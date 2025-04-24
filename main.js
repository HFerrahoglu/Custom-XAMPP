//#region Imports and Dependencies
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const Store = require('electron-store');
const path = require('path');
const { spawn, exec } = require('child_process');
const findProcess = require('find-process');
//#endregion

//#region Global Constants and State
// Create a store for app settings
const store = new Store();

// Store service processes and their status
let services = {
  apache: {
    process: null,
    status: 'STOPPED',
    pid: null,
    port: 80,
    logs: []
  },
  mysql: {
    process: null,
    status: 'STOPPED',
    pid: null,
    port: 3306,
    logs: []
  },
  filezilla: {
    process: null,
    status: 'STOPPED',
    pid: null,
    port: 21,
    logs: []
  },
  mercury: {
    process: null,
    status: 'STOPPED',
    pid: null,
    port: 25,
    logs: []
  },
  tomcat: {
    process: null,
    status: 'STOPPED',
    pid: null,
    port: 8080,
    logs: []
  }
};

//#region Path Configurations
// Path to XAMPP installation (adjust as needed)
const XAMPP_PATH = 'C:\\xampp';
const APACHE_PATH = path.join(XAMPP_PATH, 'apache', 'bin', 'httpd.exe');
const MYSQL_PATH = path.join(XAMPP_PATH, 'mysql', 'bin', 'mysqld.exe');
const FILEZILLA_PATH = path.join(XAMPP_PATH, 'FileZillaFTP', 'FileZilla server.exe');
const FILEZILLA_SERVICE_PATH = path.join(XAMPP_PATH, 'FileZillaFTP', 'FileZilla Server Interface.exe');
const MERCURY_PATH = path.join(XAMPP_PATH, 'MercuryMail', 'mercury.exe');
const TOMCAT_PATH = path.join(XAMPP_PATH, 'tomcat', 'bin', 'catalina.bat');

// Theme management
const THEMES_DIR = path.join(__dirname, 'themes');
//#endregion

//#region Theme Management Functions
// Ensure themes directory exists
if (!fs.existsSync(THEMES_DIR)) {
  fs.mkdirSync(THEMES_DIR, { recursive: true });
}

// Get available themes
function getAvailableThemes() {
  try {
    const themeFiles = fs.readdirSync(THEMES_DIR).filter(file => file.endsWith('.json'));
    return themeFiles.map(file => {
      try {
        const themeData = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), 'utf8'));
        return {
          id: themeData.id || path.basename(file, '.json'),
          name: themeData.name || path.basename(file, '.json'),
          author: themeData.author || 'Unknown',
          description: themeData.description || '',
          filePath: path.join(THEMES_DIR, file)
        };
      } catch (error) {
        console.error(`Error parsing theme file ${file}:`, error);
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Error reading themes directory:', error);
    return [];
  }
}

// Get current theme
function getTheme() {
  const themeId = store.get('themeId', 'default-dark');
  return themeId;
}

// Set current theme
function setTheme(themeId) {
  store.set('themeId', themeId);
  return themeId;
}

// Get theme data
function getThemeData(themeId) {
  try {
    // First check if it's one of the built-in themes
    if (themeId === 'dark' || themeId === 'default-dark') {
      const defaultThemePath = path.join(THEMES_DIR, 'default.json');
      if (fs.existsSync(defaultThemePath)) {
        return JSON.parse(fs.readFileSync(defaultThemePath, 'utf8'));
      } else {
        // Fallback to hardcoded dark theme
        return {
          name: "Default Dark",
          id: "default-dark",
          colors: {
            "bg-color": "#1f2128",
            "card-bg": "#22252d",
            "border-color": "#2a2d34",
            "text-color": "#ffffff",
            "text-secondary": "#8a8f9a",
            "btn-bg": "#2a2d34",
            "btn-hover": "#3a3f4a",
            "status-running": "#3a8a6f",
            "status-Stopped": "#e74c3c",
            "notification-info": "#3498db",
            "notification-success": "#2ecc71",
            "notification-warning": "#f39c12",
            "notification-error": "#e74c3c",
            "shadow-color": "#0a0a0a"
          }
        };
      }
    } else if (themeId === 'light' || themeId === 'default-light') {
      const lightThemePath = path.join(THEMES_DIR, 'light.json');
      if (fs.existsSync(lightThemePath)) {
        return JSON.parse(fs.readFileSync(lightThemePath, 'utf8'));
      } else {
        // Fallback to hardcoded light theme
        return {
          name: "Default Light",
          id: "default-light",
          colors: {
            "bg-color": "#f5f7fa",
            "card-bg": "#ffffff",
            "border-color": "#e1e4e8",
            "text-color": "#333333",
            "text-secondary": "#6c757d",
            "btn-bg": "#e9ecef",
            "btn-hover": "#dee2e6",
            "status-running": "#28a745",
            "status-Stopped": "#dc3545",
            "notification-info": "#17a2b8",
            "notification-success": "#28a745",
            "notification-warning": "#ffc107",
            "notification-error": "#dc3545",
            "shadow-color": "rgba(0, 0, 0, 0.1)"
          }
        };
      }
    }
    
    // Look for custom theme files
    const themes = getAvailableThemes();
    const theme = themes.find(t => t.id === themeId);
    
    if (theme) {
      return JSON.parse(fs.readFileSync(theme.filePath, 'utf8'));
    }
    
    // If theme not found, return default dark theme
    return getThemeData('default-dark');
  } catch (error) {
    console.error(`Error loading theme ${themeId}:`, error);
    // Fallback to default dark theme
    return getThemeData('default-dark');
  }
}

