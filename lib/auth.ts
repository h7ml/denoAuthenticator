/**
 * 用户认证和加密模块
 */

import { UserService } from "./db.ts";

/**
 * 会话管理
 */
export interface Session {
  userId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

// 内存中的会话存储（生产环境应使用 Redis 等）
const sessions = new Map<string, Session>();

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // 生成随机盐
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 使用 PBKDF2 进行哈希
  const key = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  // 将盐和哈希值组合
  const hashArray = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  // 转换为 base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // 解码存储的哈希值
    const combined = new Uint8Array(atob(hashValue).split('').map(c => c.charCodeAt(0)));

    // 提取盐和哈希值
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    // 使用相同的盐重新计算哈希
    const key = await crypto.subtle.importKey(
      "raw",
      data,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      key,
      256
    );

    const computedHash = new Uint8Array(hashBuffer);

    // 比较哈希值
    if (computedHash.length !== storedHash.length) {
      return false;
    }

    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== storedHash[i]) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 生成会话 ID
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 创建会话
 */
export function createSession(userId: string, username: string): string {
  const sessionId = generateSessionId();
  const now = Date.now();
  const session: Session = {
    userId,
    username,
    createdAt: now,
    expiresAt: now + (24 * 60 * 60 * 1000), // 24小时过期
  };

  sessions.set(sessionId, session);
  return sessionId;
}

/**
 * 获取会话
 */
export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  // 检查是否过期
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * 清理过期会话
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

/**
 * 用户注册
 */
export async function registerUser(username: string, password: string): Promise<{
  success: boolean;
  message: string;
  userId?: string;
}> {
  const userService = new UserService();

  // 检查用户名是否已存在
  if (await userService.usernameExists(username)) {
    return {
      success: false,
      message: "用户名已存在",
    };
  }

  // 验证密码强度
  if (password.length < 6) {
    return {
      success: false,
      message: "密码长度至少为6位",
    };
  }

  try {
    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const userId = await userService.createUser(username, passwordHash);

    return {
      success: true,
      message: "注册成功",
      userId,
    };
  } catch (error) {
    return {
      success: false,
      message: "注册失败：" + (error as Error).message,
    };
  }
}

/**
 * 用户登录
 */
export async function loginUser(username: string, password: string): Promise<{
  success: boolean;
  message: string;
  sessionId?: string;
  user?: { id: string; username: string };
}> {
  const userService = new UserService();

  try {
    // 获取用户
    const user = await userService.getUserByUsername(username);
    if (!user) {
      return {
        success: false,
        message: "用户名或密码错误",
      };
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return {
        success: false,
        message: "用户名或密码错误",
      };
    }

    // 创建会话
    const sessionId = createSession(user.id, user.username);

    return {
      success: true,
      message: "登录成功",
      sessionId,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "登录失败：" + (error as Error).message,
    };
  }
}

/**
 * 用户登出
 */
export function logoutUser(sessionId: string): void {
  deleteSession(sessionId);
}

/**
 * 从请求中获取会话
 */
export function getSessionFromRequest(request: Request): Session | null {
  const cookies = request.headers.get("cookie");
  if (!cookies) {
    return null;
  }
  
  const sessionCookie = cookies
    .split(";")
    .find(cookie => cookie.trim().startsWith("session="));
    
  if (!sessionCookie) {
    return null;
  }
  
  const sessionId = sessionCookie.split("=")[1];
  return getSession(sessionId);
}

/**
 * 创建会话 Cookie
 */
export function createSessionCookie(sessionId: string): string {
  return `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`;
}

/**
 * 创建删除会话的 Cookie
 */
export function createDeleteSessionCookie(): string {
  return `session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

/**
 * 中间件：要求用户登录
 */
export function requireAuth(request: Request): Session | Response {
  const session = getSessionFromRequest(request);
  
  if (!session) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/login",
      },
    });
  }
  
  return session;
}

// 定期清理过期会话
setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // 每小时清理一次
