const {contextBridge,ipcRenderer}=require("electron");

contextBridge.exposeInMainWorld("flatplanDesktop",{
  open:()=>ipcRenderer.invoke("flatplan:open"),
  startupProject:()=>ipcRenderer.invoke("flatplan:startup-project"),
  save:data=>ipcRenderer.invoke("flatplan:save",data),
  saveAs:data=>ipcRenderer.invoke("flatplan:save-as",data),
  autoSave:data=>ipcRenderer.invoke("flatplan:auto-save",data),
  restoreBackup:()=>ipcRenderer.invoke("flatplan:restore-backup"),
  currentPath:()=>ipcRenderer.invoke("flatplan:current-path"),
  onOpen:callback=>ipcRenderer.on("flatplan:request-open",()=>callback()),
  onSave:callback=>ipcRenderer.on("flatplan:request-save",()=>callback()),
  onSaveAs:callback=>ipcRenderer.on("flatplan:request-save-as",()=>callback()),
  onRestore:callback=>ipcRenderer.on("flatplan:request-restore",()=>callback()),
  onProjectOpened:callback=>ipcRenderer.on("flatplan:project-opened",(_event,project)=>callback(project))
});
