import { Handlers, PageProps } from "$fresh/server.ts";
import { registerUser, getSessionFromRequest } from "../lib/auth.ts";

interface RegisterData {
  error?: string;
  success?: string;
}

export const handler: Handlers<RegisterData> = {
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
    const confirmPassword = form.get("confirmPassword")?.toString() || "";
    
    if (!username || !password || !confirmPassword) {
      return ctx.render({
        error: "请填写所有字段",
      });
    }
    
    if (password !== confirmPassword) {
      return ctx.render({
        error: "两次输入的密码不一致",
      });
    }
    
    const result = await registerUser(username, password);
    
    if (result.success) {
      return ctx.render({
        success: "注册成功！请前往登录页面登录。",
      });
    } else {
      return ctx.render({
        error: result.message,
      });
    }
  },
};

export default function Register({ data }: PageProps<RegisterData>) {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="flex justify-center">
          <div class="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
          </div>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          创建新账户
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          或者{" "}
          <a href="/login" class="font-medium text-blue-600 hover:text-blue-500">
            登录现有账户
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
              <div class="mt-2">
                <a href="/login" class="font-medium text-green-600 hover:text-green-500">
                  点击这里登录 →
                </a>
              </div>
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
              <p class="mt-1 text-xs text-gray-500">
                用户名将用于登录系统
              </p>
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
                  autoComplete="new-password"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入密码"
                />
              </div>
              <p class="mt-1 text-xs text-gray-500">
                密码长度至少为6位
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" class="block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <div class="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请再次输入密码"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                创建账户
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
