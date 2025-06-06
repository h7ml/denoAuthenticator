/**
 * 用户认证和加密模块
 */

import { UserService } from "./db.ts";

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

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
 * 密码哈希 - 使用简化的哈希算法（模拟 MD5 格式）
 */
export async function hashPassword(password: string): Promise<string> {
  // 使用 SHA-256 但截取前32位模拟 MD5 长度
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // 转换为十六进制字符串，截取前32位（MD5 长度）
  const hex = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 32); // MD5 是32位十六进制

  return hex;
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  try {
    // 计算输入密码的哈希
    const computedHash = await hashPassword(password);

    // 直接比较哈希值
    return computedHash === hashValue;
  } catch (error) {
    console.error("密码验证错误:", error);
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
export async function registerUser(username: string, email: string, password: string): Promise<{
  success: boolean;
  message: string;
  userId?: string;
}> {
  const userService = new UserService();

  // 验证邮箱格式
  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "邮箱格式不正确",
    };
  }

  // 检查用户名是否已存在
  if (userService.usernameExists(username)) {
    return {
      success: false,
      message: "用户名已存在",
    };
  }

  // 检查邮箱是否已存在
  if (userService.emailExists(email)) {
    return {
      success: false,
      message: "邮箱已被使用",
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
    const userId = userService.createUser(username, email, passwordHash);

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
    const user = userService.getUserByUsername(username);
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
 * 重置密码
 */
export async function resetPassword(username: string, email: string, newPassword: string): Promise<{
  success: boolean;
  message: string;
}> {
  const userService = new UserService();

  // 验证邮箱格式
  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "邮箱格式不正确",
    };
  }

  // 验证新密码强度
  if (newPassword.length < 6) {
    return {
      success: false,
      message: "密码长度至少为6位",
    };
  }

  try {
    // 验证用户名和邮箱是否匹配
    const user = userService.getUserByUsernameAndEmail(username, email);
    if (!user) {
      return {
        success: false,
        message: "用户名和邮箱不匹配",
      };
    }

    // 哈希新密码
    const newPasswordHash = await hashPassword(newPassword);

    // 更新密码
    const updated = userService.updatePassword(username, email, newPasswordHash);
    if (!updated) {
      return {
        success: false,
        message: "密码更新失败",
      };
    }

    return {
      success: true,
      message: "密码重置成功",
    };
  } catch (error) {
    return {
      success: false,
      message: "重置失败：" + (error as Error).message,
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
