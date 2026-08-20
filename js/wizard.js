// 向导渲染与路由：首页卡片 → 逐题问答 → 生成结果页
// 依赖：templates(DOCS) / validation / document(引擎) / state(状态) / monetization(付费墙)
import { DOCS, DOC_META } from "./templates.js";
import { validateField } from "./validation.js";
import { buildDocument, escapeHtml } from "./document.js";
import { state, resetState, setAnswer, nextStep, prevStep } from "./state.js";
import { Monetization } from "./monetization.js";
import { track } from "./analytics.js";

const homeEl = () => document.getElementById("home");
const wizardEl = () => document.getElementById("wizard");
const resultEl = () => document.getElementById("result");

function curDoc() {
  return DOCS[state.docId];
}

// 属性值转义（防截断 HTML 属性）
function escAttr(s) {
  return escapeHtml(String(s == null ? "" : s)).replace(/"/g, "&quot;");
}

// ---------- group 可重复字段编辑器 ----------
function groupRowHtml(f, row) {
  const inputs = f.itemFields
    .map((it) => {
      const v = (row && row[it.key]) || "";
      let html;
      if (it.type === "select") {
        html = `<select data-k="${it.key}">${it.options
          .map((o) => `<option ${v === o ? "selected" : ""}>${o}</option>`)
          .join("")}</select>`;
      } else {
        const t = it.type === "date" ? "date" : it.type === "number" ? "number" : "text";
        html = `<input data-k="${it.key}" type="${t}" value="${escAttr(v)}" placeholder="${escAttr(it.placeholder || "")}" />`;
      }
      return `<label class="grp-field"><span>${it.label}${it.required ? ' <i class="req">*</i>' : ""}</span>${html}</label>`;
    })
    .join("");
  return `<div class="group-row">${inputs}<button type="button" class="group-del">删除</button></div>`;
}

function renderGroupEditor(f, rows) {
  const rowsHtml = rows.map((r) => groupRowHtml(f, r)).join("");
  return `<div class="group-editor" id="group-rows">${rowsHtml}</div>
    <button type="button" id="group-add" class="btn-ghost group-add">${escAttr(f.addLabel || "＋ 添加一项")}</button>`;
}

// 添加 / 删除行：直接操作 DOM，避免重渲染丢失已填内容
function wireGroup(f) {
  const box = document.getElementById("group-rows");
  const addBtn = document.getElementById("group-add");
  addBtn.addEventListener("click", () => {
    box.insertAdjacentHTML("beforeend", groupRowHtml(f, {}));
  });
  box.addEventListener("click", (e) => {
    const del = e.target.closest(".group-del");
    if (!del) return;
    const rows = box.querySelectorAll(".group-row");
    if (rows.length <= 1) {
      // 至少保留一行，清空其内容
      del.closest(".group-row").querySelectorAll("input,select").forEach((el) => (el.value = ""));
      return;
    }
    del.closest(".group-row").remove();
  });
}

// 收集 + 逐行校验；返回 { ok, value, msg }
function collectGroup(f) {
  const box = document.getElementById("group-rows");
  const rows = Array.from(box.querySelectorAll(".group-row")).map((rowEl) => {
    const item = {};
    rowEl.querySelectorAll("[data-k]").forEach((el) => {
      item[el.dataset.k] = (el.value || "").trim();
    });
    return item;
  });
  // 丢弃完全为空的行
  const cleaned = rows.filter((it) => f.itemFields.some((f2) => it[f2.key]));
  if (f.required && cleaned.length === 0) {
    return { ok: false, value: [], msg: `请至少填写一项${f.label.replace(/（.*$/, "")}` };
  }
  for (const it of cleaned) {
    for (const f2 of f.itemFields) {
      if (f2.required && !it[f2.key]) {
        return { ok: false, value: cleaned, msg: `「${f2.label.replace(/（.*$/, "")}」为必填` };
      }
      if (f2.pattern && it[f2.key] && !f2.pattern.test(it[f2.key])) {
        return { ok: false, value: cleaned, msg: f2.patternMsg || `${f2.label}格式似有误` };
      }
    }
  }
  return { ok: true, value: cleaned, msg: "" };
}

export function renderHome() {
  const cards = Object.values(DOCS)
    .map((d) => {
      const soon = d.soon;
      const meta = soon
        ? '<div class="doc-soon">敬请期待</div>'
        : `<div class="card-meta">${d.fields.length} 个问题 · 约 ${Math.max(1, Math.round(d.fields.length / 3))} 分钟</div>`;
      return `<button class="doc-card ${soon ? "soon" : ""}" data-doc="${d.id}" ${soon ? "disabled" : ""}>
        <div class="doc-name">${d.name}</div>
        <div class="doc-desc">${soon ? "即将上线" : d.desc}</div>
        ${meta}
      </button>`;
    })
    .join("");
  homeEl().innerHTML = `<div class="doc-grid">${cards}</div>`;
  homeEl().querySelectorAll(".doc-card:not(.soon)").forEach((b) => {
    b.addEventListener("click", () => startDoc(b.dataset.doc));
  });
}

export function startDoc(id) {
  track("open_" + id);
  resetState(id);
  homeEl().classList.add("hidden");
  wizardEl().classList.remove("hidden");
  resultEl().classList.add("hidden");
  renderStep();
}

export function renderStep() {
  const doc = curDoc();
  const fields = doc.fields;
  if (state.step >= fields.length) return renderResult();

  const f = fields[state.step];
  const val = state.answers[f.key] || "";
  const isLast = state.step === fields.length - 1;

  let inputHtml = "";
  if (f.type === "group") {
    const rows = Array.isArray(state.answers[f.key]) ? state.answers[f.key] : [];
    inputHtml = renderGroupEditor(f, rows.length ? rows : [{}]);
  } else if (f.type === "select") {
    inputHtml = `<select id="inp">${f.options
      .map((o) => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`)
      .join("")}</select>`;
  } else if (f.type === "date") {
    inputHtml = `<input id="inp" type="date" value="${val}" />`;
  } else if (f.type === "number") {
    inputHtml = `<input id="inp" type="number" inputmode="decimal" value="${val}" placeholder="${f.placeholder || ""}" />`;
  } else {
    inputHtml = `<input id="inp" type="text" value="${val}" placeholder="${f.placeholder || ""}" />`;
  }

  wizardEl().innerHTML = `
    <div class="progress">第 ${state.step + 1} / ${fields.length} 步</div>
    <div class="q-label">${f.label}${f.required ? ' <span class="req">*</span>' : ""}</div>
    ${f.hint ? `<div class="q-hint">${f.hint}</div>` : ""}
    <div class="inp-wrap">${inputHtml}</div>
    <div class="wiz-actions">
      ${state.step > 0 ? '<button id="prev" class="btn-ghost">上一步</button>' : ""}
      <button id="next" class="btn-primary">${isLast ? "生成文书" : "下一步"}</button>
    </div>`;

  const inp = document.getElementById("inp");
  if (inp) inp.focus();

  // group 类型：行内可重复编辑器，先绑定添加 / 删除，再在下一步收集数组
  if (f.type === "group") {
    wireGroup(f);
  }

  document.getElementById("next").addEventListener("click", () => {
    let v, check;
    if (f.type === "group") {
      const res = collectGroup(f);
      if (!res.ok) {
        alert(res.msg);
        return;
      }
      v = res.value;
      check = { ok: true, msg: "" };
    } else {
      v = (inp.value || "").trim();
      check = validateField(f, v);
    }
    if (!check.ok) {
      alert(check.msg);
      return;
    }
    setAnswer(f.key, v);
    nextStep();
    renderStep();
  });
  const prev = document.getElementById("prev");
  if (prev)
    prev.addEventListener("click", () => {
      prevStep();
      renderStep();
    });
}

export function renderResult() {
  const doc = curDoc();
  const { text } = buildDocument(doc, state.answers);
  track("generate");
  const unlocked = Monetization.isUnlocked();
  const brandMark =
    "\n\n——————————\n本文书由「家事文书」生成 · 仅供参考 · 非律师意见\n解锁正式版可导出无水印版本";

  const guideHtml = Object.keys(doc.guide || {})
    .map((k) => {
      const label = (doc.fields.find((f) => f.key === k) || {}).label || k;
      return `<li><b>${label}：</b>${doc.guide[k]}</li>`;
    })
    .join("");
  const riskHtml = (doc.risks || []).map((r) => `<li>${r}</li>`).join("");
  const legalHtml = (doc.legalBasis || [])
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");

  wizardEl().classList.add("hidden");
  resultEl().classList.remove("hidden");
  resultEl().classList.toggle("is-unlocked", unlocked);

  resultEl().innerHTML = `
    <div class="res-head">${doc.name}</div>
    ${doc.badge ? `<div class="res-badge">${doc.badge}</div>` : ""}
    <div class="res-sub">以下内容仅供参考，请核对所有信息后使用</div>
    ${unlocked ? "" : '<div class="preview-badge">预览版 · 输出将带尾注</div>'}
    <pre class="doc-page${unlocked ? "" : " no-copy"}">${escapeHtml(text)}</pre>
    ${unlocked ? "" : `<div class="brand-mark">本文书由「家事文书」生成 · 仅供参考 · 非律师意见\n解锁正式版可导出无水印版本</div>`}
    <div class="disclaimer">${DOC_META.disclaimer}</div>
    ${guideHtml ? `<div class="block-sec"><h4>📝 填写指南</h4><ul class="guide">${guideHtml}</ul></div>` : ""}
    ${riskHtml ? `<div class="block-sec"><h4>⚠️ 易踩雷</h4><ul class="risks">${riskHtml}</ul></div>` : ""}
    ${legalHtml ? `<div class="block-sec legal-box"><h4>📚 法律依据 · 版本 ${doc.version || "—"}</h4><div class="legal-status">审校状态：${escapeHtml(doc.reviewStatus || "未标注")}</div><ul class="legal">${legalHtml}</ul></div>` : ""}
    <div class="res-actions">
      <button id="copy" class="btn-primary">复制全文</button>
      <button id="print" class="btn-ghost">打印 / 存 PDF</button>
      ${unlocked ? "" : '<button id="unlock" class="btn-ghost">🔓 解锁正式版</button>'}
      <button id="restart" class="btn-ghost">再做一份</button>
    </div>`;

  document.getElementById("copy").addEventListener("click", () => handleCopy(text, brandMark));
  document.getElementById("print").addEventListener("click", () => handlePrint(unlocked));
  const ub = document.getElementById("unlock");
  if (ub)
    ub.addEventListener("click", () => Monetization.triggerPaywall(() => renderResult()));
  document.getElementById("restart").addEventListener("click", () => {
    resultEl().classList.add("hidden");
    homeEl().classList.remove("hidden");
    renderHome();
  });
}

// 复制：已解锁 → 干净文本；未解锁 → 带品牌尾注，并弹出付费墙
function handleCopy(text, brandMark) {
  const btn = document.getElementById("copy");
  const unlocked = Monetization.isUnlocked();
  const out = unlocked ? text : text + brandMark;
  navigator.clipboard.writeText(out).then(
    () => {
      if (unlocked) {
        btn.textContent = "已复制 ✓";
      } else {
        btn.textContent = "已复制（含尾注）";
        // 解锁后由全局事件「lawdoc:unlocked」统一重渲染（去尾注 + 解除复制限制）
        Monetization.triggerPaywall();
      }
      setTimeout(() => (btn.textContent = "复制全文"), 1500);
    },
    () => alert("复制失败，请手动长按选择文本复制")
  );
}

// 打印：已解锁 → 直接打；未解锁 → 先弹付费墙，让用户决定后再打
function handlePrint(unlocked) {
  if (unlocked) {
    window.print();
    return;
  }
  Monetization.triggerPaywall(function () {
    window.print();
  });
}

// ---------- 复制保护：免费版禁止手动选中复制正文 ----------
// 仅拦截正文区（.doc-page），填写指南 / 风险提示等参考内容仍可正常复制。
function guardCopy(e) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  let node = sel.anchorNode;
  while (node && node !== document.body) {
    if (node.classList && node.classList.contains("no-copy")) {
      e.preventDefault();
      Monetization.showToast("🔒 请解锁正式版后复制");
      return;
    }
    node = node.parentNode;
  }
}
function guardContext(e) {
  const t = e.target;
  if (t && t.nodeType === 1 && t.closest && t.closest(".doc-page.no-copy")) {
    e.preventDefault();
  }
}
if (typeof window !== "undefined") {
  document.addEventListener("copy", guardCopy);
  document.addEventListener("contextmenu", guardContext);
  // 解锁成功后刷新结果页：去掉水印尾注 + 解除复制限制
  window.addEventListener("lawdoc:unlocked", () => {
    if (!resultEl().classList.contains("hidden")) renderResult();
  });
}
