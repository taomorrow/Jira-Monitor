# Add exact snapshot Jira links to both frozen Sprint and Epic Teams reports.
def apply_teams_links(source):
 old="      body.push({type:'Container',separator:true,spacing:'Large',items});"
 assert source.count(old)==2
 new="""      const openKeys=keys=>({type:'Action.OpenUrl',title:'查看对应 Jira 工单',url:new URL('/issues/?'+new URLSearchParams({jql:keys.length?'key in ('+[...new Set(keys)].join(',')+')':'created > now() AND created < now()'}),jiraUrl).href});
      const all=g.issues.map(x=>x.issue.key),changed=g.issues.filter(x=>x.changed).map(x=>x.issue.key),newKeys=g.issues.filter(x=>!x.before&&x.after).map(x=>x.issue.key);
      items[2].columns.forEach((column,i)=>{column.selectAction=openKeys([total.after.map(x=>x.key),changed,newKeys][i]);});
      rows.forEach((r,i)=>{const a=r.before.map(x=>x.key),b=r.after.map(x=>x.key),union=[...new Set([...a,...b])],delta=union.filter(key=>a.includes(key)!==b.includes(key)),row=items[4+i];row.columns.forEach((column,j)=>{column.selectAction=openKeys([union,a,b,delta,delta][j]);});});
      body.push({type:'Container',separator:true,spacing:'Large',selectAction:openKeys(all),items});"""
 return source.replace(old,new)
