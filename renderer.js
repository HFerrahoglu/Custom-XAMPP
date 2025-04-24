//#region DOM Element References
// Apache Elements
const apacheStatusEl = document.getElementById('apache-status');
const apachePidEl = document.getElementById('apache-pid');
const apachePortEl = document.getElementById('apache-port');
const toggleApacheBtn = document.getElementById('toggle-apache');
const configApacheBtn = document.getElementById('config-apache');
const logsApacheBtn = document.getElementById('logs-apache');
const apacheLogsEl = document.getElementById('apache-logs');

const mysqlStatusEl = document.getElementById('mysql-status');
const mysqlPidEl = document.getElementById('mysql-pid');
const mysqlPortEl = document.getElementById('mysql-port');
const toggleMySQLBtn = document.getElementById('toggle-mysql');
const configMySQLBtn = document.getElementById('config-mysql');
const logsMySQLBtn = document.getElementById('logs-mysql');
const mysqlLogsEl = document.getElementById('mysql-logs');

const filezillaStatusEl = document.getElementById('filezilla-status');
const filezillaPidEl = document.getElementById('filezilla-pid');
const filezillaPortEl = document.getElementById('filezilla-port');
const toggleFileZillaBtn = document.getElementById('toggle-filezilla');
const configFileZillaBtn = document.getElementById('config-filezilla');
const logsFileZillaBtn = document.getElementById('logs-filezilla');
const filezillaLogsEl = document.getElementById('filezilla-logs');

const mercuryStatusEl = document.getElementById('mercury-status');
const mercuryPidEl = document.getElementById('mercury-pid');
const mercuryPortEl = document.getElementById('mercury-port');
const toggleMercuryBtn = document.getElementById('toggle-mercury');
const configMercuryBtn = document.getElementById('config-mercury');
const logsMercuryBtn = document.getElementById('logs-mercury');
const mercuryLogsEl = document.getElementById('mercury-logs');

const tomcatStatusEl = document.getElementById('tomcat-status');
const tomcatPidEl = document.getElementById('tomcat-pid');
const tomcatPortEl = document.getElementById('tomcat-port');
const toggleTomcatBtn = document.getElementById('toggle-tomcat');
const configTomcatBtn = document.getElementById('config-tomcat');
const logsTomcatBtn = document.getElementById('logs-tomcat');
const tomcatLogsEl = document.getElementById('tomcat-logs');

const notificationEl = document.getElementById('notification');
const notificationMessageEl = document.getElementById('notification-message');
const closeNotificationBtn = document.getElementById('close-notification');

//#region Theme Management Elements and State
// Theme elements
const themeToggleBtn = document.getElementById('theme-toggle');
const settingsBtn = document.querySelector('button[aria-label="Settings"]');

// Theme management modal elements
let themeModal = null;
let themesList = null;
let themeEditor = null;
let currentThemeId = null;
let availableThemes = [];
//#endregion

//#region Event Listeners and Initialization
// Initialize services status and theme
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get services status
    const status = await window.api.getServicesStatus();
    updateServicesUI(status);
    
    // Load saved theme
    currentThemeId = await window.api.getTheme();
    const themeData = await window.api.getThemeData(currentThemeId);
    applyTheme(themeData);
    
    // Create theme management modal
    createThemeModal();
    
    // Load available themes
    await loadAvailableThemes();
  } catch (error) {
    showNotification(`Error initializing application: ${error.message}`, 'error');
  }
});

// Theme toggle button click handler
themeToggleBtn.addEventListener('click', async () => {
  try {
    // Get current theme
    const currentTheme = document.documentElement.getAttribute('data-theme');
    // Toggle between dark and light
    const newThemeId = currentTheme === 'dark' ? 'default-light' : 'default-dark';
    // Save theme preference
    const result = await window.api.setTheme(newThemeId);
    // Apply theme
    currentThemeId = result.id;
    applyTheme(result.data);
  } catch (error) {
    showNotification(`Error changing theme: ${error.message}`, 'error');
  }
});

