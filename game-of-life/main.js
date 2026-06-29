const { app, BrowserWindow, ipcMain, session, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Data file lives in ~/Library/Application Support/GameOfLife/data.json
const dataDir = path.join(app.getPath('userData'), 'GameOfLife');
const dataFile = path.join(dataDir, 'data.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Game of Life',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: details.requestHeaders });
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  ensureDataDir();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: " +
          "https://*.supabase.co wss://*.supabase.co " +
          "https://fonts.googleapis.com https://fonts.gstatic.com " +
          "https://cdnjs.cloudflare.com https://cdn.jsdelivr.net " +
          "https://api.anthropic.com"
        ]
      }
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('load-data', () => {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
    return {};
  } catch (e) { return {}; }
});

ipcMain.handle('save-data', (event, data) => {
  try {
    ensureDataDir();
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
ipcMain.handle('send-notification', (event, { title, body, subtitle }) => {
  try {
    if (!Notification.isSupported()) return false;
    const iconPath = path.join(__dirname, 'assets', 'icon.icns');
    const notif = new Notification({
      title,
      body,
      subtitle: subtitle || '',
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
      silent: false
    });
    notif.show();
    return true;
  } catch (e) {
    console.error('Notification error:', e);
    return false;
  }
});
