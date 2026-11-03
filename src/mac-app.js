// A stored ZIP preserves Unix executable permissions, unlike a downloaded .command file.
function macAppArchive(installer){
 const encoder=new TextEncoder(),folder='Jira Monitor Installer.app/Contents/';
 const plist='<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>JiraMonitorInstaller</string><key>CFBundleIdentifier</key><string>com.taomorrow.jira-monitor.installer</string><key>CFBundleName</key><string>Jira Monitor Installer</string><key>CFBundleDisplayName</key><string>Jira Monitor 定时任务安装器</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>LSUIElement</key><true/></dict></plist>';
 const launcher='#!/bin/bash\nset -e\napp_dir="$(/usr/bin/dirname "$0")/.."\nexport JM_INSTALL_SCRIPT="$app_dir/Resources/install.sh"\nexec /usr/bin/osascript "$app_dir/Resources/install.applescript"\n';
 const script=`try
  display dialog "将安装或更新 Jira Monitor 定时任务。使用你导出时选择的时间和浏览器。" with title "Jira Monitor" buttons {"取消", "安装"} default button "安装" cancel button "取消"
  set installerPath to system attribute "JM_INSTALL_SCRIPT"
  do shell script "/bin/bash " & quoted form of installerPath
  display dialog "定时任务已安装。请保持 Mac 唤醒、Jira 登录有效。" with title "Jira Monitor" buttons {"完成"} default button "完成"
on error errorMessage number errorNumber
  if errorNumber is not -128 then
    display dialog "安装未完成：" & errorMessage with title "Jira Monitor" buttons {"关闭"} default button "关闭" with icon stop
  end if
end try
`;
 const files=[['Info.plist',plist,0o100644],['MacOS/JiraMonitorInstaller',launcher,0o100755],['Resources/install.applescript',script,0o100644],['Resources/install.sh',installer,0o100644]];
 const crc32=bytes=>{let crc=0xffffffff;for(const b of bytes){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
 const chunks=[],directory=[];let offset=0;
 for(const [path,content,mode] of files){
  const name=encoder.encode(folder+path),data=encoder.encode(content),crc=crc32(data),header=new Uint8Array(30+name.length),h=new DataView(header.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);header.set(name,30);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,0x0314,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(38,(mode<<16)>>>0,true);c.setUint32(42,offset,true);central.set(name,46);
  chunks.push(header,data);directory.push(central);offset+=header.length+data.length;
 }
 const size=directory.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
 const archive=new Uint8Array(offset+size+end.length);let index=0;for(const chunk of [...chunks,...directory,end]){archive.set(chunk,index);index+=chunk.length;}return archive;
}
