# Jira Monitor v6.6.0

合并 [超时预警](https://github.com/taomorrow/Jira) v5.5.4 与 [Sprint Analysis](https://github.com/taomorrow/jira-sprint-analysis) v0.1.9。

## 安装与使用

1. 用 Tampermonkey 打开并安装 `jiraMonitor.user.js`。它沿用 Jira Monitor 的 name / namespace，更新现有 Monitor 时保留其本地项目配置。
2. 停用原独立 Sprint Analysis，避免重复入口。刷新 Jira，右下角点击 **Jira Monitor**。
3. 在统一面板选择 **COE（超时预警）**、**Sprint** 或 **Epic**。默认不会因打开详情页就开始分析；需要时在左侧“配置中心”勾选“详情自动分析”，详情页将在右下角独立弹出分析浮窗，该选择会保存在本地。
4. 打开左侧 **配置中心**，按项目 Key（例如 CSP、OSPIT）填写 Webhook、邮件收件人和批量自动通知开关。三套功能使用同一份配置。勾选各行“启用通知”并保存，可同时启用多个项目。停用项目仍可分析和导出，手动和自动推送均跳过。旧配置默认沿用启用状态，保留已有通知行为。

安装入口：[jiraMonitor.user.js](https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/jiraMonitor.user.js)。脚本后续更新从本仓库获取。

## 状态流程顺序

状态筛选、Sprint / Epic 页面统计、CSV、Teams 卡片、邮件表格、独立交互报告统一使用：

New → Grooming → Open → In Progress → Ready For Test → Testing → Completed → SIT → Ready For UAT → UAT → Ready For Deploy → DEPLOYED → Done → Cancelled。

Cancelled 是旁路状态，置于主流程末尾；合计始终最后。默认全部状态包含图中 14 个状态，补齐 Done、Cancelled。仅选择部分状态时仍遵循同一顺序，状态名匹配忽略大小写。顺序配置保存在 `src/status-order.json`。

## 超时预警按项目汇总发送

批量结果中的 **发送预警列表** 会筛选“即将超期 / 已超期”工单，按项目各提交一次 Webhook；同一项目一张 Teams 卡片、一封邮件，不逐 Jira 发送。列表含 Jira 编号、摘要、负责人、命中规则与时长。配置中心开启批量自动通知时，等整轮扫描完成后再提交项目汇总，继续遵循各工单的24小时冷却；手动发送不受冷却限制。暂停或停止后的手动汇总只包含已扫描结果。详情浮窗的单工单手动通知保持原行为。

正常工单不包含在预警列表。Teams 卡片超过容量时显示前若干条并标明总数，邮件保留完整列表，卡片按钮可以打开完整 Jira 工单集合。汇总载荷 `reportType` 为 `timeout-summary`，含 `items` 数组、`attachments` 卡片和 `email`；工作流邮件动作应对一次汇总只发送一次，不要对 `items` 循环发送邮件。

## 独立交互报告

Sprint 分析完成后点击 **导出交互报告**，获得单文件 HTML。用浏览器打开，点击昨日/今日数字可在下方查看准确的 Jira 明细、摘要及两个时点的状态；支持变化任务、新建任务、项目筛选、编号/摘要搜索和 Jira 链接。报告使用生成时的快照，不连接 Jira API、不要求安装脚本，也不会自动刷新数据。

推送预览中可下载各项目单独的交互报告。勾选 **邮件附交互报告（含 Jira 明细）** 时，邮件载荷包含该项目的 HTML 附件，需按 EMAIL.md 在工作流中配置附件映射。附件包含 Jira 编号、摘要和状态快照；不含 Webhook、收件人或登录凭据。未配置附件映射时，原邮件仍只有卡片正文。

当前实现是可下载 HTML / 邮件附件，不会自动上传报告。若需在邮件中点击在线链接直接进入报告，应另接入有权限控制的内网或文档站点并返回访问地址；邮件正文自身不能执行交互脚本。请将附件下载后用浏览器打开，邮件附件预览不会运行交互。

## 窗口操作

主窗口默认 960 × 620（自动适应屏幕），拖动顶部标题栏移动窗口，拖动右下角斜纹把手放大缩小；位置与大小保存在本地。右下角 Jira Monitor 悬浮入口也可拖动并记住位置，拖动不会误打开窗口。左侧菜单切换超时预警、Sprint Analysis 和配置中心，右侧呈现内容。超时预警默认展开，右上角红色 ❌ 关闭窗口。

详情自动分析使用独立的右下角浮窗，与主窗口的手动任务、结果和开关分离。关闭浮窗仅隐藏当前工单结果；进入其他工单详情会再次弹出。取消配置中心的勾选可关闭自动分析，并取消仍在读取的任务。批量扫描进行或暂停时不启动详情自动分析。

两类邮件均使用 HTML 卡片，包含标题、表格和 Jira 按钮；Sprint 合计行突出显示，正向增量为红色。工作流邮件正文必须使用 `email.bodyHtml`，使用 `email.bodyText` 会显示纯文本。

## 功能

| 超时预警 | Sprint Analysis |
| --- | --- |
| DEV / DCT 状态历史、首次进入时间、排除状态 | 当前 Jira 查询全部分页、完整状态历史 |
| 自定义阈值和状态、周五 10:30 / 17:00 阈值调整 | 按上海时间日 / 周对比、Sprint 多选、14 种状态筛选 |
| 当前页 / 全分页 / Dashboard、暂停续扫、停止 | 统计表、状态数量明细、净变化明细 |
| Excel 导出、按项目通知、冷却和负责人提及 | CSV 导出、Teams 卡片预览、确认推送 |

点击超时预警的“开始统计”运行；Sprint 页签先“载入当前页面”，选择 Sprint / 状态后“开始分析”。切换页签保留结果，不会停止已明确启动的扫描。暂停后可继续，停止后再开始会新建扫描。批量扫描通过 REST 接口读取工单和完整状态历史，全程留在当前列表页，不打开详情、不点击 History、不翻动页面。详情页 `/browse/…` 禁止显示批量列表面板，只保留独立详情浮窗。批量任务进行中或暂停时，每次加载 Jira 列表页默认自动显示超时控制面板，便于暂停和终止。扫描按顺序读取接口，失败时停在当前工单并保留进度，继续后重试；停止或暂停后的未完成读取不写入结果。升级前的旧版逐页任务请先停止，导出需要的旧结果后重新开始接口扫描。

Sprint 可以跨项目分析和导出。推送时在“推送项目（可多选）”勾选项目，程序按每个项目重新计算统计。一次预览确认可推送多个项目，各项目分别使用配置中心的 Teams Webhook 和邮件收件人，分别显示提交结果。未配置 Webhook 的所选项目会阻止提交，请取消勾选或先配置。失败或超时不会自动重试。项目邮件收件人与超时预警共用。更换分析条件后需重新分析。

## Teams 与邮件

使用 Microsoft Teams Workflows Webhook。支持 `logic.azure.com`、`api.powerplatform.com`、`api.powerautomate.com` 下带 `/workflows/` 的 HTTPS 地址。地址只存于本地 Tampermonkey，不写入代码。共享配置中可用已保存项目 Key 进行 HEAD 连接诊断；保存配置和诊断都不推送消息。

邮件由项目 Webhook 对应的 Power Automate 工作流发送，脚本不直接连接 SMTP。需要在工作流中读取 `email.enabled`，为 true 时调用邮件动作：收件人 `email.to`、标题 `email.subject`、HTML 正文 `email.bodyHtml`。详见 EMAIL.md。Sprint 消息另带 `reportType: "sprint-analysis"`、`projectKey` 和 Adaptive Card attachments；工作流如果强制要求超时报告特有的字段，应将 Sprint 分支按 reportType 区分处理。

超时预警已有项目配置会保留；旧全局设置可在配置中心指定项目 Key 后复制并保存。独立 Sprint 脚本有独立的油猴存储，无法自动跨脚本读取其旧 Webhook，请复制到统一配置中。Sprint 始终手动预览确认，项目“批量自动通知”开关只控制超时批量扫描。

HTTP 2xx 仅表示 Webhook 接受请求；卡片和邮件最终投递请查看工作流运行记录。超时不会自动重试，避免重复投递。

## 开发和验证

- `src/timeout.user.js`、`src/sprint.user.js` 保存两仓库原始版本，方便核对计算逻辑。
- `scripts/build.py` 合并模块作用域、统一面板和通知配置，生成唯一安装文件 `jiraMonitor.user.js`。
- `src/timeout-summary.js` 负责按项目汇总的超时卡片和邮件，保留自动冷却去重。
- `src/batch-api.js` 负责 REST 批量扫描、暂停续扫和结果提交；全部筛选通过 Jira Search API 分页，当前分页从可见列表提取编号，Dashboard 从已加载组件提取编号。
- `src/interactive-report.js` 为独立报告生成器，`src/report-actions.js` 对接分析快照、下载和附件编码。
- `src/sprint-notify.js` 负责多项目独立预览、目标快照和分别推送。
- `src/hub.js` 提供窗口、侧边栏、拖动缩放和独立详情容器；`src/mail.js` 提供 Outlook 兼容的表格式 HTML 邮件卡片。
- `npm ci && npm run build && npm run check && npm test`。
- 集成测试覆盖页面入口、窗口拖动缩放、配置、项目通知路由、详情独立存储与取消、邮件卡片和 HTML 转义。另以 Chrome 无头浏览器实测拖动缩放和检查各页面排版。
- 原仓库的测试保持在各自仓库中；本项目 `tests/` 是超时预警原版测试参考，旧面板假设不适用于统一 UI。

验证未连接实际 Jira / Teams / 邮件服务，也未发送真实通知。

## Epic 分析（v6.6.0）

左侧 Epic → 载入当前页面（全部分页）→ 多选 Epic、状态和日/周对比 → 开始分析。仅统计本次 Jira 查询范围内的 Story（也识别“故事”“用户故事”类型名），排除 Bug、Task 和子任务。按 Epic 编号和摘要显示分组，无关联的 Story 归入“未分配 Epic”。不自动扩大到整个 Epic；如需完整数量，请先调整 Jira 查询，包含需要统计的 Story 和状态。

支持点击数量查看工单明细、状态变化、CSV、独立交互 HTML 报告及 Teams / 邮件预览推送。各项目按 Story 的项目 Key 路由，仅向已启用项目提交。通知载荷为 `reportType: "epic-analysis"`，与 Sprint 共用卡片和 `email` 字段格式；如工作流按 reportType 分支，请增加 Epic 分支。Sprint 和 Epic 只在用户确认后发送，“批量自动通知”仅用于 COE。

优先从 Jira 字段定义识别 Epic Link，兼容无 Epic Link 时使用 parent 字段。按照 Atlassian [Epic Link 字段说明](https://developer.atlassian.com/cloud/jira/software/rest/intro)读取当前所属 Epic，再用完整状态历史回溯昨天/上周状态；不会还原过去的 Epic 归属。无 Epic 读取权限时以编号显示。完整历史缺失时停止生成结果，避免误报。验证使用模拟 Jira 接口，未向真实 Teams 或邮箱发送消息。
