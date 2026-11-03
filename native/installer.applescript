try
  set installerPath to system attribute "JM_INSTALL_SCRIPT"
  try
    do shell script "/usr/bin/test -f " & quoted form of installerPath
  on error
    set installerPath to POSIX path of (choose file with prompt "请选择同一解压文件夹中的 Jira-Monitor-Schedule.sh 配置文件")
  end try
  display dialog "将安装或更新 Jira Monitor 定时任务。使用你导出时选择的时间和浏览器。" with title "Jira Monitor" buttons {"取消", "安装"} default button "安装" cancel button "取消"
  do shell script "/bin/bash " & quoted form of installerPath
  display dialog "定时任务已安装。请保持 Mac 唤醒、Jira 登录有效。" with title "Jira Monitor" buttons {"完成"} default button "完成"
on error errorMessage number errorNumber
  if errorNumber is not -128 then
    display dialog "安装未完成：" & errorMessage with title "Jira Monitor" buttons {"关闭"} default button "关闭" with icon stop
  end if
end try
