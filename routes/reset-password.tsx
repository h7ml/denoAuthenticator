import { Handlers, PageProps } from "$fresh/server.ts";
import { resetPassword, getSessionFromRequest } from "../lib/auth.ts";

interface ResetPasswordData {
  error?: string;
  success?: string;
}

export const handler: Handlers<ResetPasswordData> = {
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
    const email = form.get("email")?.toString() || "";
    const newPassword = form.get("newPassword")?.toString() || "";
    const confirmPassword = form.get("confirmPassword")?.toString() || "";

    if (!username || !email || !newPassword || !confirmPassword) {
      return ctx.render({
        error: "请填写所有字段",
      });
    }

    if (newPassword !== confirmPassword) {
      return ctx.render({
        error: "两次输入的密码不一致",
      });
    }

    const result = await resetPassword(username, email, newPassword);

    if (result.success) {
      return ctx.render({
        success: "密码重置成功！请使用新密码登录。",
      });
    } else {
      return ctx.render({
        error: result.message,
      });
    }
  },
};

export default function ResetPassword({ data }: PageProps<ResetPasswordData>) {
  return (
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="flex justify-center">
          <div class="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414a6 6 0 015.743-7.743z"></path>
            </svg>
          </div>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          重置密码
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          请输入您的用户名和邮箱地址来重置密码
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
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" class="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <div class="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="请输入注册时的邮箱地址"
                />
              </div>
              <p class="mt-1 text-xs text-gray-500">
                必须与注册时使用的邮箱地址一致
              </p>
            </div>

            <div>
              <label htmlFor="newPassword" class="block text-sm font-medium text-gray-700">
                新密码
              </label>
              <div class="mt-1">
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="请输入新密码"
                />
              </div>
              <p class="mt-1 text-xs text-gray-500">
                密码长度至少为6位
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" class="block text-sm font-medium text-gray-700">
                确认新密码
              </label>
              <div class="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="请再次输入新密码"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                重置密码
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

            <div class="mt-6 grid grid-cols-2 gap-3">
              <a
                href="/login"
                class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                返回登录
              </a>
              <a
                href="/register"
                class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                注册账户
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
