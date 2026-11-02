  function renderNotifyProjects(preserve=false){
    const picker=$('notify-project'),previous=new Map([...picker.querySelectorAll('input')].map(x=>[x.value,x.checked]));picker.replaceChildren();
    const configured=new Map(hub.projects().map(p=>[p.projectKey,p]));
    const keys=[...new Set(groups.flatMap(g=>g.issues.map(x=>x.issue.key.split('-')[0].toUpperCase())))].filter(key=>configured.has(key)).sort();
    for(const key of keys){
      const config=configured.get(key),label=text('label','',picker),input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=preserve&&previous.has(key)?previous.get(key):config.enabled!==false;
      const state=config.enabled===false?'（通知已停用）':!config.webhook?'（未配置 Webhook）':'';
      label.append(input,document.createTextNode(key+state));label.title='Story / 工单所属项目：'+key+(config.projectGroup?'；共享配置：'+config.projectGroup:'')+(state?'；请在配置中心启用并保存':'');
      if(config.enabled===false)input.onchange=()=>{if(input.checked)message(key+' 通知已停用。请在配置中心勾选“启用通知”并保存后推送。',true);};
    }
    if(!keys.length)text('span',groups.length?'本次结果没有已配置的通知项目。':'分析后显示本次结果的通知项目。',picker);
    const note=text('small','仅显示本次结果中已配置的工单所属项目，不是 Epic 名称。',picker);note.style.cssText='flex-basis:100%;color:#718098;font-size:11px';
    const settings=text('button','通知设置',picker);settings.type='button';settings.onclick=()=>hub.configure();
  }
  addEventListener('jira-monitor-project-config',()=>renderNotifyProjects(true));