// Settings button click handler for theme management
settingsBtn.addEventListener('click', () => {
  openThemeModal();
});

// Listen for theme changes from main process
window.api.onThemeChanged((themeInfo) => {
  currentThemeId = themeInfo.id;
  applyTheme(themeInfo.data);
});

// Apply theme function
function applyTheme(themeData) {
  if (!themeData) return;
  
  // Determine if it's a dark or light theme for the data-theme attribute
  // This is for backward compatibility with existing CSS
  const isDark = themeData.id?.includes('dark') || 
                (themeData.colors && themeData.colors['bg-color']?.startsWith('#1') || 
                themeData.colors['bg-color']?.startsWith('#2'));
  
  const themeType = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', themeType);
  
  // Apply custom CSS variables if available
  if (themeData.colors) {
    const root = document.documentElement;
    Object.entries(themeData.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }
  
  // Update theme toggle button icon
  if (themeType === 'dark') {
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    themeToggleBtn.setAttribute('title', 'Switch to Light Theme');
  } else {
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggleBtn.setAttribute('title', 'Switch to Dark Theme');
  }
}

// Create theme management modal
function createThemeModal() {
  // Create modal container if it doesn't exist
  if (!themeModal) {
    themeModal = document.createElement('div');
    themeModal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center w-full h-screen z-50 hidden';
    themeModal.style.zIndex = '1000';
    themeModal.id = 'theme-modal';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-card-bg border border-border-color rounded-lg p-6 w-full h-full overflow-auto';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'flex justify-between items-center mb-4';
    
    const modalTitle = document.createElement('h2');
    modalTitle.className = 'text-xl font-semibold';
    modalTitle.textContent = 'Theme Manager';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'text-text-secondary hover:text-text-color';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.onclick = () => closeThemeModal();
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create tabs
    const tabs = document.createElement('div');
    tabs.className = 'flex border-b border-border-color mb-4';
    
    const browseTab = document.createElement('button');
    browseTab.className = 'py-2 px-4 border-b-2 border-notification-info -mb-px';
    browseTab.textContent = 'Browse Themes';
    browseTab.dataset.tab = 'browse';
    
    const createTab = document.createElement('button');
    createTab.className = 'py-2 px-4 text-text-secondary';
    createTab.textContent = 'Create Theme';
    createTab.dataset.tab = 'create';
    
    tabs.appendChild(browseTab);
    tabs.appendChild(createTab);
    
    // Tab click handler
    tabs.addEventListener('click', (e) => {
      if (e.target.dataset.tab) {
        // Update tab styles
        document.querySelectorAll('#theme-modal [data-tab]').forEach(tab => {
          tab.className = 'py-2 px-4 text-text-secondary';
        });
        e.target.className = 'py-2 px-4 border-b-2 border-notification-info -mb-px';
        
        // Show/hide content
        if (e.target.dataset.tab === 'browse') {
          document.getElementById('themes-list').classList.remove('hidden');
          document.getElementById('theme-editor').classList.add('hidden');
        } else {
          document.getElementById('themes-list').classList.add('hidden');
          document.getElementById('theme-editor').classList.remove('hidden');
          
          // Reset the editor with a new theme template
          populateThemeEditor({
            name: 'New Custom Theme',
            id: `custom-theme-${Date.now()}`,
            author: '',
            description: 'My custom theme',
            colors: {
              'bg-color': '#1f2128',
              'card-bg': '#22252d',
              'border-color': '#2a2d34',
              'text-color': '#ffffff',
              'text-secondary': '#8a8f9a',
              'btn-bg': '#2a2d34',
              'btn-hover': '#3a3f4a',
              'btn-text-color': '#ffffff',
              'window-title-color': '#ffffff',
              'status-running': '#3a8a6f',
              'status-Stopped': '#e74c3c',
              'notification-info': '#3498db',
              'notification-success': '#2ecc71',
              'notification-warning': '#f39c12',
              'notification-error': '#e74c3c',
              'shadow-color': '#0a0a0a',
              // Button specific colors
              'btn-start-bg': '#4CAF50',
              'btn-start-hover': '#3d8b40',
              'btn-start-text': '#ffffff',
              'btn-stop-bg': '#f44336',
              'btn-stop-hover': '#d32f2f',
              'btn-stop-text': '#ffffff',
              'btn-config-bg': '#2196F3',
              'btn-config-hover': '#0b7dda',
              'btn-config-text': '#ffffff',
              'btn-logs-bg': '#FF9800',
              'btn-logs-hover': '#e68a00',
              'btn-logs-text': '#ffffff'
            }
          });
        }
      }
    });
    
    // Create themes list container
    themesList = document.createElement('div');
    themesList.id = 'themes-list';
    themesList.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    
    // Create theme editor container
    themeEditor = document.createElement('div');
    themeEditor.id = 'theme-editor';
    themeEditor.className = 'hidden';
    
    // Create theme editor form
    const editorForm = document.createElement('form');
    editorForm.className = 'space-y-4';
    editorForm.id = 'theme-editor-form';
    
    // Theme basic info
    const basicInfo = document.createElement('div');
    basicInfo.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    
    // Theme name
    const nameGroup = document.createElement('div');
    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'theme-name';
    nameLabel.className = 'block text-sm font-medium mb-1';
    nameLabel.textContent = 'Theme Name';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'theme-name';
    nameInput.className = 'w-full p-2 rounded border border-border-color bg-card-bg';
    nameInput.required = true;
    
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    
    // Theme ID (hidden)
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.id = 'theme-id';
    
    // Theme author
    const authorGroup = document.createElement('div');
    const authorLabel = document.createElement('label');
    authorLabel.htmlFor = 'theme-author';
    authorLabel.className = 'block text-sm font-medium mb-1';
    authorLabel.textContent = 'Author';
    
    const authorInput = document.createElement('input');
    authorInput.type = 'text';
    authorInput.id = 'theme-author';
    authorInput.className = 'w-full p-2 rounded border border-border-color bg-card-bg';
    
    authorGroup.appendChild(authorLabel);
    authorGroup.appendChild(authorInput);
    
    basicInfo.appendChild(nameGroup);
    basicInfo.appendChild(authorGroup);
    
    // Theme description
    const descGroup = document.createElement('div');
    const descLabel = document.createElement('label');
    descLabel.htmlFor = 'theme-description';
    descLabel.className = 'block text-sm font-medium mb-1';
    descLabel.textContent = 'Description';
    
    const descInput = document.createElement('textarea');
    descInput.id = 'theme-description';
    descInput.className = 'w-full p-2 rounded border border-border-color bg-card-bg';
    descInput.rows = 2;
    
    descGroup.appendChild(descLabel);
    descGroup.appendChild(descInput);
    
    // Color editor
    const colorEditor = document.createElement('div');
    colorEditor.className = 'mt-4';
    
    const colorTitle = document.createElement('h3');
    colorTitle.className = 'text-lg font-medium mb-2';
    colorTitle.textContent = 'Colors';
    
    // Add explanation for button colors and window title
    const colorExplanation = document.createElement('div');
    colorExplanation.className = 'mb-4 p-3 bg-card-bg border border-border-color rounded';
    colorExplanation.innerHTML = `
      <p class="text-sm mb-2"><strong>Button Colors:</strong> You can customize both the background and text colors of buttons.</p>
      <p class="text-sm mb-2"><strong>Service Button Customization:</strong> You can now customize the Start, Stop, Config, and Logs buttons individually with their own colors and hover effects.</p>
      <p class="text-sm mb-2"><strong>Window Title:</strong> The "window-title-color" option controls the color of the application title bar text.</p>
      <p class="text-sm"><strong>Note:</strong> The window controls (minimize, maximize, close) are configured by the system. The maximize button is disabled by design in this application.</p>
    `;
    
    colorEditor.appendChild(colorTitle);
    colorEditor.appendChild(colorExplanation);
    
    const colorGrid = document.createElement('div');
    colorGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    colorGrid.id = 'color-editor-grid';
    
    // Add color inputs for each theme color
    const colorKeys = [
      'bg-color', 'card-bg', 'border-color', 'text-color', 'text-secondary',
      'btn-bg', 'btn-hover', 'btn-text-color', 'window-title-color',
      'status-running', 'status-Stopped',
      'notification-info', 'notification-success', 'notification-warning', 'notification-error',
      'shadow-color',
      // Button specific colors
      'btn-start-bg', 'btn-start-hover', 'btn-start-text',
      'btn-stop-bg', 'btn-stop-hover', 'btn-stop-text',
      'btn-config-bg', 'btn-config-hover', 'btn-config-text',
      'btn-logs-bg', 'btn-logs-hover', 'btn-logs-text'
    ];
    
    colorKeys.forEach(key => {
      const colorGroup = document.createElement('div');
      colorGroup.className = 'flex items-center';
      
      const colorLabel = document.createElement('label');
      colorLabel.htmlFor = `color-${key}`;
      colorLabel.className = 'block text-sm font-medium w-1/2';
      colorLabel.textContent = key;
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.id = `color-${key}`;
      colorInput.className = 'ml-2 p-1 rounded border border-border-color bg-card-bg';
      colorInput.dataset.colorKey = key;
      
      // Preview color change on input
      colorInput.addEventListener('input', () => {
        document.documentElement.style.setProperty(`--${key}`, colorInput.value);
      });
      
      colorGroup.appendChild(colorLabel);
      colorGroup.appendChild(colorInput);
      colorGrid.appendChild(colorGroup);
    });
    
    colorEditor.appendChild(colorGrid);
    
    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'flex justify-end space-x-2 mt-6';
    
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'btn font-semibold rounded-md px-5 py-2 bg-notification-success text-white';
    saveButton.textContent = 'Save Theme';
    
    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'btn font-semibold rounded-md px-5 py-2 bg-notification-info text-white';
    previewButton.textContent = 'Preview';
    previewButton.onclick = (e) => {
      e.preventDefault();
      previewTheme();
    };
    
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'btn font-semibold rounded-md px-5 py-2';
    resetButton.textContent = 'Reset';
    resetButton.onclick = (e) => {
      e.preventDefault();
      resetThemePreview();
    };
    
    actionButtons.appendChild(resetButton);
    actionButtons.appendChild(previewButton);
    actionButtons.appendChild(saveButton);
    
    // Add all elements to form
    editorForm.appendChild(idInput);
    editorForm.appendChild(basicInfo);
    editorForm.appendChild(descGroup);
    editorForm.appendChild(colorEditor);
    editorForm.appendChild(actionButtons);
    
    // Form submit handler
    editorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveCustomTheme();
    });
    
    themeEditor.appendChild(editorForm);
    
    // Add all elements to modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(tabs);
    modalContent.appendChild(themesList);
    modalContent.appendChild(themeEditor);
    
    themeModal.appendChild(modalContent);
    document.body.appendChild(themeModal);
  }
}

