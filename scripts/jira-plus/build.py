from pathlib import Path
import hashlib,json,zipfile
from features import apply_job_bundle
root=Path(__file__).resolve().parents[2];ext=root/'extensions/jira-plus'
source=(ext/'vendor/jira-monitor-6.10.4.user.js').read_text()
assert '// @version      6.10.4\n' in source
assert hashlib.sha256((ext/'vendor/jira-monitor-6.10.4.user.js').read_bytes()).hexdigest()=='abb5fdd0fa94f30b468360a3cb29a27d91128f35d69fa2ff3566880a41303522'
source=source[source.index('(function(){'):].replace('Jira Monitor','Jira+').replace('jira-monitor','jira-plus')
# UI copy only; keep the original fixed-tab Job model.
source=source.replace('请检查油猴启用','请检查扩展启用').replace('缺少油猴跨域请求权限','缺少扩展跨域请求权限').replace('缺少打开标签权限，请更新脚本并允许 GM_openInTab。','无法打开任务标签，请检查扩展状态。')
source=apply_job_bundle(source,ext).replace("v6.10.4'", "v6.10.4.4'")
bridge=(ext/'bridge.js').read_text()
(ext/'content.js').write_text('// Jira+ extension based on frozen Jira Monitor 6.10.4. Generated; do not edit.\n(async()=>{\n'+bridge+'\n'+source+'\n})().catch(error=>console.error("Jira+ 初始化失败",error));\n')
files=['README.md','manifest.json','content.js','background.js','options.html','options.js','options.css',*[str(p.relative_to(ext)) for p in (ext/'icons').glob('*.png')]]
out=root/'dist/jira-plus';out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out/'JiraPlus-6.10.4.4.zip','w',zipfile.ZIP_DEFLATED) as z:
 for file in files:z.write(ext/file,file)
print('Built dist/jira-plus/JiraPlus-6.10.4.4.zip; base SHA256 '+hashlib.sha256((ext/'vendor/jira-monitor-6.10.4.user.js').read_bytes()).hexdigest())

artifact=out/'JiraPlus-6.10.4.4.zip'
(out/'SHA256SUMS.txt').write_text(hashlib.sha256(artifact.read_bytes()).hexdigest()+'  '+artifact.name+'\n')
