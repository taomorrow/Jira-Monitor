# Jira Monitor v6.12.8

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

## Epic 分析（v6.7.0）

左侧 Epic → 载入当前页面（全部分页）→ 多选 Epic、状态和日/周对比 → 开始分析。仅使用当前 Jira 查询全部分页中的 Story（含“故事”“用户故事”类型名），按当前 Epic Link / parent 分组，不再查询 Epic 下其他 Story。Bug、Task、Subtask 和 Epic 本身均不计数；无 Epic 的 Story 放入“未分配 Epic”。明细、CSV、交互报告、Teams 和邮件均使用同一范围。

Epic 两个对比时点数量都为 0 的状态行自动隐藏；所选状态下两侧都无数量的 Epic 也隐藏。页面、CSV、Teams、邮件和交互报告沿用同一规则，状态顺序不变。Sprint、Epic 点击数量或“查看变化”均在独立、可搜索、可缩放的明细弹窗中显示，右上角 ❌ 关闭，不再滚动到页面底部；导出的独立报告也使用明细弹窗。

各项目按 Story 的项目 Key 路由，仅向已启用项目提交。Epic 通知载荷为 `reportType: "epic-analysis"`，与 Sprint 共用卡片和 `email` 字段格式；如工作流按 reportType 分支，请增加 Epic 分支。Sprint 和 Epic 只在用户确认后发送，“批量自动通知”仅用于 COE。

