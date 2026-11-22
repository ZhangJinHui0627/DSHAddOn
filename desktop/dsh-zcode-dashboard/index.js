/**
 * dsh-zcode-dashboard — 宿主半段。
 *
 * 本插件是纯 UI 壳：不注册任何 HTTP 路由、不读写凭据、不落盘任何敏感数据。
 * 所有数据交互都在 client.js 里同源 fetch 原插件 dsh-zcode-startplan 的
 * /api/zcode-start-plan/*（其安全边界由原插件承担：loopback 防护 + 无凭据出
 * 网关 + 参数校验，见 dsh-zcode-startplan/lib/manage-routes.js）。
 *
 * 宿主半段仅声明 bundle 元信息（cordis 侧零服务、零依赖注入）。
 */
export const name = 'dsh-zcode-dashboard'

export function apply() {
  // 纯 UI 壳：宿主侧无逻辑。
}
