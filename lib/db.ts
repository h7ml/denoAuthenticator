/**
 * 数据库操作模块
 * 使用 Deno KV 存储用户数据和认证器条目
 */

/// <reference lib="deno.unstable" />

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatorEntry {
  id: string;
  user_id: string;
  name: string;
  secret: string;
  issuer: string;
  account_name: string;
  digits: number;
  time_step: number;
  created_at: string;
  updated_at: string;
}

// Deno KV 数据库实例
let kv: Deno.Kv | null = null;

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<void> {
  if (kv) {
    return;
  }

  // 检查是否为生产环境
  const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

  // 检查是否强制使用本地 KV
  const forceLocalKV = Deno.env.get("FORCE_LOCAL_KV") === "true";

  try {
    if (isProduction || forceLocalKV) {
      // 生产环境或强制本地：使用本地 KV
      kv = await Deno.openKv();
      console.log(`✅ ${isProduction ? '生产环境' : '强制本地模式'} Deno KV 数据库初始化完成`);
    } else {
      // 本地开发：使用云端 KV 数据库
      kv = await Deno.openKv("https://api.deno.com/databases/abf6d01e-4635-4c60-9796-4c33db50b058/connect");
      console.log("✅ 本地开发环境连接到云端 Deno KV 数据库成功");
    }
  } catch (error) {
    console.error("❌ 首选 KV 连接失败，使用备用方案:", error);
    // 如果首选方案失败，使用备用方案
    try {
      if (isProduction) {
        // 生产环境备用：尝试云端 KV
        kv = await Deno.openKv("https://api.deno.com/databases/abf6d01e-4635-4c60-9796-4c33db50b058/connect");
        console.log("✅ 生产环境备用：连接到云端 Deno KV 数据库成功");
      } else {
        // 本地开发备用：使用本地 KV
        kv = await Deno.openKv();
        console.log("✅ 本地开发环境备用：使用本地 Deno KV 数据库");
      }
    } catch (backupError) {
      console.error("❌ 备用 KV 连接也失败，使用默认本地 KV:", backupError);
      kv = await Deno.openKv();
      console.log("✅ 默认本地 Deno KV 数据库初始化完成");
    }
  }
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Deno.Kv {
  if (!kv) {
    throw new Error("数据库未初始化，请先调用 initDatabase()");
  }
  return kv;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (kv) {
    kv.close();
    kv = null;
  }
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 用户相关操作
 */
export class UserService {
  private kv: Deno.Kv;

  constructor() {
    this.kv = getDatabase();
  }

  /**
   * 创建用户
   */
  async createUser(username: string, email: string, passwordHash: string): Promise<string> {
    const id = generateId();
    const now = new Date().toISOString();

    const user: User = {
      id,
      username,
      email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };

    // 使用事务确保数据一致性
    const result = await this.kv.atomic()
      .set(["users", id], user)
      .set(["users_by_username", username], id)
      .set(["users_by_email", email], id)
      .commit();

    if (!result.ok) {
      throw new Error("创建用户失败");
    }

    return id;
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const userIdResult = await this.kv.get<string>(["users_by_username", username]);
    if (!userIdResult.value) {
      return null;
    }

    const userResult = await this.kv.get<User>(["users", userIdResult.value]);
    return userResult.value || null;
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const userIdResult = await this.kv.get<string>(["users_by_email", email]);
    if (!userIdResult.value) {
      return null;
    }

    const userResult = await this.kv.get<User>(["users", userIdResult.value]);
    return userResult.value || null;
  }

  /**
   * 根据用户名和邮箱获取用户
   */
  async getUserByUsernameAndEmail(username: string, email: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.email === email) {
      return user;
    }
    return null;
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(id: string): Promise<User | null> {
    const userResult = await this.kv.get<User>(["users", id]);
    return userResult.value || null;
  }

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string): Promise<boolean> {
    const result = await this.kv.get(["users_by_username", username]);
    return result.value !== null;
  }

  /**
   * 检查邮箱是否存在
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await this.kv.get(["users_by_email", email]);
    return result.value !== null;
  }

  /**
   * 检查用户名和邮箱组合是否存在
   */
  async usernameEmailExists(username: string, email: string): Promise<boolean> {
    const usernameCheck = await this.usernameExists(username);
    const emailCheck = await this.emailExists(email);
    return usernameCheck || emailCheck;
  }

  /**
   * 更新用户密码
   */
  async updatePassword(username: string, email: string, newPasswordHash: string): Promise<boolean> {
    const user = await this.getUserByUsernameAndEmail(username, email);
    if (!user) {
      return false;
    }

    const updatedUser: User = {
      ...user,
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString(),
    };

    const result = await this.kv.set(["users", user.id], updatedUser);
    return result.ok;
  }
}

/**
 * 认证器条目相关操作
 */
export class AuthenticatorService {
  private kv: Deno.Kv;

  constructor() {
    this.kv = getDatabase();
  }

  /**
   * 创建认证器条目
   */
  async createEntry(
    userId: string,
    name: string,
    secret: string,
    issuer: string = "",
    accountName: string = "",
    digits: number = 6,
    timeStep: number = 30
  ): Promise<string> {
    const id = generateId();
    const now = new Date().toISOString();

    const entry: AuthenticatorEntry = {
      id,
      user_id: userId,
      name,
      secret,
      issuer,
      account_name: accountName,
      digits,
      time_step: timeStep,
      created_at: now,
      updated_at: now,
    };

    // 使用事务确保数据一致性
    const result = await this.kv.atomic()
      .set(["authenticator_entries", id], entry)
      .set(["user_entries", userId, id], entry)
      .commit();

    if (!result.ok) {
      throw new Error("创建认证器条目失败");
    }

    return id;
  }

  /**
   * 获取用户的所有认证器条目
   */
  async getUserEntries(userId: string): Promise<AuthenticatorEntry[]> {
    const entries: AuthenticatorEntry[] = [];

    // 使用 list 方法获取用户的所有认证器条目
    const iter = this.kv.list<AuthenticatorEntry>({ prefix: ["user_entries", userId] });

    for await (const entry of iter) {
      entries.push(entry.value);
    }

    // 按创建时间倒序排列
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * 根据 ID 获取认证器条目
   */
  async getEntryById(id: string, userId: string): Promise<AuthenticatorEntry | null> {
    const result = await this.kv.get<AuthenticatorEntry>(["user_entries", userId, id]);
    return result.value || null;
  }

  /**
   * 更新认证器条目
   */
  async updateEntry(
    id: string,
    userId: string,
    name: string,
    issuer: string = "",
    accountName: string = ""
  ): Promise<boolean> {
    const existing = await this.getEntryById(id, userId);

    if (!existing) {
      return false;
    }

    const updated: AuthenticatorEntry = {
      ...existing,
      name,
      issuer,
      account_name: accountName,
      updated_at: new Date().toISOString(),
    };

    // 使用事务更新两个位置的数据
    const result = await this.kv.atomic()
      .set(["authenticator_entries", id], updated)
      .set(["user_entries", userId, id], updated)
      .commit();

    return result.ok;
  }

  /**
   * 删除认证器条目
   */
  async deleteEntry(id: string, userId: string): Promise<boolean> {
    const existing = await this.getEntryById(id, userId);

    if (!existing) {
      return false;
    }

    // 使用事务删除两个位置的数据
    const result = await this.kv.atomic()
      .delete(["authenticator_entries", id])
      .delete(["user_entries", userId, id])
      .commit();

    return result.ok;
  }
}
