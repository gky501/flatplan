const {contextBridge,ipcRenderer}=require("electron");

contextBridge.exposeInMainWorld("flatplanDesktop",{
  open:()=>ipcRenderer.invoke("flatplan:open"),
  save:data=>ipcRenderer.invoke("flatplan:save",data),
  saveAs:data=>ipcRenderer.invoke("flatplan:save-as",data),
  autoSave:data=>ipcRenderer.invoke("flatplan:auto-save",data),
  currentPath:()=>ipcRenderer.invoke("flatplan:current-path"),
  onOpen:callback=>ipcRenderer.on("flatplan:request-open",()=>callback()),
  onSave:callback=>ipcRenderer.on("flatplan:request-save",()=>callback()),
  onSaveAs:callback=>ipcRenderer.on("flatplan:request-save-as",()=>callback())
});
