// 轻量合规访问统计。
// 主通道：Vercel Web Analytics（在 Vercel 托管的任意域名下启用，含自定义域名与 *.vercel.app）。
// 副通道：GoatCounter 漏斗（可选，配置 GC_CODE 后启用）。
// 漏斗事件：view_home / open_<doc> / generate / paywall_show / unlock
// 私密性：仅统计“事件名 + 渠道(src)”，不收集任何填写内容。本地 file:// 不加载统计，不报错。
const GC_CODE = "REPLACE_WITH_GC_CODE"; // ← 可选：填 GoatCounter 码启用漏斗；留空则只用 Vercel Analytics
let gcEnabled = false;

// Vercel Web Analytics 注入：任何 http(s) 页面都注入（含自定义域名 legal.ishuchen.com）。
// 仅跳过 file://，避免本地双击打开时报 404。
function initVercelAnalytics() {
  try {
    if (location.protocol === "file:") return;
    if (typeof window.va === "function") return; // 已注入则跳过
    // 官方静态站片段：先建事件队列，再加载脚本，避免脚本就绪前事件丢失
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
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
  // Vercel Web Analytics 自定义事件（漏斗）
  try {
    if (typeof window.va === "function") window.va("event", { name });
  } catch (e) {
    /* swallow */
  }
  // GoatCounter 漏斗（可选副通道）
  if (!gcEnabled || typeof window.goatcounter !== "object") return;
  const src = new URLSearchParams(location.search).get("src") || "direct";
  try {
    window.goatcounter.count({ event: true, path: `funnel/${name}/${src}` });
  } catch (e) {
    /* swallow */
  }
}
