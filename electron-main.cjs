const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.maximize();

  // In development, load Vite dev server; in production, load built files
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist', 'index.html')}`;
  mainWindow.loadURL(startUrl);
}

app.whenReady().then(createWindow);

// Listen for backup request from renderer
ipcMain.handle('export-database', async (event, { data, exportPath }) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(exportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write as binary
    fs.writeFileSync(exportPath, Buffer.from(data), 'binary');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Listen for folder selection dialog request from renderer
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

const dbFilePath = path.join(app.getPath('userData'), 'invoicedb.bin');

// IPC handler to read the database file
ipcMain.handle('read-database-file', async () => {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath);
      return { success: true, data: Array.from(data) };
    } else {
      return { success: false, error: 'Database file does not exist.' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC handler to write the database file
ipcMain.handle('write-database-file', async (event, { data }) => {
  try {
    fs.writeFileSync(dbFilePath, Buffer.from(data), 'binary');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC handler to return the correct path to sql-wasm.wasm using process.resourcesPath
ipcMain.handle('get-sql-wasm-path', () => {
  return path.join(process.resourcesPath, 'sql-wasm.wasm');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    if (process.env.ELECTRON_START_URL) {
      // In dev mode, also exit the parent process (concurrently will kill vite)
      process.exit(0);
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 