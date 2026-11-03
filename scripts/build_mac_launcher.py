"""Build an ad-hoc signed universal app template on macOS; never run its installer."""
from pathlib import Path
import base64
import json
import plistlib
import subprocess
import tempfile
root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='jira-monitor-launcher-') as tmp:
    app = Path(tmp) / 'Jira Monitor Installer.app'
    contents = app / 'Contents'
    (contents/'MacOS').mkdir(parents=True)
    (contents/'Resources').mkdir()
    binary = contents/'MacOS/JiraMonitorInstaller'
    subprocess.run(['xcrun', 'clang', '-O2', '-Wall', '-Wextra', '-arch', 'arm64', '-arch', 'x86_64', '-mmacosx-version-min=11.0', str(root/'native/mac-launcher.c'), '-o', str(binary)], check=True)
    (contents/'Info.plist').write_bytes(plistlib.dumps({'CFBundleExecutable':'JiraMonitorInstaller','CFBundleIdentifier':'com.taomorrow.jira-monitor.installer','CFBundleName':'Jira Monitor Installer','CFBundleDisplayName':'Jira Monitor 定时任务安装器','CFBundlePackageType':'APPL','CFBundleVersion':'2','LSUIElement':True}))
    (contents/'Resources/install.applescript').write_bytes((root/'native/installer.applescript').read_bytes())
    # Sign the complete static bundle, including its resource envelope. This is not Developer ID/notarization.
    subprocess.run(['/usr/bin/codesign', '--force', '--sign', '-', str(app)], check=True)
    subprocess.run(['/usr/bin/codesign', '--verify', '--deep', '--strict', str(app)], check=True)
    entries=[]
    for file in sorted(contents.rglob('*')):
        if file.is_file():
            entries.append([file.relative_to(contents).as_posix(),base64.b64encode(file.read_bytes()).decode(),0o100755 if file==binary else 0o100644])
    (root/'src/mac-app-template.base64').write_text(base64.b64encode(json.dumps(entries,separators=(',',':')).encode()).decode()+'\n')
