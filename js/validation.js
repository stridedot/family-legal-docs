// 增强型字段校验（Schema 驱动）：required / pattern(regex) / min / max
// 纯函数，无 DOM 依赖，可被浏览器与 node --test 复用。

// 校验单个字段：返回 { ok:boolean, msg:string }
// value 为已 trim 的字符串（number 类型由向导层传字符串，这里按字段定义解释）
export function validateField(field, value) {
  const v = (value == null ? "" : String(value)).trim();

  // 必填
  if (field.required && !v) {
    return { ok: false, msg: "这一项是必填的～" };
  }
  // 非必填且为空 → 跳过后续格式校验
  if (!v) return { ok: true, msg: "" };

  // 正则（如身份证号）
  if (field.pattern && !(field.pattern instanceof RegExp)) {
    field.pattern = new RegExp(field.pattern);
  }
  if (field.pattern && !field.pattern.test(v)) {
    return { ok: false, msg: field.patternMsg || "格式似有误，请核对" };
  }

  // 数值范围（仅 number 类型，或显式给了 min/max）
  if (field.type === "number" || field.min != null || field.max != null) {
    const n = Number(v);
    if (field.type === "number" && !isFinite(n)) {
      return { ok: false, msg: "请填写有效的数字" };
    }
    if (field.min != null && isFinite(n) && n < Number(field.min)) {
      return { ok: false, msg: `不能小于 ${field.min}` };
    }
    if (field.max != null && isFinite(n) && n > Number(field.max)) {
      return { ok: false, msg: `不能大于 ${field.max}` };
    }
  }

  return { ok: true, msg: "" };
}

// 便捷：校验整个答案集，返回第一个不过的 { key, msg } 或 null
export function validateAll(fields, answers) {
  for (const f of fields) {
    const r = validateField(f, answers[f.key]);
    if (!r.ok) return { key: f.key, msg: r.msg };
  }
  return null;
}