// Open theme modal
function openThemeModal() {
  themeModal.classList.remove('hidden');
  loadAvailableThemes();
}

// Close theme modal
function closeThemeModal() {
  themeModal.classList.add('hidden');
  resetThemePreview();
}

// Load available themes
async function loadAvailableThemes() {
  try {
    availableThemes = await window.api.getAvailableThemes();
    renderThemesList();
  } catch (error) {
    showNotification(`Error loading themes: ${error.message}`, 'error');
  }
}

// Render themes list
function renderThemesList() {
  themesList.innerHTML = '';
  
  availableThemes.forEach(theme => {
    const themeCard = document.createElement('div');
    themeCard.className = `p-4 border rounded-md border-border-color ${theme.id === currentThemeId ? 'border-notification-info' : ''}`;
    
    const themeHeader = document.createElement('div');
    themeHeader.className = 'flex justify-between items-center mb-2';
    
    const themeName = document.createElement('h3');
    themeName.className = 'font-medium';
    themeName.textContent = theme.name;
    
    const activeIndicator = document.createElement('span');
    if (theme.id === currentThemeId) {
      activeIndicator.className = 'text-xs bg-notification-info text-white px-2 py-1 rounded';
      activeIndicator.textContent = 'Active';
    }
    
    themeHeader.appendChild(themeName);
    if (theme.id === currentThemeId) {
      themeHeader.appendChild(activeIndicator);
    }
    
    const themeAuthor = document.createElement('p');
    themeAuthor.className = 'text-sm text-text-secondary';
    themeAuthor.textContent = `By: ${theme.author || 'Unknown'}`;
    
    const themeDesc = document.createElement('p');
    themeDesc.className = 'text-sm mt-2';
    themeDesc.textContent = theme.description || '';
    
    const themeActions = document.createElement('div');
    themeActions.className = 'flex justify-end space-x-2 mt-3';
    
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn font-semibold rounded-md px-3 py-1 text-sm';
    applyBtn.textContent = theme.id === currentThemeId ? 'Applied' : 'Apply';
    applyBtn.disabled = theme.id === currentThemeId;
    applyBtn.onclick = () => applyThemeById(theme.id);
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn font-semibold rounded-md px-3 py-1 text-sm';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => editTheme(theme.id);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn font-semibold rounded-md px-3 py-1 text-sm bg-notification-error text-white';
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = theme.id === 'default-dark' || theme.id === 'default-light';
    deleteBtn.onclick = () => deleteThemeById(theme.id);
    
    themeActions.appendChild(applyBtn);
    themeActions.appendChild(editBtn);
    if (theme.id !== 'default-dark' && theme.id !== 'default-light') {
      themeActions.appendChild(deleteBtn);
    }
    
    themeCard.appendChild(themeHeader);
    themeCard.appendChild(themeAuthor);
    themeCard.appendChild(themeDesc);
    themeCard.appendChild(themeActions);
    
    themesList.appendChild(themeCard);
  });
}

