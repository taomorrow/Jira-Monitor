# 邮件通知配置

本指南适用于 Jira Monitor v5.4.0 或更高版本。邮件通过现有 Teams Webhook 所指向的 Power Automate 工作流发送，不需要把邮箱密码放进油猴脚本。

## 脚本设置

1. 油猴菜单 → Jira Monitor → 配置中心。
2. 在对应项目行填写多个邮箱：每行一个，或使用分号、逗号分隔。重复地址忽略大小写去重。邮箱留空则该项目不提交邮件。
3. 点击保存，看到“已保存并验证”。配置保存在当前脚本油猴存储中，升级保留；卸载或清除存储不保留。各项目独立保存。
4. 同一项目行必须配置 Webhook，每个项目的工作流都需要配置邮件步骤。当前【发送 Teams】按钮会同时向工作流提交 Teams 卡片和邮件内容；邮件设置不自动改变工作流中的 Teams 发送步骤。

保存本身不会发信。所有配置地址均作为 To 收件人发送，因此相互可见。批量扫描按项目汇总，一项目一封预警列表邮件；自动通知在整轮扫描完成后发送，沿用通知开关、筛选和24小时去重。详情浮窗仍可单独发送当前工单。更改收件人会被视为不同通知目标，使用独立冷却；手动通知不受冷却限制。邮件跟随该项目的批量自动通知开关。详情不自动发送。

## Power Automate 一次性设置

打开当前 Webhook 对应的工作流，在 Teams 原有逻辑外新增一个条件，避免放在附件 For each 中导致重复发信，也避免依赖 Teams 卡片动作成功：

```text
equals(triggerBody()?['email']?['enabled'], true)
```

条件为真时，新增 Office 365 Outlook → Send an email (V2) / 发送电子邮件(V2)，使用你的账号连接。字段填入表达式：

| 字段 | 表达式 |
|---|---|
| To / 收件人 | `triggerBody()?['email']?['to']` |
| Subject / 主题 | `triggerBody()?['email']?['subject']` |
| Body / 正文（HTML） | `triggerBody()?['email']?['bodyHtml']` |

编辑正文时将表达式作为整个 HTML 正文插入，避免在普通文本中直接显示 HTML 源码。多个收件人已由脚本转换为分号分隔。若触发器使用显式 JSON Schema 校验，请将 email 对象加入允许字段；不要只取 attachments，否则会丢失邮件字段。

[微软 Office 365 Outlook 连接器文档](https://learn.microsoft.com/en-us/connectors/office365/)

## 请求字段

```json
{
  "email": {
    "enabled": true,
    "recipients": ["first@example.com", "second@example.com"],
    "to": "first@example.com;second@example.com",
    "subject": "[Jira Monitor] TEST-1 · DEV 即将超期",
    "bodyText": "纯文本邮件内容",
    "bodyHtml": "<div>HTML邮件内容</div>"
  }
}
```

停用时仅提交 `email: {enabled: false}`，不提交收件人。标题、负责人等 Jira 内容经过 HTML 转义。邮件步骤配置后先手动通知一条，检查工作流运行记录和收件箱。Webhook 2xx 只表示请求已接收，不代表邮件成功送达。脚本测试验证了多收件人保存及请求字段，尚未在用户工作流中验证实际邮件投递。

## v6.1.0 卡片格式

超时预警和 Sprint Analysis 的 `email.bodyHtml` 都是带内联样式的 HTML 卡片，含标题、统计表格、Jira 按钮；Sprint 含合计行和正增量标红。邮件动作正文请绑定 `email.bodyHtml` 并作为 HTML 渲染。`email.bodyText` 仅作纯文本备用。无需改变收件人、主题或 Webhook 配置；若原流程已经绑定 bodyHtml，更新脚本即可。

## v6.4.0 独立交互报告附件

Sprint 分析完成后可直接“导出交互报告”。推送时默认勾选“邮件附交互报告（含 Jira 明细）”，脚本会为每个项目单独生成报告，并在 `email.attachments` 中附加：

```json
{
  "name": "Jira-Monitor-CSP-时间.html",
  "contentType": "text/html",
  "contentBytes": "UTF-8 HTML 的 Base64 字符串"
}
```

原工作流不会自动发送新增字段，需配置一次。进入 `email.enabled` 为真的邮件分支，在发送邮件动作前添加 **数据操作 → 选择（Select）**，将其重命名为 `ReportAttachments`：

- From 表达式：`coalesce(triggerBody()?['email']?['attachments'], json('[]'))`
- 映射键 `Name`，值表达式：`item()?['name']`
- 映射键 `ContentBytes`，值表达式：`item()?['contentBytes']`

在 **发送电子邮件 (V2)** 的附件参数中切换为输入整个数组，使用表达式 `body('ReportAttachments')`。正文仍绑定 `email.bodyHtml`；收件人与主题沿用已有配置。不要把整个发送邮件动作放到逐附件循环里，避免重复发送邮件。如果触发器使用显式 JSON Schema，需允许 `email.attachments` 数组及上述字段。

附件名称和内容分别对应 Outlook 连接器的 `Name`、`ContentBytes`，参见 [微软 Office 365 Outlook 连接器文档](https://learn.microsoft.com/en-us/connectors/office365/)。

收件人下载 HTML 附件后使用浏览器打开，点击数字就能在页面下方显示工单明细。不需要访问 Jira 就能阅读快照；点击工单链接仍需要对应的 Jira 权限。邮件附件预览不会执行报告脚本。实际邮件投递及企业附件策略需在你的工作流中验证，脚本不会自行上传报告到公共站点。

## v6.5.0 超时列表汇总

批量超时预警现在使用 `reportType: "timeout-summary"`，每个项目只提交一份消息。`email.bodyHtml` 是完整预警列表的表格；`items` 包含每条工单的摘要、负责人和命中规则。既有流程若直接读取 attachments 发 Teams、读取 email 发邮件，可沿用。若触发器使用严格的 Schema，需允许 `reportType`、`items`，不应再强制要求单工单 `jiraKey` / `rules` 字段。

发送邮件动作应放在项目汇总这次请求的邮件分支内，对一次请求执行一次；不要再放入逐工单 items 循环。收件人与正文表达式保持不变。自动扫描完成后才发汇总；手动可发送当前已扫描部分的预警结果。Teams 因容量限制显示部分记录时，邮件仍包含完整项目列表。

## v6.6.0：项目启用开关与 Epic

项目行“启用通知”控制 COE、Sprint、Epic 所有手动/自动通知，关闭后只分析不发送。多项目可同时启用，按各项目 Webhook / 收件人分别提交。旧配置未包含 enabled 字段时按启用处理。

Epic 使用 `reportType: "epic-analysis"`，邮件仍读取 `email.enabled`、`email.to`、`email.subject`、`email.bodyHtml` 和可选 `email.attachments`。与 Sprint 一样，一项目一封邮件；如有 reportType 分支，需允许 Epic，勿在 Story / 卡片附件循环里发信。

## v6.7.0：DEV 负责人

DEV 预警正文和 Teams 提及使用去重后的子任务负责人，DCT 仍使用父工单负责人。邮件收件人继续使用项目配置，不自动追加子任务负责人邮箱。列表载荷 `items[].devAssignees` 包含负责人姓名、账号及 Jira 返回的邮箱；未提供邮箱且未配置 Teams 映射时只显示姓名。旧扫描结果需重新扫描。Epic 的两侧零数量行在邮件及附件中一并隐藏。