// Save a new theme
function saveTheme(themeData) {
  try {
    if (!themeData.id) {
      throw new Error('Theme ID is required');
    }
    
    const fileName = `${themeData.id}.json`;
    const filePath = path.join(THEMES_DIR, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(themeData, null, 2), 'utf8');
    return { success: true, filePath };
  } catch (error) {
    console.error('Error saving theme:', error);
    return { success: false, error: error.message };
  }
}

// Delete a theme
function deleteTheme(themeId) {
  try {
    // Don't allow deleting default themes
    if (themeId === 'default-dark' || themeId === 'default-light') {
      return { success: false, error: 'Cannot delete default themes' };
    }
    
    const themes = getAvailableThemes();
    const theme = themes.find(t => t.id === themeId);
    
    if (!theme) {
      return { success: false, error: 'Theme not found' };
    }
    
    fs.unlinkSync(theme.filePath);
    
    // If the deleted theme was the current theme, switch to default
    if (getTheme() === themeId) {
      setTheme('default-dark');
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error deleting theme ${themeId}:`, error);
    return { success: false, error: error.message };
  }
}

// Create the browser window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 630,
    icon: path.join(__dirname, 'favicon.png'),
    frame: true,
    autoHideMenuBar: true, // Hide the menu bar
    resizable: false, // Prevent window resizing
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile('template/index.html');

  // Send the initial theme to the renderer process
  mainWindow.webContents.on('did-finish-load', () => {
    const themeId = getTheme();
    const themeData = getThemeData(themeId);
    mainWindow.webContents.send('theme-changed', { id: themeId, data: themeData });
  });

  // Check initial status of services
  checkServicesStatus();
}

// Check if services are already running
async function checkServicesStatus() {
  try {
    // Using dynamic import for ps-list (ES Module)
    const psList = await import('ps-list');
    const processes = await psList.default();
    
    // Check for Apache (httpd.exe)
    const apacheProcess = processes.find(p => p.name.toLowerCase() === 'httpd.exe');
    if (apacheProcess) {
      services.apache.status = 'RUNNING';
      services.apache.pid = apacheProcess.pid;
    } else {
      services.apache.status = 'STOPPED';
      services.apache.pid = null;
    }
    
    // Check for MySQL (mysqld.exe)
    const mysqlProcess = processes.find(p => p.name.toLowerCase() === 'mysqld.exe');
    if (mysqlProcess) {
      services.mysql.status = 'RUNNING';
      services.mysql.pid = mysqlProcess.pid;
    } else {
      services.mysql.status = 'STOPPED';
      services.mysql.pid = null;
    }
    
    // Check for FileZilla (filezilla server.exe)
    const filezillaProcess = processes.find(p => p.name.toLowerCase() === 'filezilla server.exe');
    if (filezillaProcess) {
      services.filezilla.status = 'RUNNING';
      services.filezilla.pid = filezillaProcess.pid;
    } else {
      services.filezilla.status = 'STOPPED';
      services.filezilla.pid = null;
    }
    
    // Check for Mercury (mercury.exe)
    const mercuryProcess = processes.find(p => p.name.toLowerCase() === 'mercury.exe');
    if (mercuryProcess) {
      services.mercury.status = 'RUNNING';
      services.mercury.pid = mercuryProcess.pid;
    } else {
      services.mercury.status = 'STOPPED';
      services.mercury.pid = null;
    }
    
    // Check for Tomcat (tomcat9.exe)
    const tomcatProcess = processes.find(p => p.name.toLowerCase() === 'tomcat9.exe');
    if (tomcatProcess) {
      services.tomcat.status = 'RUNNING';
      services.tomcat.pid = tomcatProcess.pid;
    } else {
      services.tomcat.status = 'STOPPED';
      services.tomcat.pid = null;
    }
    
    // Send updated status to renderer
    sendStatusUpdate();
  } catch (error) {
    console.error('Error checking service status:', error);
  }
}

// Send status updates to the renderer process
function sendStatusUpdate() {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('service-status-update', {
      apache: {
        status: services.apache.status,
        pid: services.apache.pid,
        port: services.apache.port
      },
      mysql: {
        status: services.mysql.status,
        pid: services.mysql.pid,
        port: services.mysql.port
      },
      filezilla: {
        status: services.filezilla.status,
        pid: services.filezilla.pid,
        port: services.filezilla.port
      },
      mercury: {
        status: services.mercury.status,
        pid: services.mercury.pid,
        port: services.mercury.port
      },
      tomcat: {
        status: services.tomcat.status,
        pid: services.tomcat.pid,
        port: services.tomcat.port
      }
    });
  }
}

// Start Apache service
async function startApache() {
  if (services.apache.status === 'RUNNING') {
    return { success: false, message: 'Apache is already running' };
  }
  
  try {
    services.apache.status = 'STARTING';
    sendStatusUpdate();
    
    // Add a log entry for startup attempt
    const startLog = `[${new Date().toISOString()}] Attempting to start Apache service`;
    services.apache.logs.push(startLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('apache-log', startLog);
    }
    
    const process = spawn(APACHE_PATH, ['-f', path.join(XAMPP_PATH, 'apache', 'conf', 'httpd.conf')]);
    services.apache.process = process;
    
    process.stdout.on('data', (data) => {
      const log = data.toString();
      services.apache.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('apache-log', log);
      }
    });
    
    process.stderr.on('data', (data) => {
      const log = data.toString();
      services.apache.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('apache-log', log);
      }
    });
    
    process.on('close', (code) => {
      if (code !== 0 && services.apache.status !== 'STOPPING') {
        services.apache.status = 'error';
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('service-error', {
            service: 'apache',
            message: `Apache process exited with code ${code}`
          });
        }
      }
      
      if (services.apache.status !== 'stopping') {
        services.apache.status = 'STOPPED';
        services.apache.process = null;
        services.apache.pid = null;
      }
      
      sendStatusUpdate();
    });
    
    // Wait a bit to ensure the process started correctly
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the process is running
    const processes = await findProcess('name', 'httpd.exe');
    if (processes.length > 0) {
      services.apache.status = 'running';
      services.apache.pid = processes[0].pid;
      
      // Add a log entry for successful start
      const successLog = `[${new Date().toISOString()}] Apache service started successfully with PID ${processes[0].pid}`;
      services.apache.logs.push(successLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('apache-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'Apache started successfully' };
    } else {
      services.apache.status = 'error';
      
      // Add a log entry for failed start
      const errorLog = `[${new Date().toISOString()}] Failed to start Apache service`;
      services.apache.logs.push(errorLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('apache-log', errorLog);
      }
      
      sendStatusUpdate();
      return { success: false, message: 'Failed to start Apache' };
    }
  } catch (error) {
    console.error('Error starting Apache:', error);
    services.apache.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error starting Apache: ${error.message}` };
  }
}

