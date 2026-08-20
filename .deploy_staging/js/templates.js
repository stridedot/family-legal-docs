// 家庭法律文书 — 文书配置数据（配置驱动：加一个新文书类型 = 往 DOCS 加一个对象，引擎零改动）
// 模板为函数 (a) => 字符串；a 是预处理后的答案（含 amount_cn 金额大写 / *_cn 日期中文 / interest_clause 利息整句等辅助字段）
// 字段 type: text / number / date / select
// 注意：中文文案内的引号一律用全角“ ” ，避免与 JS 字符串定界符冲突

// ---------- 工具函数（模板函数会用到，也供 document.js / tests 复用） ----------
export function amountToChinese(num) {
  const n = Number(num);
  if (!isFinite(n) || n <= 0) return "（金额有误）";
  const digit = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const unit = ["", "拾", "佰", "仟"];
  const bigUnit = ["", "万", "亿"];
  const s = Math.floor(n).toString();
  let out = "", section = 0, lastZero = false;
  for (let i = 0; i < s.length; i++) {
    const idx = s.length - 1 - i;
    const d = Number(s[i]);
    const pos = idx % 4, sec = Math.floor(idx / 4);
    if (d === 0) {
      lastZero = true;
      if (pos === 0 && sec > section) { out += bigUnit[sec]; section = sec; }
      continue;
    }
    if (lastZero && out && !/万|亿$/.test(out)) out += "零";
    lastZero = false;
    out += digit[d] + unit[pos];
    if (pos === 0) { out += bigUnit[sec]; section = sec; }
  }
  let dec = "";
  const frac = Math.round((n - Math.floor(n)) * 100);
  if (frac > 0) {
    const jiao = Math.floor(frac / 10), fen = frac % 10;
    if (jiao > 0) dec += digit[jiao] + "角";
    if (fen > 0) dec += digit[fen] + "分";
  }
  return out + "圆" + (dec || "整");
}

export function dateToChinese(d) {
  if (!d) return "";
  const p = d.split("-");
  if (p.length !== 3) return d;
  const [y, m, day] = p.map(Number);
  // 日期用阿拉伯数字更清晰规范（金额才用中文大写）
  return `${y}年${m}月${day}日`;
}

// 整数转中文序号（一 ~ 九十九，超过用阿拉伯数字兜底）
function cnNum(n) {
  const d = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n <= 0) return "零";
  if (n <= 10) return ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][n];
  if (n < 20) return "十" + (n === 10 ? "" : d[n - 10]);
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return d[t] + "十" + (o ? d[o] : "");
  }
  return String(n);
}

// 动态条款编号：过滤空项再按 一二三 顺序编号，避免“二”因可选为空而跳号
export function numberedClauses(...items) {
  return items
    .filter((s) => s && String(s).trim())
    .map((s, i) => `${cnNum(i + 1)}、${s}`)
    .join("\n");
}

// ---------- 全局合规免责 ----------
export const DOC_META = {
  disclaimer:
    "⚠️ 本工具生成内容仅供参考，不构成律师意见，也不替代专业法律文件审核。离婚财产分割、子女抚养、遗嘱继承、重大财产事项，建议线下咨询执业律师。本工具不针对个案提供法律意见。",
};

