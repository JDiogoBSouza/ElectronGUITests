const { app, BrowserWindow } = require('electron')
const {ipcMain} = require('electron')

// For use serial port. Why ? i have no idea
app.allowRendererProcessReuse = false;

let mainWindow = null;
let configWindow = null;
let passwordWindow = null;

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

  //configWindow.setFullScreen(true)
  //configWindow.webContents.openDevTools()
}

function createPasswordWindow () {
  
  let parentWindow = null;

  if( configWindow != null)
    parentWindow = configWindow;

    passwordWindow = new BrowserWindow({
    width: 300,
    height: 200,
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
  
  passwordWindow.loadFile('app/passwordWindow.html')

  passwordWindow.once('ready-to-show', () => {
    passwordWindow.show()
  })

  //passwordWindow.setFullScreen(true)
  //passwordWindow.webContents.openDevTools()
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

  mainWindow.webContents.openDevTools()
}

app.whenReady().then(createMainWindow)

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

ipcMain.on('openPasswordOnConfig', (evt, arg) => {

  createPasswordWindow()
  console.log("Abrindo tela de Password a partir da Config.");

})

ipcMain.on('closePasswordWindow', (evt, arg) => {

  if(passwordWindow != null)
    passwordWindow.close()

  console.log("Encerrando tela de Password.")

})

ipcMain.on('passwordToMain', (evt, arg) => {

  if(passwordWindow != null)
    passwordWindow.close()
  
  console.log("Encerrando tela de Password. Senha: " + arg)
  
  if( configWindow != null){
    configWindow.webContents.send('mainPasswordToConfig', arg);
  }

})