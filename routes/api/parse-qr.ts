import { Handlers } from "$fresh/server.ts";
import { requireAuth } from "../../lib/auth.ts";
import { parseAuthenticatorURL } from "../../lib/totp.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    // 验证用户登录
    const authResult = requireAuth(req);
    if (authResult instanceof Response) {
      return new Response(JSON.stringify({ error: "未登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const contentType = req.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        // 处理 JSON 数据（来自剪切板或直接输入）
        const data = await req.json();
        const { text, base64Image } = data;
        
        if (text) {
          // 直接解析文本 URL
          const parsed = parseAuthenticatorURL(text);
          if (parsed) {
            return new Response(JSON.stringify({
              success: true,
              data: parsed
            }), {
              headers: { "Content-Type": "application/json" },
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: "无法解析认证器 URL"
            }), {
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        
        if (base64Image) {
          // 这里应该解析二维码，但由于服务端限制，我们返回错误
          return new Response(JSON.stringify({
            success: false,
            error: "服务端不支持图片解析，请在客户端处理"
          }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        
      } else if (contentType.includes("multipart/form-data")) {
        // 处理文件上传
        const formData = await req.formData();
        const file = formData.get("qrcode") as File;
        
        if (!file) {
          return new Response(JSON.stringify({
            success: false,
            error: "未找到上传的文件"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // 验证文件类型
        if (!file.type.startsWith("image/")) {
          return new Response(JSON.stringify({
            success: false,
            error: "请上传图片文件"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // 由于服务端限制，我们不能直接处理图片
        // 返回文件信息，让客户端处理
        return new Response(JSON.stringify({
          success: false,
          error: "请在客户端处理图片解析",
          fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: "不支持的请求格式"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: "解析失败: " + (error as Error).message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
