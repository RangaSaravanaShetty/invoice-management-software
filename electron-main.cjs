const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { createWriteStream, createReadStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'SwiftBill v1.2',
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

  // Set custom menu: File > Application Settings, Exit
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Application Settings',
          click: () => {
            mainWindow.webContents.send('open-app-settings');
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          role: 'quit',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Developer Tools',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Register global shortcut for developer tools
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow.webContents.toggleDevTools();
  });
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
    
    // Check if data is binary (array) or text (string)
    if (Array.isArray(data)) {
      // Binary data - write as binary
      fs.writeFileSync(exportPath, Buffer.from(data), 'binary');
    } else {
      // Text data (JSON) - write as UTF-8
      fs.writeFileSync(exportPath, data, 'utf8');
    }
    
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

const dbFilePath = path.join(app.getPath('userData'), 'swiftbill.bin');

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

// IPC handler to get the database file path
ipcMain.handle('get-database-path', () => {
  return dbFilePath;
});

// IPC handler to clear the database file (for testing)
ipcMain.handle('clear-database', async () => {
  try {
    if (fs.existsSync(dbFilePath)) {
      fs.unlinkSync(dbFilePath);
      return { success: true, message: 'Database cleared successfully' };
    } else {
      return { success: true, message: 'Database file does not exist' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC handler to create a simple backup (copy database file)
ipcMain.handle('create-simple-backup', async (event, { backupPath }) => {
  try {
    if (!fs.existsSync(dbFilePath)) {
      return { success: false, error: 'Database file does not exist' };
    }
    
    // Ensure the backups directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy the database file directly
    fs.copyFileSync(dbFilePath, backupPath);
    
    return { success: true, message: 'Backup created successfully' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC handler to restore from a simple backup (copy database file)
ipcMain.handle('restore-simple-backup', async (event, { backupPath }) => {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file does not exist' };
    }
    
    // Copy the backup file to replace the current database
    fs.copyFileSync(backupPath, dbFilePath);
    
    return { success: true, message: 'Backup restored successfully' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Handle IPC messages
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
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