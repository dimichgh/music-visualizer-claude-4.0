import { app, BrowserWindow } from 'electron';
import { WindowManager } from './window-manager';
import { AudioIPC } from './audio/audio-ipc';

class MusicVisualizerApp {
  private windowManager: WindowManager;
  private audioIPC: AudioIPC;

  constructor() {
    this.windowManager = new WindowManager();
    this.audioIPC = new AudioIPC();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    app.whenReady().then(() => {
      this.windowManager.createMainWindow();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createMainWindow();
      }
    });

    app.on('before-quit', () => {
      // Clean up audio processing
      this.audioIPC.getAudioManager().stop();
    });
  }
}

new MusicVisualizerApp();
