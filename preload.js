//#region Imports and Setup
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
//#endregion

//#region API Exposure
contextBridge.exposeInMainWorld('api', {
  //#region Service Control Methods
  // Service control functions
  startApache: () => ipcRenderer.invoke('start-apache'),
  stopApache: () => ipcRenderer.invoke('stop-apache'),
  startMySQL: () => ipcRenderer.invoke('start-mysql'),
  stopMySQL: () => ipcRenderer.invoke('stop-mysql'),
  startFileZilla: () => ipcRenderer.invoke('start-filezilla'),
  stopFileZilla: () => ipcRenderer.invoke('stop-filezilla'),
  startMercury: () => ipcRenderer.invoke('start-mercury'),
  stopMercury: () => ipcRenderer.invoke('stop-mercury'),
  startTomcat: () => ipcRenderer.invoke('start-tomcat'),
  stopTomcat: () => ipcRenderer.invoke('stop-tomcat'),
  getServicesStatus: () => ipcRenderer.invoke('get-services-status'),
  //#endregion
  
  //#region Configuration and Logs Methods
  // Config and logs functions
  openConfig: (service) => ipcRenderer.invoke('open-config', service),
  openLogs: (service) => ipcRenderer.invoke('open-logs', service),
  //#endregion
  
  //#region Event Listeners
  // Event listeners
  onServiceStatusUpdate: (callback) => {
    ipcRenderer.on('service-status-update', (_, data) => callback(data));
  },
  onApacheLog: (callback) => {
    ipcRenderer.on('apache-log', (_, data) => callback(data));
  },
  onMySQLLog: (callback) => {
    ipcRenderer.on('mysql-log', (_, data) => callback(data));
  },
  onFileZillaLog: (callback) => {
    ipcRenderer.on('filezilla-log', (_, data) => callback(data));
  },
  onMercuryLog: (callback) => {
    ipcRenderer.on('mercury-log', (_, data) => callback(data));
  },
  onTomcatLog: (callback) => {
    ipcRenderer.on('tomcat-log', (_, data) => callback(data));
  },
  onServiceError: (callback) => {
    ipcRenderer.on('service-error', (_, data) => callback(data));
  },
  
  //#region Theme Management Methods
  // Theme management
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (themeId) => ipcRenderer.invoke('set-theme', themeId),
  getThemeData: (themeId) => ipcRenderer.invoke('get-theme-data', themeId),
  getAvailableThemes: () => ipcRenderer.invoke('get-available-themes'),
  saveTheme: (themeData) => ipcRenderer.invoke('save-theme', themeData),
  deleteTheme: (themeId) => ipcRenderer.invoke('delete-theme', themeId),
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (_, themeData) => callback(themeData));
  }
});