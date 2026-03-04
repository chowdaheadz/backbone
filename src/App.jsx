import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase.js";

const C = {
  bg:"#eef0f6",surface:"#ffffff",card:"#f5f6fa",border:"#d8dcea",
  navy:"#0c1230",navyLight:"#1e2c5a",red:"#990000",
  text:"#0c1230",textMuted:"#6b7494",green:"#1a7f4b",orange:"#c2610a",blue:"#1d5fa8",purple:"#6b35a3",
};

const PRIORITIES=["Low","Medium","High","Critical"];
const PCOL={Low:"#1d5fa8",Medium:"#1a7f4b",High:"#c2610a",Critical:"#990000"};
const STATUSES=["To Do","In Progress","Review","Done"];
const SCOL={"To Do":"#6b7494","In Progress":"#1d5fa8","Review":"#c2610a","Done":"#1a7f4b"};
const CATEGORIES_DEFAULT=["Operations","Marketing","Fulfillment","IT","Finance","HR","General"];
const ROLES=["admin","lead","employee"];
const FREQS=["daily","weekly","biweekly","monthly"];
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const FCOL={daily:"#1d5fa8",weekly:"#1a7f4b",biweekly:"#c2610a",monthly:"#6b35a3"};
const FLABEL={daily:"Daily",weekly:"Weekly",biweekly:"Bi-Weekly",monthly:"Monthly"};
const GOAL_STATUSES=["Not Started","In Progress","Completed"];
const GCOL={"Not Started":"#6b7494","In Progress":"#1d5fa8","Completed":"#1a7f4b"};

const today=new Date();today.setHours(0,0,0,0);
const t0=today.toISOString().split("T")[0];
const fmt=d=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";
const fmtS=d=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"—";
const addDays=(base,n)=>{const d=new Date(base);d.setDate(d.getDate()+n);return d.toISOString().split("T")[0];};
const mkI=name=>name.trim().split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);
const ord=n=>n+(n===1?"st":n===2?"nd":n===3?"rd":"th");

function advanceNextDue(date,freq){
  const d=new Date(date);
  if(freq==="daily")d.setDate(d.getDate()+1);
  if(freq==="weekly")d.setDate(d.getDate()+7);
  if(freq==="biweekly")d.setDate(d.getDate()+14);
  if(freq==="monthly")d.setMonth(d.getMonth()+1);
  return d.toISOString().split("T")[0];
}

function freqLabel(r){
  if(r.frequency==="daily")return"Every day";
  if(r.frequency==="weekly")return`Every ${DAYS[r.dayOfWeek??1]}`;
  if(r.frequency==="biweekly")return`Every other ${DAYS[r.dayOfWeek??1]}`;
  if(r.frequency==="monthly")return`Monthly on the ${ord(r.dayOfMonth??1)}`;
  return"";
}

let nextEid=7,nextTid=20,nextRid=10,nextCid=100,nextSid=100,nextGid=1;

const EMP0=[
  {id:1,name:"Ryan",role:"admin",initials:"RY"},
  {id:2,name:"Alex",role:"lead",initials:"AL"},
  {id:3,name:"Sam",role:"lead",initials:"SM"},
  {id:4,name:"Jordan",role:"employee",initials:"JR"},
  {id:5,name:"Casey",role:"employee",initials:"CS"},
  {id:6,name:"Morgan",role:"employee",initials:"MG"},
];

const TASKS_SEED=[
  {id:1,title:"Update product listings on website",category:"Marketing",priority:"High",status:"In Progress",assignee:4,dueDate:addDays(today,3),createdBy:1,description:"Review all active SKUs and ensure photos, descriptions, and pricing are current.",subtasks:[{id:1,text:"Audit current listings",done:true},{id:2,text:"Update photos for top 20 SKUs",done:false},{id:3,text:"Sync prices with inventory system",done:false}],comments:[{id:1,author:1,text:"Focus on the new summer collection first.",date:addDays(today,-2)}]},
  {id:2,title:"Process pending wholesale orders",category:"Fulfillment",priority:"Critical",status:"To Do",assignee:5,dueDate:addDays(today,1),createdBy:2,description:"Three wholesale orders queued and need to ship by EOD tomorrow.",subtasks:[{id:1,text:"Pull inventory for order #1042",done:false},{id:2,text:"Pack and label order #1043",done:false}],comments:[]},
  {id:3,title:"Review Q1 ad spend performance",category:"Marketing",priority:"Medium",status:"To Do",assignee:2,dueDate:addDays(today,7),createdBy:1,description:"Pull Google and Meta ad reports, summarize ROAS, and flag underperforming campaigns.",subtasks:[],comments:[]},
  {id:4,title:"Submit payroll — current period",category:"Finance",priority:"High",status:"Done",assignee:1,dueDate:addDays(today,-1),createdBy:1,description:"Export timeclock CSV and submit through Gusto Smart Import.",subtasks:[{id:1,text:"Export timeclock data",done:true},{id:2,text:"Review hours",done:true},{id:3,text:"Submit to Gusto",done:true}],comments:[{id:1,author:1,text:"Completed and submitted.",date:addDays(today,-1)}]},
  {id:5,title:"Fix Google Merchant Center feed error",category:"IT",priority:"High",status:"In Progress",assignee:1,dueDate:addDays(today,2),createdBy:1,description:"Feed throwing validation errors on several SKUs. Needs schema review.",subtasks:[{id:1,text:"Identify failing SKUs",done:true},{id:2,text:"Fix product data schema",done:false}],comments:[]},
  {id:6,title:"Restock low inventory items",category:"Fulfillment",priority:"Medium",status:"Review",assignee:6,dueDate:addDays(today,5),createdBy:3,description:"Several SKUs below reorder threshold. Draft POs for supplier approval.",subtasks:[],comments:[]},
  {id:7,title:"Onboard new seasonal employee",category:"HR",priority:"Medium",status:"To Do",assignee:3,dueDate:addDays(today,10),createdBy:1,description:"Prepare onboarding packet, system access, and first-week schedule.",subtasks:[{id:1,text:"Send welcome email",done:false},{id:2,text:"Set up system access",done:false},{id:3,text:"Schedule first-day walkthrough",done:false}],comments:[]},
];

const RECURRING_SEED=[
  {id:1,title:"Weekly inventory count",category:"Operations",priority:"Medium",assignee:3,description:"Count all SKUs in warehouse and reconcile with system numbers.",frequency:"weekly",dayOfWeek:1,dayOfMonth:1,active:true,nextDue:addDays(today,0),createdBy:1},
  {id:2,title:"Bi-weekly payroll submission",category:"Finance",priority:"High",assignee:1,description:"Export timeclock CSV and submit through Gusto Smart Import.",frequency:"biweekly",dayOfWeek:5,dayOfMonth:1,active:true,nextDue:addDays(today,4),createdBy:1},
  {id:3,title:"Monthly supplier check-in",category:"Operations",priority:"Low",assignee:2,description:"Review supplier performance, pricing, and lead times. Update vendor scorecard.",frequency:"monthly",dayOfWeek:1,dayOfMonth:1,active:true,nextDue:addDays(today,12),createdBy:1},
  {id:4,title:"Daily order fulfillment check",category:"Fulfillment",priority:"High",assignee:5,description:"Review open orders, flag anything delayed, confirm all shipments are on track.",frequency:"daily",dayOfWeek:1,dayOfMonth:1,active:true,nextDue:addDays(today,0),createdBy:2},
  {id:5,title:"Weekly social media review",category:"Marketing",priority:"Low",assignee:4,description:"Review last week's post performance, schedule upcoming content, check comments.",frequency:"weekly",dayOfWeek:3,dayOfMonth:1,active:false,nextDue:addDays(today,2),createdBy:1},
];

function genRecurring(recurring,existingTasks){
  const newTasks=[];
  const updRec=recurring.map(r=>({...r}));
  for(let i=0;i<updRec.length;i++){
    const r=updRec[i];
    if(!r.active)continue;
    while(updRec[i].nextDue<=t0){
      const nd=updRec[i].nextDue;
      const exists=[...existingTasks,...newTasks].some(t=>t.recurringId===r.id&&t.dueDate===nd&&t.status!=="Done");
      if(!exists){
        newTasks.push({id:nextTid++,title:r.title,category:r.category,priority:r.priority,assignee:r.assignee,dueDate:nd,createdBy:r.createdBy,description:r.description,status:"To Do",subtasks:[],comments:[],recurringId:r.id});
      }
      updRec[i]={...updRec[i],nextDue:advanceNextDue(nd,r.frequency)};
    }
  }
  return{newTasks,updRec};
}

const{newTasks:initNew,updRec:initRec}=genRecurring(RECURRING_SEED,TASKS_SEED);
const INIT_TASKS=[...TASKS_SEED,...initNew];
const INIT_REC=initRec;

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Av({u,size=32}){if(!u)return null;return<div style={{width:size,height:size,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:"bold",color:"#fff",flexShrink:0,border:`2px solid ${C.red}`}}>{u.initials}</div>;}
function PB({priority}){const c=PCOL[priority];return<span style={{background:c+"18",color:c,border:`1px solid ${c}66`,padding:"2px 9px",fontSize:10,letterSpacing:1,fontWeight:700}}>{priority.toUpperCase()}</span>;}
function SB({status}){const c=SCOL[status];return<span style={{background:c+"18",color:c,border:`1px solid ${c}66`,padding:"2px 9px",fontSize:10,letterSpacing:1,fontWeight:700}}>{status.toUpperCase()}</span>;}
function RP({role}){const c=role==="admin"?C.red:role==="lead"?C.orange:C.blue;return<span style={{background:c+"18",color:c,border:`1px solid ${c}55`,padding:"2px 10px",fontSize:10,letterSpacing:1,fontWeight:700}}>{role.toUpperCase()}</span>;}
function FB({freq}){const c=FCOL[freq];return<span style={{background:c+"18",color:c,border:`1px solid ${c}55`,padding:"2px 9px",fontSize:10,letterSpacing:1,fontWeight:700}}>↻ {FLABEL[freq].toUpperCase()}</span>;}
function RecurBadge(){return<span style={{background:C.purple+"18",color:C.purple,border:`1px solid ${C.purple}44`,padding:"1px 7px",fontSize:9,letterSpacing:1,fontWeight:700,marginLeft:6}}>↻ RECURRING</span>;}
function FSel({label,value,onChange,opts}){return<div><div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginBottom:4,fontWeight:700}}>{label}</div><select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.surface,border:`1.5px solid ${C.border}`,color:C.text,padding:"6px 10px",fontFamily:"inherit",fontSize:12}}>{opts.map(o=>typeof o==="object"?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o} value={o}>{o}</option>)}</select></div>;}
function ESel({label,value,onChange,opts,full}){return<div><div style={{fontSize:11,color:C.textMuted,marginBottom:4,fontWeight:700}}>{label}</div><select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"6px 10px",fontFamily:"inherit",fontSize:12,width:full?"100%":"auto"}}>{opts.map(o=>typeof o==="object"?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o}>{o}</option>)}</select></div>;}
function NB({label,active,onClick}){return<button onClick={onClick} style={{background:active?C.red:"none",color:"#fff",border:"none",fontFamily:"inherit",cursor:"pointer",fontSize:12,fontWeight:700,letterSpacing:1,padding:"6px 18px",opacity:active?1:0.65}}>{label}</button>;}
function SH({label,color,count}){return<div style={{fontSize:11,fontWeight:700,color,letterSpacing:2,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,background:color,borderRadius:"50%"}}/>{label}{count!==undefined?` (${count})`:""}</div>;}
function SC({label,value,color,sub}){return<div style={{background:C.surface,border:`1px solid ${C.border}`,padding:"10px 16px",flex:1,borderTop:`3px solid ${color}`,boxShadow:"0 1px 6px #0c123014"}}><div style={{fontSize:20,fontWeight:900,color,lineHeight:1}}>{value}</div><div style={{fontSize:10,color:C.navy,letterSpacing:1,marginTop:4,fontWeight:700}}>{label}</div>{sub&&<div style={{fontSize:10,color:C.textMuted,marginTop:2}}>{sub}</div>}</div>;}

// ── DB helpers ────────────────────────────────────────────────────────────────
const taskFromDb=t=>({id:t.id,title:t.title,category:t.category,priority:t.priority,status:t.status,assignee:t.assignee,dueDate:t.due_date,createdBy:t.created_by,description:t.description,subtasks:t.subtasks??[],comments:t.comments??[],recurringId:t.recurring_id});
const recFromDb=r=>({id:r.id,title:r.title,category:r.category,priority:r.priority,assignee:r.assignee,description:r.description,frequency:r.frequency,dayOfWeek:r.day_of_week,dayOfMonth:r.day_of_month,active:r.active,nextDue:r.next_due,createdBy:r.created_by});
const goalFromDb=g=>({id:g.id,empId:g.emp_id,text:g.text,status:g.status});
const launchFromDb=r=>({id:r.id,name:r.name,sku:r.sku,checks:{Desc:r.check_desc,Tags:r.check_tags,Images:r.check_images,AR4:r.check_ar4,Sirv:r.check_sirv,Linx:r.check_linx,Linx2:r.check_linx2}});

