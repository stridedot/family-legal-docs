// 反馈入口：右下角悬浮按钮 → 弹窗收集描述 → 打开邮件客户端发到主理人邮箱
// 纯前端 mailto，不上传任何内容；自动附带当前页面/文书类型/浏览器信息，便于定位问题。
const FEEDBACK_EMAIL = "stridedot@outlook.com";

function ensureRoot() {
  let root = document.getElementById("feedback-root");
  if (root) return root;
  root = document.createElement("div");
  root.id = "feedback-root";
  root.innerHTML = `
    <button id="fb-fab" title="反馈问题" aria-label="反馈问题">💬</button>
    <div class="modal-overlay hidden" id="fb-overlay">
      <div class="modal">
        <button class="modal-close" id="fb-close" aria-label="关闭">×</button>
        <div class="pw-title">💬 反馈问题</div>
        <div class="pw-sub">遇到问题？写两句，打开邮件发给我们（打开的是你的邮箱客户端）</div>
        <textarea id="fb-text" class="fb-text" rows="4" placeholder="描述你遇到的情况，如：哪一步、出现了什么……"></textarea>
        <div class="fb-hint" id="fb-hint"></div>
        <button class="pw-verify" id="fb-send">打开邮件发送</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  return root;
}

function contextInfo() {
  const docName =
    (document.querySelector(".res-head") || {}).textContent || "";
  const bits = [
    "页面：首页 / 向导 / 结果".replace("首页", location.pathname.split("/").pop() || "index.html"),
    docName ? "文书类型：" + docName.trim() : "文书类型：未生成",
    "浏览器：" + (navigator.userAgent || "").slice(0, 120),
  ];
  return bits.join("\n");
}

function bindEvents() {
  const fab = document.getElementById("fb-fab");
  const overlay = document.getElementById("fb-overlay");
  const text = document.getElementById("fb-text");
  const hint = document.getElementById("fb-hint");
  const close = document.getElementById("fb-close");
  const send = document.getElementById("fb-send");

  fab.addEventListener("click", () => {
    hint.textContent = "自动附带排查信息：\n" + contextInfo();
    text.value = "";
    overlay.classList.remove("hidden");
    text.focus();
  });
  close.addEventListener("click", () => overlay.classList.add("hidden"));
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "fb-overlay") overlay.classList.add("hidden");
  });
  send.addEventListener("click", () => {
    const subject = encodeURIComponent("【家事文书反馈】" + ((document.querySelector(".res-head") || {}).textContent || "使用问题").trim());
    const body = encodeURIComponent(
      "问题描述：\n" + (text.value.trim() || "（未填写）") +
      "\n\n—— 自动附带的排查信息 ——\n" + contextInfo()
    );
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    overlay.classList.add("hidden");
  });
}

export function initFeedback() {
  ensureRoot();
  bindEvents();
}
