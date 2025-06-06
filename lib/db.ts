/**
 * 数据库操作模块
 * 使用内存存储用户数据和认证器条目（生产环境应使用真实数据库）
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

// 内存存储
const users = new Map<string, User>();
const usersByUsername = new Map<string, string>();
const authenticatorEntries = new Map<string, AuthenticatorEntry>();
const userEntries = new Map<string, Map<string, AuthenticatorEntry>>();

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<void> {
  // 内存数据库不需要初始化
  console.log("✅ 内存数据库初始化完成");
}

/**
 * 获取数据库实例
 */
export async function getDatabase(): Promise<void> {
  // 内存数据库不需要实例
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  // 内存数据库不需要关闭
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
  constructor() {
    // 内存存储不需要初始化
  }

  /**
   * 创建用户
   */
  async createUser(username: string, passwordHash: string): Promise<string> {
    const id = generateId();
    const user: User = {
      id,
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    users.set(id, user);
    usersByUsername.set(username, id);

    return id;
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    // 先通过用户名获取用户 ID
    const userId = usersByUsername.get(username);
    if (!userId) {
      return null;
    }

    // 再通过 ID 获取用户信息
    return users.get(userId) || null;
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(id: string): Promise<User | null> {
    return users.get(id) || null;
  }

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string): Promise<boolean> {
    return usersByUsername.has(username);
  }
}

/**
 * 认证器条目相关操作
 */
export class AuthenticatorService {
  constructor() {
    // 内存存储不需要初始化
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

    authenticatorEntries.set(id, entry);

    if (!userEntries.has(userId)) {
      userEntries.set(userId, new Map());
    }
    userEntries.get(userId)!.set(id, entry);

    return id;
  }

  /**
   * 获取用户的所有认证器条目
   */
  async getUserEntries(userId: string): Promise<AuthenticatorEntry[]> {
    const userEntriesMap = userEntries.get(userId);
    if (!userEntriesMap) {
      return [];
    }

    const entries = Array.from(userEntriesMap.values());

    // 按创建时间倒序排列
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * 根据 ID 获取认证器条目
   */
  async getEntryById(id: string, userId: string): Promise<AuthenticatorEntry | null> {
    const userEntriesMap = userEntries.get(userId);
    if (!userEntriesMap) {
      return null;
    }
    return userEntriesMap.get(id) || null;
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

    authenticatorEntries.set(id, updated);
    userEntries.get(userId)!.set(id, updated);

    return true;
  }

  /**
   * 删除认证器条目
   */
  async deleteEntry(id: string, userId: string): Promise<boolean> {
    const existing = await this.getEntryById(id, userId);

    if (!existing) {
      return false;
    }

    authenticatorEntries.delete(id);
    const userEntriesMap = userEntries.get(userId);
    if (userEntriesMap) {
      userEntriesMap.delete(id);
    }

    return true;
  }
}
