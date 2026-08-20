# family-legal-docs（家事文书）

对话式家庭法律文书生成器：回答几个问题 → 生成填好关键信息的协议 + 填写指南 + 易踩雷提示。

纯前端、零构建、零后端、无外部 CDN 依赖。数据只存在用户本机（LocalStorage），不上传。

## 支持文书

| 文书 | 说明 | 状态 |
|---|---|---|
| 借款借据 / 欠条 | 金额大写、计息、违约金、还款期 | ✅ |
| 房屋租赁合同 | 租金/押金/期限/维修/费用承担/转租 | ✅ |
| 自书遗嘱 | 形式要件提示 + 法律依据 | ✅ |
| 离婚协议书 | 条款复杂，打磨中 | 🚧 即将上线 |

## 商业化

- 免费：完整问答 + 生成草稿 + 指南 + 风险提示（复制/打印带尾注水印）
- 付费 ¥19.9/份、¥39 包3类：无水印导出
- 支付：爱发电（Afdian）跳转 + 解锁码回填（前端软门槛）
- 配置在 `js/monetization.js` 的 `PAYMENT_CONFIG`

## 隐私

- 纯本地：所有填写内容只存在用户浏览器 LocalStorage，不发送到任何服务器
- 详见 `privacy.html`

## 统计

- 默认接入 GoatCounter（`js/analytics.js`，未配置码则不加载）
- Vercel Web Analytics：`/_vercel/insights/script.js`（需在 Vercel 项目设置开启）

## 反馈

页面右下角悬浮按钮，用户问题通过 `mailto:stridedot@outlook.com` 直接发给主理人。

## 本地开发 / 测试

```bash
npm test        # node --test 单元测试（校验/模板引擎/XSS）
```

## 部署

- 静态托管，部署任意静态站（Vercel / GitHub Pages / CloudStudio）
- `vercel.json` 已声明 `framework: "static"`
- 注意：`package.json` 会让 CloudStudio 误判为 Node 容器，CloudStudio 部署时需剔除它

## 目录结构

```
family-legal-docs/
├── index.html / privacy.html / style.css
├── js/
│   ├── main.js        # 入口
│   ├── wizard.js      # 向导渲染与路由
│   ├── templates.js   # 文书配置（加文书=加对象）
│   ├── document.js    # 模板引擎 + XSS 转义
│   ├── validation.js  # 字段校验
│   ├── state.js       # 状态 + LocalStorage
│   ├── monetization.js# 付费墙 + 解锁码
│   ├── analytics.js   # GoatCounter 漏斗
│   └── feedback.js    # 反馈入口
└── tests/             # node --test
```