// ---------- 文书库 ----------
export const DOCS = {
  // ============ 1. 借款借据 / 欠条 ============
  iou: {
    id: "iou",
    name: "借款借据 / 欠条",
    desc: "朋友、亲戚间借钱，写清谁借谁、金额、利息、何时还，避免日后扯皮。",
    soon: false,
    version: "1.0.0",
    reviewStatus: "草稿 · 待执业律师审校（收费前请替换为真实审校信息）",
    legalBasis: [
      "《民法典》第667条：借款合同的定义",
      "《民法典》第680条：禁止高利放贷，借款利率不得违反国家有关规定",
      "《民法典》第585条：违约金约定；约定的违约金过分高于造成的损失的，法院 / 仲裁机构可予以调减",
      "《民法典》第188条：向人民法院请求保护民事权利的诉讼时效期间为3年",
    ],
    fields: [
      { key: "lender", label: "出借人（借钱方）姓名", type: "text", required: true, placeholder: "如：张三" },
      { key: "lender_idno", label: "出借人身份证号", type: "text", required: false, placeholder: "选填，增强效力", pattern: /^\d{17}[\dXx]$/, patternMsg: "身份证号格式似有误，请核对（应为18位，末位可为X）" },
      { key: "lender_phone", label: "出借人联系电话", type: "text", required: false, placeholder: "选填" },
      { key: "borrower", label: "借款人（欠钱方）姓名", type: "text", required: true, placeholder: "如：李四" },
      { key: "borrower_idno", label: "借款人身份证号", type: "text", required: false, placeholder: "选填，增强效力", pattern: /^\d{17}[\dXx]$/, patternMsg: "身份证号格式似有误，请核对（应为18位，末位可为X）" },
      { key: "borrower_phone", label: "借款人联系电话", type: "text", required: false, placeholder: "选填" },
      { key: "amount", label: "借款金额（元）", type: "number", required: true, placeholder: "如：50000", min: 0.01 },
      { key: "interest", label: "是否计息", type: "select", required: true, options: ["无息（友情借款）", "按年利率计息"] },
      { key: "rate", label: "年利率（%）", type: "number", required: false, hint: "仅选“计息”时填；司法保护上限约年利率 12%", min: 0, max: 100 },
      { key: "overdue", label: "逾期利率（%，选填）", type: "number", required: false, hint: "不填则无息借款按法定上限参考、计息借款按约定利率", min: 0, max: 100 },
      { key: "purpose", label: "借款用途", type: "text", required: false, placeholder: "选填，如：资金周转（须合法）" },
      { key: "method", label: "交付方式", type: "select", required: true, options: ["银行转账", "微信 / 支付宝", "现金"] },
      { key: "bank", label: "收款账户（选填）", type: "text", required: false, placeholder: "银行转账时填：开户行 + 账号" },
      { key: "start", label: "借款起始日期", type: "date", required: true },
      { key: "repay_date", label: "约定还款日期", type: "date", required: true },
    ],
    template: (a) => {
      const lenderLine = `出借人：【${a.lender}】${a.lender_idno ? `（身份证号：${a.lender_idno}）` : ""}${a.lender_phone ? `，电话：${a.lender_phone}` : ""}`;
      const borrowerLine = `借款人：【${a.borrower}】${a.borrower_idno ? `（身份证号：${a.borrower_idno}）` : ""}${a.borrower_phone ? `，电话：${a.borrower_phone}` : ""}`;
      const bankLine = a.method === "银行转账" && a.bank ? `（开户行 / 账号：${a.bank}）` : "";
      const overdueRate = a.overdue && Number(a.overdue) > 0 ? a.overdue : a.rate || "12（一年期 LPR 四倍参考上限）";
      return `借　条

${borrowerLine}
${lenderLine}

因【${a.purpose || "资金周转"}】之需，今借到出借人【${a.lender}】人民币（大写）${a.amount_cn}（¥${a.amount}）。

一、交付方式：上述借款通过【${a.method}】交付${bankLine}，转账凭证 / 收据为证。
二、借款期限：自【${a.start_cn}】起至【${a.repay_date_cn}】止。
三、利息约定：${a.interest_clause}
四、逾期责任：逾期未还，借款人自愿按年利率 ${overdueRate}% 支付逾期利息，直至本息还清；并承担出借人为维权支出的合理费用（律师费、诉讼费、保全费等）。
五、收款确认：借款人确认已全额收到上述借款，无任何异议。

立据人（借款人签字并按手印）：__________　　日期：______年____月____日
见证人（签字，可选）：__________　　日期：______`;
    },
    guide: {
      borrower: "务必核对借款人真实姓名与身份证，与转账对象一致，防止冒名。",
      borrower_idno: "借款人身份证号建议填全，与转账对象、借条签名一致，增强效力。",
      amount: "金额同时写大小写，大写防篡改；建议通过银行转账并备注“借款”。",
      rate: "利率、违约金、服务费等全部费用合计不能超过一年期 LPR 的 4 倍（约年化 12%），超出部分法院不支持。",
      repay_date: "写明具体起止日期，确定 3 年诉讼时效，不要写“尽快还”等模糊表述。",
      method: "优先选银行转账并留凭证；现金交付建议让对方另写收条，最好有见证人。",
      bank: "银行转账务必写清开户行与账号，作为交付凭证的一部分。",
      start: "借款起始日与还款日共同构成借款期限，二者都写清。",
      interest: "无息借款也建议写明“无息”，避免日后争议是否计息。",
    },
    risks: [
      "保存转账凭证，备注“借款”而非“赠与 / 货款”；大额借款尽量转账，现金借款务必注明并有见证人。",
      "借款用途须合法（避免赌博等），否则借条可能无效。",
      "利率、违约金、服务费等所有费用合计超过一年期 LPR 四倍（约年化 12%）的部分法院不予支持；本模板逾期利率已按此上限提示。",
      "注意诉讼时效（通常自还款到期日起 3 年），到期及时催收并留痕（微信 / 短信 / 律师函均可）。",
      "借条由借款人亲笔签名并按手印、注明日期，最好附借款人身份证复印件。",
    ],
  },

  // ============ 2. 房屋租赁合同 ============
  lease: {
    id: "lease",
    name: "房屋租赁合同",
    desc: "房东 / 租客用来约定租金、押金、期限、维修责任，减少退租扯皮。",
    soon: false,
    version: "1.0.0",
    reviewStatus: "草稿 · 待执业律师审校（收费前请替换为真实审校信息）",
    legalBasis: [
      "《民法典》第703条：租赁合同的定义",
      "《民法典》第705条：租赁期限不得超过20年，超过部分无效",
      "《民法典》第708条：出租人按约定将租赁物交付承租人的义务",
      "《民法典》第716条：承租人经出租人同意方可转租",
    ],
    fields: [
      { key: "landlord", label: "出租方（房东）姓名", type: "text", required: true, placeholder: "如：王五" },
      { key: "landlord_idno", label: "出租方身份证号", type: "text", required: false, placeholder: "选填，增强效力", pattern: /^\d{17}[\dXx]$/, patternMsg: "身份证号格式似有误，请核对（应为18位，末位可为X）" },
      { key: "tenant", label: "承租方（租客）姓名", type: "text", required: true, placeholder: "如：赵六" },
      { key: "tenant_idno", label: "承租方身份证号", type: "text", required: false, placeholder: "选填，增强效力", pattern: /^\d{17}[\dXx]$/, patternMsg: "身份证号格式似有误，请核对（应为18位，末位可为X）" },
      { key: "addr", label: "房屋地址", type: "text", required: true, placeholder: "如：XX市XX区XX路XX号X栋X单元X室" },
      { key: "area", label: "建筑面积（㎡）", type: "number", required: false, placeholder: "选填", min: 0 },
      { key: "rent", label: "月租金（元）", type: "number", required: true, placeholder: "如：3000", min: 0 },
      { key: "deposit", label: "押金（元）", type: "number", required: true, placeholder: "通常 1–2 个月租金", min: 0 },
      { key: "start", label: "起租日期", type: "date", required: true },
      { key: "months", label: "租期（月）", type: "number", required: true, placeholder: "如：12", min: 1, max: 240 },
      { key: "purpose", label: "房屋用途", type: "select", required: true, options: ["居住", "办公", "商用"] },
      { key: "pay", label: "租金支付周期", type: "select", required: true, options: ["押一付一", "押一付三", "半年付", "年付"] },
      { key: "bills", label: "水电燃气等费用由谁承担", type: "select", required: true, options: ["租客承担（自理）", "房东承担", "双方按约定分担"] },
      { key: "transfer", label: "是否允许转租", type: "select", required: true, options: ["不允许转租", "需房东书面同意"] },
    ],
    template: (a) => {
      const end = (() => {
        if (!a.start || !a.months) return "（请按起租日与租期推算）";
        const d = new Date(a.start);
        d.setMonth(d.getMonth() + Number(a.months));
        return d.toISOString().slice(0, 10);
      })();
      const billsText =
        a.bills === "房东承担"
          ? "由甲方（房东）承担"
          : a.bills === "双方按约定分担"
          ? "由双方按约定分担"
          : "由乙方（租客）承担";
      const transferText =
        a.transfer === "需房东书面同意"
          ? "乙方经甲方书面同意方可转租，转租期限不得超过乙方剩余租赁期间。"
          : "未经甲方书面同意，乙方不得转租该房屋。";
      return `房屋租赁合同

出租方（甲方）：【${a.landlord}】${a.landlord_idno ? `（身份证号：${a.landlord_idno}）` : ""}
承租方（乙方）：【${a.tenant}】${a.tenant_idno ? `（身份证号：${a.tenant_idno}）` : ""}

一、房屋情况：甲方将位于【${a.addr}】的房屋（建筑面积 ${a.area ? a.area + " ㎡" : "详见房产证"}）出租给乙方作【${a.purpose}】使用。
二、租赁期限：自【${a.start_cn}】至【${dateToChinese(end)}】，共 ${a.months} 个月。
三、租金与押金：月租金人民币 ¥${a.rent}；支付周期：【${a.pay}】。押金 ¥${a.deposit}，退租时乙方结清租金及各项费用后，甲方应在 7 日内全额退还押金；乙方有欠费或造成房屋、附属设施损坏的，甲方可从押金中抵扣。
四、费用承担：租赁期间该房屋的水、电、燃气、物业等费用，${billsText}。
五、转租：${transferText}
六、维修责任：房屋主体及固有设施自然损坏由甲方负责维修；乙方使用不当造成的损坏由乙方承担。
七、提前退租：租赁期内乙方提前退租，应提前 30 日书面通知甲方，押金按约定处理（建议约定不予退还或按比例扣减）。
八、居住安全：甲方未经乙方同意，不得擅自进入该房屋；确有必要进入的，应提前与乙方约定时间。
九、违约责任：租赁期内甲方提前收回房屋或乙方提前退租，违约方应向守约方支付 1 个月租金作为违约金；违约金不足以弥补实际损失的，守约方有权要求赔偿差额。任何一方有其他违约行为的，应承担继续履行、采取补救措施或赔偿损失等违约责任。
十、合同解除：双方协商一致或发生法定事由时可解除本合同；因一方违约导致解除的，违约方承担相应责任。
十一、争议解决：因本合同发生争议，双方应协商解决；协商不成的，任何一方均可向该房屋所在地人民法院提起诉讼。

甲方签字：__________　　乙方签字：__________　　签订日期：______年____月____日`;
    },
    guide: {
      landlord_idno: "房东身份证号与权属证明一致，防止二房东 / 假房东冒名。",
      tenant_idno: "租客身份证号务必与本人一致，与留存复印件对应。",
      addr: "地址写清到门牌，与房产证一致，避免“描述性地址”日后争议。",
      deposit: "押金建议不超过 2 个月租金；明确退押条件与时限（如退租后 3 日内）。",
      months: "租期写整数月；到期续租应另行签补充协议或续租条款。",
      pay: "明确“押一付三”等含义，避免“季付”理解分歧。",
      purpose: "居住与商用税率 / 监管要求不同，如实填写。",
      bills: "水电气物业谁承担要写死，退租结算是扯皮高发点，建议写“租客承担”。",
      transfer: "转租须经房东书面同意；擅自转租房东可解除合同。",
    },
    risks: [
      "签约前核实房东房产证与身份，防止二房东 / 假房东。",
      "入住时拍照 / 录像留存房屋现状（家具、墙面、水电表底数），作为退押依据。",
      "口头约定一律写进合同；微信里的补充约定也可截图作为附件。",
      "确认房屋未设居住权、未被查封抵押，避免影响正常居住。",
    ],
  },

  // ============ 3. 自书遗嘱 ============
  will: {
    id: "will",
    name: "自书遗嘱",
    desc: "中老年人立一份意思表示清楚、格式合规的遗嘱，减少继承纠纷。",
    soon: false,
    version: "1.0.0",
    reviewStatus: "草稿 · 待执业律师审校（收费前请替换为真实审校信息）",
    legalBasis: [
      "《民法典》第1134条：自书遗嘱由遗嘱人亲笔书写、签名、注明年 / 月 / 日",
      "《民法典》第1141条：应为缺乏劳动能力又没有生活来源的继承人保留必要遗产份额（必留份）",
      "《民法典》第1153条：夫妻共同财产应先析产，仅被继承人个人份额可经遗嘱处分",
      "《民法典》第1142条：遗嘱人可以撤回、变更遗嘱；立有数份遗嘱的，以最后的遗嘱为准",
    ],
    fields: [
      { key: "testator", label: "立遗嘱人姓名", type: "text", required: true, placeholder: "如：孙七" },
      { key: "gender", label: "性别", type: "select", required: true, options: ["男", "女"] },
      { key: "idno", label: "立遗嘱人身份证号", type: "text", required: true, placeholder: "18位，必填", pattern: /^\d{17}[\dXx]$/, patternMsg: "身份证号格式似有误，请核对（应为18位，末位可为X）" },
      { key: "residence", label: "立遗嘱人住址", type: "text", required: false, placeholder: "选填" },
      {
        key: "allocations",
        label: "财产分配（可添加多行：每项填一类财产 + 对应继承人）",
        type: "group",
        required: true,
        addLabel: "＋ 添加一项财产分配",
        itemFields: [
          { key: "asset", label: "财产描述（房产写地址+产权证号 / 存款写银行+账号 / 车辆写车牌）", type: "text", required: true, placeholder: "如：XX路XX号房产（不动产权证号：…）" },
          { key: "heir", label: "继承人姓名", type: "text", required: true, placeholder: "如：儿子张三" },
          { key: "relation", label: "与继承人关系", type: "text", required: true, placeholder: "如：父子" },
        ],
      },
      { key: "executor", label: "遗嘱执行人（选填）", type: "text", required: false, placeholder: "选填，如：李四（身份证号：…）" },
      { key: "alt", label: "其他安排 / 备注（选填）", type: "text", required: false, placeholder: "选填，如：此前所有遗嘱以此份为准" },
    ],
    badge: "含形式要件提示",
    template: (a) => {
      const allocs = Array.isArray(a.allocations) ? a.allocations : [];
      const items = allocs.map((it) => `将【${it.asset}】由【${it.heir}】（${it.relation}）继承。`);
      const decls = [];
      if (a.alt && String(a.alt).trim()) decls.push(`其他安排：【${a.alt}】。`);
      decls.push(`本遗嘱为本人最终有效版本，此前所立遗嘱、口头或书面承诺均以此份为准。`);
      if (a.executor && String(a.executor).trim())
        decls.push(`指定【${a.executor}】为本遗嘱执行人，负责按本遗嘱执行财产分配。`);
      decls.push(`本遗嘱内容系本人真实意思表示，未受任何人胁迫、欺骗；全文由本人亲笔书写、签名并注明完整年 / 月 / 日。`);
      const body = numberedClauses(...items, ...decls);
      return `立遗嘱人：【${a.testator}】，性别${a.gender || "　"}，身份证号：【${a.idno}】${a.residence ? `，住址：【${a.residence}】` : ""}。

本人神志清楚、自愿立此遗嘱，对名下个人合法财产作如下安排：
${body}

立遗嘱人（亲笔签名）：__________
日　期：______年____月____日

（注：自书遗嘱须全文亲笔书写、签名、注明完整年 / 月 / 日，缺一不可。）`;
    },
    guide: {
      testator: "立遗嘱人须有完全民事行为能力，神志清楚。",
      idno: "身份证号务必准确，与财产权属证明一致。",
      allocations: "每项写清一类财产与对应继承人：房产写地址+产权证号，存款写银行+账号，车辆写车牌；可添加多行，分别指定不同继承人。夫妻共同财产须先析产，只处分本人份额。",
      executor: "执行人负责按遗嘱分配财产，建议填可信亲属并注明身份证号。",
    },
    risks: [
      "自书遗嘱须由遗嘱人亲笔书写全文、签名、注明年 / 月 / 日，缺一不可，否则可能无效。",
      "涉及房产等重大财产，强烈建议办理公证遗嘱或到不动产登记机构咨询，效力更稳。",
      "若此前立有遗嘱，新遗嘱应明确“此前遗嘱以本份为准”，避免多份冲突。",
      "本草稿不能替代专业遗嘱规划，复杂家庭（再婚 / 多子女 / 境外资产）务必咨询律师。",
      "必留份：若您有缺乏劳动能力又无生活来源的继承人（如未成年子女、残疾或无收入亲属），须为其保留必要遗产份额，否则对应部分遗嘱可能无效（《民法典》第1141条）。",
      "夫妻共同财产：遗嘱只能处分您的个人份额；若财产为夫妻共有，须先析产，直接处分配偶部分无效（《民法典》第1153条）。",
    ],
  },

  // ============ 即将上线 ============
  divorce: {
    id: "divorce",
    name: "离婚协议书",
    desc: "协议离婚的夫妻，写清财产分割、子女抚养、债务承担。条款复杂，正在打磨。",
    soon: true,
  },
};

// 兼容：浏览器里也挂到 window，方便临时在控制台调试
if (typeof window !== "undefined") {
  window.DOCS = DOCS;
  window.DOC_META = DOC_META;
}
