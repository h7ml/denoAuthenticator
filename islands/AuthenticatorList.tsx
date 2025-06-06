import { useSignal, useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface Authenticator {
  id: string;
  name: string;
  issuer: string;
  account_name: string;
  code: string;
  remainingTime: number;
}

interface Props {
  authenticators: Authenticator[];
}

export default function AuthenticatorList({ authenticators }: Props) {
  const currentTime = useSignal(Date.now());
  const copiedId = useSignal<number | null>(null);

  // 每秒更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      currentTime.value = Date.now();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 计算每个认证器的剩余时间
  const authenticatorsWithTime = useComputed(() => {
    return authenticators.map(auth => {
      const timeStep = 30; // 默认30秒
      const currentSeconds = Math.floor(currentTime.value / 1000);
      const remaining = timeStep - (currentSeconds % timeStep);

      return {
        ...auth,
        remainingTime: remaining,
        progressPercentage: (remaining / timeStep) * 100,
      };
    });
  });

  const copyToClipboard = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      copiedId.value = id;
      setTimeout(() => {
        copiedId.value = null;
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const deleteAuthenticator = async (id: string, name: string) => {
    if (confirm(`确定要删除认证器 "${name}" 吗？`)) {
      try {
        const response = await fetch(`/api/authenticators/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // 刷新页面
          window.location.reload();
        } else {
          alert('删除失败，请重试');
        }
      } catch (err) {
        console.error('删除失败:', err);
        alert('删除失败，请重试');
      }
    }
  };

  if (authenticators.length === 0) {
    return null;
  }

  return (
    <div class="space-y-4">
      {authenticatorsWithTime.value.map((auth) => (
        <div
          key={auth.id}
          class="bg-white overflow-hidden shadow rounded-lg border border-gray-200"
        >
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <h3 class="text-lg font-medium text-gray-900">{auth.name}</h3>
                    {auth.issuer && (
                      <p class="text-sm text-gray-500">{auth.issuer}</p>
                    )}
                    {auth.account_name && (
                      <p class="text-xs text-gray-400">{auth.account_name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-4">
                {/* 验证码显示 */}
                <div class="text-center">
                  <div class="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                    {auth.code}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {auth.remainingTime}秒后刷新
                  </div>
                  {/* 进度条 */}
                  <div class="w-16 bg-gray-200 rounded-full h-1 mt-2">
                    <div
                      class={`h-1 rounded-full transition-all duration-1000 ${auth.remainingTime <= 5 ? 'bg-red-500' :
                        auth.remainingTime <= 10 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                      style={{ width: `${auth.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div class="flex flex-col space-y-2">
                  <button
                    onClick={() => copyToClipboard(auth.code, auth.id)}
                    class={`px-3 py-1 rounded text-xs font-medium transition-colors ${copiedId.value === auth.id
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                  >
                    {copiedId.value === auth.id ? '已复制!' : '复制'}
                  </button>

                  <button
                    onClick={() => deleteAuthenticator(auth.id, auth.name)}
                    class="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
