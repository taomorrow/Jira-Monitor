# 安装 Jira Monitor

通过 Tampermonkey 安装本目录 `jiraMonitor.user.js`，停用独立 Sprint Analysis，然后刷新 Jira。

右下角 Jira Monitor → 共享 Teams / 邮件配置 → 按项目 Key 保存通知目标。

超时预警 → 开始统计；Sprint Analysis → 载入当前页面 → 选择 Sprint 和状态 → 开始分析。

详情自动分析默认关闭，可在顶部开启。旧 Monitor 的项目设置在沿用同一脚本身份升级时保留。独立 Sprint 的旧 Webhook 需要手动复制。

完整功能、邮件工作流和开发说明见 README.md。
