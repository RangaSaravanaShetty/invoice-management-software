const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: async () => {
    return await ipcRenderer.invoke('select-folder');
  },
  exportDatabase: async (data, exportPath) => {
    return await ipcRenderer.invoke('export-database', { data, exportPath });
  },
  readDatabaseFile: async () => {
    return await ipcRenderer.invoke('read-database-file');
  },
  writeDatabaseFile: async (data) => {
    return await ipcRenderer.invoke('write-database-file', { data });
  },
  getSqlWasmPath: async () => await ipcRenderer.invoke('get-sql-wasm-path'),
  on: (channel, listener) => {
    ipcRenderer.on(channel, listener);
  }
}); 