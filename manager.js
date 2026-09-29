const settingsDialog=document.querySelector("#settingsDialog");

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
  state.settings||={accent:"#ff5a36",density:"compact"};
  document.querySelector("#settingsTitle").value=state.title;
  document.querySelector("#settingsAccent").value=state.settings.accent;
  document.querySelector("#settingsDensity").value=state.settings.density;
  renderPublicationList();
  if(!settingsDialog.open)settingsDialog.showModal();
}

document.querySelector("#settingsBtn").onclick=openSettings;
document.querySelectorAll(".close-settings").forEach(button=>button.onclick=()=>settingsDialog.close());
document.querySelector("#settingsForm").onsubmit=event=>{
  event.preventDefault();
  state.title=document.querySelector("#settingsTitle").value.trim()||"Untitled publication";
  state.settings={accent:document.querySelector("#settingsAccent").value,density:document.querySelector("#settingsDensity").value};
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