// Apply theme by ID
async function applyThemeById(themeId) {
  try {
    const result = await window.api.setTheme(themeId);
    currentThemeId = result.id;
    applyTheme(result.data);
    renderThemesList(); // Refresh the list to update active status
    showNotification('Theme applied successfully', 'success');
  } catch (error) {
    showNotification(`Error applying theme: ${error.message}`, 'error');
  }
}

// Edit theme
async function editTheme(themeId) {
  try {
    const themeData = await window.api.getThemeData(themeId);
    
    // Switch to edit tab
    document.querySelector('#theme-modal [data-tab="create"]').click();
    
    // Populate editor with theme data
    populateThemeEditor(themeData);
  } catch (error) {
    showNotification(`Error editing theme: ${error.message}`, 'error');
  }
}

// Populate theme editor with theme data
function populateThemeEditor(themeData) {
  if (!themeData) return;
  
  // Set basic info
  document.getElementById('theme-id').value = themeData.id || '';
  document.getElementById('theme-name').value = themeData.name || '';
  document.getElementById('theme-author').value = themeData.author || '';
  document.getElementById('theme-description').value = themeData.description || '';
  
  // Set colors
  if (themeData.colors) {
    Object.entries(themeData.colors).forEach(([key, value]) => {
      const colorInput = document.getElementById(`color-${key}`);
      if (colorInput) {
        colorInput.value = value;
      }
    });
  }
}

