import { Handlers, PageProps } from "$fresh/server.ts";
import { loginUser, getSessionFromRequest, createSessionCookie } from "../lib/auth.ts";

interface LoginData {
  error?: string;
  success?: string;
}

export const handler: Handlers<LoginData> = {
  GET(req, ctx) {
    // 检查用户是否已登录
    const session = getSessionFromRequest(req);
    if (session) {
      return new Response(null, {
        status: 302,
        headers: { "Location": "/dashboard" },
      });
    }
    
    return ctx.render({});
  },
  
  async POST(req, ctx) {
    const form = await req.formData();
    const username = form.get("username")?.toString() || "";
    const password = form.get("password")?.toString() || "";
    
    if (!username || !password) {
      return ctx.render({
        error: "请填写用户名和密码",
      });
    }
    
    const result = await loginUser(username, password);
    
    if (result.success && result.sessionId) {
      const headers = new Headers();
      headers.set("Location", "/dashboard");
      headers.set("Set-Cookie", createSessionCookie(result.sessionId));
      
      return new Response(null, {
        status: 302,
        headers,
      });
    } else {
      return ctx.render({
        error: result.message,
      });
    }
  },
};

export default function Login({ data }: PageProps<LoginData>) {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="flex justify-center">
          <div class="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          登录账户
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          或者{" "}
          <a href="/register" class="font-medium text-blue-600 hover:text-blue-500">
            创建新账户
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {data.error && (
            <div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <span class="block sm:inline">{data.error}</span>
            </div>
          )}
          
          {data.success && (
            <div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              <span class="block sm:inline">{data.success}</span>
            </div>
          )}

          <form class="space-y-6" method="POST">
            <div>
              <label htmlFor="username" class="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <div class="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" class="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                登录
              </button>
            </div>
          </form>

          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">其他选项</span>
              </div>
            </div>

            <div class="mt-6">
              <a
                href="/"
                class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
