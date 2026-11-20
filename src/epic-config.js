// This preference affects only oversized Epic Teams notifications, never scan or email scope.
const EPIC_PUSH_KEYS='jira-monitor-epic-push-keys-v1';
function parseEpicPushKeys(value){const keys=[...new Set(String(value||'').toUpperCase().split(/[\s,，;；]+/).filter(Boolean))];if(keys.some(key=>!/^([A-Z][A-Z0-9_]*)-\d+$/.test(key)))throw Error('Epic Key 格式无效，例如 OSPIT-9421；多个 Key 请换行或用逗号分隔。');return keys;}
hub.epicPushKeys=()=>parseEpicPushKeys((GM_getValue(EPIC_PUSH_KEYS,[])||[]).join('\n'));
hub.renderEpicConfig=()=>{
 hub.settings.querySelector('#epic-push-settings')?.remove();const section=el('section',null,hub.settings);section.id='epic-push-settings';section.style.cssText='border:1px solid #dbe3f0;border-radius:12px;padding:16px;margin:16px 0';el('h3','Epic 推送配置',section);el('p','Epic 的 Teams 内容超限时，仅发送下列 Epic；仍超限按完整 Epic 分页。留空则保留全部 Epic。扫描、邮件及交互附件不受此配置限制。',section);
 const label=el('label','Epic Key（多个可换行或逗号分隔）',section),input=el('textarea',null,label);input.id='epic-push-keys';input.rows=4;input.placeholder='OSPIT-9421\nCSP-100';input.style.cssText='display:block;width:min(620px,100%);margin:8px 0;font:inherit';const status=el('p',null,section);status.id='epic-push-status';status.setAttribute('role','status');try{input.value=hub.epicPushKeys().join('\n');}catch(error){status.textContent=error.message;}
 const save=el('button','保存 Epic 配置',section);save.id='epic-push-save';save.onclick=()=>{try{const keys=parseEpicPushKeys(input.value);GM_setValue(EPIC_PUSH_KEYS,keys);input.value=keys.join('\n');status.textContent=keys.length?'已保存 '+keys.length+' 个 Epic：'+keys.join(' / '):'已清空配置，超限时保留全部 Epic 并分页。';}catch(error){status.textContent=error.message;}};
};
hub.menuTeamsPayloads=(payload,menu,project)=>{
 if(payload.teams?.enabled===false)return [payload];const parts=jobTeamsParts([{menu,payload}],project,{epicKeys:hub.epicPushKeys()});
 if(parts.length===1)return [{...payload,attachments:[parts[0].attachment],teams:{enabled:true}}];
 const result=payload.email?.enabled?[{...payload,attachments:[],teams:{enabled:false},deliveryMode:'email-only'}]:[];
 parts.forEach((part,i)=>result.push({...payload,text:project+' · '+jobTeamsLabels[menu]+' · '+(i+1)+'/'+parts.length,email:{enabled:false},teams:{enabled:true,part:i+1,parts:parts.length},attachments:[part.attachment],deliveryMode:'teams-only'}));return result;
};
