const { app, BrowserWindow } = require('electron')
const {ipcMain} = require('electron')

function createWindow () {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      resizable: false,
      center: true,
      frame: false,
      webPreferences: {
        nodeIntegration: true
      }
    })
  
    win.loadFile('app/mainWindow.html')
    win.maximize();

    //win.webContents.openDevTools()
  }
  
  app.whenReady().then(createWindow)
  
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