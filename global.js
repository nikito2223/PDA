const { app, BrowserWindow, session  } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // обычно false для безопасности
      contextIsolation: true,
    }
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'geolocation') callback(true);
    else callback(false);
  });

  // Подключаемся к сайту на GitHub Pages
  win.loadURL('https://nikito2223.github.io/PDA');

}

app.whenReady().then(createWindow);
