# Jira+

独立的 Chrome / Edge Manifest V3 扩展，基于 **Jira Monitor 6.10.4**，扩展版本 **6.10.4.7**。

[下载安装包](https://github.com/taomorrow/Jira-Monitor/releases/download/jira-plus-v6.10.4.7/JiraPlus-6.10.4.7.zip)

6.10.4.7 新增：Job 合并 Teams 卡片超限时改为按 COE → Sprint → Epic → Risk 分菜单发送，不再删除菜单；单菜单超限再按内容分页。所有分页预先校验 UTF-8 字节大小，单页最多 26 KiB；无法安全拆分的单个明细会在提交前报错，要求缩小范围。邮件及交互附件每项目仍只发送一份，包含所有所选结果；拆分后的 Teams 请求关闭邮件，避免重复邮件。发送中断时日志记录已提交邮件 / 卡片数量，不自动重试。

Sprint / Epic Teams 的分组名称、当前数量、状态变化、创建数，以及状态行的昨日、今日、增减与环比数字可点击打开 Jira。链接使用对应扫描快照的精确工单编号，历史统计数字对应当时参与统计的工单集合，查询打开后显示 Jira 当前数据；零值打开空集合。各菜单统计说明的切换标识也按菜单隔离。

6.10.4.6 新增：独立 Risk 菜单，移植主脚本 v6.12.20 的交付风险计算、Assignee → Due → Story 三级弹窗、Teams / 邮件及离线交互附件。已到期风险率严格大于 50% 标红；Teams 使用精简卡片并显示实际字节大小，不重复携带总量链接。配置里执行菜单和合并推送菜单都可选择 Risk，合并顺序 COE → Sprint → Epic → Risk，附件仍为一个带菜单页签的 HTML。原有 COE / Sprint / Epic 扫描保持冻结基线；不添加 Kanban。

“保存并立即运行”先保存当前执行及推送勾选项，等待扩展存储写入后再打开任务标签，避免新勾选 Risk 未生效。定时任务仍使用已保存配置。

## Risk 交付风险

点击左侧 Risk → 载入当前查询，读取当前 Jira 查询全部分页的 Story 和标准 Due 字段。点击负责人弹出 Due 分组，再点击数字或风险率查看 Assignee / Due / Epic / Story / 摘要 / Status 明细，可搜索、打开 Jira。仅读取数据，不更新工单。

有效 Story 排除 Done、DEPLOYED、Cancel / Cancelled / Canceled；未达 Completed 包含 New、Grooming、Open、In Progress、Ready For Test、Testing。未达 Completed 率 = 未达 Completed / 有效 Story；已到期风险率在 Due ≤ 扫描当天的有效 Story 中计算；Due < 当天且未达 Completed 才计逾期。Completed、SIT、Ready For UAT、UAT、Ready For Deploy 仍在分母。未知状态相关风险率显示 `—`；无 Due / 未分配负责人单列。按浏览器本地日期判断，指标不是延期概率。

Risk 可手动选择项目及 Teams / 邮件，预览后确认一次发送；邮件附件支持离线三级下钻。Job 可选 Risk 单独或与其他菜单合并；不同项目隔离。合并 Teams 超限时按菜单分别发送，单个 Risk 仍超限时分页；邮件及合并附件保留所选 Risk。扫描失败不发送合并部分结果。

6.10.4.5 新增：Teams 按实际 UTF-8 字节大小逐级缩减，不会添加未勾选菜单；卡片及 Job 日志显示实际保留的菜单。邮件及交互附件完整保留。

6.10.4.4 新增：合并推送只提交一个交互 HTML 附件，不再依赖邮件工作流保留多个附件；邮件正文同步只显示合并报告文件名。

6.10.4.3 修复：COE 与 Sprint / Epic 的 Webhook 地址先统一规范化再合并；避免只发送 COE 后误报“通知已停用”。所有项目目标在首次提交前完成校验，保留 COE 的 Teams @ 提及；执行日志列出实际合并菜单。

## Job 一键合并推送

在 Configuration → 定时 Job 设置中，勾选“一键合并推送”，选择 COE、Sprint、EPIC、Risk 中一个或多个，再启用 Teams / 邮件并保存。会先完成扫描，再按 COE → Sprint → EPIC → Risk 合并为每项目一封邮件、一张 Teams 卡片；交互报告合并为一个 HTML 附件，打开后通过 COE / Sprint / Epic / Risk 标签切换，数字下钻、Assignee 和状态变化均保留。不同项目仍按各自配置投递。合并卡片超过 Teams 检查线时按菜单发送，单菜单仍超限则分页；邮件及单文件交互报告每项目只发一份，保持全部所选结果。仅启用 Teams 也可以分页，不强制启用邮件。扫描失败则不发送本次合并结果。原有 Job 未启用合并时保持分别推送。

## Mac 安装

1. 下载 ZIP，解压到一个固定位置，例如“文稿/JiraPlus”。
2. Chrome 打开 `chrome://extensions`；Edge 打开 `edge://extensions`。
3. 打开“开发者模式”，点击“加载已解压的扩展程序”，选择解压后含 `manifest.json` 的文件夹。
4. 打开 Jira 页面，点击浮动星号或浏览器工具栏的 Jira+ 图标。点击工具栏图标时，如果当前不是 Jira，会打开默认筛选页。
5. 在 Configuration 配置项目 Webhook、邮件收件人与 Job。测试通过后，在该浏览器停用旧 Jira Monitor 油猴脚本，避免两个产品各自扫描或发送通知。油猴和旧脚本不用卸载。

无需油猴、终端或 Mac 安装器。扩展只在 `https://jira.xpaas.lenovo.com/` 注入，读取已有 Jira 登录态。

## 保留与隔离

- 冻结基线为提交 `1c1f74ab6ac1e3383ebd9c0082369b735f17a30d` 的 6.10.4，原文件保存在 `vendor/`；不跟随仓库主脚本更新。
- 保留 COE、Sprint、Epic、Configuration，新增独立 Risk；保留 Teams/邮件、交互报告、固定标签 Job；没有 Kanban 和 Due。
- Job 沿用 6.10.4 的固定 Jira 调度标签方案：启用 Job 后把 Jira 标签设为调度页，并保持该页运行、电脑唤醒和 Jira 登录有效。没有改成浏览器后台定时器，不会唤醒电脑或启动已关闭的浏览器。
- 扩展的 `chrome.storage.local` 独立于油猴私有存储，配置不会自动继承，也不会覆盖 v6.12.6 的配置。界面、事件和会话缓存标识使用独立 `jira-plus` 前缀。
- 邮件仍通过配置的 Power Automate 工作流发送，HTML 附件仍需工作流正确映射附件字段。
- 设置说明中的原版 Mac 导出功能仍保留；该功能按需读取原仓库安装器数据，不下载/执行远程扩展 JavaScript。日常使用扩展不需要 Mac 导出。

## 配置备份与迁移

在扩展详情页打开“扩展程序选项”，可导出/导入 Jira+ JSON 备份。导入后刷新已有 Jira 标签页。

也接受以原 GM 存储键为字段的 JSON 对象，自动把 `jira-monitor-` 前缀改为 `jira-plus-`。**不是**油猴“全部脚本备份”压缩包导入器；浏览器扩展无法直接读取油猴私有存储。没有这种 JSON 时，首次需要在 Configuration 重新填写项目与 Job。备份包含 Webhook 和收件人，勿上传 GitHub。

## 在线更新

此 GitHub 下载包是本地安装版，**尚未上架扩展商店，不会自动更新**。更新时下载 Jira+ 的新版 ZIP，解压覆盖到原文件夹，再在扩展管理页点击“重新加载”，最后刷新 Jira。使用同一个安装目录时会继续使用原扩展本地存储，建议先导出备份。

扩展商店自动更新是后续独立的发布步骤，需要开发者账号及商店审核；此处没有使用远程脚本替换功能绕过商店机制。主分支上的 `jiraMonitor.user.js` 更新不会改变此扩展。

## 开发与验证

从仓库根目录执行：

```sh
python3 scripts/jira-plus/build.py
node --check extensions/jira-plus/content.js
node --check extensions/jira-plus/background.js
node --test scripts/jira-plus/test.cjs
```

ZIP 输出到 `dist/jira-plus/`。仅打包 manifest、已捆绑 content/background/配置页及图标，不打包测试、历史源码或任何个人配置。扩展不使用 eval、不注入页面主世界、不自动重试通知；跨域请求由后台严格限制目的域、方法、发送者，并且省略凭据、拒绝重定向。原版在页面内的 Jira 接口请求继续使用当前登录态。
