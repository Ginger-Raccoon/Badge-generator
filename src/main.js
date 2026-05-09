import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import './main/ipc.js';

app.name = 'Бейджик';

if (started) {
  app.quit();
}

const createWindow = () => {
  const iconPath = path.join(app.getAppPath(), 'icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  if (process.platform === 'darwin') {
    app.dock.setIcon(icon)
  }

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