// Stop Apache service
async function stopApache() {
  if (services.apache.status !== 'running') {
    return { success: false, message: 'Apache is not running' };
  }
  
  try {
    services.apache.status = 'stopping';
    sendStatusUpdate();
    
    // Add a log entry for stopping attempt
    const stopLog = `[${new Date().toISOString()}] Attempting to stop Apache service`;
    services.apache.logs.push(stopLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('apache-log', stopLog);
    }
    
    if (services.apache.process) {
      // Try to gracefully stop the process first
      services.apache.process.kill();
    } else if (services.apache.pid) {
      // If we only have the PID (e.g., service was already running before app started)
      exec(`taskkill /PID ${services.apache.pid} /F`);
    }
    
    // Wait a bit to ensure the process Stopped
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the process is still running
    const processes = await findProcess('name', 'httpd.exe');
    const apacheProcesses = processes.filter(p => p.pid === services.apache.pid);
    
    // If no Apache processes found or the specific PID is no longer running, consider it Stopped
    if (processes.length === 0 || apacheProcesses.length === 0) {
      services.apache.status = 'STOPPED';
      services.apache.process = null;
      services.apache.pid = null;
      
      // Add a log entry for successful stop
      const successLog = `[${new Date().toISOString()}] Apache service Stopped successfully`;
      services.apache.logs.push(successLog);
      if (mainWindow) {
        mainWindow.webContents.send('apache-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'Apache Stopped successfully' };
    } else {
      // Try one more time with force
      exec(`taskkill /F /IM httpd.exe`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      const checkAgain = await findProcess('name', 'httpd.exe');
      if (checkAgain.length === 0) {
        services.apache.status = 'STOPPED';
        services.apache.process = null;
        services.apache.pid = null;
        
        // Add a log entry for successful stop after retry
        const retryLog = `[${new Date().toISOString()}] Apache service Stopped successfully after retry`;
        services.apache.logs.push(retryLog);
        if (mainWindow) {
          mainWindow.webContents.send('apache-log', retryLog);
        }
        
        sendStatusUpdate();
        return { success: true, message: 'Apache Stopped successfully' };
      } else {
        services.apache.status = 'error';
        
        // Add a log entry for failed stop
        const errorLog = `[${new Date().toISOString()}] Failed to stop Apache service`;
        services.apache.logs.push(errorLog);
        if (mainWindow) {
          mainWindow.webContents.send('apache-log', errorLog);
        }
        
        sendStatusUpdate();
        return { success: false, message: 'Failed to stop Apache after multiple attempts' };
      }
    }
  } catch (error) {
    console.error('Error stopping Apache:', error);
    services.apache.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error stopping Apache: ${error.message}` };
  }
}

// Start MySQL service
async function startMySQL() {
  if (services.mysql.status === 'RUNNING') {
    return { success: false, message: 'MySQL is already running' };
  }
  
  try {
    services.mysql.status = 'STARTING';
    sendStatusUpdate();
    
    // Add a log entry for startup attempt
    const startLog = `[${new Date().toISOString()}] Attempting to start MySQL service`;
    services.mysql.logs.push(startLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('mysql-log', startLog);
    }
    
    const process = spawn(MYSQL_PATH, ['--defaults-file=' + path.join(XAMPP_PATH, 'mysql', 'bin', 'my.ini')]);
    services.mysql.process = process;
    
    process.stdout.on('data', (data) => {
      const log = data.toString();
      services.mysql.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mysql-log', log);
      }
    });
    
    process.stderr.on('data', (data) => {
      const log = data.toString();
      services.mysql.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mysql-log', log);
      }
    });
    
    process.on('close', (code) => {
      if (code !== 0 && services.mysql.status !== 'STOPPING') {
        services.mysql.status = 'error';
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('service-error', {
            service: 'mysql',
            message: `MySQL process exited with code ${code}`
          });
        }
      }
      
      if (services.mysql.status !== 'stopping') {
        services.mysql.status = 'STOPPED';
        services.mysql.process = null;
        services.mysql.pid = null;
      }
      
      sendStatusUpdate();
    });
    
    // Wait a bit to ensure the process started correctly
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the process is running
    const processes = await findProcess('name', 'mysqld.exe');
    if (processes.length > 0) {
      services.mysql.status = 'running';
      services.mysql.pid = processes[0].pid;
      
      // Add a log entry for successful start
      const successLog = `[${new Date().toISOString()}] MySQL service started successfully with PID ${processes[0].pid}`;
      services.mysql.logs.push(successLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mysql-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'MySQL started successfully' };
    } else {
      services.mysql.status = 'error';
      
      // Add a log entry for failed start
      const errorLog = `[${new Date().toISOString()}] Failed to start MySQL service`;
      services.mysql.logs.push(errorLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mysql-log', errorLog);
      }
      
      sendStatusUpdate();
      return { success: false, message: 'Failed to start MySQL' };
    }
  } catch (error) {
    console.error('Error starting MySQL:', error);
    services.mysql.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error starting MySQL: ${error.message}` };
  }
}

// Stop MySQL service
async function stopMySQL() {
  if (services.mysql.status !== 'running') {
    return { success: false, message: 'MySQL is not running' };
  }
  
  try {
    services.mysql.status = 'stopping';
    sendStatusUpdate();
    
    // Add a log entry for stopping attempt
    const stopLog = `[${new Date().toISOString()}] Attempting to stop MySQL service`;
    services.mysql.logs.push(stopLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('mysql-log', stopLog);
    }
    
    if (services.mysql.process) {
      // Try to gracefully stop the process first
      services.mysql.process.kill();
    } else if (services.mysql.pid) {
      // If we only have the PID (e.g., service was already running before app started)
      exec(`taskkill /PID ${services.mysql.pid} /F`);
    }
    
    // Wait a bit to ensure the process Stopped
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the process is still running
    const processes = await findProcess('name', 'mysqld.exe');
    const mysqlProcesses = processes.filter(p => p.pid === services.mysql.pid);
    
    // If no MySQL processes found or the specific PID is no longer running, consider it Stopped
    if (processes.length === 0 || mysqlProcesses.length === 0) {
      services.mysql.status = 'STOPPED';
      services.mysql.process = null;
      services.mysql.pid = null;
      
      // Add a log entry for successful stop
      const successLog = `[${new Date().toISOString()}] MySQL service Stopped successfully`;
      services.mysql.logs.push(successLog);
      if (mainWindow) {
        mainWindow.webContents.send('mysql-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'MySQL Stopped successfully' };
    } else {
      // Try one more time with force
      exec(`taskkill /F /IM mysqld.exe`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      const checkAgain = await findProcess('name', 'mysqld.exe');
      if (checkAgain.length === 0) {
        services.mysql.status = 'STOPPED';
        services.mysql.process = null;
        services.mysql.pid = null;
        
        // Add a log entry for successful stop after retry
        const retryLog = `[${new Date().toISOString()}] MySQL service Stopped successfully after retry`;
        services.mysql.logs.push(retryLog);
        if (mainWindow) {
          mainWindow.webContents.send('mysql-log', retryLog);
        }
        
        sendStatusUpdate();
        return { success: true, message: 'MySQL Stopped successfully' };
      } else {
        services.mysql.status = 'error';
        
        // Add a log entry for failed stop
        const errorLog = `[${new Date().toISOString()}] Failed to stop MySQL service`;
        services.mysql.logs.push(errorLog);
        if (mainWindow) {
          mainWindow.webContents.send('mysql-log', errorLog);
        }
        
        sendStatusUpdate();
        return { success: false, message: 'Failed to stop MySQL after multiple attempts' };
      }
    }
  } catch (error) {
    console.error('Error stopping MySQL:', error);
    services.mysql.status = 'error';
    
    // Add a log entry for error
    const errorLog = `[${new Date().toISOString()}] Error stopping MySQL: ${error.message}`;
    services.mysql.logs.push(errorLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('mysql-log', errorLog);
    }
    
    sendStatusUpdate();
    return { success: false, message: `Error stopping MySQL: ${error.message}` };
  }
}

// Start FileZilla service
async function startFileZilla() {
  if (services.filezilla.status === 'running') {
    return { success: false, message: 'FileZilla is already running' };
  }
  
  try {
    services.filezilla.status = 'Starting';
    sendStatusUpdate();
    
    // Add a log entry for startup attempt
    const startLog = `[${new Date().toISOString()}] Attempting to start FileZilla service`;
    services.filezilla.logs.push(startLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('filezilla-log', startLog);
    }
    
    // First, try to start the service interface
    const interfaceProcess = spawn(FILEZILLA_SERVICE_PATH);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for interface to initialize
    
    // Then start the server
    const process = spawn(FILEZILLA_PATH, ['/start']);
    services.filezilla.process = process;
    
    process.stdout.on('data', (data) => {
      const log = data.toString();
      services.filezilla.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('filezilla-log', log);
      }
    });
    
    process.stderr.on('data', (data) => {
      const log = data.toString();
      services.filezilla.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('filezilla-log', log);
      }
    });
    
    process.on('close', (code) => {
      if (code !== 0 && services.filezilla.status !== 'stopping') {
        services.filezilla.status = 'error';
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('service-error', {
            service: 'filezilla',
            message: `FileZilla process exited with code ${code}`
          });
        }
      }
      
      if (services.filezilla.status !== 'stopping') {
        services.filezilla.status = 'STOPPED';
        services.filezilla.process = null;
        services.filezilla.pid = null;
      }
      
      sendStatusUpdate();
    });
    
    // Wait a bit to ensure the process started correctly
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the process is running
    const processes = await findProcess('name', 'filezilla server.exe');
    if (processes.length > 0) {
      services.filezilla.status = 'running';
      services.filezilla.pid = processes[0].pid;
      
      // Add a log entry for successful start
      const successLog = `[${new Date().toISOString()}] FileZilla service started successfully with PID ${processes[0].pid} on port ${services.filezilla.port}`;
      services.filezilla.logs.push(successLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('filezilla-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'FileZilla started successfully' };
    } else {
      services.filezilla.status = 'error';
      
      // Add a log entry for failed start
      const errorLog = `[${new Date().toISOString()}] Failed to start FileZilla service`;
      services.filezilla.logs.push(errorLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('filezilla-log', errorLog);
      }
      
      sendStatusUpdate();
      return { success: false, message: 'Failed to start FileZilla' };
    }
  } catch (error) {
    console.error('Error starting FileZilla:', error);
    services.filezilla.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error starting FileZilla: ${error.message}` };
  }
}

// Stop FileZilla service
async function stopFileZilla() {
  if (services.filezilla.status !== 'running') {
    return { success: false, message: 'FileZilla is not running' };
  }
  
  try {
    services.filezilla.status = 'stopping';
    sendStatusUpdate();
    
    // Add a log entry for stopping attempt
    const stopLog = `[${new Date().toISOString()}] Attempting to stop FileZilla service`;
    services.filezilla.logs.push(stopLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('filezilla-log', stopLog);
    }
    
    if (services.filezilla.process) {
      // Try to gracefully stop the process first
      services.filezilla.process.kill();
    } else if (services.filezilla.pid) {
      // If we only have the PID (e.g., service was already running before app started)
      exec(`taskkill /PID ${services.filezilla.pid} /F`);
    }
    
    // Wait a bit to ensure the process Stopped
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the process is still running
    const processes = await findProcess('name', 'filezilla server.exe');
    const filezillaProcesses = processes.filter(p => p.pid === services.filezilla.pid);
    
    // If no FileZilla processes found or the specific PID is no longer running, consider it Stopped
    if (processes.length === 0 || filezillaProcesses.length === 0) {
      services.filezilla.status = 'STOPPED';
      services.filezilla.process = null;
      services.filezilla.pid = null;
      
      // Add a log entry for successful stop
      const successLog = `[${new Date().toISOString()}] FileZilla service Stopped successfully`;
      services.filezilla.logs.push(successLog);
      if (mainWindow) {
        mainWindow.webContents.send('filezilla-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'FileZilla Stopped successfully' };
    } else {
      // Try one more time with force
      exec(`taskkill /F /IM "filezilla server.exe"`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      const checkAgain = await findProcess('name', 'filezilla server.exe');
      if (checkAgain.length === 0) {
        services.filezilla.status = 'STOPPED';
        services.filezilla.process = null;
        services.filezilla.pid = null;
        
        // Add a log entry for successful stop after retry
        const retryLog = `[${new Date().toISOString()}] FileZilla service Stopped successfully after retry`;
        services.filezilla.logs.push(retryLog);
        if (mainWindow) {
          mainWindow.webContents.send('filezilla-log', retryLog);
        }
        
        sendStatusUpdate();
        return { success: true, message: 'FileZilla Stopped successfully' };
      } else {
        services.filezilla.status = 'error';
        
        // Add a log entry for failed stop
        const errorLog = `[${new Date().toISOString()}] Failed to stop FileZilla service`;
        services.filezilla.logs.push(errorLog);
        if (mainWindow) {
          mainWindow.webContents.send('filezilla-log', errorLog);
        }
        
        sendStatusUpdate();
        return { success: false, message: 'Failed to stop FileZilla after multiple attempts' };
      }
    }
  } catch (error) {
    console.error('Error stopping FileZilla:', error);
    services.filezilla.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error stopping FileZilla: ${error.message}` };
  }
}

// Start Mercury service
async function startMercury() {
  if (services.mercury.status === 'running') {
    return { success: false, message: 'Mercury is already running' };
  }
  
  try {
    services.mercury.status = 'Starting';
    sendStatusUpdate();
    
    // Add a log entry for startup attempt
    const startLog = `[${new Date().toISOString()}] Attempting to start Mercury service`;
    services.mercury.logs.push(startLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('mercury-log', startLog);
    }
    
    const process = spawn(MERCURY_PATH);
    services.mercury.process = process;
    
    process.stdout.on('data', (data) => {
      const log = data.toString();
      services.mercury.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mercury-log', log);
      }
    });
    
    process.stderr.on('data', (data) => {
      const log = data.toString();
      services.mercury.logs.push(log);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mercury-log', log);
      }
    });
    
    process.on('close', (code) => {
      if (code !== 0 && services.mercury.status !== 'stopping') {
        services.mercury.status = 'error';
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('service-error', {
            service: 'mercury',
            message: `Mercury process exited with code ${code}`
          });
        }
      }
      
      if (services.mercury.status !== 'stopping') {
        services.mercury.status = 'STOPPED';
        services.mercury.process = null;
        services.mercury.pid = null;
      }
      
      sendStatusUpdate();
    });
    
    // Wait a bit to ensure the process started correctly
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the process is running
    const processes = await findProcess('name', 'mercury.exe');
    if (processes.length > 0) {
      services.mercury.status = 'running';
      services.mercury.pid = processes[0].pid;
      
      // Add a log entry for successful start
      const successLog = `[${new Date().toISOString()}] Mercury service started successfully with PID ${processes[0].pid} on port ${services.mercury.port}`;
      services.mercury.logs.push(successLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mercury-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'Mercury started successfully' };
    } else {
      services.mercury.status = 'error';
      
      // Add a log entry for failed start
      const errorLog = `[${new Date().toISOString()}] Failed to start Mercury service`;
      services.mercury.logs.push(errorLog);
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('mercury-log', errorLog);
      }
      
      sendStatusUpdate();
      return { success: false, message: 'Failed to start Mercury' };
    }
  } catch (error) {
    console.error('Error starting Mercury:', error);
    services.mercury.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error starting Mercury: ${error.message}` };
  }
}

// Stop Mercury service
async function stopMercury() {
  if (services.mercury.status !== 'running') {
    return { success: false, message: 'Mercury is not running' };
  }
  
  try {
    services.mercury.status = 'stopping';
    sendStatusUpdate();
    
    // Add a log entry for stopping attempt
    const stopLog = `[${new Date().toISOString()}] Attempting to stop Mercury service`;
    services.mercury.logs.push(stopLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('mercury-log', stopLog);
    }
    
    if (services.mercury.process) {
      // Try to gracefully stop the process first
      services.mercury.process.kill();
    } else if (services.mercury.pid) {
      // If we only have the PID (e.g., service was already running before app started)
      exec(`taskkill /PID ${services.mercury.pid} /F`);
    }
    
    // Wait a bit to ensure the process Stopped
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the process is still running
    const processes = await findProcess('name', 'mercury.exe');
    const mercuryProcesses = processes.filter(p => p.pid === services.mercury.pid);
    
    // If no Mercury processes found or the specific PID is no longer running, consider it Stopped
    if (processes.length === 0 || mercuryProcesses.length === 0) {
      services.mercury.status = 'STOPPED';
      services.mercury.process = null;
      services.mercury.pid = null;
      
      // Add a log entry for successful stop
      const successLog = `[${new Date().toISOString()}] Mercury service Stopped successfully`;
      services.mercury.logs.push(successLog);
      if (mainWindow) {
        mainWindow.webContents.send('mercury-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'Mercury Stopped successfully' };
    } else {
      // Try one more time with force
      exec(`taskkill /F /IM mercury.exe`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      const checkAgain = await findProcess('name', 'mercury.exe');
      if (checkAgain.length === 0) {
        services.mercury.status = 'STOPPED';
        services.mercury.process = null;
        services.mercury.pid = null;
        
        // Add a log entry for successful stop after retry
        const retryLog = `[${new Date().toISOString()}] Mercury service Stopped successfully after retry`;
        services.mercury.logs.push(retryLog);
        if (mainWindow) {
          mainWindow.webContents.send('mercury-log', retryLog);
        }
        
        sendStatusUpdate();
        return { success: true, message: 'Mercury Stopped successfully' };
      } else {
        services.mercury.status = 'error';
        
        // Add a log entry for failed stop
        const errorLog = `[${new Date().toISOString()}] Failed to stop Mercury service`;
        services.mercury.logs.push(errorLog);
        if (mainWindow) {
          mainWindow.webContents.send('mercury-log', errorLog);
        }
        
        sendStatusUpdate();
        return { success: false, message: 'Failed to stop Mercury after multiple attempts' };
      }
    }
  } catch (error) {
    console.error('Error stopping Mercury:', error);
    services.mercury.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error stopping Mercury: ${error.message}` };
  }
}

