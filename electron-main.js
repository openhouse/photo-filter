const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  const indexPath = path.join(__dirname, 'frontend', 'photo-filter-frontend', 'dist', 'index.html');
  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  const serverPath = path.join(__dirname, 'backend', 'server.js');
  backendProcess = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'ignore',
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
