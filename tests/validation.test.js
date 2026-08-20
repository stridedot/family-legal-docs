// validation 单元测试：必填 / 正则 / 数值范围
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateField, validateAll } from "../js/validation.js";

test("必填项为空 → 不通过", () => {
  const f = { key: "name", label: "姓名", type: "text", required: true };
  assert.equal(validateField(f, "").ok, false);
  assert.equal(validateField(f, "   ").ok, false);
});

test("非必填为空 → 通过（跳过格式校验）", () => {
  const f = { key: "idno", label: "身份证", type: "text", required: false, pattern: /^\d{17}[\dXx]$/ };
  assert.equal(validateField(f, "").ok, true);
});

test("身份证正则：111 不通过，合法 18 位通过", () => {
  const f = { key: "idno", label: "身份证", type: "text", required: true, pattern: /^\d{17}[\dXx]$/, patternMsg: "格式错" };
  assert.equal(validateField(f, "111").ok, false);
  assert.equal(validateField(f, "11010119900307123X").ok, true);
});

test("数值 min/max：利率 0–100", () => {
  const f = { key: "rate", label: "利率", type: "number", min: 0, max: 100 };
  assert.equal(validateField(f, "6").ok, true);
  assert.equal(validateField(f, "-1").ok, false);
  assert.equal(validateField(f, "200").ok, false);
  assert.equal(validateField(f, "abc").ok, false);
});

test("validateAll 返回第一个不过的字段", () => {
  const fields = [
    { key: "a", label: "A", type: "text", required: true },
    { key: "b", label: "B", type: "text", required: true, pattern: /^\d+$/ },
  ];
  assert.deepEqual(validateAll(fields, { a: "x", b: "12" }), null);
  const bad = validateAll(fields, { a: "x", b: "yy" });
  assert.equal(bad.key, "b");
});
