# 当前 Mail V3 邮件：补上交互报告附件

如果邮件由 Microsoft Power Apps and Power Automate 发出、底部有订阅/退订链接，通常使用的是 Mail 连接器的“发送电子邮件通知 (V3)”。这个动作支持附件，但它的附件参数不是 Outlook V2 的附件数组，因此不能照搬 V2 的 Select 数组映射。

目前 Jira Monitor 已把报告放在 `email.attachments[0]`，邮件正文显示的文件名不是下载链接，也不会自动变成附件。无需更新脚本、修改收件人或更换当前已成功发信的连接。

## 现有 Mail V3 动作的设置

打开对应工作流 → 邮件为真的分支 → “发送电子邮件通知 (V3)” → 显示全部参数/高级参数。

在有报告附件的分支中填写（以“表达式”输入，不要把表达式当作普通文本）：

| 参数 | 表达式 |
| --- | --- |
| 附件文件名 / Attachment File Name | `first(triggerBody()?['email']?['attachments'])?['name']` |
| 附件 / Attachment | `base64ToBinary(first(triggerBody()?['email']?['attachments'])?['contentBytes'])` |

To、Subject、Body 保持原来的 `email.to`、`email.subject`、`email.bodyHtml` 映射。不要取顶层 `attachments`，那里放的是 Teams 卡片；不要再对 contentBytes 调用 base64()。

为兼容没有勾选“邮件附交互报告”的发送，在 `email.enabled == true` 内加一个条件：

```text
greater(length(coalesce(triggerBody()?['email']?['attachments'], json('[]'))), 0)
```

- 是：运行带上述两个附件参数的 Mail V3 邮件动作。
- 否：运行原有不带附件参数的邮件动作。

两个分支只执行一个，均放在 Teams 卡片循环之外。`email-actions-mail-v3.template.json` 提供这一结构的动作片段；必须绑定你现有的 Mail 连接，不是可直接导入的完整工作流。当前每个项目邮件只附一个交互报告，符合单文件参数结构。

保存工作流后，检查下一次正常推送的邮件动作输入：files 应包含二进制文件内容，filenames 应为 `.html` 报告名。下载附件，用浏览器打开即可点击数字查看明细。

## 为什么没有网页链接

目前报告是自包含 HTML 附件，没有部署在线报告存储。正文里的文件名不是网页地址。如果要改成邮件中直接打开的链接，需要另外配置 SharePoint / 内部文件服务器等受控存储，由工作流保存文件后将实际可访问链接加入邮件；不能使用你电脑的临时路径或虚构链接。

参考：[Microsoft Mail 连接器参数](https://learn.microsoft.com/en-us/connectors/sendmail/#send-an-email-notification-v3)。

## 收到 Monitor Details.txt 怎么改

打开“发送电子邮件通知 (V3)”→ 显示全部参数 → 找到“附件文件名”。删掉固定的 `Monitor Details.txt`，点击 fx，填入：

```text
first(triggerBody()?['email']?['attachments'])?['name']
```

“附件”内容仍使用上表的 base64ToBinary 表达式。保存后新邮件将使用脚本提供的 Jira-Monitor-项目-时间.html 文件名。已有邮件附件不会改变。

## 无预警扫描摘要不带附件

COE 扫描摘要正文已经包含时间、条目数和扫描完成状态，`email.attachments` 是空数组，不需要报告。若 V3 报 `base64ToBinary` 收到 Null，请把现有邮件动作放入“有附件”为真的分支，并在假分支新增一个不带附件参数的 V3 邮件动作。两边 To、Subject、Body 都使用 `email.to`、`email.subject`、`email.bodyHtml`。

条件左侧（fx）：`greater(length(coalesce(triggerBody()?['email']?['attachments'], json('[]'))), 0)`；中间“等于”；右侧（fx）`true`。

假分支的邮件动作不要填写附件及附件文件名，也不要复制原来的附件转换表达式。此修改在 Power Automate 完成，更新油猴脚本不会自动修改工作流。
