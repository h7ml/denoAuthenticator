/**
 * TOTP (Time-based One-Time Password) 算法实现
 * 基于 RFC 6238 标准
 */

// Base32 字符集
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Base32 解码
 */
export function base32Decode(encoded: string): Uint8Array {
  // 移除空格和转换为大写
  const cleanInput = encoded.replace(/\s/g, "").toUpperCase();
  
  let bits = "";
  for (const char of cleanInput) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    const byte = bits.substr(i * 8, 8);
    bytes[i] = parseInt(byte, 2);
  }
  
  return bytes;
}

/**
 * Base32 编码
 */
export function base32Encode(data: Uint8Array): string {
  let bits = "";
  for (const byte of data) {
    bits += byte.toString(2).padStart(8, "0");
  }
  
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substr(i, 5).padEnd(5, "0");
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  
  return result;
}

/**
 * HMAC-SHA1 实现
 */
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(signature);
}

/**
 * 将数字转换为 8 字节大端序数组
 */
function numberToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

/**
 * 动态截断函数
 */
function dynamicTruncate(hash: Uint8Array): number {
  const offset = hash[hash.length - 1] & 0xf;
  return (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  );
}

/**
 * 生成 TOTP 验证码
 */
export async function generateTOTP(
  secret: string,
  timeStep: number = 30,
  digits: number = 6,
  timestamp?: number
): Promise<string> {
  // 解码 Base32 密钥
  const key = base32Decode(secret);
  
  // 计算时间步长
  const time = Math.floor((timestamp || Date.now()) / 1000);
  const timeCounter = Math.floor(time / timeStep);
  
  // 生成 HMAC
  const timeBytes = numberToBytes(timeCounter);
  const hash = await hmacSha1(key, timeBytes);
  
  // 动态截断
  const code = dynamicTruncate(hash);
  
  // 生成指定位数的验证码
  const otp = (code % Math.pow(10, digits)).toString().padStart(digits, "0");
  
  return otp;
}

/**
 * 验证 TOTP 验证码
 */
export async function verifyTOTP(
  secret: string,
  token: string,
  timeStep: number = 30,
  digits: number = 6,
  window: number = 1
): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000);
  
  // 检查当前时间窗口及前后窗口
  for (let i = -window; i <= window; i++) {
    const testTime = currentTime + (i * timeStep);
    const expectedToken = await generateTOTP(secret, timeStep, digits, testTime * 1000);
    
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

/**
 * 解析 phonefactor:// URL (Microsoft Authenticator 格式)
 */
export function parsePhoneFactorURL(url: string): {
  secret: string;
  issuer: string;
  accountName: string;
} | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.protocol !== "phonefactor:") {
      return null;
    }

    // phonefactor://activate_account?code=518227904&url=https%3a%2f%2fmobileappcommunicator.auth.microsoft.com%2factivatev2%2f863602595%2fSASPUBKRCAZ1FD043
    const code = urlObj.searchParams.get("code");
    const activateUrl = urlObj.searchParams.get("url");

    if (!code || !activateUrl) {
      return null;
    }

    // 解码激活 URL
    const decodedUrl = decodeURIComponent(activateUrl);

    // 从激活 URL 中提取密钥（通常在路径的最后部分）
    const urlParts = decodedUrl.split("/");
    const secret = urlParts[urlParts.length - 1];

    if (!secret || secret.length < 10) {
      return null;
    }

    return {
      secret: secret,
      issuer: "Microsoft",
      accountName: `Microsoft Account (${code})`,
    };
  } catch {
    return null;
  }
}

/**
 * 解析标准 otpauth:// URL
 */
export function parseOtpAuthURL(url: string): {
  secret: string;
  issuer: string;
  accountName: string;
} | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.protocol !== "otpauth:") {
      return null;
    }

    const secret = urlObj.searchParams.get("secret");
    const issuer = urlObj.searchParams.get("issuer") || urlObj.pathname.split("/")[1] || "";
    const accountName = decodeURIComponent(urlObj.pathname.split("/")[2] || "");

    if (!secret) {
      return null;
    }

    return {
      secret,
      issuer,
      accountName,
    };
  } catch {
    return null;
  }
}

/**
 * 通用认证器 URL 解析器
 */
export function parseAuthenticatorURL(url: string): {
  secret: string;
  issuer: string;
  accountName: string;
} | null {
  // 尝试解析不同格式的 URL
  const parsers = [
    parseOtpAuthURL,
    parsePhoneFactorURL,
  ];

  for (const parser of parsers) {
    const result = parser(url);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 解析 Microsoft Authenticator URL (保持向后兼容)
 */
export function parseMicrosoftAuthURL(url: string): {
  secret: string;
  issuer: string;
  accountName: string;
} | null {
  return parseAuthenticatorURL(url);
}

/**
 * 生成随机密钥
 */
export function generateRandomSecret(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/**
 * 获取剩余时间（秒）
 */
export function getRemainingTime(timeStep: number = 30): number {
  const currentTime = Math.floor(Date.now() / 1000);
  return timeStep - (currentTime % timeStep);
}
