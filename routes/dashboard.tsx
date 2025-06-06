import { Handlers, PageProps } from "$fresh/server.ts";
import { getSessionFromRequest, requireAuth } from "../lib/auth.ts";
import { AuthenticatorService } from "../lib/db.ts";
import { generateTOTP, getRemainingTime } from "../lib/totp.ts";
import AuthenticatorList from "../islands/AuthenticatorList.tsx";

interface DashboardData {
  user: {
    id: string;
    username: string;
  };
  authenticators: Array<{
    id: string;
    name: string;
    issuer: string;
    account_name: string;
    code: string;
    remainingTime: number;
  }>;
}

export const handler: Handlers<DashboardData> = {
  async GET(req, ctx) {
    const authResult = requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const session = authResult;
    const authenticatorService = new AuthenticatorService();

    // 获取用户的所有认证器条目
    const entries = await authenticatorService.getUserEntries(session.userId);

    // 为每个条目生成当前的验证码
    const authenticators = await Promise.all(
      entries.map(async (entry) => {
        const code = await generateTOTP(entry.secret, entry.time_step, entry.digits);
        const remainingTime = getRemainingTime(entry.time_step);

        return {
          id: entry.id,
          name: entry.name,
          issuer: entry.issuer,
          account_name: entry.account_name,
          code,
          remainingTime,
        };
      })
    );

    return ctx.render({
      user: {
        id: session.userId,
        username: session.username,
      },
      authenticators,
    });
  },
};

export default function Dashboard({ data }: PageProps<DashboardData>) {
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
                <h1 class="text-xl font-semibold text-gray-900">Microsoft Authenticator</h1>
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-700">欢迎，{data.user.username}</span>
              <a
                href="/add"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                添加认证器
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
      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-900">我的认证器</h2>
            <p class="mt-1 text-sm text-gray-600">
              管理您的双因素认证设备和验证码
            </p>
          </div>

          {data.authenticators.length === 0 ? (
            <div class="text-center py-12">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">没有认证器</h3>
              <p class="mt-1 text-sm text-gray-500">
                开始添加您的第一个认证器设备
              </p>
              <div class="mt-6">
                <a
                  href="/add"
                  class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    class="-ml-1 mr-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  添加认证器
                </a>
              </div>
            </div>
          ) : (
            <AuthenticatorList authenticators={data.authenticators} />
          )}
        </div>
      </main>
    </div>
  );
}
