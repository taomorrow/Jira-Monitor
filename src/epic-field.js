  let epicClause='Epic Link';
  async function detectField(){
    if(field)return field;
    const fields=await api('/rest/api/2/field');
    const candidates=fields.filter(f=>f.schema?.custom==='com.pyxis.greenhopper.jira:gh-epic-link');
    if(candidates.length>1)throw Error('无法唯一识别 Epic Link 字段，请联系维护者检查字段定义。');
    if(candidates.length===1){const definition=candidates[0];epicClause=definition.clauseNames?.find(n=>!/^cf\[|^customfield_/i.test(n))||definition.name||'Epic Link';return field=definition.id;}
    if(fields.some(f=>f.id==='parent'))return field='parent';
    throw Error('当前 Jira 未提供 Epic Link 或 parent 字段，无法按 Epic 分析。');
  }
