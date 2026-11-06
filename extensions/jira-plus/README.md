# Jira+

独立的 Chrome / Edge Manifest V3 扩展，基于 **Jira Monitor 6.10.4**，扩展版本 **6.10.4.1**。

[下载安装包](https://github.com/taomorrow/Jira-Monitor/releases/download/jira-plus-v6.10.4.1/JiraPlus-6.10.4.1.zip)

## Mac 安装

1. 下载 ZIP，解压到一个固定位置，例如“文稿/JiraPlus”。
2. Chrome 打开 `chrome://extensions`；Edge 打开 `edge://extensions`。
3. 打开“开发者模式”，点击“加载已解压的扩展程序”，选择解压后含 `manifest.json` 的文件夹。
4. 打开 Jira 页面，点击浮动星号或浏览器工具栏的 Jira+ 图标。点击工具栏图标时，如果当前不是 Jira，会打开默认筛选页。
5. 在 Configuration 配置项目 Webhook、邮件收件人与 Job。测试通过后，在该浏览器停用旧 Jira Monitor 油猴脚本，避免两个产品各自扫描或发送通知。油猴和旧脚本不用卸载。

无需油猴、终端或 Mac 安装器。扩展只在 `https://jira.xpaas.lenovo.com/` 注入，读取已有 Jira 登录态。

## 保留与隔离

- 冻结基线为提交 `1c1f74ab6ac1e3383ebd9c0082369b735f17a30d` 的 6.10.4，原文件保存在 `vendor/`；不跟随仓库主脚本更新。
- 保留 COE、Sprint、Epic、Configuration、Teams/邮件、交互报告、固定标签 Job；没有 Kanban 和 Due。
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
