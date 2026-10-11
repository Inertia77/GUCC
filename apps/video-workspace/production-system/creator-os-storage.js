(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GuccCreatorStorage=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  // Only historical snapshots use the pool. The active project keeps its existing
  // JSON shape, so older integrations can still identify it. No history is pruned.
  const marker="$guccText",escaped="$guccObject";
  function unpackProject(project){
    if(!project?.historyCodec)return project;
    const p=JSON.parse(JSON.stringify(project)),pool=p.historyCodec.strings;
    if(p.historyCodec.version!==1||!Array.isArray(pool))throw Error("不支持的历史编码；请保留备份");
    function decode(v){
      if(!v||typeof v!=="object")return v;
      if(!Array.isArray(v)&&Object.keys(v).length===1&&marker in v){
        if(!Number.isInteger(v[marker])||typeof pool[v[marker]]!=="string")throw Error("历史文本引用损坏");
        return pool[v[marker]];
      }
      if(!Array.isArray(v)&&Object.keys(v).length===1&&escaped in v)
        return Object.fromEntries(v[escaped].map(([k,value])=>[k,decode(value)]));
      if(Array.isArray(v))return v.map(decode);
      return Object.fromEntries(Object.entries(v).map(([k,value])=>[k,decode(value)]));
    }
    for(const key of ["stepUndoHistory","retractedStages","conflictBackups"])
      if(Array.isArray(p[key]))p[key]=p[key].map(e=>({...e,snapshot:decode(e.snapshot)}));
    delete p.historyCodec;
    return p;
  }
  function packProject(project){
    const p=JSON.parse(JSON.stringify(unpackProject(project))),counts=new Map(),pool=[],indices=new Map();
    const keys=["stepUndoHistory","retractedStages","conflictBackups"];
    function count(v){
      if(typeof v==="string"&&v.length>=80)counts.set(v,(counts.get(v)||0)+1);
      else if(v&&typeof v==="object")Object.values(v).forEach(count);
    }
    for(const key of keys)for(const e of p[key]||[])count(e.snapshot);
    for(const [value,n] of counts)if(n>1){indices.set(value,pool.length);pool.push(value);}
    if(!pool.length)return p;
    function encode(v){
      if(typeof v==="string"&&indices.has(v))return {[marker]:indices.get(v)};
      if(!v||typeof v!=="object")return v;
      if(Array.isArray(v))return v.map(encode);
      const entries=Object.entries(v).map(([k,value])=>[k,encode(value)]);
      if(marker in v||escaped in v)return {[escaped]:entries};
      return Object.fromEntries(entries);
    }
    for(const key of keys)if(Array.isArray(p[key]))p[key]=p[key].map(e=>({...e,snapshot:encode(e.snapshot)}));
    p.historyCodec={version:1,strings:pool};
    return p;
  }
  return {packProject,unpackProject};
});
