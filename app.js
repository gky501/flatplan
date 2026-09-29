const STORAGE_KEY = "annual-report-flatplan-v1";

const sample = {
  title: "The Year in Perspective",
  sections: [
    { id: "front", name: "Front matter", color: "#ec5b3f" },
    { id: "story", name: "Our story", color: "#3451b2" },
    { id: "impact", name: "Impact", color: "#24835b" },
    { id: "financial", name: "Financials", color: "#7b61a8" },
    { id: "back", name: "Back matter", color: "#c47a12" }
  ],
  spreads: [
    ["Cover", "Inside cover", "front", "ready", "MS"],
    ["Contents", "At a glance", "front", "review", "AL"],
    ["Letter from the chair", "Letter from the chair", "front", "writing", "JB"],
    ["A year of momentum", "A year of momentum", "story", "review", "DK"],
    ["Who we are", "Our strategy", "story", "ready", "AL"],
    ["People & culture", "People & culture", "impact", "writing", "SK"],
    ["Climate action", "Climate action", "impact", "review", "MS"],
    ["Community impact", "Community impact", "impact", "planned", "JB"],
    ["Financial highlights", "Financial highlights", "financial", "ready", "DK"],
    ["Performance review", "Performance review", "financial", "writing", "AL"],
    ["Governance", "Governance", "financial", "planned", "SK"],
    ["Risk & outlook", "Risk & outlook", "financial", "planned", "MS"],
    ["Leadership", "Contact", "back", "review", "JB"],
    ["Inside back cover", "Back cover", "back", "planned", ""]
  ].map((x,i)=>({id:crypto.randomUUID(),left:x[0],right:x[1],section:x[2],status:x[3],owner:x[4],due:"",notes:""}))
};

let state = load();
let sectionFilter = "all";
let view = "spreads";
let search = "";
let dragId = null;
const $ = s => document.querySelector(s);

function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(sample); } catch { return structuredClone(sample); } }
function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function section(id){ return state.sections.find(s=>s.id===id) || state.sections[0]; }
function statusLabel(s){ return ({planned:"Planned",writing:"Writing",review:"In review",ready:"Ready"})[s]; }
function esc(v=""){ return v.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]); }

function render(){
  document.title = `${state.title} · Flatplan`;
  $("#project-title").textContent = state.title;
  const pages = state.spreads.length*2;
  const ready = state.spreads.filter(s=>s.status==="ready").length*2;
  $("#pageCount").textContent=pages; $("#readyCount").textContent=ready; $("#progressText").textContent=`${Math.round(ready/pages*100)||0}%`;
  renderSections(); renderBoard();
}

function renderSections(){
  const list = $("#sectionList");
  const all = `<button class="section-button ${sectionFilter==="all"?"active":""}" data-section="all"><i style="--section-color:#111827"></i><span>All sections</span><b>${state.spreads.length*2}</b></button>`;
  list.innerHTML=all+state.sections.map(s=>`<button class="section-button ${sectionFilter===s.id?"active":""}" data-section="${s.id}"><i style="--section-color:${s.color}"></i><span>${esc(s.name)}</span><b>${state.spreads.filter(p=>p.section===s.id).length*2}</b></button>`).join("");
  list.querySelectorAll("button").forEach(b=>b.onclick=()=>{sectionFilter=b.dataset.section;render();});
}

function renderBoard(){
  let items=state.spreads.filter(s=>sectionFilter==="all"||s.section===sectionFilter).filter(s=>`${s.left} ${s.right} ${s.owner}`.toLowerCase().includes(search));
  $("#filterLabel").textContent=sectionFilter==="all"?"All sections":section(sectionFilter).name;
  $("#emptyState").hidden=items.length>0;
  $("#flatplan").innerHTML=items.map(s=>spreadHtml(s,state.spreads.indexOf(s))).join("");
  document.querySelectorAll(".spread").forEach(el=>{
    el.addEventListener("dragstart",()=>{dragId=el.dataset.id;el.classList.add("dragging")});
    el.addEventListener("dragend",()=>el.classList.remove("dragging"));
    el.addEventListener("dragover",e=>e.preventDefault());
    el.addEventListener("drop",e=>{e.preventDefault();reorder(dragId,el.dataset.id)});
  });
  document.querySelectorAll(".page").forEach(el=>el.onclick=()=>openEditor(el.closest(".spread").dataset.id));
}

