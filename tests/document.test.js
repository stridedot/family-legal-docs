// document 引擎单元测试：占位符无残留 / 动态编号跳空 / 金额大写 / XSS 转义
import { test } from "node:test";
import assert from "node:assert/strict";
import { DOCS } from "../js/templates.js";
import { buildDocument, escapeHtml, enrich } from "../js/document.js";
import { numberedClauses } from "../js/templates.js";

test("遗嘱单行财产（1 项分配 + 默认声明）编号不跳号，无空占位符", () => {
  const will = DOCS.will;
  const text = will.template({
    testator: "孙七", gender: "男", idno: "11010119900307123X",
    allocations: [{ asset: "XX路XX号房产", heir: "张三", relation: "父子" }],
    alt: "",
  });
  assert.ok(!/【\s*】/.test(text), "存在空占位符");
  // 1 项分配 + 2 条默认声明（最终版本 / 真实意思）→ 共 3 条
  const lines = text.split("\n").filter((l) => /^[一二三四五六七八九十]+、/.test(l));
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith("一、"));
  assert.ok(lines[2].startsWith("三、"));
});

test("遗嘱多行财产（2 项分配）分别编号，且支持不同继承人", () => {
  const will = DOCS.will;
  const text = will.template({
    testator: "孙七", gender: "男", idno: "11010119900307123X",
    allocations: [
      { asset: "XX路XX号房产", heir: "张三", relation: "父子" },
      { asset: "车牌沪A·12345车辆", heir: "李四", relation: "父女" },
    ],
    executor: "王五",
    alt: "",
  });
  // 第 1、2 条应为两项分配
  const lines = text.split("\n").filter((l) => /^[一二三四五六七八九十]+、/.test(l));
  assert.ok(lines[0].includes("由【张三】（父子）继承"));
  assert.ok(lines[1].includes("由【李四】（父女）继承"));
  assert.ok(lines.some((l) => l.includes("王五")), "应包含执行人");
});

// 为某文书生成一组“合规样本答案”（必填项均填有效值，对应真实运行路径）
function fillSample(doc) {
  const out = {};
  for (const f of doc.fields) {
    if (f.type === "group") {
      out[f.key] = f.itemFields.map((f2) => sampleForField(f2));
    } else {
      out[f.key] = sampleForField(f);
    }
  }
  return out;
}

function sampleForField(f) {
  if (f.pattern) return "11010119900307123X"; // 合法 18 位身份证
  if (f.type === "select") return f.options[0];
  if (f.type === "date") return "2026-01-01";
  if (f.type === "number") return "1";
  return "示例";
}

test("buildDocument 不残留空占位符（所有文书，给定合规答案）", () => {
  for (const id of Object.keys(DOCS)) {
    const doc = DOCS[id];
    if (doc.soon) continue;
    const { text } = buildDocument(doc, fillSample(doc));
    assert.ok(!/【\s*】|\{\s*\}/.test(text), `${id} 产出空占位符`);
  }
});

test("enrich 生成金额大写", () => {
  const a = enrich({ amount: "50000" }, DOCS.iou);
  assert.equal(a.amount_cn, "伍万圆整");
});

test("escapeHtml 防御 XSS", () => {
  const evil = '<img src=x onerror=alert(1)>';
  assert.equal(escapeHtml(evil), "&lt;img src=x onerror=alert(1)&gt;");
});

test("numberedClauses 过滤空项并顺序编号", () => {
  const out = numberedClauses("甲", "", "乙", null, "丙");
  assert.equal(out, "一、甲\n二、乙\n三、丙");
});

// 回归：每份可生成文书都必须配置 legalBasis + version（防止 v1-02 规划却没落地的“缺失信号”再现）
test("每份可生成文书均有法律依据与版本号", () => {
  for (const id of Object.keys(DOCS)) {
    const doc = DOCS[id];
    if (doc.soon) continue;
    assert.ok(Array.isArray(doc.legalBasis) && doc.legalBasis.length > 0, `${id} 缺 legalBasis`);
    assert.ok(typeof doc.version === "string" && doc.version, `${id} 缺 version`);
    assert.ok(typeof doc.reviewStatus === "string" && doc.reviewStatus, `${id} 缺 reviewStatus`);
  }
});
