import { BrowserWindow } from 'electron';
import * as path from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  public createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
    });

    const indexPath = path.join(__dirname, 'index.html');
    this.mainWindow.loadFile(indexPath);

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
