# 安装 Jira Monitor

通过 Tampermonkey [安装 Jira Monitor](https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/jiraMonitor.user.js)，停用独立 Sprint Analysis，然后刷新 Jira。

右下角 Jira Monitor → 配置中心 → 按项目 Key 保存通知目标。

超时预警 → 开始统计；Sprint Analysis → 载入当前页面 → 选择 Sprint 和状态 → 开始分析。

详情自动分析默认关闭，可在配置中心开启，详情页右下角独立弹出。旧 Monitor 的项目设置在沿用同一脚本身份升级时保留。独立 Sprint 的旧 Webhook 需要手动复制。

完整功能、邮件工作流和开发说明见 README.md。

拖动顶部标题栏移动窗口，拖动右下角把手调整大小；左侧切换功能，右上角红色 ❌ 关闭。

悬浮入口也可拖动移动。批量扫描返回列表页后自动打开控制面板；详情页不显示批量列表弹窗。Sprint 推送项目使用复选框，可同时选择多个项目，分别发送到配置中心对应的 Teams 和邮件收件人。

v6.3.0 起，批量扫描留在列表页，通过 Jira 编号直接调用 REST 接口，不再打开详情页。升级时如存在旧版未完成任务，请先停止，导出需要的旧结果后再重新开始。

v6.4.0 起，Sprint 分析完成后可导出独立交互 HTML 报告。多项目推送预览可下载各项目报告；邮件附件需要按 EMAIL.md 配置工作流附件字段。
