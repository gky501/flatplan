const {app,BrowserWindow,dialog,ipcMain,Menu}=require("electron");
const fs=require("node:fs/promises");
const path=require("node:path");

const MAX_BACKUPS=20;
let mainWindow=null,currentFilePath="",lastKnownMtimeMs=0,pendingOpenPath="";

function projectFilters(){return[{name:"Flatplan project",extensions:["flatplan"]},{name:"JSON",extensions:["json"]}]}
function safeName(value="Flatplan"){return String(value).replace(/[\\/:*?"<>|]/g,"-").trim()||"Flatplan"}
function send(channel,payload){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(channel,payload)}
function updateTitle(){if(mainWindow)mainWindow.setTitle(currentFilePath?`${path.basename(currentFilePath)} — Flatplan`:"Flatplan")}
function preferencesPath(){return path.join(app.getPath("userData"),"flatplan-preferences.json")}
function backupDirectory(filePath){return path.join(path.dirname(filePath),".flatplan-backups")}
function timestamp(){return new Date().toISOString().replace(/[:.]/g,"-")}

async function exists(filePath){try{await fs.access(filePath);return true}catch{return false}}
async function rememberCurrentFile(){await fs.mkdir(app.getPath("userData"),{recursive:true});await fs.writeFile(preferencesPath(),JSON.stringify({lastFilePath:currentFilePath},null,2),"utf8")}
async function rememberStat(filePath){try{lastKnownMtimeMs=(await fs.stat(filePath)).mtimeMs}catch{lastKnownMtimeMs=0}}
async function readProject(filePath){const text=await fs.readFile(filePath,"utf8"),data=JSON.parse(text);return{filePath,data}}

async function createBackup(filePath){
  if(!await exists(filePath))return;
  const directory=backupDirectory(filePath),extension=path.extname(filePath)||".flatplan",stem=path.basename(filePath,extension);
  await fs.mkdir(directory,{recursive:true});
  await fs.copyFile(filePath,path.join(directory,`${safeName(stem)}-${timestamp()}${extension}`));
  const entries=(await fs.readdir(directory,{withFileTypes:true})).filter(entry=>entry.isFile()).map(entry=>entry.name).sort().reverse();
  await Promise.all(entries.slice(MAX_BACKUPS).map(name=>fs.unlink(path.join(directory,name)).catch(()=>{})));
}

async function hasExternalChange(filePath){
  if(!lastKnownMtimeMs||!await exists(filePath))return false;
  return Math.abs((await fs.stat(filePath)).mtimeMs-lastKnownMtimeMs)>1;
}

async function finishWrite(filePath,data){
  await createBackup(filePath);
  const temporary=`${filePath}.tmp`;
  await fs.writeFile(temporary,`${JSON.stringify(data,null,2)}\n`,"utf8");
  await fs.rename(temporary,filePath);
  currentFilePath=filePath;await rememberStat(filePath);await rememberCurrentFile();app.addRecentDocument(filePath);updateTitle();
  return{canceled:false,filePath,backupDirectory:backupDirectory(filePath)};
}

async function chooseSavePath(data){
  const title=data?.library?.items?.find(item=>item.id===data.library.activeId)?.data?.title||"Flatplan";
  const result=await dialog.showSaveDialog(mainWindow,{title:"Save Flatplan project",defaultPath:`${safeName(title)}.flatplan`,filters:projectFilters(),properties:["createDirectory","showOverwriteConfirmation"]});
  if(result.canceled||!result.filePath)return{canceled:true};
  return finishWrite(result.filePath,data);
}

async function writeProject(filePath,data,{interactive=false}={}){
  if(await hasExternalChange(filePath)){
    if(!interactive)return{canceled:false,conflict:true,filePath};
    const answer=await dialog.showMessageBox(mainWindow,{type:"warning",title:"Flatplan file changed",message:"This project file changed outside Flatplan.",detail:"Save a separate copy to preserve both versions, or overwrite the external change.",buttons:["Save a Copy","Overwrite","Cancel"],defaultId:0,cancelId:2});
    if(answer.response===0)return chooseSavePath(data);
    if(answer.response===2)return{canceled:true,conflict:true,filePath};
  }
  return finishWrite(filePath,data);
}

async function openProjectAt(filePath,{remember=true}={}){
  const project=await readProject(filePath);currentFilePath=filePath;await rememberStat(filePath);if(remember)await rememberCurrentFile();app.addRecentDocument(filePath);updateTitle();return{canceled:false,...project};
}

async function restoreStartupProject(){
  if(pendingOpenPath)return{canceled:true};
  try{const preferences=JSON.parse(await fs.readFile(preferencesPath(),"utf8"));if(preferences.lastFilePath&&await exists(preferences.lastFilePath))return openProjectAt(preferences.lastFilePath,{remember:false})}catch{}
  return{canceled:true};
}

ipcMain.handle("flatplan:startup-project",restoreStartupProject);
ipcMain.handle("flatplan:open",async()=>{const result=await dialog.showOpenDialog(mainWindow,{title:"Open Flatplan project",filters:projectFilters(),properties:["openFile"]});return result.canceled||!result.filePaths[0]?{canceled:true}:openProjectAt(result.filePaths[0])});
ipcMain.handle("flatplan:save",async(_event,data)=>currentFilePath?writeProject(currentFilePath,data,{interactive:true}):chooseSavePath(data));
ipcMain.handle("flatplan:save-as",async(_event,data)=>chooseSavePath(data));
ipcMain.handle("flatplan:auto-save",async(_event,data)=>currentFilePath?writeProject(currentFilePath,data):{canceled:false,skipped:true});
ipcMain.handle("flatplan:restore-backup",async()=>{
  if(!currentFilePath)return{canceled:true};
  const directory=backupDirectory(currentFilePath);if(!await exists(directory))return{canceled:true,noBackups:true};
  const result=await dialog.showOpenDialog(mainWindow,{title:"Restore a Flatplan backup",defaultPath:directory,filters:projectFilters(),properties:["openFile"]});
  if(result.canceled||!result.filePaths[0])return{canceled:true};
  const project=await readProject(result.filePaths[0]);return{canceled:false,...project,restoreTarget:currentFilePath};
});
ipcMain.handle("flatplan:current-path",()=>currentFilePath);

function createMenu(){
  const template=[{label:"File",submenu:[{label:"Open…",accelerator:"CmdOrCtrl+O",click:()=>send("flatplan:request-open")},{label:"Save",accelerator:"CmdOrCtrl+S",click:()=>send("flatplan:request-save")},{label:"Save As…",accelerator:"CmdOrCtrl+Shift+S",click:()=>send("flatplan:request-save-as")},{label:"Restore Backup…",click:()=>send("flatplan:request-restore")},{type:"separator"},{role:"close"}]}];
  if(process.platform==="darwin")template.unshift({label:app.name,submenu:[{role:"about"},{type:"separator"},{role:"services"},{type:"separator"},{role:"hide"},{role:"hideOthers"},{role:"unhide"},{type:"separator"},{role:"quit"}]});
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(){
  mainWindow=new BrowserWindow({width:1500,height:980,minWidth:900,minHeight:650,backgroundColor:"#f4f2ec",title:"Flatplan",icon:path.join(__dirname,"assets","icon.png"),webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  mainWindow.loadFile("index.html");
  mainWindow.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  mainWindow.webContents.on("will-navigate",event=>event.preventDefault());
  mainWindow.webContents.once("did-finish-load",async()=>{if(pendingOpenPath){const filePath=pendingOpenPath;pendingOpenPath="";try{send("flatplan:project-opened",await openProjectAt(filePath))}catch(error){dialog.showErrorBox("Could not open Flatplan project",error.message)}}});
  mainWindow.on("closed",()=>{mainWindow=null});
}

app.on("open-file",(event,filePath)=>{event.preventDefault();if(mainWindow)openProjectAt(filePath).then(project=>send("flatplan:project-opened",project)).catch(error=>dialog.showErrorBox("Could not open Flatplan project",error.message));else pendingOpenPath=filePath});
app.whenReady().then(()=>{createMenu();createWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