// Preview theme
function previewTheme() {
  // Get values from form
  const colors = {};
  document.querySelectorAll('#color-editor-grid input[type="color"]').forEach(input => {
    colors[input.dataset.colorKey] = input.value;
  });
  
  // Apply preview
  const previewData = {
    id: document.getElementById('theme-id').value,
    name: document.getElementById('theme-name').value,
    colors: colors
  };
  
  applyTheme(previewData);
  showNotification('Theme preview applied. Changes are not saved yet.', 'info');
}

// Reset theme preview
function resetThemePreview() {
  // Reapply current theme
  window.api.getThemeData(currentThemeId).then(themeData => {
    applyTheme(themeData);
  });
}

// Save custom theme
async function saveCustomTheme() {
  try {
    // Get values from form
    const themeId = document.getElementById('theme-id').value || `custom-theme-${Date.now()}`;
    const themeName = document.getElementById('theme-name').value;
    const themeAuthor = document.getElementById('theme-author').value;
    const themeDescription = document.getElementById('theme-description').value;
    
    const colors = {};
    document.querySelectorAll('#color-editor-grid input[type="color"]').forEach(input => {
      colors[input.dataset.colorKey] = input.value;
    });
    
    // Create theme data object
    const themeData = {
      id: themeId,
      name: themeName,
      author: themeAuthor,
      description: themeDescription,
      colors: colors
    };
    
    // Save theme
    const result = await window.api.saveTheme(themeData);
    
    if (result.success) {
      showNotification('Theme saved successfully', 'success');
      await loadAvailableThemes();
      
      // Switch to browse tab
      document.querySelector('#theme-modal [data-tab="browse"]').click();
    } else {
      showNotification(`Error saving theme: ${result.error}`, 'error');
    }
  } catch (error) {
    showNotification(`Error saving theme: ${error.message}`, 'error');
  }
}

