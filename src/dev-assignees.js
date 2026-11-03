  function devOwnerLabel(item){return item.devAssignees?.map(u=>u.name).join('、')||(item.devAssignees?'子任务暂无已分配负责人':'请重新扫描子任务负责人');}
  function scanOwnerLabel(item){const dev=(item.rules||[]).some(r=>norm(r.name)==='DEV'&&Number.isFinite(r.seconds)),other=(item.rules||[]).some(r=>norm(r.name)!=='DEV'&&Number.isFinite(r.seconds));return dev?'DEV 子任务：'+devOwnerLabel(item)+(other?'；DCT：'+(item.assignee||'未分配'):''):(item.assignee||'未分配');}
  const bugIssueType=type=>/^(bug|缺陷|错误)$/i.test(String(type?.name||'').trim());
  const subtaskIssueType=type=>!bugIssueType(type)&&(type?.subtask===true||/^(subtask|子任务)$/i.test(String(type?.name||'').replace(/[\s_-]/g,'')));
  // Only verified Subtasks contribute DEV owners; never related Bugs or the Story owner.
  async function subtaskAssignees(fields,checkpoint){
    const users=new Map(),children=subtaskIssueType(fields.issuetype)?[{fields}]:fields.subtasks||[];
    for(const child of children){
      checkpoint();let data=child.fields||{},type=data.issuetype;
      if(type&&!subtaskIssueType(type))continue;
      if(!type||data.assignee===undefined){
        if(!child.key)throw Error('Sub-task 缺少工单编号，无法读取负责人');
        const issue=await api('/rest/api/2/issue/'+encodeURIComponent(child.key)+'?fields=assignee,issuetype');checkpoint();data=issue.fields||{};type=data.issuetype;
        if(!type)throw Error(child.key+' 未返回工单类型，无法确认 Sub-task');
        if(!subtaskIssueType(type))continue;
      }
      if(!Object.hasOwn(data,'assignee'))throw Error((child.key||'Sub-task')+' 未返回子任务负责人');
      const assignee=data.assignee;if(!assignee)continue;
      const user={name:assignee.displayName||assignee.name||assignee.emailAddress||'未命名用户',account:assignee.accountId||assignee.name||assignee.key||'',email:assignee.emailAddress||''};
      const id=String(user.email||user.account||user.name).toLowerCase();if(!users.has(id))users.set(id,user);
    }
    return [...users.values()];
  }
  function teamsPayload(current,rulesConfig=CONFIG.rules,automatic=true,target=projectTarget(current.key)){
    if(detailOnly||get()?.mode==='single')target={...target,recipients:[]};
    const base=baseTeamsPayload(current,rulesConfig,automatic,target),dev=base.rules.some(r=>norm(r.name)==='DEV'),other=base.rules.some(r=>norm(r.name)!=='DEV');
    if(!dev)return base;
    const users=[...(current.devAssignees||[])];
    if(other)users.push({name:current.assignee||'未分配',account:current.assigneeAccount||'',email:current.assigneeEmail||''});
    const unique=[...new Map(users.map(u=>[String(u.email||u.account||u.name).toLowerCase(),u])).values()];
    const label=unique.map(u=>u.name).join('、')||(current.devAssignees?'子任务暂无已分配负责人':'未读取子任务负责人，请重新扫描');
    const payload=baseTeamsPayload({...current,assignee:label,assigneeEmail:'',assigneeAccount:''},rulesConfig,automatic,target),card=payload.attachments[0].content;
    const entities=[],names=[];
    for(const user of unique){const mapped=CONFIG.teamsMentionUsers[user.account],mention=CONFIG.mentionAssignee&&(mapped?.id?mapped:user.email?{id:user.email,name:user.name}:null);if(mention){const name=String(mention.name||user.name).replace(/[<>]/g,''),text='<at>'+name+'</at>';if(!entities.some(e=>e.mentioned.id.toLowerCase()===String(mention.id).toLowerCase()))entities.push({type:'mention',text,mentioned:{id:String(mention.id),name}});names.push(text);}else names.push(user.name);}
    card.msteams.entities=entities;card.body[2].text='通知负责人：'+(names.join('、')||label);
    payload.devAssignees=current.devAssignees||[];payload.assignee=label;return payload;
  }
