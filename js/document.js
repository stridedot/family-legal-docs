// 模板引擎 + XSS 转义
// 纯逻辑（无 DOM），可被浏览器与 node --test 复用。
import { amountToChinese, dateToChinese } from "./templates.js";

// XSS 转义：把用户答案渲染进 <pre> 前必须过这一道
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 计算模板函数需要的辅助字段（金额大写 / 日期中文 / 利息整句）
export function enrich(a, doc) {
  const out = { ...a };
  if (a.amount) out.amount_cn = amountToChinese(a.amount);
  for (const f of doc.fields) {
    if (f.type === "date" && a[f.key]) out[f.key + "_cn"] = dateToChinese(a[f.key]);
  }
  if (a.interest && a.interest.indexOf("计息") >= 0) {
    out.interest_clause = a.rate
      ? `按年利率 ${a.rate}% 计息（司法保护上限约年利率 12%，超出部分不受保护），到期一次性还本付息。`
      : `按双方约定利率计息（司法保护上限约年利率 12%，超出部分不受保护），到期一次性还本付息。`;
  } else {
    out.interest_clause = `本借款为无息借款。`;
  }
  return out;
}

// 开发期占位符自检：抓空【】或空{}残留，防止模板/字段对不上
const PLACEHOLDER_RE = /【\s*】|\{\s*\}/;
export function findPlaceholders(text) {
  return text.match(PLACEHOLDER_RE) || [];
}

// 生成文书：预处理答案 → 套模板 → 返回 { text, placeholders }
// 占位符残留只在控制台告警（不阻断生成），便于开发期发现模板/字段错位
export function buildDocument(doc, answers) {
  const a = enrich(answers, doc);
  const text = doc.template(a);
  const placeholders = findPlaceholders(text);
  if (placeholders.length) {
    // eslint-disable-next-line no-console
    console.warn("⚠️ 占位符残留:", placeholders);
  }
  return { text, placeholders };
}
