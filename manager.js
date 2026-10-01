const settingsDialog=document.querySelector("#settingsDialog");
let settingsChecklistDraft=[],settingsOwnerDraft=[];

function renderSectionManager(){
  const list=document.querySelector("#sectionManagerList");if(!list)return;
  list.innerHTML=state.sections.map((section,index)=>{const used=[...state.pages,...state.covers].some(page=>page.section===section.id);return`<div class="section-manager-row"><input type="color" value="${esc(section.color)}" data-section-color="${esc(section.id)}" aria-label="${esc(section.name)} color"><input value="${esc(section.name)}" data-section-name="${esc(section.id)}" aria-label="Section ${index+1} name"><button type="button" data-section-remove="${esc(section.id)}" ${used||state.sections.length===1?"disabled":""} title="${used?"Move pages out of this section before removing it":state.sections.length===1?"Keep at least one section":"Remove section"}">×</button></div>`}).join("");
  list.querySelectorAll("[data-section-name]").forEach(input=>input.onchange=()=>{const value=input.value.trim(),section=state.sections.find(item=>item.id===input.dataset.sectionName);if(!value){input.value=section.name;return toast("Section names cannot be blank")}if(state.sections.some(item=>item.id!==section.id&&item.name.toLocaleLowerCase()===value.toLocaleLowerCase())){input.value=section.name;return toast("Section names must be unique")}section.name=value;save();render();toast("Section updated")});
  list.querySelectorAll("[data-section-color]").forEach(input=>input.oninput=()=>{const section=state.sections.find(item=>item.id===input.dataset.sectionColor);if(section)section.color=input.value;save();render()});
  list.querySelectorAll("[data-section-remove]").forEach(button=>button.onclick=()=>{state.sections=state.sections.filter(item=>item.id!==button.dataset.sectionRemove);save();render();toast("Section removed")});
}
window.renderSectionManager=renderSectionManager;

function collectSettingsChecklist(){return [...document.querySelectorAll(".settings-review-row")].map(row=>{const input=row.querySelector("[data-settings-review-id]");return{id:input.dataset.settingsReviewId,label:input.value.trim(),owner:row.querySelector("[data-review-owner]")?.value||""}})}

function renderSettingsChecklist(items=settingsChecklistDraft){
  settingsChecklistDraft=items;
  document.querySelector("#settingsReviewChecklist").innerHTML=items.map((item,index)=>`<div class="settings-review-row"><input required data-settings-review-id="${esc(item.id)}" value="${esc(item.label)}" aria-label="Checklist item ${index+1}"><select data-review-owner aria-label="Checklist owner"><option value="">Anyone</option>${state.settings.owners.map(owner=>`<option value="${esc(owner)}" ${item.owner===owner?"selected":""}>${esc(owner)}</option>`).join("")}</select><div class="settings-review-actions"><button type="button" data-review-move="up" data-review-index="${index}" aria-label="Move checklist item up" ${index===0?"disabled":""}>↑</button><button type="button" data-review-move="down" data-review-index="${index}" aria-label="Move checklist item down" ${index===items.length-1?"disabled":""}>↓</button><button type="button" data-review-remove="${index}" aria-label="Remove checklist item" ${items.length===1?"disabled":""}>×</button></div></div>`).join("");
  document.querySelectorAll("[data-review-remove]").forEach(button=>button.onclick=()=>{const current=collectSettingsChecklist();if(current.length===1)return toast("Keep at least one final review item");current.splice(Number(button.dataset.reviewRemove),1);renderSettingsChecklist(current)});
  document.querySelectorAll("[data-review-move]").forEach(button=>button.onclick=()=>{const current=collectSettingsChecklist(),from=Number(button.dataset.reviewIndex),to=button.dataset.reviewMove==="up"?from-1:from+1;[current[from],current[to]]=[current[to],current[from]];renderSettingsChecklist(current)});
}

