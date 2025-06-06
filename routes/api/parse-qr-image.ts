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

      console.log("收到二维码解析请求，文件类型:", file.type, "文件大小:", file.size);

      // 方案1: 尝试简单的文本解析（如果用户直接上传了包含 URL 的文本文件）
      try {
        if (file.type.startsWith("text/")) {
          const text = await file.text();
          const parsed = parseAuthenticatorURL(text.trim());
          if (parsed) {
            console.log("文本解析成功");
            return new Response(JSON.stringify({
              success: true,
              data: parsed,
              method: "text-parsing"
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      } catch (error) {
        console.log("文本解析失败:", error);
      }

      // 方案2: 尝试第三方 API 解析
      try {
        console.log("尝试第三方 API 解析...");
        const thirdPartyResult = await parseWithThirdPartyAPI(file);
        if (thirdPartyResult) {
          console.log("第三方 API 返回:", thirdPartyResult);

          // 先尝试直接解析 phonefactor URL
          if (thirdPartyResult.startsWith("phonefactor://")) {
            console.log("检测到 phonefactor URL，直接解析...");
            try {
              const urlObj = new URL(thirdPartyResult);
              const code = urlObj.searchParams.get("code");
              const activateUrl = urlObj.searchParams.get("url");

              if (code && activateUrl) {
                const decodedUrl = decodeURIComponent(activateUrl);
                const urlParts = decodedUrl.split("/");
                const secret = urlParts[urlParts.length - 1];

                if (secret && secret.length > 10) {
                  const directResult = {
                    secret: secret,
                    issuer: "Microsoft",
                    accountName: `Microsoft Account (${code})`,
                  };
                  console.log("直接解析成功:", directResult);
                  return new Response(JSON.stringify({
                    success: true,
                    data: directResult,
                    method: "direct-phonefactor-parsing"
                  }), {
                    headers: { "Content-Type": "application/json" }
                  });
                }
              }
            } catch (error) {
              console.log("直接解析失败:", error);
            }
          }

          // 如果直接解析失败，尝试通用解析器
          const parsed = parseAuthenticatorURL(thirdPartyResult);
          console.log("parseAuthenticatorURL 解析结果:", parsed);
          if (parsed) {
            console.log("第三方 API 解析成功，返回数据:", parsed);
            return new Response(JSON.stringify({
              success: true,
              data: parsed,
              method: "third-party-api-general"
            }), {
              headers: { "Content-Type": "application/json" }
            });
          } else {
            console.log("parseAuthenticatorURL 解析失败，URL:", thirdPartyResult);
            // 即使解析失败，也要记录原始 URL 以便调试
            console.log("原始 URL 内容:", JSON.stringify(thirdPartyResult));
          }
        }
      } catch (error) {
        console.log("第三方 API 解析失败:", error);
      }

      // 方案3: 尝试其他第三方 API
      try {
        console.log("尝试备用 API 解析...");
        const alternativeResult = await parseWithAlternativeAPI(file);
        if (alternativeResult) {
          console.log("备用 API 返回:", alternativeResult);
          const parsed = parseAuthenticatorURL(alternativeResult);
          console.log("备用 API parseAuthenticatorURL 解析结果:", parsed);
          if (parsed) {
            console.log("备用 API 解析成功，返回数据:", parsed);
            return new Response(JSON.stringify({
              success: true,
              data: parsed,
              method: "alternative-api"
            }), {
              headers: { "Content-Type": "application/json" }
            });
          } else {
            console.log("备用 API parseAuthenticatorURL 解析失败，URL:", alternativeResult);
          }
        }
      } catch (error) {
        console.log("备用 API 解析失败:", error);
      }

      // 如果所有方法都失败了
      console.log("所有解析方法都失败了");
      return new Response(JSON.stringify({
        success: false,
        error: "无法解析二维码。请尝试：\n1. 确保图片清晰且包含完整的二维码\n2. 尝试使用客户端解析（刷新页面重试）\n3. 手动输入认证器信息"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("服务器处理错误:", error);
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
 * 使用第三方 API 解析二维码 - qrserver.com (使用文件上传)
 */
async function parseWithThirdPartyAPI(file: File): Promise<string | null> {
  try {
    // 使用 multipart/form-data 上传文件
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("https://api.qrserver.com/v1/read-qr-code/", {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      console.log("qrserver.com 返回结果:", result);

      // 根据文档，返回格式是数组，包含 symbol 数组
      if (result && Array.isArray(result) && result[0] && result[0].symbol && Array.isArray(result[0].symbol)) {
        const symbolData = result[0].symbol[0];
        if (symbolData && symbolData.data && !symbolData.error) {
          return symbolData.data;
        } else if (symbolData && symbolData.error) {
          console.error("qrserver.com 解析错误:", symbolData.error);
        }
      }
    } else {
      console.error("qrserver.com API 请求失败:", response.status, response.statusText);
    }
    return null;
  } catch (error) {
    console.error("qrserver.com API 错误:", error);
    return null;
  }
}

/**
 * 使用备用第三方 API 解析二维码 - qrserver.com (使用 base64 URL)
 */
async function parseWithAlternativeAPI(file: File): Promise<string | null> {
  try {
    // 将文件转换为 base64 并通过 URL 参数传递
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    // 使用 GET 请求和 fileurl 参数
    const encodedUrl = encodeURIComponent(dataUrl);
    const response = await fetch(`https://api.qrserver.com/v1/read-qr-code/?fileurl=${encodedUrl}`, {
      method: "GET"
    });

    if (response.ok) {
      const result = await response.json();
      console.log("qrserver.com (base64) 返回结果:", result);

      if (result && Array.isArray(result) && result[0] && result[0].symbol && Array.isArray(result[0].symbol)) {
        const symbolData = result[0].symbol[0];
        if (symbolData && symbolData.data && !symbolData.error) {
          return symbolData.data;
        } else if (symbolData && symbolData.error) {
          console.error("qrserver.com (base64) 解析错误:", symbolData.error);
        }
      }
    } else {
      console.error("qrserver.com (base64) API 请求失败:", response.status, response.statusText);
    }
    return null;
  } catch (error) {
    console.error("qrserver.com (base64) API 错误:", error);
    return null;
  }
}
