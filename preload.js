const {contextBridge,ipcRenderer}=require("electron");

contextBridge.exposeInMainWorld("flatplanDesktop",{
  open:()=>ipcRenderer.invoke("flatplan:open"),
  startupProject:()=>ipcRenderer.invoke("flatplan:startup-project"),
  save:data=>ipcRenderer.invoke("flatplan:save",data),
  saveAs:data=>ipcRenderer.invoke("flatplan:save-as",data),
  autoSave:data=>ipcRenderer.invoke("flatplan:auto-save",data),
  restoreBackup:()=>ipcRenderer.invoke("flatplan:restore-backup"),
  currentPath:()=>ipcRenderer.invoke("flatplan:current-path"),
  selectAssets:()=>ipcRenderer.invoke("flatplan:select-assets"),
  checkAssets:assets=>ipcRenderer.invoke("flatplan:check-assets",assets),
  exportText:payload=>ipcRenderer.invoke("flatplan:export-text",payload),
  rewriteProductionOutputs:outputs=>ipcRenderer.invoke("flatplan:rewrite-production-outputs",outputs),
  notify:(title,body)=>ipcRenderer.invoke("flatplan:notify",{title,body}),
  onOpen:callback=>ipcRenderer.on("flatplan:request-open",()=>callback()),
  onSave:callback=>ipcRenderer.on("flatplan:request-save",()=>callback()),
  onSaveAs:callback=>ipcRenderer.on("flatplan:request-save-as",()=>callback()),
  onRestore:callback=>ipcRenderer.on("flatplan:request-restore",()=>callback()),
  onProjectOpened:callback=>ipcRenderer.on("flatplan:project-opened",(_event,project)=>callback(project))
});
