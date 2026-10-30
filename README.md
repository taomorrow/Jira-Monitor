# Jira Monitor v6.1.0

合并 [超时预警](https://github.com/taomorrow/Jira) v5.5.4 与 [Sprint Analysis](https://github.com/taomorrow/jira-sprint-analysis) v0.1.9。

## 安装与使用

1. 用 Tampermonkey 打开并安装 `jiraMonitor.user.js`。它沿用 Jira Monitor 的 name / namespace，更新现有 Monitor 时保留其本地项目配置。
2. 停用原独立 Sprint Analysis，避免重复入口。刷新 Jira，右下角点击 **Jira Monitor**。
3. 在统一面板选择 **超时预警** 或 **Sprint Analysis**。默认不会因打开详情页就开始分析；需要时在左侧“配置中心”勾选“详情自动分析”，详情页将在右下角独立弹出分析浮窗，该选择会保存在本地。
4. 打开左侧 **配置中心**，按项目 Key（例如 CSP、OSPIT）填写 Webhook、邮件收件人和批量自动通知开关。两套功能立即使用同一份配置。未配置的项目可分析、导出，但不发送。

安装入口：[jiraMonitor.user.js](https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/jiraMonitor.user.js)。脚本后续更新从本仓库获取。

## 窗口操作

主窗口默认 960 × 620（自动适应屏幕），拖动顶部标题栏移动窗口，拖动右下角斜纹把手放大缩小；位置与大小保存在本地。左侧菜单切换超时预警、Sprint Analysis 和配置中心，右侧呈现内容。超时预警默认展开，右上角红色 ❌ 关闭窗口。

详情自动分析使用独立的右下角浮窗，与主窗口的手动任务、结果和开关分离。关闭浮窗仅隐藏当前工单结果；进入其他工单详情会再次弹出。取消配置中心的勾选可关闭自动分析，并取消仍在读取的任务。批量扫描进行或暂停时不启动详情自动分析。

两类邮件均使用 HTML 卡片，包含标题、表格和 Jira 按钮；Sprint 合计行突出显示，正向增量为红色。工作流邮件正文必须使用 `email.bodyHtml`，使用 `email.bodyText` 会显示纯文本。

## 功能

| 超时预警 | Sprint Analysis |
| --- | --- |
| DEV / DCT 状态历史、首次进入时间、排除状态 | 当前 Jira 查询全部分页、完整状态历史 |
| 自定义阈值和状态、周五 10:30 / 17:00 阈值调整 | 按上海时间日 / 周对比、Sprint 多选、12 种状态筛选 |
| 当前页 / 全分页 / Dashboard、暂停续扫、停止 | 统计表、状态数量明细、净变化明细 |
| Excel 导出、按项目通知、冷却和负责人提及 | CSV 导出、Teams 卡片预览、确认推送 |

点击超时预警的“开始统计”运行；Sprint 页签先“载入当前页面”，选择 Sprint / 状态后“开始分析”。切换页签保留结果，不会停止已明确启动的扫描。暂停后可继续，停止后再开始会新建扫描。

Sprint 可以跨项目分析和导出。推送时选择“推送项目”，程序按该项目重新计算统计，只发送该项目的数据；每次预览确认发送一个项目。项目邮件收件人与超时预警共用。更换分析条件后需重新分析。

## Teams 与邮件

使用 Microsoft Teams Workflows Webhook。支持 `logic.azure.com`、`api.powerplatform.com`、`api.powerautomate.com` 下带 `/workflows/` 的 HTTPS 地址。地址只存于本地 Tampermonkey，不写入代码。共享配置中可用已保存项目 Key 进行 HEAD 连接诊断；保存配置和诊断都不推送消息。

邮件由项目 Webhook 对应的 Power Automate 工作流发送，脚本不直接连接 SMTP。需要在工作流中读取 `email.enabled`，为 true 时调用邮件动作：收件人 `email.to`、标题 `email.subject`、HTML 正文 `email.bodyHtml`。详见 EMAIL.md。Sprint 消息另带 `reportType: "sprint-analysis"`、`projectKey` 和 Adaptive Card attachments；工作流如果强制要求超时报告特有的字段，应将 Sprint 分支按 reportType 区分处理。

超时预警已有项目配置会保留；旧全局设置可在配置中心指定项目 Key 后复制并保存。独立 Sprint 脚本有独立的油猴存储，无法自动跨脚本读取其旧 Webhook，请复制到统一配置中。Sprint 始终手动预览确认，项目“批量自动通知”开关只控制超时批量扫描。

HTTP 2xx 仅表示 Webhook 接受请求；卡片和邮件最终投递请查看工作流运行记录。超时不会自动重试，避免重复投递。

## 开发和验证

- `src/timeout.user.js`、`src/sprint.user.js` 保存两仓库原始版本，方便核对计算逻辑。
- `scripts/build.py` 合并模块作用域、统一面板和通知配置，生成唯一安装文件 `jiraMonitor.user.js`。
- `src/hub.js` 提供窗口、侧边栏、拖动缩放和独立详情容器；`src/mail.js` 提供 Outlook 兼容的表格式 HTML 邮件卡片。
- `npm ci && npm run build && npm run check && npm test`。
- 集成测试覆盖页面入口、窗口拖动缩放、配置、项目通知路由、详情独立存储与取消、邮件卡片和 HTML 转义。另以 Chrome 无头浏览器实测拖动缩放和检查各页面排版。
- 原仓库的测试保持在各自仓库中；本项目 `tests/` 是超时预警原版测试参考，旧面板假设不适用于统一 UI。

验证未连接实际 Jira / Teams / 邮件服务，也未发送真实通知。