// Delete theme by ID
async function deleteThemeById(themeId) {
  if (!confirm(`Are you sure you want to delete this theme?`)) {
    return;
  }
  
  try {
    const result = await window.api.deleteTheme(themeId);
    
    if (result.success) {
      showNotification('Theme deleted successfully', 'success');
      await loadAvailableThemes();
    } else {
      showNotification(`Error deleting theme: ${result.error}`, 'error');
    }
  } catch (error) {
    showNotification(`Error deleting theme: ${error.message}`, 'error');
  }
}

// Event listeners for service control buttons
// Apache toggle button
toggleApacheBtn.addEventListener('click', async () => {
  try {
    toggleApacheBtn.disabled = true;
    let result;
    if (apacheStatusEl.textContent.toLowerCase() === 'running') {
      result = await window.api.stopApache();
    } else {
      result = await window.api.startApache();
    }
    
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'warning');
    }
  } catch (error) {
    showNotification(`Error controlling Apache: ${error.message}`, 'error');
  } finally {
    toggleApacheBtn.disabled = false;
  }
});

// MySQL toggle button
toggleMySQLBtn.addEventListener('click', async () => {
  try {
    toggleMySQLBtn.disabled = true;
    let result;
    if (mysqlStatusEl.textContent.toLowerCase() === 'running') {
      result = await window.api.stopMySQL();
    } else {
      result = await window.api.startMySQL();
    }
    
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'warning');
    }
  } catch (error) {
    showNotification(`Error controlling MySQL: ${error.message}`, 'error');
  } finally {
    toggleMySQLBtn.disabled = false;
  }
});

// FileZilla toggle button
toggleFileZillaBtn.addEventListener('click', async () => {
  try {
    toggleFileZillaBtn.disabled = true;
    let result;
    if (filezillaStatusEl.textContent.toLowerCase() === 'running') {
      result = await window.api.stopFileZilla();
    } else {
      result = await window.api.startFileZilla();
    }
    
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'warning');
    }
  } catch (error) {
    showNotification(`Error controlling FileZilla: ${error.message}`, 'error');
  } finally {
    toggleFileZillaBtn.disabled = false;
  }
});

