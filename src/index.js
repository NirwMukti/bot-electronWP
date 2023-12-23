const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron');
const path = require('path');
const { mainProccess, stopProccess } = require('./bot/main');

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#124F6A',
      symbolColor: '#fff'
    },
    icon: path.join(__dirname, './assets/logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: !app.isPackaged
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  app.isPackaged && Menu.setApplicationMenu(null)
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


ipcMain.on('main', async (event, data) => {
  const logs = [];
  const prog = [];

  const logToTextarea = (message) => {
    logs.push(message);
    event.sender.send('log', logs.join('\n'));
  };

  const proggress = (pros) => {
    prog.push(pros);
    event.sender.send('proggress', prog);
  };

  try {
    logToTextarea('[INFO] Process started...');
    event.sender.send("run");
    await mainProccess(logToTextarea,proggress, data)
    logToTextarea('[INFO] Process completed successfully.');
    event.sender.send("force");
  } catch (error) {
    event.sender.send("force");
    logToTextarea('[ERROR] ' + error.message);
  }
});

ipcMain.on('stop', (event) => {
  const logs = [];

  const logToTextarea = (message) => {
    logs.push(message);
    event.sender.send('log', logs.join('\n'));
  };

  event.sender.send("force");
  stopProccess(logToTextarea);
});