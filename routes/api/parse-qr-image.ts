import { Handlers } from "$fresh/server.ts";
import { parseAuthenticatorURL } from "../../lib/totp.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const formData = await req.formData();
      const file = formData.get("image") as File;
      
      if (!file) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "没有提供图片文件" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 方案1: 尝试第三方 API 解析
      try {
        const thirdPartyResult = await parseWithThirdPartyAPI(file);
        if (thirdPartyResult) {
          const parsed = parseAuthenticatorURL(thirdPartyResult);
          if (parsed) {
            return new Response(JSON.stringify({
              success: true,
              data: parsed,
              method: "third-party-api"
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      } catch (error) {
        console.log("第三方 API 解析失败:", error);
      }

      // 方案2: 尝试其他第三方 API
      try {
        const alternativeResult = await parseWithAlternativeAPI(file);
        if (alternativeResult) {
          const parsed = parseAuthenticatorURL(alternativeResult);
          if (parsed) {
            return new Response(JSON.stringify({
              success: true,
              data: parsed,
              method: "alternative-api"
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      } catch (error) {
        console.log("备用 API 解析失败:", error);
      }

      // 如果所有方法都失败了
      return new Response(JSON.stringify({
        success: false,
        error: "无法解析二维码，请确保图片清晰且包含有效的二维码"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: "服务器处理错误: " + (error as Error).message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

/**
 * 使用第三方 API 解析二维码 - qr-server.com
 */
async function parseWithThirdPartyAPI(file: File): Promise<string | null> {
  try {
    // 将文件转换为 base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // 使用 qrserver.com 的解析 API
    const response = await fetch("https://api.qrserver.com/v1/read-qr-code/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `fileurl=data:${file.type};base64,${base64}`
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result[0] && result[0].symbol && result[0].symbol[0]) {
        return result[0].symbol[0].data;
      }
    }
    return null;
  } catch (error) {
    console.error("qrserver.com API 错误:", error);
    return null;
  }
}

/**
 * 使用备用第三方 API 解析二维码 - goqr.me
 */
async function parseWithAlternativeAPI(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("https://api.goqr.me/api/read-qr-code/", {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result[0] && result[0].symbol && result[0].symbol[0]) {
        return result[0].symbol[0].data;
      }
    }
    return null;
  } catch (error) {
    console.error("goqr.me API 错误:", error);
    return null;
  }
}
