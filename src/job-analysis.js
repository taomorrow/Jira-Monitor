  hub.jobRunners['sprint']=async job=>{
    if(busy||teamsSending)throw Error('Sprint 正在运行，请先完成当前操作。');
    let failure;
    await guard(async()=>{try{
      $('period').value=job.period;await load();for(const x of $('sprints').querySelectorAll('input'))x.checked=true;
      $('status-all').checked=true;for(const x of $('statuses').querySelectorAll('input'))x.checked=true;
      $('attach-report').checked=job.attach;await run();
    }catch(error){failure=error;throw error;}});
    if(failure)throw failure;
    if(!(job.teams||job.email)||!groups.length)return;
    let count=0;for(const x of $('notify-project').querySelectorAll('input')){x.checked=hub.jobProjectAllowed(x.value)&&!!hub.target(x.value+'-1');if(x.checked)count++;}
    if(!count)throw Error('没有可用的已启用通知项目，请检查配置中心。');
    await teamsPreview(true);
  };
