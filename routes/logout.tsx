import { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest, logoutUser, createDeleteSessionCookie } from "../lib/auth.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const session = getSessionFromRequest(req);
    
    if (session) {
      // 获取会话 ID 并删除会话
      const cookies = req.headers.get("cookie");
      if (cookies) {
        const sessionCookie = cookies
          .split(";")
          .find(cookie => cookie.trim().startsWith("session="));
          
        if (sessionCookie) {
          const sessionId = sessionCookie.split("=")[1];
          logoutUser(sessionId);
        }
      }
    }
    
    // 重定向到首页并删除会话 Cookie
    const headers = new Headers();
    headers.set("Location", "/");
    headers.set("Set-Cookie", createDeleteSessionCookie());
    
    return new Response(null, {
      status: 302,
      headers,
    });
  },
};
