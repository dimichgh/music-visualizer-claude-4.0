import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Audio control methods
  audio: {
    startMicrophoneCapture: () => ipcRenderer.invoke('audio:start-microphone-capture'),
    loadFile: (filePath: string) => ipcRenderer.invoke('audio:load-file', filePath),
    stop: () => ipcRenderer.invoke('audio:stop'),
    pause: () => ipcRenderer.invoke('audio:pause'),
    resume: () => ipcRenderer.invoke('audio:resume'),
    seek: (position: number) => ipcRenderer.invoke('audio:seek', position),
    getCurrentSource: () => ipcRenderer.invoke('audio:get-current-source'),
    getConfig: () => ipcRenderer.invoke('audio:get-config'),
    getDuration: () => ipcRenderer.invoke('audio:get-duration'),
    getCurrentTime: () => ipcRenderer.invoke('audio:get-current-time'),
    updateConfig: (config: any) => ipcRenderer.invoke('audio:update-config', config),
  },

  // Audio event listeners
  onAudioEvent: (callback: (event: string, data: any) => void) => {
    ipcRenderer.on('audio:data-available', (event, data) => callback('data-available', data));
    ipcRenderer.on('audio:features-extracted', (event, data) => callback('features-extracted', data));
    ipcRenderer.on('audio:source-changed', (event, data) => callback('source-changed', data));
    ipcRenderer.on('audio:error', (event, data) => callback('error', data));
  },

  removeAudioListeners: () => {
    ipcRenderer.removeAllListeners('audio:data-available');
    ipcRenderer.removeAllListeners('audio:features-extracted');
    ipcRenderer.removeAllListeners('audio:source-changed');
    ipcRenderer.removeAllListeners('audio:error');
  },

  // File system operations
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
}); 