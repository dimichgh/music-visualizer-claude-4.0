import { ipcMain, IpcMainInvokeEvent, webContents, dialog } from 'electron';
import { AudioManager } from './audio-manager';
import { AudioConfig, AudioEvent } from '@shared/types';

export class AudioIPC {
  private audioManager: AudioManager;

  constructor() {
    const audioConfig: AudioConfig = {
      sampleRate: 48000,
      bufferSize: 4096,
      channels: 1,
      bitDepth: 16,
    };

    this.audioManager = new AudioManager(audioConfig);
    this.setupIpcHandlers();
    this.setupAudioEventForwarding();
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('audio:start-microphone-capture', async () => {
      try {
        await this.audioManager.startMicrophoneCapture();
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('audio:load-file', async (event: IpcMainInvokeEvent, filePath: string) => {
      try {
        await this.audioManager.loadAudioFile(filePath);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('audio:stop', () => {
      this.audioManager.stop();
      return { success: true };
    });

    ipcMain.handle('audio:pause', () => {
      this.audioManager.pause();
      return { success: true };
    });

    ipcMain.handle('audio:resume', () => {
      this.audioManager.resume();
      return { success: true };
    });

    ipcMain.handle('audio:seek', (event: IpcMainInvokeEvent, position: number) => {
      this.audioManager.seek(position);
      return { success: true };
    });

    ipcMain.handle('audio:get-current-source', () => {
      return this.audioManager.getCurrentSource();
    });

    ipcMain.handle('audio:get-config', () => {
      return this.audioManager.getConfig();
    });

    ipcMain.handle('audio:get-duration', () => {
      return this.audioManager.getDuration();
    });

    ipcMain.handle('audio:get-current-time', () => {
      return this.audioManager.getCurrentTime();
    });

    ipcMain.handle('audio:update-config', (event: IpcMainInvokeEvent, newConfig: Partial<AudioConfig>) => {
      this.audioManager.updateConfig(newConfig);
      return { success: true };
    });

    // File dialog handler
    ipcMain.handle('dialog:open-file', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'aac'] },
          { name: 'WAV Files', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      } else {
        return { success: true, filePath: result.filePaths[0] };
      }
    });
  }

  private setupAudioEventForwarding(): void {
    this.audioManager.on(AudioEvent.DATA_AVAILABLE, (data) => {
      this.broadcastToRenderers('audio:data-available', data);
    });

    this.audioManager.on(AudioEvent.FEATURES_EXTRACTED, (features) => {
      this.broadcastToRenderers('audio:features-extracted', features);
    });

    this.audioManager.on(AudioEvent.SOURCE_CHANGED, (source) => {
      this.broadcastToRenderers('audio:source-changed', source);
    });

    this.audioManager.on(AudioEvent.ERROR, (error) => {
      this.broadcastToRenderers('audio:error', { message: error.message });
    });
  }

  private broadcastToRenderers(channel: string, data: any): void {
    webContents.getAllWebContents().forEach((contents) => {
      if (!contents.isDestroyed()) {
        contents.send(channel, data);
      }
    });
  }

  public getAudioManager(): AudioManager {
    return this.audioManager;
  }
} 