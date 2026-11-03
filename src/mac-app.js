// Load the native installer only after the user chooses Export; never during Jira startup.
let macTemplatePromise;
function loadMacAppTemplate(){
 if(macTemplatePromise)return macTemplatePromise;
 macTemplatePromise=new Promise((resolve,reject)=>{
  GM_xmlhttpRequest({method:'GET',url:'https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/src/mac-app-template.base64',anonymous:true,timeout:30000,
   onload:async response=>{try{
    if(response.status!==200)throw Error('安装器下载失败（HTTP '+response.status+'），请检查 GitHub 连接后重试。');
    const encoded=String(response.responseText||'').trim();if(!encoded||encoded.length>1000000)throw Error('安装器数据无效。');
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(encoded));
    const actual=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(actual!=='__MAC_APP_SHA256__')throw Error('安装器校验失败，请更新 Jira Monitor 后重新导出。未生成安装文件。');
    const template=JSON.parse(atob(encoded));resolve(template);
   }catch(error){reject(error);}},
   onerror:()=>reject(Error('无法下载 Mac 安装器，请检查 GitHub 连接后重试。')),
   ontimeout:()=>reject(Error('Mac 安装器下载超时，请重试。'))});
 }).catch(error=>{macTemplatePromise=null;throw error;});
 return macTemplatePromise;
}
// A stored ZIP preserves Unix executable permissions, unlike a downloaded .command file.
async function macAppArchive(installer){
 const encoder=new TextEncoder(),folder='Jira Monitor Installer.app/Contents/';
 const template=await loadMacAppTemplate();
 // Keep signed app contents immutable; schedule payload stays beside the app.
 const files=template.map(([path,data,mode])=>[folder+path,Uint8Array.from(atob(data),c=>c.charCodeAt(0)),mode]);
 files.push(['Jira-Monitor-Schedule.sh',encoder.encode(installer),0o100644]);
 const crc32=bytes=>{let crc=0xffffffff;for(const b of bytes){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
 const chunks=[],directory=[];let offset=0;
 for(const [path,content,mode] of files){
  const name=encoder.encode(path),data=typeof content==='string'?encoder.encode(content):content,crc=crc32(data),header=new Uint8Array(30+name.length),h=new DataView(header.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);header.set(name,30);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,0x0314,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(38,(mode<<16)>>>0,true);c.setUint32(42,offset,true);central.set(name,46);
  chunks.push(header,data);directory.push(central);offset+=header.length+data.length;
 }
 const size=directory.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
 const archive=new Uint8Array(offset+size+end.length);let index=0;for(const chunk of [...chunks,...directory,end]){archive.set(chunk,index);index+=chunk.length;}return archive;
}