// Mercury toggle button
toggleMercuryBtn.addEventListener('click', async () => {
  try {
    toggleMercuryBtn.disabled = true;
    let result;
    if (mercuryStatusEl.textContent.toLowerCase() === 'running') {
      result = await window.api.stopMercury();
    } else {
      result = await window.api.startMercury();
    }
    
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'warning');
    }
  } catch (error) {
    showNotification(`Error controlling Mercury: ${error.message}`, 'error');
  } finally {
    toggleMercuryBtn.disabled = false;
  }
});

// Tomcat toggle button
toggleTomcatBtn.addEventListener('click', async () => {
  try {
    toggleTomcatBtn.disabled = true;
    let result;
    if (tomcatStatusEl.textContent.toLowerCase() === 'running') {
      result = await window.api.stopTomcat();
    } else {
      result = await window.api.startTomcat();
    }
    
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'warning');
    }
  } catch (error) {
    showNotification(`Error controlling Tomcat: ${error.message}`, 'error');
  } finally {
    toggleTomcatBtn.disabled = false;
  }
});

// Config buttons
configApacheBtn.addEventListener('click', () => {
  window.api.openConfig('apache');
});

configMySQLBtn.addEventListener('click', () => {
  window.api.openConfig('mysql');
});

configFileZillaBtn.addEventListener('click', () => {
  window.api.openConfig('filezilla');
});

configMercuryBtn.addEventListener('click', () => {
  window.api.openConfig('mercury');
});

configTomcatBtn.addEventListener('click', () => {
  window.api.openConfig('tomcat');
});

// Logs buttons
logsApacheBtn.addEventListener('click', () => {
  window.api.openLogs('apache');
});

logsMySQLBtn.addEventListener('click', () => {
  window.api.openLogs('mysql');
});

logsFileZillaBtn.addEventListener('click', () => {
  window.api.openLogs('filezilla');
});

logsMercuryBtn.addEventListener('click', () => {
  window.api.openLogs('mercury');
});

logsTomcatBtn.addEventListener('click', () => {
  window.api.openLogs('tomcat');
});

closeNotificationBtn.addEventListener('click', () => {
  notificationEl.classList.add('hidden');
});

// Listen for service status updates from main process
window.api.onServiceStatusUpdate((data) => {
  updateServicesUI(data);
});

// Listen for service logs
window.api.onApacheLog((log) => {
  appendLogMessage(apacheLogsEl, log);
});

window.api.onMySQLLog((log) => {
  appendLogMessage(mysqlLogsEl, log);
});

window.api.onFileZillaLog((log) => {
  appendLogMessage(filezillaLogsEl, log);
});

window.api.onMercuryLog((log) => {
  appendLogMessage(mercuryLogsEl, log);
});

window.api.onTomcatLog((log) => {
  appendLogMessage(tomcatLogsEl, log);
});

// Listen for Apache logs
window.api.onApacheLog((log) => {
  appendLog(apacheLogsEl, log);
});

// Listen for MySQL logs
window.api.onMySQLLog((log) => {
  appendLog(mysqlLogsEl, log);
});

// Listen for service errors
window.api.onServiceError((data) => {
  showNotification(`${data.service.toUpperCase()} Error: ${data.message}`, 'error');
});

