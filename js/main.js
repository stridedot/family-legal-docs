// 入口：初始化视图，绑定全局操作（清除本机数据）
import { renderHome } from "./wizard.js";
import { Monetization } from "./monetization.js";
import { clearAll } from "./state.js";
import { initAnalytics, track } from "./analytics.js";
import { initFeedback } from "./feedback.js";

function init() {
  initAnalytics();
  initFeedback();
  track("view_home");
  renderHome();

  // 隐私：清除本机数据（含解锁状态）。LocalStorage 仅存状态，不存生成的文书 HTML。
  const clearBtn = document.getElementById("clearData");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("清除本机数据（含解锁状态）？此操作不可撤销。")) {
        try { localStorage.clear(); } catch (e) {}
        clearAll();
        if (Monetization) Monetization.clear();
        alert("已清除本机数据，可重新填写。");
        renderHome();
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
