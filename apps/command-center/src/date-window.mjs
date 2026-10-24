// Only an explicit, valid interval can be called current. Unknown dates stay unknown.
export function classifyWindow(start,end,now=Date.now()){
 const parse=v=>typeof v==='string'&&v.trim()?Date.parse(v):NaN;
 const from=parse(start),to=parse(end);
 if(Number.isFinite(from)&&Number.isFinite(to)&&from>=to)return {status:'invalid',label:'日期区间异常'};
 if(Number.isFinite(to)&&now>=to)return {status:'ended',label:'已结束'};
 if(Number.isFinite(from)&&now<from)return {status:'upcoming',label:'未开始'};
 if(!Number.isFinite(from)||!Number.isFinite(to))return {status:'unknown',label:'时间待核实'};
 return {status:'current',label:'进行中'};
}
export function formatWindow(start,end){
 const text=value=>{
  if(!value)return '待核实';
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  if(!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))return '时区待核实';
  return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(value))+' JST';
 };
 return text(start)+' → '+text(end);
}