function collectSettingsOwners(){return [...document.querySelectorAll("[data-settings-owner]")].map(input=>input.value.trim())}
function renderSettingsOwners(items=settingsOwnerDraft){
  settingsOwnerDraft=items;
  document.querySelector("#settingsOwnerList").innerHTML=items.length?items.map((owner,index)=>`<div class="settings-owner-row"><input data-settings-owner value="${esc(owner)}" aria-label="Owner ${index+1}" placeholder="Name or initials"><button type="button" data-owner-remove="${index}" aria-label="Remove ${esc(owner||`owner ${index+1}`)}">×</button></div>`).join(""):`<p class="settings-empty">No owners yet. Add one to make assignments available.</p>`;
  document.querySelectorAll("[data-owner-remove]").forEach(button=>button.onclick=()=>{const current=collectSettingsOwners();current.splice(Number(button.dataset.ownerRemove),1);renderSettingsOwners(current)});
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
  document.querySelector("#settingsDigitalDraftUrl").value=state.settings.digitalDraftUrl||"";
  renderSettingsOwners(structuredClone(state.settings.owners));
  renderSettingsChecklist(structuredClone(state.settings.finalReviewChecklist));
  renderPublicationList();
  if(!settingsDialog.open)settingsDialog.showModal();
}

function selectSettingsTab(name){
  document.querySelectorAll("[data-settings-tab]").forEach(button=>button.classList.toggle("active",button.dataset.settingsTab===name));
  document.querySelectorAll("[data-settings-pane]").forEach(pane=>pane.classList.toggle("active",pane.dataset.settingsPane===name));
  document.querySelector("#settingsForm").classList.toggle("show-savebar",name!=="publications");
}
document.querySelectorAll("[data-settings-tab]").forEach(button=>button.onclick=()=>selectSettingsTab(button.dataset.settingsTab));

document.querySelector("#settingsBtn").onclick=()=>{selectSettingsTab("general");openSettings()};
document.querySelector("#settingsDensity").onchange=event=>document.documentElement.dataset.density=event.target.value;
document.querySelector("#addOwnerBtn").onclick=()=>{const current=collectSettingsOwners();current.push("");renderSettingsOwners(current);document.querySelector("#settingsOwnerList .settings-owner-row:last-child input")?.focus()};
document.querySelector("#addReviewItemBtn").onclick=()=>{const current=collectSettingsChecklist();current.push({id:uid(),label:"New review requirement"});renderSettingsChecklist(current);document.querySelector("#settingsReviewChecklist .settings-review-row:last-child input")?.select()};
document.querySelector("#addSectionBtn").onclick=()=>{state.sections.push({id:`section-${uid()}`,name:`Section ${state.sections.length+1}`,color:"#667085"});save();render();document.querySelector(".section-manager")?.setAttribute("open","");document.querySelector("#sectionManagerList .section-manager-row:last-child [data-section-name]")?.select();toast("Section added")};
document.querySelectorAll(".close-settings").forEach(button=>button.onclick=()=>{document.documentElement.dataset.density=state.settings.density;settingsDialog.close()});
document.querySelector("#settingsForm").onsubmit=event=>{
  event.preventDefault();
  const owners=collectSettingsOwners().filter(Boolean),ownerKeys=owners.map(owner=>owner.toLocaleLowerCase());if(new Set(ownerKeys).size!==ownerKeys.length)return toast("Each owner name must be unique");
  const checklist=collectSettingsChecklist().filter(item=>item.label);if(!checklist.length)return toast("Add at least one final review item");
  const labels=checklist.map(item=>item.label.toLowerCase());if(new Set(labels).size!==labels.length)return toast("Final review items must be unique");
  const previousLabels=new Map(state.settings.finalReviewChecklist.map(item=>[item.id,item.label]));
  const renamedIds=checklist.filter(item=>previousLabels.has(item.id)&&previousLabels.get(item.id)!==item.label).map(item=>item.id);
  if(renamedIds.length)[...state.pages,...state.covers].forEach(page=>renamedIds.forEach(id=>delete page.reviewChecks?.[id]));
  state.title=document.querySelector("#settingsTitle").value.trim()||"Untitled publication";
  const draftInput=document.querySelector("#settingsDigitalDraftUrl"),digitalDraftUrl=draftInput.value.trim();if(digitalDraftUrl){try{const parsed=new URL(digitalDraftUrl);if(!["http:","https:"].includes(parsed.protocol))throw new Error("protocol")}catch{return toast("Enter a complete http:// or https:// digital draft link")}}
  state.settings={...state.settings,accent:document.querySelector("#settingsAccent").value,density:document.querySelector("#settingsDensity").value,digitalDraftUrl,owners,finalReviewChecklist:checklist};
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
renderSectionManager();
