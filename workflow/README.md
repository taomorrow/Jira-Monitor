# 邮件分支修复与交互报告

**若当前发件人为 Microsoft Power Apps and Power Automate，使用 Mail“发送电子邮件通知 (V3)”，请优先看 [Mail V3 附件设置](MAIL-V3-ATTACHMENT.md)。下面的 Select 数组映射适用于 Office 365 Outlook V2，不适用于 Mail V3 的单文件参数。**

这是可审查的动作片段，不是可直接导入或已部署的完整工作流。需要在你现有的 Power Automate 工作流中配置；脚本更新不会自动创建邮件动作或修复 Outlook 账号连接。

1. 打开收到 Teams 消息的那一个 Webhook 工作流，检查同次运行的邮件动作。不要重发整个流程，以免 Teams 重复推送。
2. 邮件分支放在触发器之后，与 Teams 分支平行，位于任何工单或 Teams attachments 循环之外。不要限制为某个 reportType；COE、Sprint、Epic 都检查 `email.enabled`。
3. 条件：`equals(triggerBody()?['email']?['enabled'], true)`。
4. 条件为真时添加 Select，名称 `ReportAttachments`：From 为 `coalesce(triggerBody()?['email']?['attachments'], json('[]'))`，映射 `Name` → `item()?['name']`、`ContentBytes` → `item()?['contentBytes']`。
5. 添加 Office 365 Outlook“发送电子邮件 (V2)”并绑定有效 Outlook 连接：To → `triggerBody()?['email']?['to']`；Subject → `triggerBody()?['email']?['subject']`；Body HTML → `triggerBody()?['email']?['bodyHtml']`；Attachments 整个数组 → `body('ReportAttachments')`。不要用顶层 `attachments` 当邮件附件，它是 Teams 卡片。
6. 如果使用显式触发器 schema，合并 `trigger-schema.json` 的字段定义，不要要求单工单专属的 jiraKey/rules。不要直接覆盖已有其他调用方需要的 schema。
7. `email-actions.template.json` 给出相同动作结构，`OUTLOOK_CONNECTION_REFERENCE` 必须替换为你自己的有效连接引用。它不包含 Teams 动作或连接凭据。

若邮件步骤失败，按运行记录修复连接或参数；若显示成功但未收到，核对 To、发件箱、垃圾邮件和组织邮件追踪。是否实际投递以工作流和邮件系统为准。

交互报告是 HTML 附件：下载后用浏览器打开，点击数量筛选 Jira；邮件正文自身不运行 JavaScript。附件必须经过上面的字段映射，不能仅更新脚本。

参考：[Office 365 Outlook 连接器](https://learn.microsoft.com/en-us/connectors/office365connector/)、[排查连接失败](https://learn.microsoft.com/en-us/power-automate/fix-connection-failures)。

## Epic 超限时仅发送邮件

邮件分支直接从触发器运行，与 Teams 分支平行。Teams 发送动作或整个卡片循环外增加条件：

```text
not(equals(triggerBody()?['teams']?['enabled'], false))
```

仅条件为真时执行 Teams；条件为假跳过 Teams。超限载荷含 `teams.enabled=false`、`deliveryMode=email-only` 和空的顶层 `attachments`，但 `email` 正文及附件完整保留。不要把邮件放在卡片循环内或依赖 Teams 成功，否则空卡片数组会导致邮件也被跳过。
