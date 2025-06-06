/**
 * 数据库操作模块
 * 使用 Deno KV 存储用户数据和认证器条目
 */

export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
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

let kv: Deno.Kv | null = null;

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<Deno.Kv> {
  if (kv) {
    return kv;
  }

  kv = await Deno.openKv();
  return kv;
}

/**
 * 获取数据库实例
 */
export async function getDatabase(): Promise<Deno.Kv> {
  if (!kv) {
    return await initDatabase();
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
  private kv: Promise<Deno.Kv>;

  constructor() {
    this.kv = getDatabase();
  }

  /**
   * 创建用户
   */
  async createUser(username: string, passwordHash: string): Promise<string> {
    const db = await this.kv;
    const id = generateId();
    const user: User = {
      id,
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    await db.set(["users", id], user);
    await db.set(["users_by_username", username], id);

    return id;
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const db = await this.kv;

    // 先通过用户名获取用户 ID
    const userIdResult = await db.get<string>(["users_by_username", username]);
    if (!userIdResult.value) {
      return null;
    }

    // 再通过 ID 获取用户信息
    const userResult = await db.get<User>(["users", userIdResult.value]);
    return userResult.value;
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(id: string): Promise<User | null> {
    const db = await this.kv;
    const result = await db.get<User>(["users", id]);
    return result.value;
  }

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string): Promise<boolean> {
    const db = await this.kv;
    const result = await db.get(["users_by_username", username]);
    return result.value !== null;
  }
}

/**
 * 认证器条目相关操作
 */
export class AuthenticatorService {
  private kv: Promise<Deno.Kv>;

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
    const db = await this.kv;
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

    await db.set(["authenticator_entries", id], entry);
    await db.set(["user_entries", userId, id], entry);

    return id;
  }

  /**
   * 获取用户的所有认证器条目
   */
  async getUserEntries(userId: string): Promise<AuthenticatorEntry[]> {
    const db = await this.kv;
    const entries: AuthenticatorEntry[] = [];

    for await (const entry of db.list<AuthenticatorEntry>({ prefix: ["user_entries", userId] })) {
      entries.push(entry.value);
    }

    // 按创建时间倒序排列
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * 根据 ID 获取认证器条目
   */
  async getEntryById(id: string, userId: string): Promise<AuthenticatorEntry | null> {
    const db = await this.kv;
    const result = await db.get<AuthenticatorEntry>(["user_entries", userId, id]);
    return result.value;
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
    const db = await this.kv;
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

    await db.set(["authenticator_entries", id], updated);
    await db.set(["user_entries", userId, id], updated);

    return true;
  }

  /**
   * 删除认证器条目
   */
  async deleteEntry(id: string, userId: string): Promise<boolean> {
    const db = await this.kv;
    const existing = await this.getEntryById(id, userId);

    if (!existing) {
      return false;
    }

    await db.delete(["authenticator_entries", id]);
    await db.delete(["user_entries", userId, id]);

    return true;
  }
}
