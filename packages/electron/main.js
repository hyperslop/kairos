const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

// ─── Determine if we're in dev mode ─────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Task Manager'
  });

  if (isDev) {
    // In dev mode, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  // Minimize to tray on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Create a simple tray icon (you can replace with a real icon)
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  try {
    tray = new Tray(iconPath);
  } catch {
    // Fallback: create a tiny icon in memory if file doesn't exist
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Task Manager',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Task Manager');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── IPC: Handle notification requests from renderer ────────────────
ipcMain.handle('show-notification', (_event, { title, body, taskId }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title,
      body,
      icon: path.join(__dirname, 'assets', 'icon.png'),
      urgency: 'normal'
    });

    notif.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notif.show();
  }
});

// ─── App lifecycle ──────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();

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

app.on('before-quit', () => {
  app.isQuitting = true;
});
