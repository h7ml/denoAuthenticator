import { Handlers, PageProps } from "$fresh/server.ts";
import { getSessionFromRequest, requireAuth } from "../lib/auth.ts";
import { AuthenticatorService } from "../lib/db.ts";
import { parseMicrosoftAuthURL, generateTOTP } from "../lib/totp.ts";

interface AddData {
  user: {
    id: string;
    username: string;
  };
  error?: string;
  success?: string;
}

export const handler: Handlers<AddData> = {
  async GET(req, ctx) {
    const authResult = requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const session = authResult;
    return ctx.render({
      user: {
        id: session.userId,
        username: session.username,
      },
    });
  },

  async POST(req, ctx) {
    const authResult = requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const session = authResult;
    const form = await req.formData();
    const method = form.get("method")?.toString() || "";

    if (method === "url") {
      // 通过 URL 添加
      const url = form.get("url")?.toString() || "";
      const name = form.get("name")?.toString() || "";

      if (!url || !name) {
        return ctx.render({
          user: { id: session.userId, username: session.username },
          error: "请填写所有必需字段",
        });
      }

      const parsed = parseMicrosoftAuthURL(url);
      if (!parsed) {
        return ctx.render({
          user: { id: session.userId, username: session.username },
          error: "无效的认证器 URL 格式",
        });
      }

      try {
        const authenticatorService = new AuthenticatorService();
        await authenticatorService.createEntry(
          session.userId,
          name,
          parsed.secret,
          parsed.issuer,
          parsed.accountName
        );

        return new Response(null, {
          status: 302,
          headers: { "Location": "/dashboard" },
        });
      } catch (error) {
        return ctx.render({
          user: { id: session.userId, username: session.username },
          error: "添加认证器失败：" + (error as Error).message,
        });
      }
    } else if (method === "manual") {
      // 手动添加
      const name = form.get("name")?.toString() || "";
      const secret = form.get("secret")?.toString() || "";
      const issuer = form.get("issuer")?.toString() || "";
      const accountName = form.get("accountName")?.toString() || "";

      if (!name || !secret) {
        return ctx.render({
          user: { id: session.userId, username: session.username },
          error: "请填写名称和密钥",
        });
      }

      try {
        // 验证密钥是否有效
        await generateTOTP(secret);

        const authenticatorService = new AuthenticatorService();
        await authenticatorService.createEntry(
          session.userId,
          name,
          secret,
          issuer,
          accountName
        );

        return new Response(null, {
          status: 302,
          headers: { "Location": "/dashboard" },
        });
      } catch (error) {
        return ctx.render({
          user: { id: session.userId, username: session.username },
          error: "添加认证器失败：密钥格式无效或其他错误",
        });
      }
    }

    return ctx.render({
      user: { id: session.userId, username: session.username },
      error: "无效的请求方法",
    });
  },
};

export default function Add({ data }: PageProps<AddData>) {
  return (
    <div class="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-4">
                <h1 class="text-xl font-semibold text-gray-900">添加认证器</h1>
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <a
                href="/dashboard"
                class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                返回仪表板
              </a>
              <a
                href="/logout"
                class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                退出登录
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main class="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          {data.error && (
            <div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <span class="block sm:inline">{data.error}</span>
            </div>
          )}

          <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                选择添加方式
              </h3>

              {/* URL 方式 */}
              <div class="mb-8">
                <h4 class="text-md font-medium text-gray-900 mb-2">方式一：通过 URL 添加</h4>
                <p class="text-sm text-gray-600 mb-4">
                  粘贴从 Microsoft Authenticator 或其他应用获取的 otpauth:// URL
                </p>

                <form method="POST" class="space-y-4">
                  <input type="hidden" name="method" value="url" />

                  <div>
                    <label htmlFor="name" class="block text-sm font-medium text-gray-700">
                      认证器名称
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="例如：Microsoft 账户"
                    />
                  </div>

                  <div>
                    <label htmlFor="url" class="block text-sm font-medium text-gray-700">
                      认证器 URL
                    </label>
                    <textarea
                      name="url"
                      id="url"
                      rows={3}
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="otpauth://totp/..."
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-500">
                      URL 格式：otpauth://totp/账户?secret=密钥&issuer=发行者
                    </p>
                  </div>

                  <button
                    type="submit"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    通过 URL 添加
                  </button>
                </form>
              </div>

              <div class="border-t border-gray-200 pt-8">
                <h4 class="text-md font-medium text-gray-900 mb-2">方式二：手动添加</h4>
                <p class="text-sm text-gray-600 mb-4">
                  手动输入认证器的详细信息
                </p>

                <form method="POST" class="space-y-4">
                  <input type="hidden" name="method" value="manual" />

                  <div>
                    <label htmlFor="manual-name" class="block text-sm font-medium text-gray-700">
                      认证器名称 *
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="manual-name"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="例如：Microsoft 账户"
                    />
                  </div>

                  <div>
                    <label htmlFor="secret" class="block text-sm font-medium text-gray-700">
                      密钥 (Secret) *
                    </label>
                    <input
                      type="text"
                      name="secret"
                      id="secret"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                      placeholder="Base32 编码的密钥"
                    />
                    <p class="mt-1 text-xs text-gray-500">
                      通常是一串大写字母和数字的组合
                    </p>
                  </div>

                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="issuer" class="block text-sm font-medium text-gray-700">
                        发行者 (Issuer)
                      </label>
                      <input
                        type="text"
                        name="issuer"
                        id="issuer"
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="例如：Microsoft"
                      />
                    </div>

                    <div>
                      <label htmlFor="accountName" class="block text-sm font-medium text-gray-700">
                        账户名称
                      </label>
                      <input
                        type="text"
                        name="accountName"
                        id="accountName"
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="例如：user@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    手动添加
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
