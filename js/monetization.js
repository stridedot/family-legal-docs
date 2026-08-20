// 家事文书 v1 — 商业化模块（Paywall + Entitlement）
// v1 纯前端：跳转第三方支付（爱发电 Afdian）+ 解锁码回填。无后端，前端软门槛。
// 安全说明：v1 解锁码写在 JS 里，技术用户 F12 可绕过——这是产品策略允许的“软门槛”，
// 目标用户是怕踩雷的普通人，不是要防黑客。真防盗版等月收入过千再上后端 Webhook。

import { track } from "./analytics.js";

const STORAGE_KEY = "lawdoc_entitlement_v1";

// ============ 配置区：你（主理人）填这里 ============
const PAYMENT_CONFIG = {
  provider: "afdian", // 或 "mianbaoduo"
  // TODO: 把你在爱发电上架商品后拿到的购买链接粘进来（替换下面占位）
  links: {
    single: "https://afdian.com/item/REPLACE_WITH_SINGLE", // ¥19.9 单份解锁码
    bundle: "https://afdian.com/item/REPLACE_WITH_BUNDLE", // ¥39 包3类
  },
  // 爱发电“自动发货 - 固定码”里设置的码，要和这里完全一致（大小写不敏感）
  codes: {
    single: "LAWDOC-VIP-2026",
    bundle: "LAWDOC-BUNDLE-2026",
  },
  prices: { single: "¥19.9", bundle: "¥39（包3类）" },
  // 软门槛容错：是否允许“任意长数字订单号”直接解锁。
  // 默认 false（开启 = 任何人白嫖，仅在你明确想做“心理学门槛”时才设 true）。
  ALLOW_ORDERID_FALLBACK: false,
};

// ============ Entitlement 持久化 ============
function defaultEntitlement() {
  return { type: "free", provider: null, orderId: null, expiresAt: null };
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultEntitlement();
    const e = JSON.parse(raw);
    if (!e || !e.type) return defaultEntitlement();
    return e;
  } catch (e) {
    return defaultEntitlement();
  }
}
function save(e) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); } catch (e) {}
}
let entitlement = load();
// 用闭包 pending 替代 window.__onUnlock，避免多操作并发时互相覆盖
let pendingUnlock = null;
function firePending() {
  const cb = pendingUnlock; pendingUnlock = null;
  if (typeof cb === "function") {
    try { cb(); } catch (e) { /* swallow */ }
  }
}

function isUnlocked() { return !!entitlement && entitlement.type !== "free"; }
function isBundle() { return !!entitlement && entitlement.type === "bundle"; }

// ============ 解锁码校验 ============
function validateCode(input) {
  const code = (input || "").trim().toUpperCase();
  if (!code) return null;
  if (code === String(PAYMENT_CONFIG.codes.single).toUpperCase())
    return { ok: true, type: "single" };
  if (code === String(PAYMENT_CONFIG.codes.bundle).toUpperCase())
    return { ok: true, type: "bundle" };
  if (PAYMENT_CONFIG.ALLOW_ORDERID_FALLBACK && /^\d{10,}$/.test(code)) {
    // 仅作心理学门槛：把长订单号当单份处理（不推荐开启）
    return { ok: true, type: "single" };
  }
  return null;
}

// ============ Toast ============
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(function () { t.classList.remove("show"); }, 2400);
}

// ============ Paywall 弹窗 ============
function ensureModal() {
  let root = document.getElementById("paywall-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "paywall-root";
    document.body.appendChild(root);
  }
  if (document.getElementById("paywall-modal")) return;
  root.innerHTML = `
    <div class="modal-overlay hidden" id="paywall-overlay">
      <div class="modal" id="paywall-modal">
        <button class="modal-close" id="pw-close" aria-label="关闭">×</button>
        <div class="pw-title">🔓 解锁正式版</div>
        <div class="pw-sub">免费版已能生成 + 看指南；解锁后导出无水印版本</div>
        <ul class="pw-list">
          <li class="no">免费：文书带品牌尾注 / 打印带水印</li>
          <li class="ok">无水印复制 · 无水印打印 / 存 PDF</li>
          <li class="ok">单份按类；包3类可解锁全部文书</li>
        </ul>
        <div class="buy-row">
          <button class="buy-btn buy-single" id="pw-buy-single">单份 ${PAYMENT_CONFIG.prices.single}</button>
          <button class="buy-btn buy-bundle" id="pw-buy-bundle">包3类 ${PAYMENT_CONFIG.prices.bundle}</button>
        </div>
        <div class="pw-divider">— 已在爱发电付款？粘贴解锁码 —</div>
        <input class="pw-input" id="pw-input" placeholder="如：LAWDOC-VIP-2026" autocomplete="off" />
        <button class="pw-verify" id="pw-verify">验证并解锁</button>
      </div>
    </div>`;

  document.getElementById("pw-close").addEventListener("click", hideModal);
  document.getElementById("paywall-overlay").addEventListener("click", function (e) {
    if (e.target.id === "paywall-overlay") hideModal();
  });
  document.getElementById("pw-buy-single").addEventListener("click", function () {
    window.open(PAYMENT_CONFIG.links.single, "_blank", "noopener");
  });
  document.getElementById("pw-buy-bundle").addEventListener("click", function () {
    window.open(PAYMENT_CONFIG.links.bundle, "_blank", "noopener");
  });
  document.getElementById("pw-verify").addEventListener("click", function () {
    const input = document.getElementById("pw-input").value;
    const res = validateCode(input);
    if (res && res.ok) {
      entitlement = {
        type: res.type,
        provider: PAYMENT_CONFIG.provider,
        orderId: (input || "").trim(),
        expiresAt: null,
      };
      save(entitlement);
      hideModal();
      showToast("🎉 解锁成功！已为你去除水印");
      track("unlock");
      // 先通知 UI 刷新（去掉水印 / 解除复制限制），再执行排队的回调（如打印），
      // 这样打印拿到的是去水印后的 DOM
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("lawdoc:unlocked"));
      }
      firePending();  // 解锁成功 → 执行先前未触发的操作（如打印）
    } else {
      showToast("❌ 解锁码无效，请检查是否复制完整");
    }
  });
  // 支持回车提交
  document.getElementById("pw-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("pw-verify").click();
  });
}

function showModal() {
  ensureModal();
  const ov = document.getElementById("paywall-overlay");
  if (ov) ov.classList.remove("hidden");
}
  function hideModal() {
    const ov = document.getElementById("paywall-overlay");
    if (ov) ov.classList.add("hidden");
    // 用户点 × 或点遮罩关闭 = 放弃操作：取消排队的打印/复制回调，不执行
    // （仅“验证成功”才会 firePending 执行回调，见 pw-verify 处理器）
    pendingUnlock = null;
  }

// 触发付费墙：已解锁直接执行 cb；未解锁弹窗，解锁成功或被拒后再执行 cb
function triggerPaywall(onUnlock) {
  if (isUnlocked()) {
    if (onUnlock) onUnlock();
    return;
  }
  pendingUnlock = onUnlock || function () {};
  track("paywall_show");
  showModal();
}

// ============ 对外暴露 ============
export const Monetization = {
  config: PAYMENT_CONFIG,
  isUnlocked: isUnlocked,
  isBundle: isBundle,
  validateCode: validateCode,
  triggerPaywall: triggerPaywall,
  showModal: showModal,
  hideModal: hideModal,
  showToast: showToast,
  clear: function () {
    entitlement = defaultEntitlement();
    save(entitlement);
  },
};

if (typeof window !== "undefined") {
  window.Monetization = Monetization;
}
