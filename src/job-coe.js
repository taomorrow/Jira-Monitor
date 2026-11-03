  if(!detailOnly)hub.jobRunners.coe=async job=>{
    const before=get();if(busy||teamsSending||before?.active||before?.paused)throw Error('COE 存在正在运行或暂停的任务，请先完成或停止。');
    scope.value='all';await startApiBatch();const state=get();
    if(!state||state.phase!=='done'||state.paused)throw Error(state?.message||'COE 未完成，请检查登录及接口。');
    if(job.teams||job.email){const outcomes=await sendBatchAlerts(state,false);if(outcomes?.some(x=>/失败|未知|跳过/.test(x)))throw Error(outcomes.join('；'));}
  };