优先从 Jira 字段定义识别 Epic Link，兼容无 Epic Link 时使用 parent 字段。按照 Atlassian [Epic Link 字段说明](https://developer.atlassian.com/cloud/jira/software/rest/intro)读取当前所属 Epic，再用完整状态历史回溯昨天/上周状态；不会还原过去的 Epic 归属。无 Epic 读取权限时以编号显示。完整历史缺失时停止生成结果，避免误报。

## DEV 子任务负责人（v6.7.0）

COE 扫描 DEV 状态工单时读取其全部子任务负责人，去重后用于 DEV 的负责人显示、Excel、Teams 提及和邮件正文，不再使用父工单负责人代替。无负责人时明确显示未分配，不虚构提及；Jira 返回邮箱或配置了 Teams 用户映射时生成真正的 @提及，否则显示姓名。DCT 保持使用父工单负责人；同一列表同时命中 DEV 与 DCT 时合并去重相应通知对象。

子任务负责人读取与父工单扫描共用暂停/停止检查，读取失败则暂停保留进度，不保存不完整结果。升级前已保存的扫描结果不含子任务负责人，请停止旧任务并重新扫描。邮件收件人继续遵循项目配置，提及子任务负责人不会擅自添加邮件收件人。验证使用模拟 Jira 接口，未向真实 Teams 或邮箱发送消息。

以下 v6.7.1–v6.7.3 的成员扩展查询兼容记录为历史实现；v6.8.1 已移除成员扩展及反向扫描。

### v6.7.1 Epic HTTP 400 兼容修复

Epic 成员改为逐个 Epic 使用 Jira Software 成员接口分页读取，不再提交包含所有所选 Epic 的长查询。接口返回 400 / 404 / 405 / 501 时，仅对该 Epic 使用字段定义中的查询名称执行 POST 搜索；401 / 403 或服务端错误不自动换路径。分页不完整、重复或任一 Epic 请求失败时不生成部分报告。错误提示显示 Epic 编号、HTTP 状态及 Jira 返回的 errorMessages / errors，便于区分字段、查询和权限问题。参考 [Atlassian Data Center Epic API](https://developer.atlassian.com/server/jira/platform/rest/v10002/api-group-epic/)。此修复已用模拟 HTTP 400、兼容查询、分页和权限失败验证，未连接实际 Jira 服务。

### v6.7.2 共享项目配置与通知项目选择

配置中心项目 Key 可填写 `CSP/OSPIT` 或 `CSP/OSPIT/CHM`，以 `/` 分隔；这些项目共用同一行的 Webhook、邮件列表、启用开关和批量自动通知设置。保存时统一大写、去除两侧空格；同一项目不能在多行配置中重复出现。原单项目配置兼容保留。共享目标不合并项目数据，仍按项目分别生成报告和发送，避免跨项目混淆。

Sprint / Epic 的“通知项目”是报告中工单所属项目，不是 Epic 名称。仅列出当前结果中已在配置中心配置的项目；未配置的 FY26CC 等工单项目不再出现在通知选项中。更改筛选、重新载入或分析失败后会清空旧选项。停用项目的复选框可以选择，并明确标出“通知已停用”，但发送仍要求在配置中心启用；点击“通知设置”可进入修改，保存后立即同步两个模块的选项，无需重新分析。

### v6.7.3：校验 Epic 类型及关联字段兼容读取

关联字段中的编号仅视为候选，载入时分页读取真实工单类型；普通 Story / Task 父工单及不可见候选不会列为可选 Epic，界面列明排除项。不会仅凭 parent 字段或编号认定工单是 Epic。

如果已确认的 Epic 在首个成员分页和兼容查询中返回精确错误 `No issues have a parent epic with key or name 'KEY'`，先重新确认该工单类型，再分页读取当前账号可见、关联字段非空的工单，按返回的关联编号精确筛选成员；只统计其中 Story。兼容扫描跨可见项目，数据量大时耗时可能增加，同一轮分析只读取一次。成功核对后确实没有成员的 Epic 才记为 0 条；关联字段读取失败、权限失败及其他错误仍中止报告和推送，不把 HTTP 错误当作 0 条。

## v6.8.0：邮件预览与 COE 交互报告

COE 新增“预览邮件 / 报告”和“导出交互报告”。预览显示实际收件人、邮件 HTML 和附件，预览/下载不触发通知；批量推送按项目附上仅包含该项目预警工单的 HTML 交互报告。手动导出完整扫描报告时包含已扫描的正常/预警工单，点击 DEV / DCT 各级别数量筛选、搜索、打开 Jira。详情通知也附当前工单报告。Sprint / Epic 的推送预览增加“预览邮件正文”，保留项目报告附件。报告不含 Webhook、收件人列表或账号标识。

Teams 收到消息不等于邮件已投递。脚本只向 Webhook 提交 `email` 和报告附件；邮件动作必须在你的 Power Automate 工作流中存在并成功执行。新增 [邮件动作与附件配置](workflow/README.md)、可审查的动作片段和兼容触发器 schema；不能仅更新脚本就修复账号连接或被跳过的邮件步骤。当前未获得工作流运行记录，无法确认实际投递故障原因或已恢复。

## v6.8.2：星形入口与 Epic 超限仅邮件

浮动入口改为无文字四角星，保留拖动和位置记忆。Epic 按项目检查 Teams 卡片大小，超过 26 KiB 时显示“所选数量超过 Teams 大小限制，所选数据只通过邮件发送”，清空该项目顶层 `attachments` 并设置 `teams.enabled=false`、`deliveryMode=email-only`，保留完整邮件及已勾选的交互报告。没有邮件收件人时阻止提交并提示配置。未超限项目继续正常发送。

工作流的邮件分支必须位于 Teams 循环之外，直接由触发器运行；Teams 分支增加条件 `not(equals(triggerBody()?['teams']?['enabled'], false))`，为真才发送卡片。旧版本载荷没有 teams 字段时仍正常发送。若邮件动作依赖 Teams 成功，需要先调整工作流；脚本无法自动修改远端工作流。

## v6.8.3：状态勾选及入口颜色

Sprint / Epic 默认全选且显示所有状态勾选，支持全选、清空以及单项修改；推送按钮为蓝色填充，浮动入口为蓝色四角星。脚本报告文件名始终使用 `.html`；若邮件收到 `Monitor Details.txt`，请把 Mail V3“附件文件名”固定值改为表达式 `first(triggerBody()?['email']?['attachments'])?['name']`。附件内容继续使用对应 contentBytes 的 base64ToBinary 表达式。

## v6.8.4：详情仅发送 Teams

Jira 详情独立浮窗不再显示邮件预览及交互报告导出按钮。详情通知仅发送 Teams，载荷明确设置 `email.enabled=false`，不包含邮件正文或交互报告附件。保留分析、暂停、停止及 Excel 导出。批量 COE、Sprint 和 Epic 的邮件及报告功能不变。

## v6.9.0：Mac 定时 Job

配置中心增加 Job，支持每日多个时间（例如 `09:00,21:00`）、每天/工作日、COE / Sprint / Epic 多选、日/周对比、通知项目、Teams / 邮件独立开关及邮件报告。默认页面是 `https://jira.xpaas.lenovo.com/issues/?filter=180929`，初始 Job 未启用且不自动发送，保存并启用后生效。

配置中心可导出 Mac `.app` 安装器（ZIP 下载），使用用户级 LaunchAgent 在选定时间打开已安装脚本的浏览器。安装时不会立即运行 Job。时间使用 Mac 系统时区；修改时间、页面或启用任务列表后需要重新导出安装。脚本按保存配置执行内部功能，无需模拟菜单点击。详细步骤见 [JOBS.md](JOBS.md)。

同一 Jira 站点的 Job 串行执行；同一 Job 同一时间点仅运行一次。失败不自动重试，配置中心保留最后状态。Job 的 COE 通知使用 Job 自身的发送开关，避免与原批量自动通知重复发送，且不受其 24 小时冷却阻挡早晚各一次；项目仍须启用且配置 Webhook/收件人。配置“仅邮件”须配合工作流的 email-only 跳过 Teams 判断。验证只使用模拟接口，未安装真实 LaunchAgent、未访问该私有 Jira、未发送真实通知。

## v6.9.1：双击安装 Mac 定时任务

“导出 Mac 定时启动器”现在下载 ZIP，双击解压后双击 `Jira Monitor Installer.app`，点击“安装”，完成后弹窗提示，不再要求手动打开终端或输入命令。ZIP 保留应用入口的可执行权限。应用未经过 Apple 公证，首次打开可能需要在系统设置“隐私与安全性”确认；不自动绕过系统检查。

## v6.9.2：原生 Mac 启动入口

安装器改用 arm64 / x86_64 通用 Mach-O 原生程序作为应用入口，避免将 Shell 文件当作可双击的应用执行。原生入口只定位安装资源并启动系统 osascript，不修改系统安全策略。源码见 `native/mac-launcher.c`，可在 Mac 用 `python3 scripts/build_mac_launcher.py` 重建。完整静态应用包仅有 ad-hoc 完整性签名，并非 Developer ID 签名或 Apple 公证；仍可能需要系统“隐私与安全性”确认，不能保证公司策略允许执行。

## v6.9.3：安装器按需加载

Mac 应用二进制不再内嵌在用户脚本里，仅点击“导出 Mac 定时启动器”时从仓库下载并核对 SHA-256；失败不生成文件，可重试。普通 Jira 页面加载、打开配置中心和 Job 执行均不下载安装器。Job 无后台分钟轮询，只有带 Job 标记的启动页面才执行。安装器的下载需求不影响已安装的 Mac 定时任务。脚本从约 461 KB 缩减至约 246 KB。此优化减少扩展解析负担，但不能据此认定或保证修复油猴整个弹出面板无法打开的问题。

## v6.9.4：COE 排除 Bug、核对子任务类型

COE 批量收集时排除 Bug，逐条 REST 读取时再次核对，详情中的 Bug 也跳过，不进入结果、Excel、报告或通知。DEV 读取 Story 下属条目时只接受 Sub-task / Subtask（或 Jira 明确标记 subtask=true 的非 Bug 类型）；Bug 及其他普通类型不参与负责人收集。条目缺少类型时按编号补取类型和负责人，无法确认类型时暂停而非猜测。直接扫描 Sub-task 时使用该 Sub-task 自身负责人；Story 的 DEV 仍从已确认子任务收集并去重，DCT 保持原负责人规则。升级前旧结果请停止后重新扫描。

## v6.12.8：固定 Jira 标签页调度

在“配置中心 → 定时 Job”保存配置后，点击“设此标签页为调度页”，再右键浏览器标签选择“固定”。无需 Mac 安装器。每 30 秒只检查本地时钟及配置，到点新建后台任务标签执行；多个调度页防重复、多个 Job 分析串行。更改时间或通知后保存即生效。停止调度不取消正在执行的任务。

需保持 Jira 调度页打开、电脑唤醒、登录及网络有效。后台冻结或睡眠可能导致延迟，恢复时仅补触发最近 10 分钟内的时间点。关闭后需重新设定调度页。原 Mac 模式移至折叠高级区；迁移时应停用旧系统定时项。具体步骤见 [JOBS.md](JOBS.md)。

COE 可勾选“无预警工单时推送扫描摘要”：扫描完成且项目没有预警时，发送扫描时间、查询条目数、完成分析数、扫描状态及状态范围。默认关闭；自动扫描遵循项目自动通知开关，Job 遵循所选通知渠道。

### Kanban（新增独立菜单）

点击 Kanban → 载入当前查询，读取当前页面查询的全部分页，只统计 Story，包含已完成状态。不会运行原 COE 扫描，不读取状态历史，载入不会自动推送，也不修改 COE / Sprint / Epic 的选择、规则或 Job 配置。

- **COE · 状态分布**：按工作流状态显示带数量的分段色条、图例及横向数量条。点击任意色块、状态或数量，在独立弹窗查看对应 Jira、摘要、Assignee 和当前状态。
- **Sprint / Epic · 今天**：切换 Sprint 或 Epic，选择一个或多个分组。柱图展示截至载入时的当前数量，Open = Open，Dev = In Progress，Test = Ready For Test + Testing，不计算昨日/上周或增减。
- Sprint 排除名称或状态带 CLOSED 的分组；Epic 仅按当前查询 Story 的当前关联分组，读取 Epic 标题不会扩大 Story 范围。未分配 Epic 单列。
- 点击柱、图例数量、分组总数均可查看对应明细。其他状态仍计入分组总数，但不计入 Open / Dev / Test。图例合计按 Jira 编号去重，同一 Story 可出现在多个 Sprint，各 Sprint 数量不可直接相加。
- 当前状态是接口读取时的快照，刷新数据请重新载入。Kanban 不新增 Job 菜单。可在“推送当前 Tab”选择项目、Teams / 邮件及交互附件，预览后确认推送。

Kanban 自动隐藏数量为 0 的状态，以及 Open / Dev / Test 全部为 0 的 Sprint / Epic 分组。发送内容沿用当前 Tab 和所选分组、按项目隔离；Teams 超限时若已选择邮件则仅发邮件。Teams 和邮件正文展示统计图表，点击色块、条形或数量打开对应 Jira 工单集合；HTML 交互附件中的图表点击后弹窗展示 Jira、摘要、Assignee 和状态。Sprint / Epic 分组纵向排列，按 Story 总量从多到少排序，无需横向滚动。Teams 使用原生自适应卡片，颜色和间距由 Teams 控制。

### v6.12.8：Kanban COE 负责人统计

COE 保留总状态分布，移除重复的“Status · 当前数量”。新增 Story Assignee 分组，按总数量降序显示状态数量和进度，未分配负责人单独列出。进度为 Completed / Complete、SIT、Ready For UAT、UAT、Ready For Deploy、DEPLOYED、Done 的数量除以全部 Story；Cancelled 保留在分母，不计入完成。页面与 HTML 报告的数量支持明细弹窗；邮件与 Teams 同步包含负责人统计。

HTML 报告的图例改为自动换行的完整标签，状态条连续填满容器，小色块保留最小标签宽度并显示数字。Sprint / Epic 条形修正了预留数字空间造成的长度截短。

### v6.12.8：完整状态条与科技配色

状态条连续填满可用宽度，保留所有数字，消除分段边框造成的空隙。小色块保留可读宽度，完整数量同时显示在图例中。页面、邮件和交互报告采用蓝、青、紫色系；进度条仍依真实百分比显示。

### v6.12.8：Assignee 紧凑行布局

每人一行，左侧姓名，中间按该负责人各状态数量占比填满的状态条，右侧仅显示完成进度百分比。状态色块悬停显示状态、数量和占比，点击打开对应工单；姓名可查看全部工单，百分比可查看完成阶段工单。页面、HTML 附件、邮件和 Teams 同步采用行布局；Teams 外观由客户端控制。

### v6.12.8：Kanban 状态配色与紧凑指标

In Progress / Dev 使用红色；Ready For Test、Testing、Completed 使用黄色层次；New、Grooming、Open 使用深蓝层次；SIT 及后续状态使用黑灰层次。仅调整颜色，Sprint / Epic 的 Test 统计范围仍为 Ready For Test + Testing。统一应用于页面、邮件和 HTML 报告；Teams 使用原生语义色，具体色调受客户端控制。Sprint / Epic 组内三条指标缩小间距，组间保留分隔。

### v6.12.8：Teams Kanban 紧凑卡片

Teams 指标改为固定标签列、8px 细条形和独立的固定数值列，短条及零值不会挤压数字。使用包内嵌入的 PNG 色条，不需外部图片托管，保持 Open 深蓝、Dev 红、Test 黄。精简顶部时间说明，完整统计口径收进“统计说明”按钮。各指标仍打开对应 Jira 集合；Jira+ 独立扩展不变。已通过 Adaptive Cards SDK 的结构验证和渲染检查；实际 Teams 字体、间距可能受客户端影响，未发送真实通知。

### v6.12.8：参考图黑白灰与亮黄主题

从参考图片提取亮黄 `#F4F00D`，搭配近黑 `#171717`、浅灰 `#E4E4E2`、暖白 `#FAF9F6`。Dev / In Progress 使用亮黄色，其余工作流状态使用黑白灰层次。应用于统一界面、Kanban、邮件、独立报告及 Teams 嵌入图表；原生 Teams 文字和页面背景仍适配客户端主题。COE 预警/超期含义继续以文字表达，统计逻辑与通知路由不变。Jira+ 的冻结版本、安装包和配置均未修改。

主题编译位于 `scripts/visual_theme.py`，只转换颜色字面量，上游原始模板不变。新报告需要重新导出，已有邮件附件不会自动改变颜色。