// Update UI based on services status
function updateServicesUI(status) {
  // Apache
  updateServiceUI('apache', status.apache, apacheStatusEl, apachePidEl, apachePortEl, toggleApacheBtn);
  
  // MySQL
  updateServiceUI('mysql', status.mysql, mysqlStatusEl, mysqlPidEl, mysqlPortEl, toggleMySQLBtn);
  
  // FileZilla
  updateServiceUI('filezilla', status.filezilla, filezillaStatusEl, filezillaPidEl, filezillaPortEl, toggleFileZillaBtn);
  
  // Mercury
  updateServiceUI('mercury', status.mercury, mercuryStatusEl, mercuryPidEl, mercuryPortEl, toggleMercuryBtn);
  
  // Tomcat
  updateServiceUI('tomcat', status.tomcat, tomcatStatusEl, tomcatPidEl, tomcatPortEl, toggleTomcatBtn);
}

// Update UI for a specific service
function updateServiceUI(serviceName, serviceStatus, statusEl, pidEl, portEl, toggleBtn) {
  if (serviceStatus) {
    // Update status
    statusEl.textContent = serviceStatus.status;
    statusEl.className = `status ${serviceStatus.status.toLowerCase()} text-lg font-normal select-none sm:ml-6`;
    
    // Update text color based on status
    if (serviceStatus.status.toLowerCase() === 'running') {
      statusEl.classList.add('text-[#3a8a6f]');
      statusEl.classList.remove('text-[#e74c3c]');
    } else {
      statusEl.classList.add('text-[#e74c3c]');
      statusEl.classList.remove('text-[#3a8a6f]');
    }
    
    // Update PID
    if (serviceStatus.pid) {
      pidEl.textContent = `PID: ${serviceStatus.pid}`;
    } else {
      pidEl.textContent = '';
    }
    
    // Update Port
    if (serviceStatus.port) {
      portEl.textContent = `Port: ${serviceStatus.port}`;
    } else {
      portEl.textContent = '';
    }
    
    // Update toggle button
    if (serviceStatus.status.toLowerCase() === 'running') {
      toggleBtn.textContent = 'Stop';
      toggleBtn.classList.add('running');
      toggleBtn.classList.remove('Stopped');
    } else {
      toggleBtn.textContent = 'Start';
      toggleBtn.classList.add('Stopped');
      toggleBtn.classList.remove('running');
    }
  }
}

// Helper function to append log to log container
function appendLog(logContainer, log) {
  const logLine = document.createElement('div');
  logLine.textContent = log;
  logContainer.appendChild(logLine);
  
  // Auto-scroll to bottom
  logContainer.scrollTop = logContainer.scrollHeight;
  
  // Limit the number of log entries to prevent memory issues
  while (logContainer.childNodes.length > 100) {
    logContainer.removeChild(logContainer.firstChild);
  }
}

// Show notification
function showNotification(message, type = 'info') {
  notificationMessageEl.textContent = message;
  notificationEl.className = `fixed bottom-4 right-4 bg-[#3498db] text-white p-4 rounded-md shadow-lg flex items-center justify-between min-w-[300px]`;
  
  // Change background color based on notification type
  if (type === 'success') {
    notificationEl.classList.remove('bg-[#3498db]', 'bg-[#e74c3c]', 'bg-[#f39c12]');
    notificationEl.classList.add('bg-[#2ecc71]');
  } else if (type === 'error') {
    notificationEl.classList.remove('bg-[#3498db]', 'bg-[#2ecc71]', 'bg-[#f39c12]');
    notificationEl.classList.add('bg-[#e74c3c]');
  } else if (type === 'warning') {
    notificationEl.classList.remove('bg-[#3498db]', 'bg-[#2ecc71]', 'bg-[#e74c3c]');
    notificationEl.classList.add('bg-[#f39c12]');
  } else {
    notificationEl.classList.remove('bg-[#2ecc71]', 'bg-[#e74c3c]', 'bg-[#f39c12]');
    notificationEl.classList.add('bg-[#3498db]');
  }
  
  notificationEl.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notificationEl.classList.add('hidden');
  }, 5000);
}

// Helper function to append log messages
function appendLogMessage(logElement, message) {
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.textContent = message;
  logElement.appendChild(logEntry);
  logElement.scrollTop = logElement.scrollHeight;
}