const { app, BrowserWindow } = require('electron')
const {ipcMain} = require('electron')

// For use serial port. Why ? i have no idea
app.allowRendererProcessReuse = false;

let mainWindow = null;
let configWindow = null;

function createConfigWindow () {
  
  let parentWindow = null;

  if( mainWindow != null)
    parentWindow = mainWindow;

  configWindow = new BrowserWindow({
    width: 400,
    height: 400,
    resizable: false,
    center: true,
    frame: false,
    modal: true,
    show: false,
    parent: parentWindow,
    webPreferences: {
      nodeIntegration: true
    }
  })
  
  configWindow.loadFile('app/configWindow.html')

  configWindow.once('ready-to-show', () => {
    configWindow.show()
  })

  configWindow.setFullScreen(true)
  configWindow.webContents.openDevTools()
}

function createMainWindow () {

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    center: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadFile('app/mainWindow.html')
  mainWindow.setFullScreen(true)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  //mainWindow.webContents.openDevTools()
}

app.whenReady().then(createConfigWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('close-me', (evt, arg) => {
  app.quit();
})

ipcMain.on('maximize-me', (evt, arg) => {

  if( mainWindow.isFullScreen() )
  {
    mainWindow.setFullScreen(false)
  }
  else
  {
    mainWindow.setFullScreen(true)
  }

})

ipcMain.on('closeConfigStartMain', (evt, arg) => {

  if(mainWindow == null)
    createMainWindow()

    console.log("Encerrando configuracao e Iniciando Main.");
    configWindow.close();

})

ipcMain.on('openConfigOnMain', (evt, arg) => {

  createConfigWindow()
  console.log("Abrindo tela de Configuracao a partir da Main.")

})