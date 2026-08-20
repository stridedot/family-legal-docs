// 轻量合规访问统计。
// 双通道：Vercel Web Analytics（部署在 vercel.app 时自动注入，无需配置）+ GoatCounter 漏斗（可选）。
// 漏斗事件：view_home / open_<doc> / generate / paywall_show / unlock
// 未配置 GC_CODE 时不加载 GoatCounter，页面照常运行；本地 file:// 不加载任何统计，不报错。
// 私密性：仅统计“事件名 + 渠道(src)”，不收集任何填写内容。
const GC_CODE = "REPLACE_WITH_GC_CODE"; // ← 替换为你的 GoatCounter 码（goatcounter.com 免费注册）
let gcEnabled = false;

// Vercel Web Analytics：只在 vercel.app 域名下注入，本地/私链/其他静态托管不加载（避免 file:// 404 与误报）
function initVercelAnalytics() {
  try {
    const host = location.hostname || "";
    if (!host.endsWith("vercel.app")) return;
    const s = document.createElement("script");
    s.defer = true;
    s.src = "/_vercel/insights/script.js";
    document.head.appendChild(s);
  } catch (e) {
    /* swallow */
  }
}

export function initAnalytics() {
  initVercelAnalytics();
  if (!GC_CODE || GC_CODE === "REPLACE_WITH_GC_CODE") return; // 未配置则跳过 GoatCounter
  gcEnabled = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${GC_CODE}.goatcounter.com/count`;
  document.head.appendChild(s);
}

export function track(name) {
  if (!gcEnabled || typeof window.goatcounter !== "object") return;
  const src = new URLSearchParams(location.search).get("src") || "direct";
  try {
    window.goatcounter.count({ event: true, path: `funnel/${name}/${src}` });
  } catch (e) {
    /* swallow */
  }
}
