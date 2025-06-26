const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: async () => {
    return await ipcRenderer.invoke('select-folder');
  },
  exportDatabase: async (data, exportPath) => {
    return await ipcRenderer.invoke('export-database', { data, exportPath });
  }
}); 