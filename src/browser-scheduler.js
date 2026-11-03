// Opt-in dispatcher: only a retained Jira tab checks the local clock; analysis runs in separate tabs.
const BROWSER_SCHEDULE='jira-monitor-browser-schedule-v1',BROWSER_DISPATCH='jira-monitor-browser-dispatch-v1',SCHEDULER_TAB='jira-monitor-scheduler-tab-v1';
let browserScheduleTimer=null,browserScheduleBusy=false,browserScheduleLast='',browserScheduleError='';
const initialPageTitle=document.title;
const schedulerTab=()=>sessionStorage.getItem(SCHEDULER_TAB)==='1'&&!new URLSearchParams(location.hash.slice(1)).has('jm-job');
function browserScheduleStatus(){
 const n=hub.settings.querySelector('#browser-scheduler-status');if(!n)return;
 const enabled=GM_getValue(BROWSER_SCHEDULE,false)===true;
 n.textContent=!enabled?'浏览器调度已停止。':!schedulerTab()?'浏览器调度已启用；此标签不是调度页。请保留已设为调度页的 Jira 标签。':'此标签正在调度，请右键标签选择“固定”。'+(browserScheduleLast?' 最近检查：'+browserScheduleLast+'。':'')+(browserScheduleError?' '+browserScheduleError:'');
}
async function browserSchedulerTick(){
 if(!schedulerTab()||GM_getValue(BROWSER_SCHEDULE,false)!==true){if(browserScheduleTimer!==null)clearInterval(browserScheduleTimer);browserScheduleTimer=null;if(schedulerTab())document.title=initialPageTitle;browserScheduleStatus();return;}
 if(browserScheduleBusy)return;
 browserScheduleBusy=true;browserScheduleError='';
 try{
  if(!navigator.locks?.request)throw Error('浏览器不支持防重复锁，请使用新版 Chrome。');
  await navigator.locks.request('jira-monitor-browser-dispatch',{ifAvailable:true},async lock=>{
   if(!lock||!schedulerTab()||GM_getValue(BROWSER_SCHEDULE,false)!==true)return;
   const records=GM_getValue(BROWSER_DISPATCH,{}),now=new Date();
   for(const raw of jobList()){
    if(!raw.enabled)continue;
    let job;try{job=validJob(raw);}catch(error){browserScheduleError='有 Job 配置无效：'+error.message;continue;}
    const slot=jobSlot(job,now);if(!slot)continue;
    const last=GM_getValue(JOB_LOG,{})[job.id];
    if(records[job.id]?.slot===slot||last?.slot===slot)continue;
    // Claim before opening; a second fixed tab cannot open the same slot again.
    records[job.id]={slot,openedAt:now.toISOString()};GM_setValue(BROWSER_DISPATCH,records);
    jobLog(job.id,{slot,status:'queued',message:'调度页已打开任务标签，等待运行；若一直等待，请检查油猴启用及 Jira 登录。'});
    try{
     if(typeof GM_openInTab!=='function')throw Error('缺少打开标签权限，请更新脚本并允许 GM_openInTab。');
     const url=new URL(job.url);url.hash=new URLSearchParams({'jm-job':job.id}).toString();
     const opened=GM_openInTab(url.href,{active:false,insert:true,setParent:false});
     if(opened&&typeof opened.then==='function')await opened;
    }catch(error){jobLog(job.id,{status:'failed',message:'无法打开任务页：'+error.message+'；未自动重试。'});browserScheduleError=error.message;}
   }
  });
  browserScheduleLast=new Date().toLocaleTimeString('zh-CN',{hour12:false});
 }catch(error){browserScheduleError=error.message;}
 finally{browserScheduleBusy=false;browserScheduleStatus();}
}
hub.startBrowserScheduler=()=>{
 if(browserScheduleTimer!==null)clearInterval(browserScheduleTimer);browserScheduleTimer=null;
 if(!schedulerTab()||GM_getValue(BROWSER_SCHEDULE,false)!==true){browserScheduleStatus();return;}
 document.title='◷ Jira Monitor 调度中';
 // A low-frequency clock check does not fetch Jira data or run scans in the retained tab.
 browserScheduleTimer=setInterval(()=>browserSchedulerTick(),30000);
 void browserSchedulerTick();browserScheduleStatus();
};
hub.renderBrowserScheduler=panel=>{
 const card=el('fieldset',null,panel);card.id='browser-scheduler';card.style.cssText='border:1px solid #dbe3f0;border-radius:10px;padding:12px;margin:12px 0;background:#edf3ff';
 el('strong','固定标签页调度（推荐）',card);el('p','保留此 Jira 标签页即可，到点会自动新建后台任务标签。无需 Mac 安装器。使用本机时区；电脑需保持唤醒、Jira 登录有效。',card);
 el('p',null,card).id='browser-scheduler-status';
 const start=el('button','设此标签页为调度页',card);start.id='browser-scheduler-start';start.onclick=()=>{
  if(new URLSearchParams(location.hash.slice(1)).has('jm-job')){browserScheduleError='任务执行页不能同时作为调度页，请另开一个普通 Jira 页面。';const p=card.querySelector('#browser-scheduler-status');p.textContent=browserScheduleError;return;}
  sessionStorage.setItem(SCHEDULER_TAB,'1');GM_setValue(BROWSER_SCHEDULE,true);hub.startBrowserScheduler();
 };
 const stop=el('button','停止浏览器调度',card);stop.id='browser-scheduler-stop';stop.onclick=()=>{GM_setValue(BROWSER_SCHEDULE,false);sessionStorage.removeItem(SCHEDULER_TAB);if(browserScheduleTimer!==null)clearInterval(browserScheduleTimer);browserScheduleTimer=null;document.title=initialPageTitle;browserScheduleStatus();};
 el('small','每 30 秒检查一次；多个调度页自动防重复。关闭或冻结全部调度页将停止检查，恢复时仅补触发最近 10 分钟内的时间点。已开始的任务不会因停止调度而中止。请停用旧 Mac 定时项。',card);
 browserScheduleStatus();
};
addEventListener('pagehide',()=>{if(browserScheduleTimer!==null)clearInterval(browserScheduleTimer);browserScheduleTimer=null;});
addEventListener('pageshow',()=>hub.startBrowserScheduler());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void browserSchedulerTick();});