// ── App ───────────────────────────────────────────────────────────────────────
export default function App(){
  const[user,setUser]=useState(null);
  const[emps,setEmps]=useState([]);
  const[tasks,setTasks]=useState([]);
  const[recurring,setRecurring]=useState([]);
  const[view,setView]=useState("list");
  const[modal,setModal]=useState(null);
  const[newT,setNewT]=useState(null);
  const[fSt,setFSt]=useState("All");
  const[fPr,setFPr]=useState("All");
  const[fAs,setFAs]=useState("All");
  const[fCa,setFCa]=useState("All");
  const[calMo,setCalMo]=useState(new Date(today.getFullYear(),today.getMonth(),1));
  const[goals,setGoals]=useState([]);
  const[skuCounters,setSkuCounters]=useState([]);
  const[launches,setLaunches]=useState([]);
  const[launchReady,setLaunchReady]=useState(false);
  const[categories,setCategories]=useState(CATEGORIES_DEFAULT);
  const[catReady,setCatReady]=useState(false);
  const[ideas,setIdeas]=useState([]);
  const[ideaReady,setIdeaReady]=useState(false);
  const[messages,setMessages]=useState([]);
  const[dashMsg,setDashMsg]=useState(null);
  const[loading,setLoading]=useState(true);
  const[dbError,setDbError]=useState(null);
  const dbW=(op,res)=>{if(res.error){const m=`${op}: ${res.error.message}`;console.error('[backbone]',m,res.error);setDbError(m);}return res;};

  useEffect(()=>{
    async function load(){
      const[empRes,taskRes,recRes,goalRes,skuRes,msgRes,launchRes,catRes,ideaRes]=await Promise.all([
        supabase.from('employees').select('*').order('id'),
        supabase.from('tasks').select('*').order('id'),
        supabase.from('recurring').select('*').order('id'),
        supabase.from('goals').select('*').order('id'),
        supabase.from('sku_counters').select('*').order('id'),
        supabase.from('messages').select('*').order('id'),
        supabase.from('product_launches').select('*').order('id'),
        supabase.from('categories').select('*').order('id'),
        supabase.from('ideas').select('*').order('id',{ascending:false}),
      ]);
      [empRes,taskRes,recRes,goalRes,skuRes].forEach((r,i)=>r.error&&console.error('[backbone] load error table',i,r.error));
      const loadedEmps=empRes.data??[];
      const loadedRec=(recRes.data??[]).map(recFromDb);
      const loadedTasks=(taskRes.data??[]).map(taskFromDb);
      const{newTasks,updRec}=genRecurring(loadedRec,loadedTasks);
      let allTasks=loadedTasks;
      if(newTasks.length){
        const rows=newTasks.map(t=>({title:t.title,category:t.category,priority:t.priority,assignee:t.assignee,due_date:t.dueDate,created_by:t.createdBy,description:t.description,status:'To Do',subtasks:[],comments:[],recurring_id:t.recurringId}));
        const{data:ins}=await supabase.from('tasks').insert(rows).select();
        if(ins)allTasks=[...loadedTasks,...ins.map(taskFromDb)];
      }
      for(const r of updRec){
        const orig=loadedRec.find(x=>x.id===r.id);
        if(orig&&orig.nextDue!==r.nextDue)await supabase.from('recurring').update({next_due:r.nextDue}).eq('id',r.id);
      }
      setEmps(loadedEmps);
      setTasks(allTasks);
      setRecurring(updRec);
      setGoals((goalRes.data??[]).map(goalFromDb));
      const skuData=(skuRes.data??[]).map(c=>c.value===0?{...c,value:1500}:c);
      setSkuCounters(skuData);
      skuData.filter(c=>c.value===1500&&(skuRes.data??[]).find(o=>o.id===c.id)?.value===0)
        .forEach(c=>supabase.from('sku_counters').update({value:1500}).eq('id',c.id));
      if(!msgRes.error){const msgs=msgRes.data??[];setMessages(msgs);if(msgs.length>0)setDashMsg(msgs[Math.floor(Math.random()*msgs.length)]);}
      if(!launchRes.error){setLaunches((launchRes.data??[]).map(launchFromDb));setLaunchReady(true);}
      if(!catRes.error&&catRes.data?.length){setCategories(catRes.data.map(c=>c.name));setCatReady(true);}
      if(!ideaRes.error){setIdeas(ideaRes.data??[]);setIdeaReady(true);}
      setLoading(false);
    }
    load();
  },[]);

  const isAdmin=user?.role==="admin";
  const canEdit=user&&(user.role==="admin"||user.role==="lead");

  const filtered=useMemo(()=>tasks.filter(t=>{
    if(fSt!=="All"&&t.status!==fSt)return false;
    if(fPr!=="All"&&t.priority!==fPr)return false;
    if(fAs!=="All"&&t.assignee!==parseInt(fAs))return false;
    if(fCa!=="All"&&t.category!==fCa)return false;
    return true;
  }),[tasks,fSt,fPr,fAs,fCa]);

  const stats=useMemo(()=>({
    total:tasks.length,done:tasks.filter(t=>t.status==="Done").length,
    overdue:tasks.filter(t=>t.status!=="Done"&&t.dueDate&&new Date(t.dueDate)<today).length,
    critical:tasks.filter(t=>t.priority==="Critical"&&t.status!=="Done").length,
  }),[tasks]);

  const handleTaskSave=async updated=>{
    setTasks(p=>p.map(t=>t.id===updated.id?updated:t));
    setModal(m=>m&&m.id===updated.id?updated:m);
    dbW('updateTask',await supabase.from('tasks').update({title:updated.title,category:updated.category,priority:updated.priority,status:updated.status,assignee:updated.assignee,due_date:updated.dueDate,description:updated.description,subtasks:updated.subtasks,comments:updated.comments}).eq('id',updated.id));
    if(updated.recurringId&&updated.status==="Done"){
      setRecurring(p=>p.map(r=>{
        if(r.id!==updated.recurringId)return r;
        let nd=r.nextDue;
        while(nd<=t0)nd=advanceNextDue(nd,r.frequency);
        supabase.from('recurring').update({next_due:nd}).eq('id',r.id);
        return{...r,nextDue:nd};
      }));
    }
  };

  const delTask=async id=>{
    setTasks(p=>p.filter(t=>t.id!==id));
    setModal(null);
    dbW('delTask',await supabase.from('tasks').delete().eq('id',id));
  };

  const crtTask=async d=>{
    const res=await supabase.from('tasks').insert({title:d.title,category:d.category,priority:d.priority,status:d.status,assignee:d.assignee,due_date:d.dueDate,created_by:d.createdBy,description:d.description,subtasks:d.subtasks??[],comments:[]}).select().single();
    dbW('crtTask',res);
    if(res.data)setTasks(p=>[...p,taskFromDb(res.data)]);
    setNewT(null);
  };

  const addCom=(tid,text)=>{if(!text.trim())return;setTasks(p=>p.map(t=>{if(t.id!==tid)return t;const u={...t,comments:[...t.comments,{id:nextCid++,author:user.id,text,date:t0}]};setModal(m=>m?.id===tid?u:m);supabase.from('tasks').update({comments:u.comments}).eq('id',tid).then(r=>dbW('addCom',r));return u;}));};
  const togSub=(tid,sid)=>{setTasks(p=>p.map(t=>{if(t.id!==tid)return t;const u={...t,subtasks:t.subtasks.map(s=>s.id===sid?{...s,done:!s.done}:s)};setModal(m=>m?.id===tid?u:m);supabase.from('tasks').update({subtasks:u.subtasks}).eq('id',tid).then(r=>dbW('togSub',r));return u;}));};
  const addSub=(tid,text)=>{if(!text.trim())return;setTasks(p=>p.map(t=>{if(t.id!==tid)return t;const u={...t,subtasks:[...t.subtasks,{id:nextSid++,text,done:false}]};setModal(m=>m?.id===tid?u:m);supabase.from('tasks').update({subtasks:u.subtasks}).eq('id',tid).then(r=>dbW('addSub',r));return u;}));};

  const addGoal=async g=>{
    const res=await supabase.from('goals').insert({emp_id:g.empId,text:g.text,status:g.status}).select().single();
    dbW('addGoal',res);
    if(res.data)setGoals(p=>[...p,goalFromDb(res.data)]);
  };
  const updGoal=async g=>{setGoals(p=>p.map(x=>x.id===g.id?g:x));dbW('updGoal',await supabase.from('goals').update({text:g.text,status:g.status}).eq('id',g.id));};
  const delGoal=async id=>{setGoals(p=>p.filter(g=>g.id!==id));dbW('delGoal',await supabase.from('goals').delete().eq('id',id));};

  const incSku=async id=>{
    const counter=skuCounters.find(c=>c.id===id);
    if(!counter)return;
    const newVal=counter.value+1;
    setSkuCounters(p=>p.map(c=>c.id===id?{...c,value:newVal}:c));
    dbW('incSku',await supabase.from('sku_counters').update({value:newVal}).eq('id',id));
  };
  const decSku=async id=>{
    const counter=skuCounters.find(c=>c.id===id);
    if(!counter||counter.value<=0)return;
    const newVal=counter.value-1;
    setSkuCounters(p=>p.map(c=>c.id===id?{...c,value:newVal}:c));
    dbW('decSku',await supabase.from('sku_counters').update({value:newVal}).eq('id',id));
  };

  const addLaunch=async l=>{
    const res=await supabase.from('product_launches').insert({name:l.name,sku:l.sku,check_desc:false,check_tags:false,check_images:false,check_ar4:false,check_sirv:false,check_linx:false,check_linx2:false}).select().single();
    dbW('addLaunch',res);
    if(res.data)setLaunches(p=>[...p,launchFromDb(res.data)]);
  };
  const delLaunch=async id=>{
    setLaunches(p=>p.filter(l=>l.id!==id));
    dbW('delLaunch',await supabase.from('product_launches').delete().eq('id',id));
  };
  const togLaunch=async(id,k)=>{
    const col={Desc:'check_desc',Tags:'check_tags',Images:'check_images',AR4:'check_ar4',Sirv:'check_sirv',Linx:'check_linx',Linx2:'check_linx2'}[k];
    const launch=launches.find(l=>l.id===id);
    if(!launch)return;
    const newVal=!launch.checks[k];
    setLaunches(p=>p.map(l=>l.id===id?{...l,checks:{...l.checks,[k]:newVal}}:l));
    dbW('togLaunch',await supabase.from('product_launches').update({[col]:newVal}).eq('id',id));
  };
  const completeLaunch=async(launch)=>{
    const res=await supabase.from('tasks').insert({title:`${launch.name} - Verify`,category:'Products',priority:'Medium',status:'To Do',assignee:user.id,due_date:t0,created_by:user.id,description:'',subtasks:[],comments:[]}).select().single();
    dbW('completeLaunch',res);
    if(res.data){setTasks(p=>[...p,taskFromDb(res.data)]);return true;}
    return false;
  };

  const addIdea=async(title,notes)=>{
    if(!title.trim())return;
    const res=await supabase.from('ideas').insert({title:title.trim(),notes:notes.trim(),created_by:user.id}).select().single();
    dbW('addIdea',res);
    if(res.data)setIdeas(p=>[res.data,...p]);
  };
  const delIdea=async id=>{
    setIdeas(p=>p.filter(x=>x.id!==id));
    dbW('delIdea',await supabase.from('ideas').delete().eq('id',id));
  };
  const ideaToTask=(idea)=>{
    setNewT({...blank,title:idea.title,description:idea.notes??''});
    delIdea(idea.id);
    setView('list');
  };

  const addCategory=async name=>{
    const trimmed=name.trim();
    if(!trimmed||categories.includes(trimmed))return;
    const res=await supabase.from('categories').insert({name:trimmed}).select().single();
    dbW('addCategory',res);
    if(!res.error){setCategories(p=>[...p,trimmed]);setCatReady(true);}
  };
  const delCategory=async name=>{
    setCategories(p=>p.filter(c=>c!==name));
    dbW('delCategory',await supabase.from('categories').delete().eq('name',name));
  };

  const hasPinCol=()=>emps.length>0&&'pin' in emps[0];
  const addEmp=async e=>{
    const initials=mkI(e.name);
    const payload={name:e.name,role:e.role,initials,...(hasPinCol()&&{pin:e.pin||null})};
    const res=await supabase.from('employees').insert(payload).select().single();
    dbW('addEmp',res);
    if(res.data)setEmps(p=>[...p,res.data]);
  };
  const delEmp=async id=>{
    setEmps(p=>p.filter(e=>e.id!==id));
    setTasks(p=>p.map(t=>t.assignee===id?{...t,assignee:null}:t));
    dbW('delEmp',await supabase.from('employees').delete().eq('id',id));
  };
  const updEmp=async e=>{
    const u={...e,initials:mkI(e.name)};
    setEmps(p=>p.map(x=>x.id===u.id?u:x));
    if(user?.id===u.id)setUser(u);
    const payload={name:u.name,role:u.role,initials:u.initials,...(hasPinCol()&&{pin:u.pin||null})};
    dbW('updEmp',await supabase.from('employees').update(payload).eq('id',u.id));
  };
  const addMsg=async text=>{
    const res=await supabase.from('messages').insert({text}).select().single();
    if(res.error){console.error('[backbone] addMsg',res.error);return false;}
    if(res.data)setMessages(p=>[...p,res.data]);
    return true;
  };
  const delMsg=async id=>{
    setMessages(p=>p.filter(m=>m.id!==id));
    const res=await supabase.from('messages').delete().eq('id',id);
    if(res.error)console.error('[backbone] delMsg',res.error);
  };

  const addRecurring=async rec=>{
    const{data}=await supabase.from('recurring').insert({title:rec.title,category:rec.category,priority:rec.priority,assignee:rec.assignee,description:rec.description,frequency:rec.frequency,day_of_week:rec.dayOfWeek,day_of_month:rec.dayOfMonth,active:rec.active,next_due:rec.nextDue,created_by:user.id}).select().single();
    if(!data)return;
    const r=recFromDb(data);
    if(r.active&&r.nextDue<=t0){
      const{newTasks,updRec}=genRecurring([r],tasks);
      if(newTasks.length){
        const rows=newTasks.map(t=>({title:t.title,category:t.category,priority:t.priority,assignee:t.assignee,due_date:t.dueDate,created_by:t.createdBy,description:t.description,status:'To Do',subtasks:[],comments:[],recurring_id:t.recurringId}));
        const{data:ins}=await supabase.from('tasks').insert(rows).select();
        if(ins)setTasks(p=>[...p,...ins.map(taskFromDb)]);
      }
      await supabase.from('recurring').update({next_due:updRec[0].nextDue}).eq('id',data.id);
      setRecurring(p=>[...p,{...r,nextDue:updRec[0].nextDue}]);
    }else{
      setRecurring(p=>[...p,r]);
    }
  };
  const updRecurring=async rec=>{
    setRecurring(p=>p.map(r=>r.id===rec.id?rec:r));
    await supabase.from('recurring').update({title:rec.title,category:rec.category,priority:rec.priority,assignee:rec.assignee,description:rec.description,frequency:rec.frequency,day_of_week:rec.dayOfWeek,day_of_month:rec.dayOfMonth,active:rec.active,next_due:rec.nextDue}).eq('id',rec.id);
  };
  const delRecurring=async id=>{
    setRecurring(p=>p.filter(r=>r.id!==id));
    setTasks(p=>p.filter(t=>t.recurringId!==id||t.status==="Done"));
    await supabase.from('recurring').delete().eq('id',id);
    await supabase.from('tasks').delete().eq('recurring_id',id).neq('status','Done');
  };
  const toggleRecurring=async id=>{
    const r=recurring.find(r=>r.id===id);
    if(!r)return;
    const tog={...r,active:!r.active};
    if(tog.active&&tog.nextDue<=t0){
      const{newTasks,updRec}=genRecurring([tog],tasks);
      if(newTasks.length){
        const rows=newTasks.map(t=>({title:t.title,category:t.category,priority:t.priority,assignee:t.assignee,due_date:t.dueDate,created_by:t.createdBy,description:t.description,status:'To Do',subtasks:[],comments:[],recurring_id:t.recurringId}));
        const{data:ins}=await supabase.from('tasks').insert(rows).select();
        if(ins)setTasks(prev=>[...prev,...ins.map(taskFromDb)]);
      }
      await supabase.from('recurring').update({active:true,next_due:updRec[0].nextDue}).eq('id',id);
      setRecurring(p=>p.map(r=>r.id===id?updRec[0]:r));
    }else{
      await supabase.from('recurring').update({active:tog.active}).eq('id',id);
      setRecurring(p=>p.map(r=>r.id===id?tog:r));
    }
  };
  const runNow=async id=>{
    const r=recurring.find(r=>r.id===id);
    if(!r||!r.active)return;
    const temp={...r,nextDue:t0};
    const{newTasks,updRec}=genRecurring([temp],tasks);
    if(newTasks.length){
      const rows=newTasks.map(t=>({title:t.title,category:t.category,priority:t.priority,assignee:t.assignee,due_date:t.dueDate,created_by:t.createdBy,description:t.description,status:'To Do',subtasks:[],comments:[],recurring_id:t.recurringId}));
      const{data:ins}=await supabase.from('tasks').insert(rows).select();
      if(ins)setTasks(prev=>[...prev,...ins.map(taskFromDb)]);
    }
    await supabase.from('recurring').update({next_due:updRec[0].nextDue}).eq('id',id);
    setRecurring(p=>p.map(r=>r.id===id?updRec[0]:r));
  };

  if(loading)return<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.navy,fontSize:18,fontWeight:700,letterSpacing:2}}>LOADING…</div>;
  if(!user)return<Login emps={emps} onLogin={e=>{setUser(e);setFAs(String(e.id));}}/>;
  const blank={title:"",category:"General",priority:"Medium",status:"To Do",assignee:user.id,dueDate:addDays(today,7),description:"",subtasks:[],createdBy:user.id};

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Segoe UI', system-ui, sans-serif"}}>
      <div style={{background:C.navy,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,boxShadow:"0 2px 12px #0c123055"}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <div style={{width:6,height:36,background:C.red,marginRight:14}}/>
          <div style={{marginRight:20}}>
            <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:4,lineHeight:1}}>BACKBONE</div>
            <div style={{fontSize:8,color:"#ffffff55",letterSpacing:3}}>BY CHOWDAHEADZ</div>
          </div>
          <div style={{width:1,height:30,background:"#ffffff22",marginRight:12}}/>
          <NB label="DASHBOARD"  active={view==="dashboard"}  onClick={()=>setView("dashboard")}/>
          <NB label="TASKS"      active={view==="list"}       onClick={()=>setView("list")}/>
          <NB label="CALENDAR"   active={view==="calendar"}   onClick={()=>setView("calendar")}/>
          {canEdit&&<NB label="↻ RECURRING" active={view==="recurring"} onClick={()=>setView("recurring")}/>}
          <NB label="GOALS" active={view==="goals"} onClick={()=>setView("goals")}/>
          <NB label="💡 IDEAS" active={view==="ideas"} onClick={()=>setView("ideas")}/>
          <NB label="SKU" active={view==="sku"} onClick={()=>setView("sku")}/>
          {isAdmin&&<NB label="⚙ ADMIN"     active={view==="admin"}     onClick={()=>setView("admin")}/>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {canEdit&&<button onClick={()=>setNewT({...blank})} style={{background:C.red,color:"#fff",border:"none",padding:"8px 20px",fontFamily:"inherit",fontWeight:700,cursor:"pointer",fontSize:12,letterSpacing:1}}>+ NEW TASK</button>}
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <Av u={user} size={32}/>
            <div><div style={{fontSize:12,color:"#fff",fontWeight:700}}>{user.name}</div><div style={{fontSize:9,color:"#ffffff77",textTransform:"uppercase",letterSpacing:1}}>{user.role}</div></div>
            <button onClick={()=>{setUser(null);setView("list");setFAs("All");setFSt("All");setFPr("All");setFCa("All");}} style={{background:"none",border:"1px solid #ffffff33",color:"#ffffffaa",padding:"4px 10px",fontFamily:"inherit",cursor:"pointer",fontSize:11,marginLeft:4}}>↩</button>
          </div>
        </div>
      </div>
      <div style={{height:3,background:`linear-gradient(90deg, ${C.red} 0%, ${C.navyLight} 60%, transparent 100%)`}}/>
      {dbError&&<div style={{background:"#fff0f0",borderBottom:`2px solid ${C.red}`,padding:"10px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,color:C.red,fontWeight:700}}>⚠ DATABASE ERROR: {dbError}<button onClick={()=>setDbError(null)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,fontWeight:700,marginLeft:16}}>✕</button></div>}

      <div style={{padding:28}}>
        {view==="dashboard" &&<Dash tasks={tasks} stats={stats} emps={emps} recurring={recurring} onOpen={setModal} dashMsg={dashMsg} categories={categories}/>}
        {view==="list"      &&<ListView tasks={filtered} emps={emps} fSt={fSt} setFSt={setFSt} fPr={fPr} setFPr={setFPr} fAs={fAs} setFAs={setFAs} fCa={fCa} setFCa={setFCa} onOpen={setModal} onUpdate={handleTaskSave} categories={categories}/>}
        {view==="calendar"  &&<CalView tasks={tasks} month={calMo} setMonth={setCalMo} onOpen={setModal} categories={categories}/>}
        {view==="recurring" &&canEdit&&<RecurringPanel recurring={recurring} tasks={tasks} emps={emps} canEdit={canEdit} onAdd={addRecurring} onUpd={updRecurring} onDel={delRecurring} onToggle={toggleRecurring} onRunNow={runNow} categories={categories}/>}
        {view==="goals"     &&<GoalsPanel emps={emps} goals={goals} onAdd={addGoal} onUpd={updGoal} onDel={delGoal}/>}
        {view==="ideas"     &&<IdeasPanel ideas={ideas} ready={ideaReady} onAdd={addIdea} onDel={delIdea} onToTask={ideaToTask}/>}
        {view==="sku"       &&<div><SkuPanel counters={skuCounters} onInc={incSku} onDec={decSku}/><ProductLaunchPanel launches={launches} ready={launchReady} onAdd={addLaunch} onRemove={delLaunch} onToggle={togLaunch} onComplete={completeLaunch}/></div>}
        {view==="admin"     &&isAdmin&&<AdminPanel emps={emps} tasks={tasks} me={user} onAdd={addEmp} onDel={delEmp} onUpd={updEmp} messages={messages} onAddMsg={addMsg} onDelMsg={delMsg} categories={categories} catReady={catReady} onAddCat={addCategory} onDelCat={delCategory}/>}
      </div>

      {modal&&<TaskModal task={tasks.find(t=>t.id===modal.id)||modal} emps={emps} recurring={recurring} onClose={()=>setModal(null)} onSave={handleTaskSave} onDel={delTask} onComment={addCom} onTogSub={togSub} onAddSub={addSub} canEdit={canEdit} categories={categories}/>}
      {newT&&<NewTaskModal task={newT} emps={emps} onChange={setNewT} onCreate={crtTask} onClose={()=>setNewT(null)} categories={categories}/>}
    </div>
  );
}

// ── SKU Panel ─────────────────────────────────────────────────────────────────
function SkuPanel({counters,onInc,onDec}){
  const[open,setOpen]=useState(true);
  return(
    <div style={{marginBottom:24}}>
      <div style={{background:C.navy,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none"}} onClick={()=>setOpen(o=>!o)}>
        <div style={{fontSize:11,color:"#ffffffaa",letterSpacing:3,fontWeight:700}}>SKU COUNTERS</div>
        <span style={{color:"#ffffff88",fontSize:12,fontWeight:700}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,padding:"10px 0 0"}}>
          {counters.map(c=>(
            <div key={c.id} style={{background:C.surface,border:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 1px 4px #0c123010"}}>
              <div style={{fontSize:12,fontWeight:700,color:C.navy,letterSpacing:1}}>{c.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{fontSize:26,fontWeight:900,color:C.navy,minWidth:54,textAlign:"right"}}>{c.value}</div>
                <button onClick={()=>onDec(c.id)} style={{width:30,height:30,background:C.textMuted,color:"#fff",border:"none",fontSize:20,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
                  onMouseEnter={x=>x.currentTarget.style.opacity="0.8"}
                  onMouseLeave={x=>x.currentTarget.style.opacity="1"}>−</button>
                <button onClick={()=>onInc(c.id)} style={{width:30,height:30,background:C.navy,color:"#fff",border:"none",fontSize:16,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
                  onMouseEnter={x=>x.currentTarget.style.background=C.navyLight}
                  onMouseLeave={x=>x.currentTarget.style.background=C.navy}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Launch Panel ───────────────────────────────────────────────────────
const LAUNCH_CHECKS=["Desc","Tags","Images","AR4","Sirv","Linx","Linx2"];
function ProductLaunchPanel({launches,ready,onAdd,onRemove,onToggle,onComplete}){
  const[name,setName]=useState("");
  const[sku,setSku]=useState("");
  const[completing,setCompleting]=useState({});
  const add=()=>{
    if(!name.trim()||!sku.trim())return;
    onAdd({name:name.trim(),sku:sku.trim()});
    setName("");setSku("");
  };
  const handleComplete=async(l)=>{
    setCompleting(p=>({...p,[l.id]:'loading'}));
    const ok=await onComplete(l);
    setCompleting(p=>({...p,[l.id]:ok?'done':'error'}));
    setTimeout(()=>setCompleting(p=>({...p,[l.id]:null})),3000);
  };
  const remove=onRemove;
  return(
    <div>
      <div style={{background:C.navy,padding:"10px 16px",fontSize:11,color:"#ffffffaa",letterSpacing:3,fontWeight:700}}>PRODUCT LAUNCH</div>
      {!ready&&(
        <div style={{padding:"12px 14px",background:"#fffbf0",border:`1px solid ${C.orange}55`,borderTop:"none",borderLeft:`4px solid ${C.orange}`,fontSize:12,color:C.text}}>
          <strong style={{color:C.orange}}>Table not set up.</strong> Run this SQL in your Supabase dashboard → SQL Editor:
          <pre style={{margin:"6px 0 0",background:"#1a1a2e",color:"#a8d8a8",padding:"8px 12px",fontSize:11,fontFamily:"monospace",overflowX:"auto",lineHeight:1.6}}>{"create table public.product_launches (\n  id bigint generated always as identity primary key,\n  name text not null,\n  sku text not null,\n  check_desc boolean default false,\n  check_tags boolean default false,\n  check_images boolean default false,\n  check_ar4 boolean default false,\n  check_sirv boolean default false,\n  check_linx boolean default false,\n  check_linx2 boolean default false,\n  created_at timestamptz default now()\n);\nalter table public.product_launches enable row level security;\ncreate policy \"Allow all\" on public.product_launches for all using (true) with check (true);"}</pre>
        </div>
      )}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:"none",padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-end"}}>
        <div style={{flex:1}}><div style={{fontSize:10,color:C.textMuted,marginBottom:4,fontWeight:700,letterSpacing:1}}>PRODUCT NAME</div><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="e.g. Classic Hoodie" style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/></div>
        <div style={{width:150}}><div style={{fontSize:10,color:C.textMuted,marginBottom:4,fontWeight:700,letterSpacing:1}}>PRODUCT SKU</div><input value={sku} onChange={e=>setSku(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="e.g. HDIE-001" style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/></div>
        <button onClick={add} disabled={!name.trim()||!sku.trim()} style={{background:name.trim()&&sku.trim()?C.red:C.textMuted,border:"none",color:"#fff",padding:"7px 20px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:name.trim()&&sku.trim()?"pointer":"default",letterSpacing:1,whiteSpace:"nowrap",height:34}}>+ ADD</button>
      </div>
      {launches.length===0?(
        <div style={{padding:"16px 14px",fontSize:12,color:C.textMuted,fontStyle:"italic",background:C.surface,border:`1px solid ${C.border}`,borderTop:"none"}}>No products in launch queue. Add one above.</div>
      ):(
        <div style={{border:`1px solid ${C.border}`,borderTop:"none"}}>
          <div style={{background:C.card,padding:"7px 14px",display:"grid",gridTemplateColumns:"1fr 140px repeat(7,52px) 110px 32px",gap:10,fontSize:10,color:C.textMuted,letterSpacing:1,fontWeight:700,alignItems:"center"}}>
            <div>PRODUCT</div><div>SKU</div>{LAUNCH_CHECKS.map(k=><div key={k} style={{textAlign:"center"}}>{k}</div>)}<div/><div/>
          </div>
          {launches.map(l=>{
            const done=LAUNCH_CHECKS.filter(k=>l.checks[k]).length;
            const allDone=done===LAUNCH_CHECKS.length;
            return(
              <div key={l.id} style={{padding:"9px 14px",display:"grid",gridTemplateColumns:"1fr 140px repeat(7,52px) 110px 32px",gap:10,alignItems:"center",borderTop:`1px solid ${C.border}`,background:allDone?"#f0fff4":"transparent",transition:"background 0.15s"}}
                onMouseEnter={e=>{if(!allDone)e.currentTarget.style.background=C.card;}} onMouseLeave={e=>{if(!allDone)e.currentTarget.style.background="transparent";}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:allDone?C.green:C.text,textDecoration:allDone?"line-through":"none"}}>{l.name}</div>
                  <div style={{fontSize:10,color:C.textMuted,marginTop:1}}>{done}/{LAUNCH_CHECKS.length} complete</div>
                </div>
                <div style={{fontSize:12,fontFamily:"monospace",color:C.navy,fontWeight:700,letterSpacing:1}}>{l.sku}</div>
                {LAUNCH_CHECKS.map(k=>(
                  <div key={k} style={{display:"flex",justifyContent:"center"}}>
                    <input type="checkbox" checked={!!l.checks[k]} onChange={()=>onToggle(l.id,k)} style={{width:16,height:16,cursor:"pointer",accentColor:C.navy}}/>
                  </div>
                ))}
                <button onClick={()=>handleComplete(l)} disabled={completing[l.id]==='loading'}
                  style={{background:completing[l.id]==='done'?C.green:completing[l.id]==='error'?C.red:C.green,border:"none",color:"#fff",padding:"5px 14px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:completing[l.id]==='loading'?"default":"pointer",letterSpacing:1,whiteSpace:"nowrap",opacity:completing[l.id]==='loading'?0.6:1}}>
                  {completing[l.id]==='loading'?'...' :completing[l.id]==='done'?'✓ TASK CREATED':completing[l.id]==='error'?'✗ ERROR':'COMPLETE'}
                </button>
                <button onClick={()=>remove(l.id)} style={{background:"none",border:`1px solid ${C.border}`,color:C.textMuted,width:26,height:26,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",flexShrink:0}}
                  onMouseEnter={x=>{x.currentTarget.style.borderColor=C.red;x.currentTarget.style.color=C.red;}}
                  onMouseLeave={x=>{x.currentTarget.style.borderColor=C.border;x.currentTarget.style.color=C.textMuted;}}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({emps,onLogin}){
  const[sel,setSel]=useState(null);
  const[pin,setPin]=useState("");
  const[err,setErr]=useState(false);

  const tapDigit=d=>{
    if(pin.length>=4)return;
    const next=pin+d;
    setPin(next);
    setErr(false);
    if(next.length===4)setTimeout(()=>submit(next),120);
  };
  const tapBack=()=>{setPin(p=>p.slice(0,-1));setErr(false);};
  const submit=(p=pin)=>{
    if(!sel.pin){onLogin(sel);return;}
    if(p===sel.pin){onLogin(sel);}
    else{setErr(true);setPin("");}
  };
  const goBack=()=>{setSel(null);setPin("");setErr(false);};

  const Logo=()=>(
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
      <div style={{width:6,height:64,background:C.red}}/>
      <div>
        <div style={{fontSize:48,fontWeight:900,color:"#fff",letterSpacing:6,lineHeight:1}}>BACKBONE</div>
        <div style={{fontSize:11,color:"#ffffff44",letterSpacing:4,marginTop:5}}>BY CHOWDAHEADZ</div>
      </div>
    </div>
  );

  if(!sel){
    return(
      <div style={{minHeight:"100vh",background:C.navy,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI', system-ui, sans-serif"}}>
        <Logo/>
        <div style={{background:"#ffffff0d",border:"1px solid #ffffff18",padding:32,width:370,marginTop:44}}>
          <div style={{color:"#ffffff55",marginBottom:20,fontSize:12,letterSpacing:3,fontWeight:700}}>SELECT YOUR PROFILE</div>
          {emps.map(e=>(
            <button key={e.id} onClick={()=>setSel(e)}
              style={{display:"flex",alignItems:"center",gap:14,width:"100%",background:"#ffffff09",border:"1px solid #ffffff14",padding:"13px 16px",marginBottom:8,cursor:"pointer",fontFamily:"inherit",color:"#fff",textAlign:"left"}}
              onMouseEnter={x=>x.currentTarget.style.background="#ffffff18"} onMouseLeave={x=>x.currentTarget.style.background="#ffffff09"}>
              <Av u={e} size={38}/>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{e.name}</div>
                <div style={{fontSize:10,color:e.role==="admin"?"#ff8888":e.role==="lead"?"#ffb86c":"#88aaff",textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{e.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const btnStyle={background:"#ffffff14",border:"1px solid #ffffff22",color:"#fff",fontFamily:"inherit",fontSize:22,fontWeight:700,cursor:"pointer",padding:"18px 0",borderRadius:0,letterSpacing:1};
  return(
    <div style={{minHeight:"100vh",background:C.navy,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI', system-ui, sans-serif"}}>
      <Logo/>
      <div style={{background:"#ffffff0d",border:"1px solid #ffffff18",padding:32,width:320,marginTop:44,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
        <Av u={sel} size={56}/>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{sel.name}</div>
          <div style={{fontSize:10,color:sel.role==="admin"?"#ff8888":sel.role==="lead"?"#ffb86c":"#88aaff",textTransform:"uppercase",letterSpacing:2,marginTop:4}}>{sel.role}</div>
        </div>
        <div style={{fontSize:11,color:"#ffffff55",letterSpacing:3,fontWeight:700}}>ENTER YOUR PIN</div>
        <div style={{display:"flex",gap:14}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<pin.length?"#fff":"transparent",border:"2px solid #ffffff66",transition:"background 0.1s"}}/>
          ))}
        </div>
        {err&&<div style={{fontSize:12,color:C.red,fontWeight:700,letterSpacing:1}}>INCORRECT PIN — TRY AGAIN</div>}
        {!sel.pin&&<div style={{fontSize:11,color:"#ffb86c",fontWeight:700,letterSpacing:1,textAlign:"center"}}>NO PIN SET — CONTACT ADMIN</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:"100%"}}>
          {[1,2,3,4,5,6,7,8,9].map(d=>(
            <button key={d} onClick={()=>tapDigit(String(d))} style={{...btnStyle}} onMouseEnter={x=>x.currentTarget.style.background="#ffffff22"} onMouseLeave={x=>x.currentTarget.style.background="#ffffff14"}>{d}</button>
          ))}
          <button onClick={goBack} style={{...btnStyle,fontSize:11,letterSpacing:2,color:"#ffffff88"}} onMouseEnter={x=>x.currentTarget.style.background="#ffffff22"} onMouseLeave={x=>x.currentTarget.style.background="#ffffff14"}>← BACK</button>
          <button onClick={()=>tapDigit("0")} style={{...btnStyle}} onMouseEnter={x=>x.currentTarget.style.background="#ffffff22"} onMouseLeave={x=>x.currentTarget.style.background="#ffffff14"}>0</button>
          <button onClick={tapBack} style={{...btnStyle,fontSize:18}} onMouseEnter={x=>x.currentTarget.style.background="#ffffff22"} onMouseLeave={x=>x.currentTarget.style.background="#ffffff14"}>⌫</button>
        </div>
      </div>
    </div>
  );
}

// ── Recurring Panel ───────────────────────────────────────────────────────────
const BLANK_REC={title:"",category:"Operations",priority:"Medium",assignee:null,description:"",frequency:"weekly",dayOfWeek:1,dayOfMonth:1,active:true,nextDue:t0};

function RecurringPanel({recurring,tasks,emps,canEdit,onAdd,onUpd,onDel,onToggle,onRunNow,categories}){
  const[showForm,setShowForm]=useState(false);
  const[editingId,setEditingId]=useState(null);
  const[draft,setDraft]=useState(null);
  const[confirm,setConfirm]=useState(null);

  const startAdd=()=>{setDraft({...BLANK_REC,nextDue:t0});setEditingId("new");setShowForm(true);};
  const startEdit=r=>{setDraft({...r});setEditingId(r.id);setShowForm(true);};
  const doSave=()=>{
    if(!draft.title.trim())return;
    if(editingId==="new")onAdd(draft);else onUpd(draft);
    setShowForm(false);setEditingId(null);setDraft(null);
  };
  const doClose=()=>{setShowForm(false);setEditingId(null);setDraft(null);};

  const active=recurring.filter(r=>r.active).length;
  const dueToday=recurring.filter(r=>r.active&&r.nextDue<=t0).length;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:11,color:C.textMuted,letterSpacing:3,fontWeight:700}}>RECURRING TASKS</div>
          <span style={{background:C.purple+"18",color:C.purple,border:`1px solid ${C.purple}44`,padding:"2px 10px",fontSize:10,fontWeight:700,letterSpacing:1}}>AUTO-GENERATES</span>
        </div>
        {canEdit&&<button onClick={startAdd} style={{background:C.red,color:"#fff",border:"none",padding:"9px 22px",fontFamily:"inherit",fontWeight:700,cursor:"pointer",fontSize:12,letterSpacing:1}}>+ NEW RECURRING TASK</button>}
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:14,marginBottom:32}}>
        {[{l:"TOTAL TEMPLATES",v:recurring.length,c:C.navy},{l:"ACTIVE",v:active,c:C.green},{l:"PAUSED",v:recurring.length-active,c:C.textMuted},{l:"DUE TODAY",v:dueToday,c:dueToday>0?C.red:C.textMuted}].map(s=>(
          <div key={s.l} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderTop:`3px solid ${s.c}`,padding:"7px 18px",boxShadow:"0 1px 4px #0c123010"}}>
            <div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:C.navy,letterSpacing:1,fontWeight:700,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Freq legend */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        {FREQS.map(f=><span key={f} style={{background:FCOL[f]+"18",color:FCOL[f],border:`1px solid ${FCOL[f]}44`,padding:"3px 12px",fontSize:11,fontWeight:700,letterSpacing:1}}>↻ {FLABEL[f].toUpperCase()}</span>)}
      </div>

      {/* Table */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,boxShadow:"0 1px 6px #0c123012"}}>
        <div style={{background:C.navy,padding:"11px 20px",display:"grid",gridTemplateColumns:"2.2fr 1.2fr 1fr 110px 110px 160px",gap:12,fontSize:10,color:"#ffffffaa",letterSpacing:1,fontWeight:700}}>
          <div>TASK TITLE</div><div>SCHEDULE</div><div>ASSIGNEE</div><div>NEXT DUE</div><div>STATUS</div><div style={{textAlign:"right"}}>ACTIONS</div>
        </div>

        {recurring.length===0&&<div style={{padding:36,textAlign:"center",color:C.textMuted}}>No recurring tasks set up yet.</div>}

        {recurring.map(r=>{
          const emp=emps.find(e=>e.id===r.assignee);
          const isOv=r.active&&r.nextDue<=t0;
          const openCount=tasks.filter(t=>t.recurringId===r.id&&t.status!=="Done").length;
          return(
            <div key={r.id} style={{borderBottom:`1px solid ${C.border}`,opacity:r.active?1:0.65}}
              onMouseEnter={e=>e.currentTarget.style.background=C.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"2.2fr 1.2fr 1fr 110px 110px 210px",gap:12,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:FCOL[r.frequency],flexShrink:0,display:"inline-block"}}/>
                    {r.title}
                  </div>
                  <div style={{fontSize:11,color:C.textMuted,marginTop:3,paddingLeft:16}}>
                    {r.category} · {openCount>0?<span style={{color:C.blue}}>{openCount} open instance{openCount!==1?"s":""}</span>:"no open instances"}
                  </div>
                </div>
                <div>
                  <FB freq={r.frequency}/>
                  <div style={{fontSize:10,color:C.textMuted,marginTop:4}}>{freqLabel(r)}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  {emp?<><Av u={emp} size={24}/><span style={{fontSize:12}}>{emp.name}</span></>:<span style={{fontSize:12,color:C.textMuted}}>Unassigned</span>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:isOv?C.red:C.text}}>{fmtS(r.nextDue)}{isOv?" ⚠":""}</div>
                  <div style={{marginTop:3}}><PB priority={r.priority}/></div>
                </div>
                <div>
                  {r.active
                    ?<span style={{background:C.green+"18",color:C.green,border:`1px solid ${C.green}44`,padding:"3px 10px",fontSize:10,fontWeight:700,letterSpacing:1}}>● ACTIVE</span>
                    :<span style={{background:"#eee",color:C.textMuted,border:`1px solid ${C.border}`,padding:"3px 10px",fontSize:10,fontWeight:700,letterSpacing:1}}>⏸ PAUSED</span>
                  }
                </div>
                <div style={{display:"flex",gap:5,justifyContent:"flex-end",flexWrap:"nowrap"}}>
                  {canEdit&&r.active&&<button onClick={()=>onRunNow(r.id)} title="Generate an instance right now" style={{background:"none",border:`1px solid ${C.purple}`,color:C.purple,padding:"4px 9px",fontFamily:"inherit",fontSize:10,cursor:"pointer",fontWeight:700}}>↻ NOW</button>}
                  {canEdit&&<button onClick={()=>startEdit(r)} style={{background:"none",border:`1px solid ${C.navy}`,color:C.navy,padding:"4px 9px",fontFamily:"inherit",fontSize:10,cursor:"pointer",fontWeight:700}}>EDIT</button>}
                  {canEdit&&<button onClick={()=>onToggle(r.id)} style={{background:"none",border:`1px solid ${r.active?C.orange:C.green}`,color:r.active?C.orange:C.green,padding:"4px 9px",fontFamily:"inherit",fontSize:10,cursor:"pointer",fontWeight:700}}>{r.active?"PAUSE":"RESUME"}</button>}
                  {canEdit&&<button onClick={()=>setConfirm(r)} style={{background:"none",border:`1px solid ${C.red}`,color:C.red,padding:"4px 9px",fontFamily:"inherit",fontSize:10,cursor:"pointer",fontWeight:700}}>DEL</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div style={{marginTop:18,padding:"13px 18px",background:C.card,border:`1px solid ${C.border}`,fontSize:12,color:C.textMuted,lineHeight:1.7}}>
        <strong style={{color:C.navy}}>How recurring tasks work: </strong>
        Each active template auto-generates a task in the Tasks tab when its due date arrives. Marking a generated task <strong>Done</strong> automatically advances the template to the next occurrence. Use <strong>↻ NOW</strong> to generate an instance immediately. Pausing stops new instances from being created without losing your schedule.
      </div>

      {/* Form modal */}
      {showForm&&draft&&(
        <div style={{position:"fixed",inset:0,background:"#0c123077",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div style={{background:C.surface,width:640,maxHeight:"90vh",overflow:"auto",boxShadow:"0 12px 50px #0c123055",borderTop:`4px solid ${C.purple}`}} onClick={e=>e.stopPropagation()}>
            <div style={{background:C.navy,padding:"16px 24px",color:"#fff",fontSize:15,fontWeight:700,letterSpacing:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>{editingId==="new"?"↻ NEW RECURRING TASK":"↻ EDIT RECURRING TASK"}</span>
              <button onClick={doClose} style={{background:"none",border:"1px solid #ffffff33",color:"#ffffffaa",padding:"4px 11px",fontFamily:"inherit",cursor:"pointer",fontSize:14}}>✕</button>
            </div>
            <div style={{padding:24}}>
              {/* Title */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>TITLE *</div>
                <input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Weekly inventory count"
                  style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"10px 12px",fontFamily:"inherit",fontSize:14,boxSizing:"border-box"}}/>
              </div>
              {/* Description */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>DESCRIPTION</div>
                <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} rows={2} placeholder="What needs to be done each time..."
                  style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/>
              </div>

              {/* Schedule box */}
              <div style={{background:"#f3f0fa",border:`1.5px solid ${C.purple}44`,padding:18,marginBottom:18,borderRadius:2}}>
                <div style={{fontSize:11,fontWeight:700,color:C.purple,letterSpacing:2,marginBottom:14}}>↻ SCHEDULE</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <ESel label="FREQUENCY" value={draft.frequency} onChange={v=>setDraft({...draft,frequency:v})} opts={FREQS.map(f=>({v:f,l:FLABEL[f]}))} full/>
                  {(draft.frequency==="weekly"||draft.frequency==="biweekly")&&(
                    <ESel label="DAY OF WEEK" value={draft.dayOfWeek??1} onChange={v=>setDraft({...draft,dayOfWeek:parseInt(v)})} opts={DAYS.map((d,i)=>({v:i,l:d}))} full/>
                  )}
                  {draft.frequency==="monthly"&&(
                    <div><div style={{fontSize:11,color:C.textMuted,marginBottom:4,fontWeight:700}}>DAY OF MONTH</div>
                      <input type="number" min={1} max={28} value={draft.dayOfMonth??1} onChange={e=>setDraft({...draft,dayOfMonth:parseInt(e.target.value)||1})}
                        style={{background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",fontFamily:"inherit",fontSize:12,width:"100%",boxSizing:"border-box"}}/>
                    </div>
                  )}
                  <div><div style={{fontSize:11,color:C.textMuted,marginBottom:4,fontWeight:700}}>FIRST / NEXT DUE</div>
                    <input type="date" value={draft.nextDue} onChange={e=>setDraft({...draft,nextDue:e.target.value})}
                      style={{background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",fontFamily:"inherit",fontSize:12,width:"100%",boxSizing:"border-box"}}/>
                  </div>
                </div>
                <div style={{marginTop:10,padding:"8px 12px",background:C.purple+"12",border:`1px solid ${C.purple}33`,fontSize:12,color:C.purple,fontWeight:600}}>
                  Preview: {freqLabel(draft)} · Next due {fmtS(draft.nextDue)}
                </div>
              </div>

              {/* Task settings */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}}>
                <ESel label="CATEGORY"         value={draft.category}     onChange={v=>setDraft({...draft,category:v})}             opts={categories} full/>
                <ESel label="PRIORITY"         value={draft.priority}     onChange={v=>setDraft({...draft,priority:v})}             opts={PRIORITIES} full/>
                <ESel label="DEFAULT ASSIGNEE" value={draft.assignee||""} onChange={v=>setDraft({...draft,assignee:v?parseInt(v):null})} opts={[{v:"",l:"Unassigned"},...emps.map(e=>({v:e.id,l:e.name}))]} full/>
              </div>

              <div style={{marginBottom:22}}>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})} style={{accentColor:C.red,width:16,height:16}}/>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>Active — generate tasks on schedule</span>
                </label>
              </div>

              <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
                <button onClick={doClose} style={{background:"none",border:`1.5px solid ${C.border}`,color:C.textMuted,padding:"9px 20px",fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:600}}>CANCEL</button>
                <button onClick={doSave} disabled={!draft.title.trim()}
                  style={{background:draft.title.trim()?C.red:C.textMuted,border:"none",color:"#fff",padding:"9px 22px",fontFamily:"inherit",fontSize:12,cursor:draft.title.trim()?"pointer":"default",fontWeight:700,letterSpacing:1}}>
                  {editingId==="new"?"CREATE RECURRING TASK":"SAVE CHANGES"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm&&(
        <div style={{position:"fixed",inset:0,background:"#0c123077",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
          <div style={{background:C.surface,width:420,borderTop:`4px solid ${C.red}`,boxShadow:"0 12px 50px #0c123055"}}>
            <div style={{background:C.navy,padding:"16px 24px",color:"#fff",fontSize:14,fontWeight:700}}>DELETE RECURRING TASK</div>
            <div style={{padding:24}}>
              <div style={{padding:"12px 16px",background:C.card,border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:700}}>{confirm.title}</div>
                <div style={{fontSize:12,color:C.textMuted,marginTop:4}}>{freqLabel(confirm)}</div>
              </div>
              <p style={{fontSize:13,color:C.textMuted,marginBottom:20,lineHeight:1.6}}>Deleting this template will remove all open generated tasks. Completed instances will be kept. This cannot be undone.</p>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button onClick={()=>setConfirm(null)} style={{background:"none",border:`1.5px solid ${C.border}`,color:C.textMuted,padding:"9px 20px",fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:600}}>CANCEL</button>
                <button onClick={()=>{onDel(confirm.id);setConfirm(null);}} style={{background:C.red,border:"none",color:"#fff",padding:"9px 22px",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>DELETE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function MC({task,emps,onClick,highlight}){
  const e=emps.find(x=>x.id===task.assignee);
  const od=task.dueDate&&new Date(task.dueDate)<today&&task.status!=="Done";
  return<div onClick={onClick} style={{background:C.surface,border:`1px solid ${highlight||C.border}`,padding:"10px 13px",marginBottom:8,cursor:"pointer",borderLeft:`4px solid ${PCOL[task.priority]}`,boxShadow:"0 1px 3px #0c123010"}}
    onMouseEnter={x=>x.currentTarget.style.background=C.card} onMouseLeave={x=>x.currentTarget.style.background=C.surface}>
    <div style={{fontSize:12,fontWeight:600,marginBottom:5}}>{task.title}{task.recurringId&&<RecurBadge/>}</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:11,color:od?C.red:C.textMuted,fontWeight:od?700:400}}>Due {fmtS(task.dueDate)}{od?" ⚠":""}</div>
      <div style={{display:"flex",alignItems:"center",gap:6}}><SB status={task.status}/>{e&&<Av u={e} size={20}/>}</div>
    </div>
  </div>;
}

function Dash({tasks,stats,emps,recurring,onOpen,dashMsg,categories}){
  const od=tasks.filter(t=>t.status!=="Done"&&t.dueDate&&new Date(t.dueDate)<today);
  const up=tasks.filter(t=>t.status!=="Done"&&t.dueDate&&new Date(t.dueDate)>=today).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).slice(0,5);
  const activeRec=recurring.filter(r=>r.active).length;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:11,color:C.textMuted,letterSpacing:3,fontWeight:700}}>DASHBOARD</div>
        <div style={{fontSize:12,color:C.textMuted}}>{fmt(t0)}</div>
      </div>
      {dashMsg&&<div style={{background:"#f0f1f4",padding:"12px 20px",marginBottom:22,display:"flex",alignItems:"center",gap:14,borderLeft:`4px solid ${C.red}`}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:2,color:C.red,flexShrink:0}}>NOTICE</span>
        <span style={{width:1,height:14,background:`${C.navy}33`,flexShrink:0,display:"inline-block"}}/>
        <span style={{fontSize:13,color:C.navy,lineHeight:1.5}}>{dashMsg.text}</span>
      </div>}
      <div style={{display:"flex",gap:16,marginBottom:30}}>
        <SC label="TOTAL TASKS"  value={stats.total}    color={C.navy}/>
        <SC label="COMPLETED"    value={stats.done}     color={C.green}  sub={`${Math.round(stats.done/Math.max(stats.total,1)*100)}% done`}/>
        <SC label="OVERDUE"      value={stats.overdue}  color={C.red}    sub={stats.overdue>0?"needs attention":"all clear"}/>
        <SC label="CRITICAL"     value={stats.critical} color={C.orange} sub="open critical tasks"/>
        <SC label="↻ RECURRING"  value={activeRec}      color={C.purple} sub="active templates"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:24}}>
        <div><SH label="OVERDUE" count={od.length} color={C.red}/>{od.length===0?<div style={{color:C.textMuted,fontSize:13}}>No overdue tasks 🎉</div>:od.map(t=><MC key={t.id} task={t} emps={emps} onClick={()=>onOpen(t)} highlight={C.red+"99"}/>)}</div>
        <div><SH label="UPCOMING DUE" color={C.navy}/>{up.length===0?<div style={{color:C.textMuted,fontSize:13}}>Nothing due soon.</div>:up.map(t=><MC key={t.id} task={t} emps={emps} onClick={()=>onOpen(t)}/>)}</div>
        <div>
          <SH label="BY CATEGORY" color={C.navy}/>
          {categories.map(cat=>{const n=tasks.filter(t=>t.category===cat&&t.status!=="Done").length;if(!n)return null;return<div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}><span>{cat}</span><span style={{color:C.navy,fontWeight:800}}>{n}</span></div>;})}
        </div>
      </div>
      <div style={{marginTop:32}}>
        <SH label="TEAM WORKLOAD" color={C.navy}/>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:12}}>
          {emps.map(e=>{const n=tasks.filter(t=>t.assignee===e.id&&t.status!=="Done").length;return<div key={e.id} style={{background:C.surface,border:`1px solid ${C.border}`,padding:"12px 18px",display:"flex",alignItems:"center",gap:12,minWidth:160,boxShadow:"0 1px 4px #0c123010"}}><Av u={e} size={36}/><div><div style={{fontSize:13,fontWeight:700}}>{e.name}</div><div style={{fontSize:11,color:n>3?C.red:C.textMuted,marginTop:2}}>{n} open task{n!==1?"s":""}</div></div></div>;})}
        </div>
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListView({tasks,emps,fSt,setFSt,fPr,setFPr,fAs,setFAs,fCa,setFCa,onOpen,onUpdate,categories}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:11,color:C.textMuted,letterSpacing:3,fontWeight:700}}>TASKS</div>
        <div style={{fontSize:12,color:C.textMuted}}>{tasks.length} task{tasks.length!==1?"s":""}</div>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <FSel label="STATUS"   value={fSt} onChange={setFSt} opts={["All",...STATUSES]}/>
        <FSel label="PRIORITY" value={fPr} onChange={setFPr} opts={["All",...PRIORITIES]}/>
        <FSel label="ASSIGNEE" value={fAs} onChange={setFAs} opts={[{v:"All",l:"All"},...emps.map(e=>({v:e.id,l:e.name}))]}/>
        <FSel label="CATEGORY" value={fCa} onChange={setFCa} opts={["All",...categories]}/>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,boxShadow:"0 1px 6px #0c123012"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 130px 110px",padding:"10px 16px",background:C.navy,fontSize:10,color:"#ffffffaa",letterSpacing:1,fontWeight:700}}>
          <div>TASK</div><div>CATEGORY</div><div>ASSIGNEE</div><div>DUE DATE</div><div>STATUS</div><div>PRIORITY</div>
        </div>
        {tasks.length===0&&<div style={{padding:36,textAlign:"center",color:C.textMuted}}>No tasks match your filters.</div>}
        {tasks.map(task=>{
          const emp=emps.find(e=>e.id===task.assignee);
          const od=task.dueDate&&new Date(task.dueDate)<today&&task.status!=="Done";
          return(
            <div key={task.id} onClick={()=>onOpen(task)}
              style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 130px 110px",padding:"13px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",borderLeft:`4px solid ${task.recurringId?C.purple:PCOL[task.priority]}`}}
              onMouseEnter={e=>e.currentTarget.style.background=C.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{task.title}{task.recurringId&&<RecurBadge/>}</div>
                {task.subtasks?.length>0&&<div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{task.subtasks.filter(s=>s.done).length}/{task.subtasks.length} subtasks</div>}
              </div>
              <div style={{fontSize:12,color:C.textMuted,display:"flex",alignItems:"center"}}>{task.category}</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>{emp?<><Av u={emp} size={24}/><span style={{fontSize:12,fontWeight:500}}>{emp.name}</span></>:<span style={{fontSize:12,color:C.textMuted}}>Unassigned</span>}</div>
              <div style={{display:"flex",alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                <input type="date" value={task.dueDate||""} onChange={e=>onUpdate({...task,dueDate:e.target.value})}
                  style={{background:"transparent",border:"none",color:od?C.red:C.textMuted,fontSize:12,fontFamily:"inherit",fontWeight:od?700:400,cursor:"pointer",padding:0,width:"100%",colorScheme:"dark"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                {(()=>{const sc=SCOL[task.status];return<select value={task.status} onChange={e=>onUpdate({...task,status:e.target.value})}
                  style={{background:sc+"18",color:sc,border:`1px solid ${sc}66`,padding:"2px 6px",fontSize:10,letterSpacing:1,fontWeight:700,fontFamily:"inherit",cursor:"pointer",appearance:"none",WebkitAppearance:"none",textTransform:"uppercase",outline:"none"}}>
                  {STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select>;})()}
              </div>
              <div style={{display:"flex",alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                {(()=>{const pc=PCOL[task.priority];return<select value={task.priority} onChange={e=>onUpdate({...task,priority:e.target.value})}
                  style={{background:pc+"18",color:pc,border:`1px solid ${pc}66`,padding:"2px 6px",fontSize:10,letterSpacing:1,fontWeight:700,fontFamily:"inherit",cursor:"pointer",appearance:"none",WebkitAppearance:"none",textTransform:"uppercase",outline:"none"}}>
                  {PRIORITIES.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}</select>;})()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalView({tasks,month,setMonth,onOpen,categories}){
  const yr=month.getFullYear(),mo=month.getMonth();
  const[selCats,setSelCats]=useState(new Set());
  const toggleCat=cat=>setSelCats(prev=>{const s=new Set(prev);s.has(cat)?s.delete(cat):s.add(cat);return s;});
  const allSelected=selCats.size===0;
  const visibleTasks=allSelected?tasks:tasks.filter(t=>selCats.has(t.category));
  const cells=[...Array(new Date(yr,mo,1).getDay()).fill(null),...Array.from({length:new Date(yr,mo+1,0).getDate()},(_,i)=>i+1)];
  const byDay={};
  visibleTasks.forEach(t=>{if(!t.dueDate)return;const[dy,dm,dd]=t.dueDate.split('-').map(Number);if(dy===yr&&dm-1===mo){if(!byDay[dd])byDay[dd]=[];byDay[dd].push(t);}});
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.textMuted,letterSpacing:3,fontWeight:700}}>CALENDAR</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setMonth(new Date(yr,mo-1,1))} style={{background:C.navy,border:"none",color:"#fff",padding:"6px 16px",fontFamily:"inherit",cursor:"pointer",fontWeight:700}}>←</button>
          <div style={{fontSize:14,color:C.navy,fontWeight:800,minWidth:150,textAlign:"center"}}>{month.toLocaleDateString("en-US",{month:"long",year:"numeric"}).toUpperCase()}</div>
          <button onClick={()=>setMonth(new Date(yr,mo+1,1))} style={{background:C.navy,border:"none",color:"#fff",padding:"6px 16px",fontFamily:"inherit",cursor:"pointer",fontWeight:700}}>→</button>
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12,padding:"10px 12px",background:C.surface,border:`1px solid ${C.border}`}}>
        <span style={{fontSize:10,color:C.textMuted,fontWeight:700,letterSpacing:1,alignSelf:"center",marginRight:4}}>FILTER:</span>
        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,fontWeight:700,color:allSelected?C.navy:C.textMuted,background:allSelected?C.navy+"18":"none",border:`1px solid ${allSelected?C.navy:C.border}`,padding:"3px 10px"}}>
          <input type="checkbox" checked={allSelected} onChange={()=>setSelCats(new Set())} style={{accentColor:C.navy,cursor:"pointer"}}/>
          ALL
        </label>
        {categories.map(cat=>{
          const active=selCats.has(cat);
          return(
            <label key={cat} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,fontWeight:700,color:active?C.navy:C.textMuted,background:active?C.navy+"18":"none",border:`1px solid ${active?C.navy:C.border}`,padding:"3px 10px"}}>
              <input type="checkbox" checked={active} onChange={()=>toggleCat(cat)} style={{accentColor:C.navy,cursor:"pointer"}}/>
              {cat}
            </label>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d=><div key={d} style={{background:C.navy,color:"#fff",padding:8,textAlign:"center",fontSize:11,letterSpacing:1,fontWeight:700}}>{d}</div>)}
        {cells.map((day,i)=>{
          const isT=day===today.getDate()&&yr===today.getFullYear()&&mo===today.getMonth();
          const dt=day?(byDay[day]||[]):[];
          return<div key={i} style={{background:C.surface,minHeight:90,padding:6,border:isT?`2px solid ${C.red}`:`1px solid ${C.border}`}}>
            {day&&<div style={{fontSize:13,color:isT?C.red:C.textMuted,marginBottom:4,fontWeight:isT?800:400}}>{day}</div>}
            {dt.slice(0,3).map(t=><div key={t.id} onClick={()=>onOpen(t)} style={{fontSize:11,color:"#fff",background:t.recurringId?C.purple:PCOL[t.priority],padding:"2px 5px",marginBottom:2,cursor:"pointer",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontWeight:600}}>{t.recurringId?"↻ ":""}{t.title}</div>)}
            {dt.length>3&&<div style={{fontSize:11,color:C.textMuted}}>+{dt.length-3} more</div>}
          </div>;
        })}
      </div>
      <div style={{marginTop:12,display:"flex",gap:16,fontSize:11,color:C.textMuted,flexWrap:"wrap"}}>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:12,background:C.purple,display:"inline-block",flexShrink:0}}/> Recurring</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:12,background:PCOL.Critical,display:"inline-block",flexShrink:0}}/> Critical</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:12,background:PCOL.High,display:"inline-block",flexShrink:0}}/> High</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:12,background:PCOL.Medium,display:"inline-block",flexShrink:0}}/> Medium</span>
      </div>
    </div>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────
function TaskModal({task,emps,recurring,onClose,onSave,onDel,onComment,onTogSub,onAddSub,canEdit,categories}){
  const[ed,setEd]=useState(false);
  const[dr,setDr]=useState(null);
  const[ct,setCt]=useState("");
  const[ns,setNs]=useState("");
  const[tab,setTab]=useState("details");
  if(!task)return null;
  const wt=ed?dr:task;
  const emp=emps.find(e=>e.id===task.assignee);
  const cre=emps.find(e=>e.id===task.createdBy);
  const od=task.dueDate&&new Date(task.dueDate)<today&&task.status!=="Done";
  const recTpl=task.recurringId?recurring?.find(r=>r.id===task.recurringId):null;
  const accent=task.recurringId?C.purple:C.red;

  return(
    <div style={{position:"fixed",inset:0,background:"#0c123077",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:C.surface,width:700,maxHeight:"88vh",overflow:"auto",boxShadow:"0 12px 50px #0c123055",borderTop:`4px solid ${accent}`}} onClick={e=>e.stopPropagation()}>
        <div style={{background:C.navy,padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1,marginRight:16}}>
            {ed?<input value={dr.title} onChange={e=>setDr({...dr,title:e.target.value})} style={{fontSize:17,fontWeight:700,color:"#fff",background:"#ffffff18",border:"1px solid #ffffff44",padding:"6px 10px",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
              :<div style={{fontSize:17,fontWeight:700,color:"#fff",lineHeight:1.3}}>{task.title}{task.recurringId&&<RecurBadge/>}</div>}
            <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center"}}><PB priority={wt.priority}/><SB status={wt.status}/><span style={{fontSize:11,color:"#ffffff77"}}>{task.category}</span></div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {canEdit&&!ed&&<button onClick={()=>{setDr({...task});setEd(true);}} style={{background:"none",border:"1px solid #ffffff55",color:"#fff",padding:"5px 13px",fontFamily:"inherit",fontSize:11,cursor:"pointer",fontWeight:700}}>EDIT</button>}
            {ed&&<button onClick={()=>{onSave(dr);setEd(false);}} style={{background:C.green,border:"none",color:"#fff",padding:"5px 13px",fontFamily:"inherit",fontSize:11,cursor:"pointer",fontWeight:700}}>SAVE</button>}
            {ed&&<button onClick={()=>setEd(false)} style={{background:"none",border:"1px solid #ffffff33",color:"#ffffffaa",padding:"5px 13px",fontFamily:"inherit",fontSize:11,cursor:"pointer"}}>CANCEL</button>}
            {canEdit&&!ed&&<button onClick={()=>onDel(task.id)} style={{background:C.red,border:"none",color:"#fff",padding:"5px 13px",fontFamily:"inherit",fontSize:11,cursor:"pointer",fontWeight:700}}>DELETE</button>}
            <button onClick={onClose} style={{background:"none",border:"1px solid #ffffff33",color:"#ffffffaa",padding:"5px 11px",fontFamily:"inherit",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
        </div>

        {recTpl&&(
          <div style={{background:C.purple+"14",borderBottom:`1px solid ${C.purple}33`,padding:"9px 24px",display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.purple,fontWeight:600}}>
            ↻ Generated by: <strong>{recTpl.title}</strong> · {freqLabel(recTpl)} · Template next due: {fmtS(recTpl.nextDue)}
          </div>
        )}

        <div style={{padding:24}}>
          {ed&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20,padding:16,background:C.card,border:`1px solid ${C.border}`}}>
              <ESel label="STATUS"   value={dr.status}        onChange={v=>setDr({...dr,status:v})}               opts={STATUSES}   full/>
              <ESel label="PRIORITY" value={dr.priority}      onChange={v=>setDr({...dr,priority:v})}             opts={PRIORITIES} full/>
              <ESel label="CATEGORY" value={dr.category}      onChange={v=>setDr({...dr,category:v})}             opts={categories} full/>
              <ESel label="ASSIGNEE" value={dr.assignee||""} onChange={v=>setDr({...dr,assignee:v?parseInt(v):null})} opts={[{v:"",l:"Unassigned"},...emps.map(e=>({v:e.id,l:e.name}))]} full/>
              <div><div style={{fontSize:11,color:C.textMuted,marginBottom:4,fontWeight:700}}>DUE DATE</div><input type="date" value={dr.dueDate} onChange={e=>setDr({...dr,dueDate:e.target.value})} style={{background:C.surface,border:`1.5px solid ${C.border}`,color:C.text,padding:"6px 10px",fontFamily:"inherit",fontSize:12,width:"100%",boxSizing:"border-box"}}/></div>
            </div>
          )}
          {!ed&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:20,padding:14,background:C.card,border:`1px solid ${C.border}`}}>
              <div><div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginBottom:4,fontWeight:700}}>ASSIGNEE</div><div style={{display:"flex",alignItems:"center",gap:6}}>{emp?<><Av u={emp} size={22}/><span style={{fontSize:12,fontWeight:600}}>{emp.name}</span></>:<span style={{fontSize:12,color:C.textMuted}}>Unassigned</span>}</div></div>
              <div><div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginBottom:4,fontWeight:700}}>DUE DATE</div><div style={{fontSize:12,color:od?C.red:C.text,fontWeight:od?700:400}}>{fmtS(task.dueDate)}{od?" ⚠":""}</div></div>
              <div><div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginBottom:4,fontWeight:700}}>CREATED BY</div><div style={{fontSize:12}}>{cre?.name||"—"}</div></div>
              <div><div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginBottom:4,fontWeight:700}}>CATEGORY</div><div style={{fontSize:12}}>{task.category}</div></div>
            </div>
          )}

          <div style={{display:"flex",borderBottom:`2px solid ${C.border}`,marginBottom:20}}>
            {["details","subtasks","comments"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{background:"none",border:"none",borderBottom:tab===t?`3px solid ${accent}`:"3px solid transparent",color:tab===t?accent:C.textMuted,padding:"8px 20px",fontFamily:"inherit",fontSize:12,cursor:"pointer",letterSpacing:1,fontWeight:700,marginBottom:-2}}>
                {t.toUpperCase()}{t==="comments"&&task.comments.length>0?` (${task.comments.length})`:""}{t==="subtasks"&&task.subtasks?.length>0?` (${task.subtasks.filter(s=>s.done).length}/${task.subtasks.length})`:""}
              </button>
            ))}
          </div>

          {tab==="details"&&<div><div style={{fontSize:11,color:C.textMuted,marginBottom:8,fontWeight:700,letterSpacing:1}}>DESCRIPTION</div>{ed?<textarea value={dr.description} onChange={e=>setDr({...dr,description:e.target.value})} rows={4} style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:10,fontFamily:"inherit",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/>:<div style={{color:C.text,fontSize:13,lineHeight:1.7,background:C.card,padding:14,minHeight:80,border:`1px solid ${C.border}`}}>{task.description||<span style={{color:C.textMuted}}>No description.</span>}</div>}</div>}
          {tab==="subtasks"&&<div>{(task.subtasks||[]).map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><input type="checkbox" checked={s.done} onChange={()=>onTogSub(task.id,s.id)} style={{accentColor:accent,width:16,height:16,cursor:"pointer"}}/><span style={{fontSize:13,color:s.done?C.textMuted:C.text,textDecoration:s.done?"line-through":"none"}}>{s.text}</span></div>)}{canEdit&&<div style={{display:"flex",gap:8,marginTop:14}}><input value={ns} onChange={e=>setNs(e.target.value)} placeholder="Add a subtask..." onKeyDown={e=>{if(e.key==="Enter"){onAddSub(task.id,ns);setNs("");}}} style={{flex:1,background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:13}}/><button onClick={()=>{onAddSub(task.id,ns);setNs("");}} style={{background:C.navy,border:"none",color:"#fff",padding:"9px 18px",fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:700}}>ADD</button></div>}</div>}
          {tab==="comments"&&<div>{task.comments.length===0&&<div style={{color:C.textMuted,fontSize:13,marginBottom:14}}>No comments yet.</div>}{task.comments.map(c=>{const a=emps.find(e=>e.id===c.author);return<div key={c.id} style={{display:"flex",gap:12,marginBottom:16}}><Av u={a} size={32}/><div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}><span style={{fontSize:13,color:C.navy,fontWeight:700}}>{a?.name}</span><span style={{fontSize:11,color:C.textMuted}}>{fmtS(c.date)}</span></div><div style={{fontSize:13,color:C.text,background:C.card,padding:"10px 14px",border:`1px solid ${C.border}`,lineHeight:1.6}}>{c.text}</div></div></div>;})}<div style={{display:"flex",gap:8,marginTop:10}}><input value={ct} onChange={e=>setCt(e.target.value)} placeholder="Add a comment..." onKeyDown={e=>{if(e.key==="Enter"){onComment(task.id,ct);setCt("");}}} style={{flex:1,background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:13}}/><button onClick={()=>{onComment(task.id,ct);setCt("");}} style={{background:accent,border:"none",color:"#fff",padding:"9px 20px",fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:700}}>POST</button></div></div>}
        </div>
      </div>
    </div>
  );
}

// ── New Task Modal ────────────────────────────────────────────────────────────
function NewTaskModal({task,emps,onChange,onCreate,onClose,categories}){
  return(
    <div style={{position:"fixed",inset:0,background:"#0c123077",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={onClose}>
      <div style={{background:C.surface,width:560,boxShadow:"0 12px 50px #0c123055",borderTop:`4px solid ${C.red}`}} onClick={e=>e.stopPropagation()}>
        <div style={{background:C.navy,padding:"16px 24px",color:"#fff",fontSize:15,fontWeight:700,letterSpacing:1}}>+ NEW TASK</div>
        <div style={{padding:24}}>
          <div style={{marginBottom:16}}><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>TITLE *</div><input value={task.title} onChange={e=>onChange({...task,title:e.target.value})} placeholder="Task title..." style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"10px 12px",fontFamily:"inherit",fontSize:14,boxSizing:"border-box"}}/></div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>DESCRIPTION</div><textarea value={task.description} onChange={e=>onChange({...task,description:e.target.value})} rows={3} placeholder="Details..." style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:22}}>
            <ESel label="CATEGORY"  value={task.category}     onChange={v=>onChange({...task,category:v})}             opts={categories} full/>
            <ESel label="PRIORITY"  value={task.priority}     onChange={v=>onChange({...task,priority:v})}             opts={PRIORITIES} full/>
            <ESel label="STATUS"    value={task.status}       onChange={v=>onChange({...task,status:v})}               opts={STATUSES}   full/>
            <ESel label="ASSIGN TO" value={task.assignee||""} onChange={v=>onChange({...task,assignee:v?parseInt(v):null})} opts={[{v:"",l:"Unassigned"},...emps.map(e=>({v:e.id,l:e.name}))]} full/>
            <div><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>DUE DATE</div><input type="date" value={task.dueDate} onChange={e=>onChange({...task,dueDate:e.target.value})} style={{background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",fontFamily:"inherit",fontSize:12,width:"100%",boxSizing:"border-box"}}/></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={onClose} style={{background:"none",border:`1.5px solid ${C.border}`,color:C.textMuted,padding:"9px 20px",fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:600}}>CANCEL</button>
            <button onClick={()=>{if(task.title.trim())onCreate(task);}} disabled={!task.title.trim()} style={{background:task.title.trim()?C.red:C.textMuted,border:"none",color:"#fff",padding:"9px 22px",fontFamily:"inherit",fontSize:12,cursor:task.title.trim()?"pointer":"default",fontWeight:700,letterSpacing:1}}>CREATE TASK</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function CategoriesSection({categories,catReady,onAdd,onDel}){
  const[newCat,setNewCat]=useState("");
  const doAdd=()=>{if(newCat.trim()){onAdd(newCat.trim());setNewCat("");}};
  return(
    <div style={{background:C.surface,border:`1px solid ${C.border}`,marginTop:28,boxShadow:"0 1px 4px #0c123010"}}>
      <div style={{background:C.navy,padding:"12px 20px",fontSize:12,fontWeight:700,color:"#fff",letterSpacing:2}}>TASK CATEGORIES</div>
      {!catReady&&(
        <div style={{padding:"12px 20px",background:"#fffbf0",border:`1px solid ${C.orange}33`,borderLeft:`4px solid ${C.orange}`,fontSize:12,color:C.text,lineHeight:1.7}}>
          <strong style={{color:C.orange}}>Categories table not set up.</strong> Changes won't persist until you run this SQL in your <strong>Supabase dashboard → SQL Editor</strong>:
          <pre style={{marginTop:8,background:"#1a1a2e",color:"#a8d8a8",padding:"10px 14px",fontSize:11,overflowX:"auto",fontFamily:"monospace",lineHeight:1.6}}>{"create table public.categories (\n  id bigint generated always as identity primary key,\n  name text not null unique\n);\nalter table public.categories enable row level security;\ncreate policy \"Allow all\" on public.categories for all using (true) with check (true);\n-- seed defaults\ninsert into public.categories (name) values\n  ('Operations'),('Marketing'),('Fulfillment'),\n  ('IT'),('Finance'),('HR'),('General');"}</pre>
        </div>
      )}
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-end"}}>
        <div style={{flex:1}}><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>CATEGORY NAME</div><input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAdd()} placeholder="e.g. Logistics" style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/></div>
        <button onClick={doAdd} disabled={!newCat.trim()} style={{background:newCat.trim()?C.red:C.textMuted,border:"none",color:"#fff",padding:"9px 20px",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:newCat.trim()?"pointer":"default",letterSpacing:1,whiteSpace:"nowrap"}}>ADD CATEGORY</button>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"14px 20px"}}>
        {categories.map(cat=>(
          <div key={cat} style={{display:"flex",alignItems:"center",gap:0,background:C.card,border:`1px solid ${C.border}`}}>
            <span style={{padding:"5px 12px",fontSize:12,fontWeight:700,color:C.navy,letterSpacing:0.5}}>{cat}</span>
            <button onClick={()=>onDel(cat)} style={{background:"none",border:"none",borderLeft:`1px solid ${C.border}`,color:C.textMuted,padding:"5px 9px",cursor:"pointer",fontSize:12,fontFamily:"inherit",lineHeight:1}}
              onMouseEnter={x=>{x.currentTarget.style.background=C.red+"18";x.currentTarget.style.color=C.red;}}
              onMouseLeave={x=>{x.currentTarget.style.background="none";x.currentTarget.style.color=C.textMuted;}}>✕</button>
          </div>
        ))}
        {categories.length===0&&<span style={{fontSize:12,color:C.textMuted,fontStyle:"italic"}}>No categories. Add one above.</span>}
      </div>
    </div>
  );
}

function AdminPanel({emps,tasks,me,onAdd,onDel,onUpd,messages,onAddMsg,onDelMsg,categories,catReady,onAddCat,onDelCat}){
  const[name,setName]=useState("");const[role,setRole]=useState("employee");const[addPin,setAddPin]=useState("");
  const[editId,setEditId]=useState(null);const[draft,setDraft]=useState(null);const[confirm,setConfirm]=useState(null);
  const[newMsg,setNewMsg]=useState("");
  const[msgErr,setMsgErr]=useState(false);
  const pinValid=p=>!p||/^\d{4}$/.test(p);
  const doAdd=()=>{if(!name.trim()||!pinValid(addPin))return;onAdd({name:name.trim(),role,pin:addPin||null});setName("");setRole("employee");setAddPin("");};
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{fontSize:11,color:C.textMuted,letterSpacing:3,fontWeight:700}}>ADMIN PANEL</div>
        <span style={{background:C.red+"18",color:C.red,border:`1px solid ${C.red}55`,padding:"2px 10px",fontSize:10,fontWeight:700,letterSpacing:1}}>ADMIN ONLY</span>
      </div>
      <div style={{display:"flex",gap:14,marginBottom:32}}>
        {[{l:"TOTAL EMPLOYEES",v:emps.length,c:C.navy},{l:"ADMINS",v:emps.filter(e=>e.role==="admin").length,c:C.red},{l:"TEAM LEADS",v:emps.filter(e=>e.role==="lead").length,c:C.orange},{l:"EMPLOYEES",v:emps.filter(e=>e.role==="employee").length,c:C.blue}].map(s=>(
          <div key={s.l} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderTop:`4px solid ${s.c}`,padding:"14px 18px",boxShadow:"0 1px 4px #0c123010"}}><div style={{fontSize:28,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:C.navy,letterSpacing:1,fontWeight:700,marginTop:4}}>{s.l}</div></div>
        ))}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,marginBottom:28,boxShadow:"0 1px 4px #0c123010"}}>
        <div style={{background:C.navy,padding:"12px 20px",fontSize:12,fontWeight:700,color:"#fff",letterSpacing:2}}>+ ADD EMPLOYEE</div>
        <div style={{padding:"18px 20px",display:"flex",gap:12,alignItems:"flex-end"}}>
          <div style={{flex:1}}><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>FULL NAME</div><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAdd()} placeholder="e.g. Jamie Lee" style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:14,boxSizing:"border-box"}}/></div>
          <div style={{width:160}}><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>ROLE</div><select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:13}}>{ROLES.map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></div>
          <div style={{width:120}}><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>PIN (4 digits)</div><input value={addPin} onChange={e=>setAddPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="e.g. 1234" maxLength={4} style={{width:"100%",background:C.card,border:`1.5px solid ${addPin&&!pinValid(addPin)?C.red:C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:14,boxSizing:"border-box",letterSpacing:4,textAlign:"center"}}/></div>
          <button onClick={doAdd} disabled={!name.trim()||!pinValid(addPin)} style={{background:name.trim()&&pinValid(addPin)?C.red:C.textMuted,border:"none",color:"#fff",padding:"9px 24px",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:name.trim()&&pinValid(addPin)?"pointer":"default",letterSpacing:1,whiteSpace:"nowrap"}}>ADD EMPLOYEE</button>
        </div>
      </div>
      {emps.length>0&&emps[0].pin===undefined&&(
        <div style={{padding:"12px 20px",background:"#fffbf0",border:`1px solid ${C.orange}55`,borderLeft:`4px solid ${C.orange}`,marginBottom:16,fontSize:12,color:C.text}}>
          <strong style={{color:C.orange}}>PIN column not set up.</strong> Run this SQL in your Supabase dashboard → SQL Editor to enable PINs:
          <pre style={{margin:"6px 0 0",background:"#1a1a2e",color:"#a8d8a8",padding:"8px 12px",fontSize:11,fontFamily:"monospace",overflowX:"auto",lineHeight:1.6}}>{"ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pin varchar(4);"}</pre>
        </div>
      )}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,boxShadow:"0 1px 6px #0c123012"}}>
        <div style={{background:C.navy,padding:"11px 20px",display:"grid",gridTemplateColumns:"52px 1fr 130px 80px 100px 120px",gap:12,fontSize:10,color:"#ffffffaa",letterSpacing:1,fontWeight:700}}>
          <div/><div>NAME</div><div>ROLE</div><div>PIN</div><div>OPEN TASKS</div><div style={{textAlign:"right"}}>ACTIONS</div>
        </div>
        {emps.map(emp=>{
          const open=tasks.filter(t=>t.assignee===emp.id&&t.status!=="Done").length;
          const isSelf=me.id===emp.id;const isEditing=editId===emp.id;
          return(
            <div key={emp.id} style={{borderBottom:`1px solid ${C.border}`}}>
              {isEditing?(
                <div style={{padding:"16px 20px",background:"#eef3ff",borderLeft:`4px solid ${C.blue}`}}>
                  <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
                    <Av u={{initials:mkI(draft.name||" ")}} size={38}/>
                    <div style={{flex:1}}><div style={{fontSize:10,color:C.textMuted,marginBottom:4,fontWeight:700}}>NAME</div><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} style={{width:"100%",background:C.surface,border:`1.5px solid ${C.navy}`,color:C.text,padding:"8px 10px",fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/></div>
                    <div style={{width:160}}><div style={{fontSize:10,color:C.textMuted,marginBottom:4,fontWeight:700}}>ROLE</div><select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})} style={{width:"100%",background:C.surface,border:`1.5px solid ${C.navy}`,color:C.text,padding:"8px 10px",fontFamily:"inherit",fontSize:13}}>{ROLES.map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></div>
                    <div style={{width:110}}><div style={{fontSize:10,color:C.textMuted,marginBottom:4,fontWeight:700}}>PIN (4 digits)</div><input value={draft.pin||""} onChange={e=>setDraft({...draft,pin:e.target.value.replace(/\D/g,"").slice(0,4)||null})} placeholder="set pin" maxLength={4} style={{width:"100%",background:C.surface,border:`1.5px solid ${draft.pin&&draft.pin.length!==4?C.red:C.navy}`,color:C.text,padding:"8px 10px",fontFamily:"inherit",fontSize:13,boxSizing:"border-box",letterSpacing:4,textAlign:"center"}}/></div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{onUpd(draft);setEditId(null);}} style={{background:C.green,border:"none",color:"#fff",padding:"8px 18px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1}}>SAVE</button>
                      <button onClick={()=>setEditId(null)} style={{background:"none",border:`1.5px solid ${C.border}`,color:C.textMuted,padding:"8px 14px",fontFamily:"inherit",fontSize:11,cursor:"pointer"}}>CANCEL</button>
                    </div>
                  </div>
                </div>
              ):(
                <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"52px 1fr 130px 80px 100px 120px",gap:12,alignItems:"center"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Av u={emp} size={38}/><div><div style={{fontSize:14,fontWeight:700}}>{emp.name}{isSelf&&<span style={{fontSize:10,color:C.textMuted,marginLeft:8,fontWeight:400}}>(you)</span>}</div></div>
                  <div><RP role={emp.role}/></div>
                  <div style={{fontSize:12,color:emp.pin?C.text:C.textMuted,letterSpacing:emp.pin?3:0,fontWeight:emp.pin?700:400}}>{emp.pin?"••••":"—"}</div>
                  <div style={{fontSize:13,color:open>3?C.red:C.textMuted,fontWeight:open>0?700:400}}>{open} open</div>
                  <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    <button onClick={()=>{setEditId(emp.id);setDraft({...emp});}} style={{background:"none",border:`1px solid ${C.navy}`,color:C.navy,padding:"5px 13px",fontFamily:"inherit",fontSize:11,cursor:"pointer",fontWeight:700}}>EDIT</button>
                    <button onClick={()=>!isSelf&&setConfirm({...emp,open})} disabled={isSelf} style={{background:"none",border:`1px solid ${isSelf?C.border:C.red}`,color:isSelf?C.border:C.red,padding:"5px 13px",fontFamily:"inherit",fontSize:11,cursor:isSelf?"default":"pointer",fontWeight:700,opacity:isSelf?0.35:1}}>REMOVE</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,marginTop:28,boxShadow:"0 1px 4px #0c123010"}}>
        <div style={{background:C.navy,padding:"12px 20px",fontSize:12,fontWeight:700,color:"#fff",letterSpacing:2}}>DASHBOARD MESSAGES</div>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:1}}><div style={{fontSize:11,color:C.textMuted,marginBottom:5,fontWeight:700}}>MESSAGE TEXT</div><input value={newMsg} onChange={e=>{setNewMsg(e.target.value);setMsgErr(false);}} onKeyDown={e=>{if(e.key==="Enter"&&newMsg.trim()){onAddMsg(newMsg.trim()).then(ok=>{if(ok)setNewMsg("");else setMsgErr(true);})}}} placeholder="Enter a message to display on the dashboard..." style={{width:"100%",background:C.card,border:`1.5px solid ${msgErr?C.red:C.border}`,color:C.text,padding:"9px 12px",fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/></div>
          <button onClick={()=>{if(newMsg.trim())onAddMsg(newMsg.trim()).then(ok=>{if(ok)setNewMsg("");else setMsgErr(true);});}} disabled={!newMsg.trim()} style={{background:newMsg.trim()?C.red:C.textMuted,border:"none",color:"#fff",padding:"9px 20px",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:newMsg.trim()?"pointer":"default",letterSpacing:1,whiteSpace:"nowrap"}}>ADD MESSAGE</button>
        </div>
        {msgErr&&<div style={{padding:"12px 20px",background:"#fff3f3",borderBottom:`1px solid ${C.red}33`,fontSize:12,color:C.red,lineHeight:1.7}}>
          ⚠ The <code style={{background:"#fde8e8",padding:"1px 5px"}}>messages</code> table doesn't exist yet. Run this SQL in your <strong>Supabase dashboard → SQL Editor</strong>:
          <pre style={{marginTop:8,background:"#1a1a2e",color:"#a8d8a8",padding:"10px 14px",fontSize:11,overflowX:"auto",fontFamily:"monospace",lineHeight:1.6}}>{"create table public.messages (\n  id bigint generated always as identity primary key,\n  text text not null,\n  created_at timestamptz default now()\n);\nalter table public.messages enable row level security;\ncreate policy \"Allow all\" on public.messages for all using (true) with check (true);"}</pre>
        </div>}
        {messages.length===0&&!msgErr?(
          <div style={{padding:"20px",fontSize:13,color:C.textMuted,fontStyle:"italic"}}>No messages. Add one above to display it on the dashboard.</div>
        ):(
          <div>
            {messages.map((m,i)=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:`1px solid ${C.border}`}}
                onMouseEnter={e=>e.currentTarget.style.background=C.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:11,fontWeight:700,color:C.textMuted,minWidth:20}}>{i+1}</span>
                <span style={{flex:1,fontSize:13,color:C.text,lineHeight:1.5}}>{m.text}</span>
                <button onClick={()=>onDelMsg(m.id)} style={{background:"none",border:`1px solid ${C.red}`,color:C.red,padding:"4px 12px",fontFamily:"inherit",fontSize:11,cursor:"pointer",fontWeight:700,flexShrink:0}}>REMOVE</button>
              </div>
            ))}
            <div style={{padding:"10px 20px",fontSize:11,color:C.textMuted}}>One message is picked at random each time the dashboard loads.</div>
          </div>
        )}
      </div>
      <CategoriesSection categories={categories} catReady={catReady} onAdd={onAddCat} onDel={onDelCat}/>
      {confirm&&(
        <div style={{position:"fixed",inset:0,background:"#0c123077",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
          <div style={{background:C.surface,width:430,borderTop:`4px solid ${C.red}`,boxShadow:"0 12px 50px #0c123055"}}>
            <div style={{background:C.navy,padding:"16px 24px",color:"#fff",fontSize:14,fontWeight:700,letterSpacing:1}}>REMOVE EMPLOYEE</div>
            <div style={{padding:24}}>
              <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.card,border:`1px solid ${C.border}`,marginBottom:20}}><Av u={confirm} size={46}/><div><div style={{fontSize:16,fontWeight:700,marginBottom:6}}>{confirm.name}</div><RP role={confirm.role}/></div></div>
              {confirm.open>0?<div style={{background:"#fff3f3",border:`1px solid ${C.red}55`,padding:"12px 16px",marginBottom:20,fontSize:13,color:C.red,lineHeight:1.6}}>⚠ <strong>{confirm.name}</strong> has <strong>{confirm.open} open task{confirm.open!==1?"s":""}</strong>. Those tasks will become unassigned.</div>:<p style={{fontSize:13,color:C.textMuted,marginBottom:20,lineHeight:1.6}}>Are you sure you want to remove <strong>{confirm.name}</strong>? This cannot be undone.</p>}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button onClick={()=>setConfirm(null)} style={{background:"none",border:`1.5px solid ${C.border}`,color:C.textMuted,padding:"9px 20px",fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:600}}>CANCEL</button>
                <button onClick={()=>{onDel(confirm.id);setConfirm(null);}} style={{background:C.red,border:"none",color:"#fff",padding:"9px 22px",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>CONFIRM REMOVE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ideas ──────────────────────────────────────────────────────────────────────
function IdeasPanel({ideas,ready,onAdd,onDel,onToTask}){
  const[title,setTitle]=useState("");
  const[notes,setNotes]=useState("");
  const[showNotes,setShowNotes]=useState(false);
  const submit=()=>{
    if(!title.trim())return;
    onAdd(title,notes);
    setTitle("");setNotes("");setShowNotes(false);
  };
  const SQL=`create table ideas (\n  id bigint generated always as identity primary key,\n  title text not null,\n  notes text default '',\n  created_at timestamptz default now(),\n  created_by bigint references employees(id)\n);`;
  return(
    <div style={{maxWidth:860,margin:"0 auto",padding:"24px 16px"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,marginBottom:0}}>
        <div style={{background:C.navy,padding:"12px 20px",fontSize:12,fontWeight:700,color:"#fff",letterSpacing:2,display:"flex",alignItems:"center",gap:10}}>
          <span>💡 IDEAS</span>
          <span style={{fontSize:10,color:"#ffffff66",fontWeight:400,letterSpacing:1}}>{ideas.length} stored</span>
        </div>
        {!ready&&(
          <div style={{padding:"14px 18px",fontSize:12,color:C.orange,background:"#fff8ee",borderBottom:`1px solid ${C.border}`}}>
            <strong style={{color:C.orange}}>Table not set up.</strong> Run this SQL in your Supabase dashboard → SQL Editor:<br/>
            <pre style={{margin:"8px 0 0",padding:"10px 14px",background:C.card,border:`1px solid ${C.border}`,fontSize:11,overflowX:"auto",color:C.text,lineHeight:1.6}}>{SQL}</pre>
          </div>
        )}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&submit()}
              placeholder="New idea…"
              style={{flex:1,background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"8px 12px",fontFamily:"inherit",fontSize:13,outline:"none"}}/>
            <button onClick={()=>setShowNotes(o=>!o)} title="Add notes"
              style={{background:"none",border:`1px solid ${C.border}`,color:showNotes?C.navy:C.textMuted,padding:"7px 12px",fontFamily:"inherit",fontSize:11,cursor:"pointer",fontWeight:700}}>
              {showNotes?"▲ NOTES":"▼ NOTES"}
            </button>
            <button onClick={submit} disabled={!title.trim()}
              style={{background:title.trim()?C.red:C.textMuted,border:"none",color:"#fff",padding:"8px 20px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:title.trim()?"pointer":"default",letterSpacing:1}}>
              + ADD
            </button>
          </div>
          {showNotes&&(
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes…" rows={3}
              style={{width:"100%",background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"8px 12px",fontFamily:"inherit",fontSize:12,resize:"vertical",boxSizing:"border-box"}}/>
          )}
        </div>
        {ideas.length===0?(
          <div style={{padding:"24px 18px",fontSize:12,color:C.textMuted,fontStyle:"italic",textAlign:"center"}}>No ideas yet. Add one above.</div>
        ):(
          <div>
            {ideas.map(idea=>(
              <div key={idea.id} style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"flex-start",gap:12,background:"transparent",transition:"background 0.12s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.card}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:idea.notes?4:0}}>{idea.title}</div>
                  {idea.notes&&<div style={{fontSize:12,color:C.textMuted,whiteSpace:"pre-wrap",lineHeight:1.5}}>{idea.notes}</div>}
                  <div style={{fontSize:10,color:C.textMuted,marginTop:4,letterSpacing:0.5}}>
                    {new Date(idea.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}}>
                  <button onClick={()=>onToTask(idea)} title="Convert to task"
                    style={{background:C.navy,border:"none",color:"#fff",padding:"5px 12px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap"}}
                    onMouseEnter={x=>x.currentTarget.style.background=C.navyLight}
                    onMouseLeave={x=>x.currentTarget.style.background=C.navy}>
                    → TASK
                  </button>
                  <button onClick={()=>onDel(idea.id)} title="Delete idea"
                    style={{background:"none",border:`1px solid ${C.border}`,color:C.textMuted,width:28,height:28,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",flexShrink:0}}
                    onMouseEnter={x=>{x.currentTarget.style.borderColor=C.red;x.currentTarget.style.color=C.red;}}
                    onMouseLeave={x=>{x.currentTarget.style.borderColor=C.border;x.currentTarget.style.color=C.textMuted;}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalsPanel({emps,goals,onAdd,onUpd,onDel}){
  const[drafts,setDrafts]=useState({});
  const doAdd=empId=>{
    const text=(drafts[empId]||"").trim();
    if(!text)return;
    onAdd({empId,text,status:"Not Started"});
    setDrafts(d=>({...d,[empId]:""}));
  };
  return(
    <div style={{width:"100%"}}>
      <div style={{fontSize:11,color:C.textMuted,letterSpacing:3,fontWeight:700,marginBottom:16}}>GOALS</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
      {emps.map(emp=>{
        const empGoals=goals.filter(g=>g.empId===emp.id);
        const draft=drafts[emp.id]||"";
        return(
          <div key={emp.id} style={{background:C.surface,border:`1px solid ${C.border}`,marginBottom:18,boxShadow:"0 1px 4px #0c123010"}}>
            <div style={{background:C.navy,padding:"11px 20px",display:"flex",alignItems:"center",gap:12}}>
              <Av u={emp} size={30}/>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",flex:1}}>{emp.name}</div>
              <RP role={emp.role}/>
              <span style={{fontSize:10,color:"#ffffff88",marginLeft:8}}>{empGoals.length} goal{empGoals.length!==1?"s":""}</span>
            </div>
            <div style={{padding:"14px 20px"}}>
              {empGoals.length===0&&<div style={{fontSize:12,color:C.textMuted,fontStyle:"italic",paddingBottom:8}}>No goals yet.</div>}
              {empGoals.map(g=>(
                <div key={g.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{flex:1,fontSize:13,color:C.text}}>{g.text}</div>
                  <select value={g.status} onChange={e=>onUpd({...g,status:e.target.value})}
                    style={{background:GCOL[g.status]+"18",border:`1.5px solid ${GCOL[g.status]}66`,color:GCOL[g.status],padding:"4px 8px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    {GOAL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={()=>onDel(g.id)}
                    style={{background:"none",border:`1px solid ${C.border}`,color:C.textMuted,padding:"4px 10px",fontFamily:"inherit",fontSize:12,cursor:"pointer"}}>✕</button>
                </div>
              ))}
              <div style={{display:"flex",gap:10,marginTop:12,alignItems:"center"}}>
                <input value={draft} onChange={e=>setDrafts(d=>({...d,[emp.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doAdd(emp.id)}
                  placeholder="Add a goal..." style={{flex:1,background:C.card,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",fontFamily:"inherit",fontSize:13}}/>
                <button onClick={()=>doAdd(emp.id)} disabled={!draft.trim()}
                  style={{background:draft.trim()?C.navy:C.textMuted,border:"none",color:"#fff",padding:"7px 18px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:draft.trim()?"pointer":"default",letterSpacing:1,whiteSpace:"nowrap"}}>+ ADD</button>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
