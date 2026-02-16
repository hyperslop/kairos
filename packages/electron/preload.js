const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: ({ title, body, taskId }) => {
    return ipcRenderer.invoke('show-notification', { title, body, taskId });
  },
  platform: process.platform
});
