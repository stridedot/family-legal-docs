// 状态管理 + LocalStorage 持久化（含隐私模式降级）
// 隐私模式下 localStorage 可能抛错或不可用 → 自动降级为内存态，不打断用户填写。

const KEY = "lawdoc_wizard_v1";

// 隐私模式检测：尝试写入再读出，失败即视为降级
let privateMode = false;
function probeStorage() {
  try {
    const t = "__lawdoc_probe__";
    localStorage.setItem(t, "1");
    localStorage.removeItem(t);
    return false;
  } catch (e) {
    return true;
  }
}
privateMode = probeStorage();

// 内存兜底（隐私模式 / 禁用存储时）
let memory = null;

function lsGet() {
  if (privateMode) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return memory;
  }
}
function lsSet(obj) {
  memory = obj;
  if (privateMode) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (e) {
    /* 降级为内存态 */
  }
}
function lsClear() {
  memory = null;
  if (privateMode) return;
  try { localStorage.removeItem(KEY); } catch (e) {}
}

// 向导运行时状态
export const state = { docId: null, step: 0, answers: {} };

export function resetState(docId) {
  state.docId = docId;
  state.step = 0;
  state.answers = {};
  lsSet({ docId, step: 0, answers: {} });
}

export function setAnswer(key, value) {
  state.answers[key] = value;
  lsSet({ docId: state.docId, step: state.step, answers: state.answers });
}

export function getAnswer(key) {
  return state.answers[key] || "";
}

export function nextStep() {
  state.step++;
  lsSet({ docId: state.docId, step: state.step, answers: state.answers });
}

export function prevStep() {
  state.step = Math.max(0, state.step - 1);
  lsSet({ docId: state.docId, step: state.step, answers: state.answers });
}

// 清除本机数据（含解锁态由 monetization.clear 处理）
export function clearAll() {
  state.docId = null;
  state.step = 0;
  state.answers = {};
  lsClear();
}

export function isPrivateMode() {
  return privateMode;
}
