const {app,BrowserWindow,dialog,ipcMain,Menu}=require("electron");
const fs=require("node:fs/promises");
const path=require("node:path");

let mainWindow=null,currentFilePath="";

function projectFilters(){return[{name:"Flatplan project",extensions:["flatplan"]},{name:"JSON",extensions:["json"]}]}
function safeName(value="Flatplan"){return String(value).replace(/[\\/:*?"<>|]/g,"-").trim()||"Flatplan"}
function send(channel){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(channel)}
function updateTitle(){if(mainWindow)mainWindow.setTitle(currentFilePath?`${path.basename(currentFilePath)} — Flatplan`:"Flatplan")}

async function writeProject(filePath,data){
  const temporary=`${filePath}.tmp`;
  await fs.writeFile(temporary,`${JSON.stringify(data,null,2)}\n`,"utf8");
  await fs.rename(temporary,filePath);
  currentFilePath=filePath;
  updateTitle();
  return{canceled:false,filePath};
}

async function chooseSavePath(data){
  const title=data?.library?.items?.find(item=>item.id===data.library.activeId)?.data?.title||"Flatplan";
  const result=await dialog.showSaveDialog(mainWindow,{title:"Save Flatplan project",defaultPath:`${safeName(title)}.flatplan`,filters:projectFilters(),properties:["createDirectory","showOverwriteConfirmation"]});
  if(result.canceled||!result.filePath)return{canceled:true};
  return writeProject(result.filePath,data);
}

ipcMain.handle("flatplan:open",async()=>{
  const result=await dialog.showOpenDialog(mainWindow,{title:"Open Flatplan project",filters:projectFilters(),properties:["openFile"]});
  if(result.canceled||!result.filePaths[0])return{canceled:true};
  const filePath=result.filePaths[0],text=await fs.readFile(filePath,"utf8"),data=JSON.parse(text);
  currentFilePath=filePath;updateTitle();return{canceled:false,filePath,data};
});
ipcMain.handle("flatplan:save",async(_event,data)=>currentFilePath?writeProject(currentFilePath,data):chooseSavePath(data));
ipcMain.handle("flatplan:save-as",async(_event,data)=>chooseSavePath(data));
ipcMain.handle("flatplan:auto-save",async(_event,data)=>currentFilePath?writeProject(currentFilePath,data):{canceled:false,skipped:true});
ipcMain.handle("flatplan:current-path",()=>currentFilePath);

function createMenu(){
  const template=[{label:"File",submenu:[{label:"Open…",accelerator:"CmdOrCtrl+O",click:()=>send("flatplan:request-open")},{label:"Save",accelerator:"CmdOrCtrl+S",click:()=>send("flatplan:request-save")},{label:"Save As…",accelerator:"CmdOrCtrl+Shift+S",click:()=>send("flatplan:request-save-as")},{type:"separator"},{role:"close"}]}];
  if(process.platform==="darwin")template.unshift({label:app.name,submenu:[{role:"about"},{type:"separator"},{role:"services"},{type:"separator"},{role:"hide"},{role:"hideOthers"},{role:"unhide"},{type:"separator"},{role:"quit"}]});
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(){
  mainWindow=new BrowserWindow({width:1500,height:980,minWidth:900,minHeight:650,backgroundColor:"#f4f2ec",title:"Flatplan",webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  mainWindow.loadFile("index.html");
  mainWindow.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  mainWindow.webContents.on("will-navigate",event=>event.preventDefault());
  mainWindow.on("closed",()=>{mainWindow=null});
}

app.whenReady().then(()=>{createMenu();createWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