// Start Tomcat service
async function startTomcat() {
  if (services.tomcat.status === 'running') {
    return { success: false, message: 'Tomcat is already running' };
  }
  
  try {
    services.tomcat.status = 'Starting';
    sendStatusUpdate();
    
    const startLog = `[${new Date().toISOString()}] Attempting to start Tomcat service`;
    services.tomcat.logs.push(startLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('tomcat-log', startLog);
    }
    
    const errorLog = `[${new Date().toISOString()}] The Tomcat service has been deprecated on this control panel (I tried, but fuck, it didn't work). Please use another application or use the default XAMPP application.`;
    services.tomcat.logs.push(errorLog);
    if (mainWindow) {
      mainWindow.webContents.send('tomcat-log', errorLog);
    }
    services.tomcat.status = 'error';
    sendStatusUpdate();
    return { success: false, message: 'Tomcat service is deprecated' };

    
    const processEnv = {
      ...process.env,
      CATALINA_HOME: path.join(XAMPP_PATH, 'tomcat'),
      CATALINA_BASE: path.join(XAMPP_PATH, 'tomcat'),
      JAVA_HOME: require('fs').existsSync(javaPath) ? javaPath : jrePath,
      JRE_HOME: require('fs').existsSync(jrePath) ? jrePath : javaPath
    };
    
    // Start Tomcat using catalina.bat
    const tomcatProcess = spawn('cmd.exe', ['/c', TOMCAT_PATH, 'start'], { env: processEnv });
    services.tomcat.process = tomcatProcess;
    
    tomcatProcess.stdout.on('data', (data) => {
      const log = data.toString();
      services.tomcat.logs.push(log);
      if (mainWindow) {
        mainWindow.webContents.send('tomcat-log', log);
      }
    });
    
    tomcatProcess.stderr.on('data', (data) => {
      const log = data.toString();
      services.tomcat.logs.push(log);
      if (mainWindow) {
        mainWindow.webContents.send('tomcat-log', log);
      }
    });
    
    tomcatProcess.on('close', (code) => {
      if (code !== 0 && services.tomcat.status !== 'stopping') {
        services.tomcat.status = 'error';
        if (mainWindow) {
          mainWindow.webContents.send('service-error', {
            service: 'tomcat',
            message: `Tomcat process exited with code ${code}`
          });
        }
      }
      
      if (services.tomcat.status !== 'stopping') {
        services.tomcat.status = 'STOPPED';
        services.tomcat.process = null;
        services.tomcat.pid = null;
      }
      
      sendStatusUpdate();
    });
    
    // Wait for process to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if Tomcat is running
    const processes = await findProcess('name', 'tomcat9.exe');
    if (processes.length > 0) {
      services.tomcat.status = 'running';
      services.tomcat.pid = processes[0].pid;
      
      const successLog = `[${new Date().toISOString()}] Tomcat service started successfully with PID ${processes[0].pid}`;
      services.tomcat.logs.push(successLog);
      if (mainWindow) {
        mainWindow.webContents.send('tomcat-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'Tomcat started successfully' };
    } else {
      services.tomcat.status = 'error';
      
      const errorLog = `[${new Date().toISOString()}] Failed to start Tomcat service`;
      services.tomcat.logs.push(errorLog);
      if (mainWindow) {
        mainWindow.webContents.send('tomcat-log', errorLog);
      }
      
      sendStatusUpdate();
      return { success: false, message: 'Failed to start Tomcat' };
    }
  } catch (error) {
    console.error('Error starting Tomcat:', error);
    services.tomcat.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error starting Tomcat: ${error.message}` };
  }
}

// Stop Tomcat service
async function stopTomcat() {
  if (services.tomcat.status !== 'running') {
    return { success: false, message: 'Tomcat is not running' };
  }
  
  try {
    services.tomcat.status = 'stopping';
    sendStatusUpdate();
    
    // Add a log entry for stopping attempt
    const stopLog = `[${new Date().toISOString()}] Attempting to stop Tomcat service`;
    services.tomcat.logs.push(stopLog);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('tomcat-log', stopLog);
    }
    
    if (services.tomcat.process) {
      // Try to gracefully stop the process first
      services.tomcat.process.kill();
    } else if (services.tomcat.pid) {
      // If we only have the PID (e.g., service was already running before app started)
      exec(`taskkill /PID ${services.tomcat.pid} /F`);
    }
    
    // Wait a bit to ensure the process Stopped
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the process is still running
    const processes = await findProcess('name', 'tomcat9.exe');
    const tomcatProcesses = processes.filter(p => p.pid === services.tomcat.pid);
    
    // If no Tomcat processes found or the specific PID is no longer running, consider it Stopped
    if (processes.length === 0 || tomcatProcesses.length === 0) {
      services.tomcat.status = 'STOPPED';
      services.tomcat.process = null;
      services.tomcat.pid = null;
      
      // Add a log entry for successful stop
      const successLog = `[${new Date().toISOString()}] Tomcat service Stopped successfully`;
      services.tomcat.logs.push(successLog);
      if (mainWindow) {
        mainWindow.webContents.send('tomcat-log', successLog);
      }
      
      sendStatusUpdate();
      return { success: true, message: 'Tomcat Stopped successfully' };
    } else {
      // Try one more time with force
      exec(`taskkill /F /IM tomcat9.exe`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      const checkAgain = await findProcess('name', 'tomcat9.exe');
      if (checkAgain.length === 0) {
        services.tomcat.status = 'STOPPED';
        services.tomcat.process = null;
        services.tomcat.pid = null;
        
        // Add a log entry for successful stop after retry
        const retryLog = `[${new Date().toISOString()}] Tomcat service Stopped successfully after retry`;
        services.tomcat.logs.push(retryLog);
        if (mainWindow) {
          mainWindow.webContents.send('tomcat-log', retryLog);
        }
        
        sendStatusUpdate();
        return { success: true, message: 'Tomcat Stopped successfully' };
      } else {
        services.tomcat.status = 'error';
        
        // Add a log entry for failed stop
        const errorLog = `[${new Date().toISOString()}] Failed to stop Tomcat service`;
        services.tomcat.logs.push(errorLog);
        if (mainWindow) {
          mainWindow.webContents.send('tomcat-log', errorLog);
        }
        
        sendStatusUpdate();
        return { success: false, message: 'Failed to stop Tomcat after multiple attempts' };
      }
    }
  } catch (error) {
    console.error('Error stopping Tomcat:', error);
    services.tomcat.status = 'error';
    sendStatusUpdate();
    return { success: false, message: `Error stopping Tomcat: ${error.message}` };
  }
}

// IPC handlers for renderer process communication
ipcMain.handle('start-apache', async () => {
  return await startApache();
});

ipcMain.handle('stop-apache', async () => {
  return await stopApache();
});

ipcMain.handle('start-mysql', async () => {
  return await startMySQL();
});

ipcMain.handle('stop-mysql', async () => {
  return await stopMySQL();
});

ipcMain.handle('start-filezilla', async () => {
  return await startFileZilla();
});

ipcMain.handle('stop-filezilla', async () => {
  return await stopFileZilla();
});

ipcMain.handle('start-mercury', async () => {
  return await startMercury();
});

ipcMain.handle('stop-mercury', async () => {
  return await stopMercury();
});

ipcMain.handle('start-tomcat', async () => {
  return await startTomcat();
});

ipcMain.handle('stop-tomcat', async () => {
  return await stopTomcat();
});

// Config file paths
const CONFIG_PATHS = {
  apache: path.join(XAMPP_PATH, 'apache', 'conf', 'httpd.conf'),
  mysql: path.join(XAMPP_PATH, 'mysql', 'bin', 'my.ini'),
  filezilla: path.join(XAMPP_PATH, 'FileZillaFTP', 'FileZilla Server.xml'),
  mercury: path.join(XAMPP_PATH, 'MercuryMail', 'mercury.ini'),
  tomcat: path.join(XAMPP_PATH, 'tomcat', 'conf', 'server.xml')
};

// Log file paths
const LOG_PATHS = {
  apache: path.join(XAMPP_PATH, 'apache', 'logs', 'error.log'),
  mysql: path.join(XAMPP_PATH, 'mysql', 'data', 'mysql_error.log'),
  filezilla: path.join(XAMPP_PATH, 'FileZillaFTP', 'Logs'),
  mercury: path.join(XAMPP_PATH, 'MercuryMail', 'MERCURY.LOG'),
  tomcat: path.join(XAMPP_PATH, 'tomcat', 'logs', 'catalina.log')
};

// Open config file
ipcMain.handle('open-config', async (event, service) => {
  try {
    if (CONFIG_PATHS[service]) {
      const configPath = CONFIG_PATHS[service];
      // Check if file exists
      if (require('fs').existsSync(configPath)) {
        // Open with default application
        exec(`start "" "${configPath}"`);
        return { success: true, message: `Opened ${service} configuration file` };
      } else {
        return { success: false, message: `Configuration file for ${service} not found` };
      }
    } else {
      return { success: false, message: `No configuration file defined for ${service}` };
    }
  } catch (error) {
    console.error(`Error opening ${service} config:`, error);
    return { success: false, message: `Error opening configuration: ${error.message}` };
  }
});

// Open logs file or directory
ipcMain.handle('open-logs', async (event, service) => {
  try {
    if (LOG_PATHS[service]) {
      const logPath = LOG_PATHS[service];
      // Check if path exists
      if (require('fs').existsSync(logPath)) {
        // Open with default application
        exec(`start "" "${logPath}"`);
        return { success: true, message: `Opened ${service} logs` };
      } else {
        return { success: false, message: `Log file for ${service} not found` };
      }
    } else {
      return { success: false, message: `No log file defined for ${service}` };
    }
  } catch (error) {
    console.error(`Error opening ${service} logs:`, error);
    return { success: false, message: `Error opening logs: ${error.message}` };
  }
});

ipcMain.handle('get-services-status', async () => {
  await checkServicesStatus();
  return {
    apache: {
      status: services.apache.status,
      pid: services.apache.pid,
      port: services.apache.port
    },
    mysql: {
      status: services.mysql.status,
      pid: services.mysql.pid,
      port: services.mysql.port
    },
    filezilla: {
      status: services.filezilla.status,
      pid: services.filezilla.pid,
      port: services.filezilla.port
    },
    mercury: {
      status: services.mercury.status,
      pid: services.mercury.pid,
      port: services.mercury.port
    },
    tomcat: {
      status: services.tomcat.status,
      pid: services.tomcat.pid,
      port: services.tomcat.port
    }
  };
});

// App lifecycle events

// When the app is ready, create the window
app.whenReady().then(() => {
  createWindow();
  
  // Register IPC handlers for theme management
  ipcMain.handle('get-theme', () => getTheme());
  ipcMain.handle('get-theme-data', (_, themeId) => getThemeData(themeId || getTheme()));
  ipcMain.handle('get-available-themes', () => getAvailableThemes());
  ipcMain.handle('save-theme', (_, themeData) => saveTheme(themeData));
  ipcMain.handle('delete-theme', (_, themeId) => deleteTheme(themeId));
  ipcMain.handle('set-theme', (_, themeId) => {
    const newThemeId = setTheme(themeId);
    const themeData = getThemeData(newThemeId);
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('theme-changed', { id: newThemeId, data: themeData });
    });
    return { id: newThemeId, data: themeData };
  });
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

// Clean up services when app is quitting
app.on('before-quit', async () => {
  if (services.apache.status === 'RUNNING') {
    await stopApache();
  }
  
  if (services.mysql.status === 'RUNNING') {
    await stopMySQL();
  }
  
  if (services.filezilla.status === 'running') {
    await stopFileZilla();
  }
  
  if (services.mercury.status === 'running') {
    await stopMercury();
  }
  
  if (services.tomcat.status === 'running') {
    await stopTomcat();
  }
});