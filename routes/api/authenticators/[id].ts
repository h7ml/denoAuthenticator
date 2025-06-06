import { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest, requireAuth } from "../../../lib/auth.ts";
import { AuthenticatorService } from "../../../lib/db.ts";

export const handler: Handlers = {
  async DELETE(req, ctx) {
    const authResult = requireAuth(req);
    if (authResult instanceof Response) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const session = authResult;
    const id = ctx.params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: "无效的 ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const authenticatorService = new AuthenticatorService();
      const success = await authenticatorService.deleteEntry(id, session.userId);
      
      if (success) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ error: "认证器不存在或无权限删除" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: "删除失败" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
