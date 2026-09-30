const settingsDialog=document.querySelector("#settingsDialog");
let settingsChecklistDraft=[];

function collectSettingsChecklist(){return [...document.querySelectorAll("[data-settings-review-id]")].map(input=>({id:input.dataset.settingsReviewId,label:input.value.trim()}))}

function renderSettingsChecklist(items=settingsChecklistDraft){
  settingsChecklistDraft=items;
  document.querySelector("#settingsReviewChecklist").innerHTML=items.map((item,index)=>`<div class="settings-review-row"><input required data-settings-review-id="${esc(item.id)}" value="${esc(item.label)}" aria-label="Checklist item ${index+1}"><div class="settings-review-actions"><button type="button" data-review-move="up" data-review-index="${index}" aria-label="Move checklist item up" ${index===0?"disabled":""}>↑</button><button type="button" data-review-move="down" data-review-index="${index}" aria-label="Move checklist item down" ${index===items.length-1?"disabled":""}>↓</button><button type="button" data-review-remove="${index}" aria-label="Remove checklist item" ${items.length===1?"disabled":""}>×</button></div></div>`).join("");
  document.querySelectorAll("[data-review-remove]").forEach(button=>button.onclick=()=>{const current=collectSettingsChecklist();if(current.length===1)return toast("Keep at least one final review item");current.splice(Number(button.dataset.reviewRemove),1);renderSettingsChecklist(current)});
  document.querySelectorAll("[data-review-move]").forEach(button=>button.onclick=()=>{const current=collectSettingsChecklist(),from=Number(button.dataset.reviewIndex),to=button.dataset.reviewMove==="up"?from-1:from+1;[current[from],current[to]]=[current[to],current[from]];renderSettingsChecklist(current)});
}

function renderPublicationList(){
  const sorted=[...library.items].sort((a,b)=>(a.archived-b.archived)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
  document.querySelector("#publicationList").innerHTML=sorted.map(item=>{
    const active=item.id===library.activeId;
    const date=item.updatedAt?new Date(item.updatedAt).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"";
    return `<div class="publication-row ${active?"active":""} ${item.archived?"archived":""}"><div><strong>${esc(item.data.title||"Untitled publication")}</strong><small>${active?"Current · ":item.archived?"Archived · ":""}${date}</small></div>${active?"":`<button type="button" data-open-publication="${item.id}">${item.archived?"Restore":"Open"}</button>`}</div>`;
  }).join("");
  document.querySelectorAll("[data-open-publication]").forEach(button=>button.onclick=()=>{
    const item=library.items.find(x=>x.id===button.dataset.openPublication);
    if(!item)return;
    item.archived=false;library.activeId=item.id;state=item.data;save();render();openSettings();toast("Publication opened");
  });
}

function openSettings(){
  normalizePublication(state);
  document.querySelector("#settingsTitle").value=state.title;
  document.querySelector("#settingsAccent").value=state.settings.accent;
  document.querySelector("#settingsDensity").value=state.settings.density;
  renderSettingsChecklist(structuredClone(state.settings.finalReviewChecklist));
  renderPublicationList();
  if(!settingsDialog.open)settingsDialog.showModal();
}

document.querySelector("#settingsBtn").onclick=openSettings;
document.querySelector("#addReviewItemBtn").onclick=()=>{const current=collectSettingsChecklist();current.push({id:uid(),label:"New review requirement"});renderSettingsChecklist(current);document.querySelector("#settingsReviewChecklist .settings-review-row:last-child input")?.select()};
document.querySelectorAll(".close-settings").forEach(button=>button.onclick=()=>settingsDialog.close());
document.querySelector("#settingsForm").onsubmit=event=>{
  event.preventDefault();
  const checklist=collectSettingsChecklist().filter(item=>item.label);if(!checklist.length)return toast("Add at least one final review item");
  const labels=checklist.map(item=>item.label.toLowerCase());if(new Set(labels).size!==labels.length)return toast("Final review items must be unique");
  const previousLabels=new Map(state.settings.finalReviewChecklist.map(item=>[item.id,item.label]));
  const renamedIds=checklist.filter(item=>previousLabels.has(item.id)&&previousLabels.get(item.id)!==item.label).map(item=>item.id);
  if(renamedIds.length)[...state.pages,...state.covers].forEach(page=>renamedIds.forEach(id=>delete page.reviewChecks?.[id]));
  state.title=document.querySelector("#settingsTitle").value.trim()||"Untitled publication";
  state.settings={...state.settings,accent:document.querySelector("#settingsAccent").value,density:document.querySelector("#settingsDensity").value,finalReviewChecklist:checklist};
  save();render();settingsDialog.close();toast("Publication settings saved");
};
document.querySelector("#newPublicationBtn").onclick=()=>{
  const title=prompt("Name the new publication","New Publication Edition 2027");
  if(!title?.trim())return;
  save();const id=uid();state=blankPublication(title.trim());library.activeId=id;library.items.push({id,archived:false,updatedAt:new Date().toISOString(),data:state});save();render();openSettings();toast("New publication started");
};
document.querySelector("#archivePublicationBtn").onclick=()=>{
  if(!confirm(`Archive “${state.title}”? You can restore it from Settings.`))return;
  const current=library.items.find(x=>x.id===library.activeId);if(current)current.archived=true;
  let next=library.items.find(x=>!x.archived&&x.id!==library.activeId);
  if(!next){const id=uid(),data=blankPublication("New Publication");next={id,archived:false,updatedAt:new Date().toISOString(),data};library.items.push(next)}
  library.activeId=next.id;state=next.data;save();render();openSettings();toast("Publication archived");
};