function spreadHtml(s,index){
  const sec=section(s.section), n=index*2+1;
  const card=(title,num)=>`<article class="page" style="--section-color:${sec.color}" tabindex="0"><span class="page-number">${String(num).padStart(2,"0")}</span><h3>${esc(title)}</h3><span class="kind">${esc(sec.name)}</span><footer class="page-footer"><span class="owner">${s.owner?`<i class="avatar">${esc(s.owner.slice(0,2))}</i>${esc(s.owner)}`:"Unassigned"}</span><span class="status-pill ${s.status}">${statusLabel(s.status)}</span></footer></article>`;
  if(view==="pages") return `<div class="spread" draggable="true" data-id="${s.id}">${card(s.left,n)}${card(s.right,n+1)}<span class="spread-label">Pages ${n}–${n+1}</span></div>`;
  return `<div class="spread" draggable="true" data-id="${s.id}">${card(s.left,n)}${card(s.right,n+1)}<span class="spread-label">Spread ${index+1} · ${n}–${n+1}</span></div>`;
}

function reorder(from,to){ if(!from||from===to)return; const a=state.spreads.findIndex(s=>s.id===from),b=state.spreads.findIndex(s=>s.id===to); const [m]=state.spreads.splice(a,1);state.spreads.splice(b,0,m);save();render(); }
function openEditor(id){
  const s=state.spreads.find(x=>x.id===id); if(!s)return;
  $("#editId").value=s.id; $("#dialogTitle").textContent=`Pages ${state.spreads.indexOf(s)*2+1}–${state.spreads.indexOf(s)*2+2}`;
  $("#editTitle").value=s.left===s.right?s.left:`${s.left} / ${s.right}`; $("#editSection").innerHTML=state.sections.map(x=>`<option value="${x.id}" ${x.id===s.section?"selected":""}>${esc(x.name)}</option>`).join("");
  $("#editStatus").value=s.status; $("#editOwner").value=s.owner; $("#editDue").value=s.due||""; $("#editNotes").value=s.notes||""; $("#editDialog").showModal();
}

$("#editForm").addEventListener("submit",e=>{
  if(e.submitter?.value!=="default")return;
  e.preventDefault(); const s=state.spreads.find(x=>x.id===$("#editId").value); const parts=$("#editTitle").value.split("/").map(x=>x.trim());
  Object.assign(s,{left:parts[0],right:parts[1]||parts[0],section:$("#editSection").value,status:$("#editStatus").value,owner:$("#editOwner").value,due:$("#editDue").value,notes:$("#editNotes").value}); save();$("#editDialog").close();render();
});
$("#deleteBtn").onclick=()=>{state.spreads=state.spreads.filter(x=>x.id!==$("#editId").value);save();$("#editDialog").close();render();};
$("#addSpreadBtn").onclick=()=>{const id=crypto.randomUUID();state.spreads.push({id,left:"Untitled story",right:"Untitled story",section:sectionFilter==="all"?state.sections[0].id:sectionFilter,status:"planned",owner:"",due:"",notes:""});save();render();openEditor(id);};
$("#addSectionBtn").onclick=()=>{const name=prompt("Section name");if(!name)return;const colors=["#0e7490","#a33b20","#5c6f2f","#8a4f7d"];state.sections.push({id:crypto.randomUUID(),name,color:colors[state.sections.length%colors.length]});save();render();};
$("#searchInput").oninput=e=>{search=e.target.value.toLowerCase();renderBoard();};
$("#project-title").addEventListener("blur",e=>{state.title=e.target.textContent.trim()||"Untitled report";save();render();});
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x===b));renderBoard();});
$("#resetBtn").onclick=()=>{if(confirm("Replace this plan with the original sample?")){state=structuredClone(sample);save();render();}};
$("#exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="annual-report-flatplan.json";a.click();URL.revokeObjectURL(a.href);};
render();
