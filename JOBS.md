# Mac 每天自动运行 Jira Monitor

## 先在配置中心设置

1. 更新到 v6.9.0，刷新 Jira，点击蓝色星号 → 配置中心 → 定时 Job。
2. 页面已预填 `https://jira.xpaas.lenovo.com/issues/?filter=180929`。
3. 时间填写 `09:00,21:00`，表示早上 9 点、晚上 9 点。可继续用逗号添加时间。
4. 选择“每天”或“周一至周五”，勾选需要的 COE、Sprint、Epic（可多选）。选择昨天/今天或上周/本周。
5. 需要通知时勾选 Teams / 邮件，并按需勾选交互报告。推送项目留空表示使用当前结果中全部已启用项目；也可填写 `CSP/OSPIT`。Webhook 和邮件列表仍在原项目配置中维护。
6. 勾选“启用 Job”，点击“保存 Job 配置”。可新增其他 Job，各有自己的页面、时间和功能。

分析范围：当前查询全部分页；Sprint / Epic 默认所有分组、所有状态。Epic 只使用查询中的 Story。多个功能依次执行，任一功能失败则停止这个 Job 后续功能，不自动重试。无数据时不发送空报告。

“立即运行”会打开保存的查询并立即分析，若已勾选通知也会发送。测试前可先关闭 Teams / 邮件开关并保存。

## 安装 Mac 定时启动器（首次一次）

1. 在 Job 下方选择安装了 Tampermonkey 和 Jira Monitor 的浏览器：Google Chrome 或 Microsoft Edge。
2. 点击“导出 Mac 定时启动器”。
3. 打开 Mac“终端”，输入 `bash`，再输入一个空格。
4. 将下载的 `Jira-Monitor-安装定时任务.command` 拖入终端，按回车。
5. 看到“Jira Monitor 定时任务已安装”即完成。无需输入管理员密码。

启动器只包含 Job 编号、查询地址和时间，不含 Webhook 或收件人。它安装到 `~/Library/LaunchAgents`，只替换本功能生成的 `com.taomorrow.jira-monitor.job.*.plist`。**修改时间、页面、执行日期、增删或启停 Job 后，重新导出并运行一次安装器。** 菜单、日周维度及通知设置在脚本中读取，保存后生效。

Mac 时间以系统当前时区为准。需保持电脑开机、用户登录、电脑唤醒、公司网络/VPN可用，浏览器中的 Jira 登录有效。不会自动登录、唤醒 Mac 或补发错过的任务。Mac 睡眠后补触发的启动，只有处于计划时间之后 10 分钟内才执行；超过窗口不会执行。

## 防重复和执行记录

启动器打开带 Job 标记的页面，脚本核对保存的查询和 Job 启用状态。普通打开 Jira 页面不会自动执行 Job。

使用浏览器同站点锁串行执行不同 Job，保存每个 Job 最后执行时间点，重复打开同一时间点的页面不会重复发送。多浏览器、不同浏览器用户配置或不同脚本存储互不共享防重复状态：只在一个浏览器用户配置中安装启动器。

配置中心显示最后一次执行状态。`completed` 表示分析及所选通知请求已完成提交，不代表邮件/Teams 最终投递。`failed` 不自动重试；确认工作流没有重复投递风险后，使用“立即运行”。关闭页面、浏览器退出或电脑休眠可能中断任务。若停在 running，请先确认旧页面已停止，再手动运行。

COE Job 有通知时，扫描完成后发送一次各项目预警列表，不重复使用原“批量自动通知”，也不套用其每日冷却；因此早晚均可通知。仍只发送即将超期和已超期工单。项目未启用或无目标会显示失败/跳过。没有命中预警则不发消息。

## 工作流

Teams / 邮件继续走现有 Webhook：

- 仅 Teams：`email.enabled=false`。
- 仅邮件：`deliveryMode=email-only`、`teams.enabled=false`、顶层卡片数组为空。请保留已配置的“只发邮件 → 终止（成功）”条件，且邮件位于该条件之前。
- 同时勾选：两者都发送；Epic 卡片超限仍使用既有仅邮件回退。

邮件附件是 `.html`。V3 邮件“附件文件名”和内容映射见 [附件配置](workflow/MAIL-V3-ATTACHMENT.md)。

## 停用和卸载

临时停用：配置中心取消 Job 的“启用”，保存。系统可能仍打开页面，但脚本不再执行；重新导出安装可移除已停用 Job 的启动项（至少保留一个启用 Job 时可导出）。

完全移除本功能的系统定时项，在终端执行：

```bash
for agent in "$HOME"/Library/LaunchAgents/com.taomorrow.jira-monitor.job.*.plist; do
  [ -f "$agent" ] || continue
  launchctl bootout "gui/$(id -u)" "$agent" 2>/dev/null || true
  rm "$agent"
done
```

此操作只删除 Jira Monitor 导出的定时项，不删除脚本、项目配置或 Job 配置。
