/**
 * 数据库操作模块
 * 使用 JSON 文件存储用户数据和认证器条目（持久化内存存储）
 */

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

// 数据存储
interface DatabaseData {
  users: Map<string, User>;
  usersByUsername: Map<string, string>;
  usersByEmail: Map<string, string>;
  authenticatorEntries: Map<string, AuthenticatorEntry>;
  userEntries: Map<string, Map<string, AuthenticatorEntry>>;
}

// 内存数据
let data: DatabaseData = {
  users: new Map(),
  usersByUsername: new Map(),
  usersByEmail: new Map(),
  authenticatorEntries: new Map(),
  userEntries: new Map(),
};

const DB_FILE = "./db/data.json";

/**
 * 从文件加载数据
 */
function loadData(): void {
  try {
    const fileContent = Deno.readTextFileSync(DB_FILE);
    const jsonData = JSON.parse(fileContent);

    // 重建 Map 结构
    data.users = new Map(jsonData.users || []);
    data.usersByUsername = new Map(jsonData.usersByUsername || []);
    data.usersByEmail = new Map(jsonData.usersByEmail || []);
    data.authenticatorEntries = new Map(jsonData.authenticatorEntries || []);

    // 重建嵌套 Map 结构
    data.userEntries = new Map();
    if (jsonData.userEntries) {
      for (const [userId, entries] of jsonData.userEntries) {
        data.userEntries.set(userId, new Map(entries));
      }
    }

    console.log("✅ 数据从文件加载完成");
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log("📁 数据文件不存在，将创建新文件");
    } else {
      console.error("❌ 加载数据失败:", error);
    }
  }
}

/**
 * 保存数据到文件
 */
function saveData(): void {
  try {
    // 确保目录存在
    try {
      Deno.mkdirSync("./db", { recursive: true });
    } catch {
      // 目录已存在
    }

    // 转换 Map 为数组以便 JSON 序列化
    const jsonData = {
      users: Array.from(data.users.entries()),
      usersByUsername: Array.from(data.usersByUsername.entries()),
      usersByEmail: Array.from(data.usersByEmail.entries()),
      authenticatorEntries: Array.from(data.authenticatorEntries.entries()),
      userEntries: Array.from(data.userEntries.entries()).map(([userId, entries]) => [
        userId,
        Array.from(entries.entries())
      ]),
    };

    Deno.writeTextFileSync(DB_FILE, JSON.stringify(jsonData, null, 2));
  } catch (error) {
    console.error("❌ 保存数据失败:", error);
  }
}

/**
 * 初始化数据库连接
 */
export function initDatabase(): void {
  loadData();
  console.log("✅ JSON 数据库初始化完成");
}

/**
 * 获取数据库实例
 */
export function getDatabase(): DatabaseData {
  return data;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  saveData();
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
    // JSON 存储不需要初始化
  }

  /**
   * 创建用户
   */
  createUser(username: string, email: string, passwordHash: string): string {
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

    data.users.set(id, user);
    data.usersByUsername.set(username, id);
    data.usersByEmail.set(email, id);

    // 保存到文件
    saveData();

    return id;
  }

  /**
   * 根据用户名获取用户
   */
  getUserByUsername(username: string): User | null {
    const userId = data.usersByUsername.get(username);
    if (!userId) {
      return null;
    }
    return data.users.get(userId) || null;
  }

  /**
   * 根据邮箱获取用户
   */
  getUserByEmail(email: string): User | null {
    const userId = data.usersByEmail.get(email);
    if (!userId) {
      return null;
    }
    return data.users.get(userId) || null;
  }

  /**
   * 根据用户名和邮箱获取用户
   */
  getUserByUsernameAndEmail(username: string, email: string): User | null {
    const user = this.getUserByUsername(username);
    if (user && user.email === email) {
      return user;
    }
    return null;
  }

  /**
   * 根据 ID 获取用户
   */
  getUserById(id: string): User | null {
    return data.users.get(id) || null;
  }

  /**
   * 检查用户名是否存在
   */
  usernameExists(username: string): boolean {
    return data.usersByUsername.has(username);
  }

  /**
   * 检查邮箱是否存在
   */
  emailExists(email: string): boolean {
    return data.usersByEmail.has(email);
  }

  /**
   * 检查用户名和邮箱组合是否存在
   */
  usernameEmailExists(username: string, email: string): boolean {
    return this.usernameExists(username) || this.emailExists(email);
  }

  /**
   * 更新用户密码
   */
  updatePassword(username: string, email: string, newPasswordHash: string): boolean {
    const user = this.getUserByUsernameAndEmail(username, email);
    if (!user) {
      return false;
    }

    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();

    data.users.set(user.id, user);
    saveData();

    return true;
  }
}

/**
 * 认证器条目相关操作
 */
export class AuthenticatorService {
  constructor() {
    // JSON 存储不需要初始化
  }

  /**
   * 创建认证器条目
   */
  createEntry(
    userId: string,
    name: string,
    secret: string,
    issuer: string = "",
    accountName: string = "",
    digits: number = 6,
    timeStep: number = 30
  ): string {
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

    data.authenticatorEntries.set(id, entry);

    if (!data.userEntries.has(userId)) {
      data.userEntries.set(userId, new Map());
    }
    data.userEntries.get(userId)!.set(id, entry);

    saveData();

    return id;
  }

  /**
   * 获取用户的所有认证器条目
   */
  getUserEntries(userId: string): AuthenticatorEntry[] {
    const userEntriesMap = data.userEntries.get(userId);
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
  getEntryById(id: string, userId: string): AuthenticatorEntry | null {
    const userEntriesMap = data.userEntries.get(userId);
    if (!userEntriesMap) {
      return null;
    }
    return userEntriesMap.get(id) || null;
  }

  /**
   * 更新认证器条目
   */
  updateEntry(
    id: string,
    userId: string,
    name: string,
    issuer: string = "",
    accountName: string = ""
  ): boolean {
    const existing = this.getEntryById(id, userId);

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

    data.authenticatorEntries.set(id, updated);
    data.userEntries.get(userId)!.set(id, updated);

    saveData();

    return true;
  }

  /**
   * 删除认证器条目
   */
  deleteEntry(id: string, userId: string): boolean {
    const existing = this.getEntryById(id, userId);

    if (!existing) {
      return false;
    }

    data.authenticatorEntries.delete(id);
    const userEntriesMap = data.userEntries.get(userId);
    if (userEntriesMap) {
      userEntriesMap.delete(id);
    }

    saveData();

    return true;
  }
}
