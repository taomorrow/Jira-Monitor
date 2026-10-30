  // Read Jira REST data in the current tab; never click issue links or navigate.
  async function scanDirect(){
    if(busy)return;
    const initial=get();if(!initial?.active||initial.mode!=='batch')return;
    const id=initial.id,token=epoch;busy=true;
    try{
      while(true){
        const state=valid(id,token);
        if(state.index>=state.queue.length){state.active=false;state.paused=false;state.phase='done';state.message=state.dashboardScan?'Dashboard 已加载工单接口扫描完成（不含未加载的小组件分页）':`接口扫描完成：${state.index}/${state.queue.length} 条（查询共 ${state.total??state.queue.length} 条）`;save(state);if(!state.autoSummaryAttempted){state.autoSummaryAttempted=true;save(state);await sendBatchAlerts(state,true);}break;}
        const item=state.queue[state.index];update(`接口读取 ${item.key}（${state.index+1}/${state.queue.length}）…`);
        const data=await issueHistory(item.key,()=>valid(id,token));
        const current=valid(id,token),now=Date.now();
        const result={...item,summary:data.summary,assignee:data.assignee,assigneeEmail:data.assigneeEmail,assigneeAccount:data.assigneeAccount,currentStatus:data.status,checkedAt:now,source:data.source,rules:evaluateHistory(data.events,data.status,current.rules,now)};
        current.results.push(result);current.index++;current.phase='reading';current.message=`接口扫描 ${current.index}/${current.queue.length} · ${item.key}`;
        // Persist the completed item before notification, so pause/reload cannot count it twice.
        save(current);render();
        valid(id,token);
      }
    }catch(error){
      if(error.message!=='CANCELLED'){
        const state=get();if(state?.id===id&&token===epoch){state.active=false;state.paused=true;state.message='接口扫描暂停：'+safeError(error)+'；已保留进度，点击开始统计重试当前工单。';save(state);}
      }
    }finally{if(token===epoch)busy=false;render();}
  }
  async function startApiBatch(){
    const previous=get();if(previous?.active||teamsSending)return;
    if(previous?.paused&&previous.mode==='batch'){
      if(!previous.apiScan){notice('这是旧版逐页扫描任务。请先停止，再重新开始接口扫描；旧结果仍可导出。');return;}
      epoch++;busy=false;previous.active=true;previous.paused=false;previous.jobDirect=false;previous.message='继续接口扫描，保留已完成结果';save(previous);render();
      if(previous.phase==='collecting')await continueCollection();else await scanDirect();return;
    }
    epoch++;busy=false;
    const state={id:'api-'+Date.now()+'-'+epoch,mode:'batch',apiScan:true,active:true,paused:false,rules:JSON.parse(JSON.stringify(CONFIG.rules)),scope:scope.value,listUrl:location.href,queue:[],index:0,results:[],phase:'reading'};
    if(isDashboard()){
      state.dashboardScan=true;state.queue=dashboardIssues();state.total=state.queue.length;
      if(!state.queue.length){notice('Dashboard 未识别到工单编号。'+dashboardDiagnostics);return;}
    }else if(scope.value==='all'){
      state.phase='collecting';state.message='通过接口收集当前查询的全部分页…';save(state);render();await continueCollection();return;
    }else{
      state.queue=summaryLinks().filter(item=>!item.currentStatus||state.rules.some(rule=>rule.currentStatuses.map(norm).includes(norm(item.currentStatus)))).map(({anchor,...item})=>item);state.total=state.queue.length;
      if(!state.queue.length){notice('当前页未找到符合状态范围的工单，请等待 Jira 列表加载后重试。');return;}
    }
    save(state);render();await scanDirect();
  }
