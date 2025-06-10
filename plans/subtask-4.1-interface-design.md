# Sub-task 4.1: Interface Design - Advanced User Controls

## Objective
Create a comprehensive user interface with settings panels, visualization customization options, preset management, and advanced controls for the music visualizer experience.

## Technical Requirements
- Modern, intuitive UI with cosmic theme consistency
- Real-time settings adjustment without restart
- Preset system for different visualization styles
- Audio source management and file browser
- Performance monitoring and optimization controls
- Export functionality for screenshots/videos
- Responsive design for different window sizes
- Keyboard shortcuts and hotkey support

## Implementation Steps

### Step 1: Settings Panel System
Create `src/renderer/ui/settings-panel.ts`:
```typescript
export interface VisualizationSettings {
  // Particle System Settings
  particleCount: number;
  particleSize: number;
  particleSpeed: number;
  
  // Audio Sensitivity
  bassBoost: number;
  midBoost: number;
  trebleBoost: number;
  beatSensitivity: number;
  
  // Visual Effects
  bloomIntensity: number;
  cosmicEffectsEnabled: boolean;
  avatarsEnabled: boolean;
  nebulaeIntensity: number;
  portalThreshold: number;
  
  // Camera Settings
  cameraMovement: boolean;
  cameraSpeed: number;
  fov: number;
  autoRotate: boolean;
  
  // Color Scheme
  colorPalette: string;
  keyColorMapping: boolean;
  customColors: string[];
  
  // Performance
  quality: 'low' | 'medium' | 'high' | 'ultra';
  targetFPS: number;
  adaptiveQuality: boolean;
}

export class SettingsPanel {
  private panel: HTMLElement;
  private sections: Map<string, HTMLElement> = new Map();
  private settings: VisualizationSettings;
  private onSettingsChange: (settings: VisualizationSettings) => void;

  constructor(onSettingsChange: (settings: VisualizationSettings) => void) {
    this.onSettingsChange = onSettingsChange;
    this.settings = this.getDefaultSettings();
    this.createPanel();
    this.setupEventListeners();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'settings-panel';
    this.panel.innerHTML = `
      <div class="settings-header">
        <h2>🌌 Visualization Settings</h2>
        <button class="close-btn" id="close-settings">×</button>
      </div>
      
      <div class="settings-content">
        <div class="settings-section" id="audio-section">
          <h3>🎵 Audio Settings</h3>
          <div class="setting-group">
            <label>Bass Boost: <span id="bass-value">1.0</span></label>
            <input type="range" id="bass-boost" min="0.1" max="3.0" step="0.1" value="1.0">
          </div>
          <div class="setting-group">
            <label>Mid Boost: <span id="mid-value">1.0</span></label>
            <input type="range" id="mid-boost" min="0.1" max="3.0" step="0.1" value="1.0">
          </div>
          <div class="setting-group">
            <label>Treble Boost: <span id="treble-value">1.0</span></label>
            <input type="range" id="treble-boost" min="0.1" max="3.0" step="0.1" value="1.0">
          </div>
          <div class="setting-group">
            <label>Beat Sensitivity: <span id="beat-value">1.0</span></label>
            <input type="range" id="beat-sensitivity" min="0.1" max="2.0" step="0.1" value="1.0">
          </div>
        </div>

        <div class="settings-section" id="visual-section">
          <h3>✨ Visual Effects</h3>
          <div class="setting-group">
            <label>Particle Count: <span id="particle-count-value">1450</span></label>
            <input type="range" id="particle-count" min="500" max="5000" step="50" value="1450">
          </div>
          <div class="setting-group">
            <label>Bloom Intensity: <span id="bloom-value">1.5</span></label>
            <input type="range" id="bloom-intensity" min="0.0" max="3.0" step="0.1" value="1.5">
          </div>
          <div class="setting-group">
            <label>
              <input type="checkbox" id="cosmic-effects" checked>
              Cosmic Effects (Nebulae, Portals)
            </label>
          </div>
          <div class="setting-group">
            <label>
              <input type="checkbox" id="avatars-enabled" checked>
              Musical Avatars
            </label>
          </div>
        </div>

        <div class="settings-section" id="camera-section">
          <h3>📷 Camera Settings</h3>
          <div class="setting-group">
            <label>
              <input type="checkbox" id="camera-movement" checked>
              Auto Camera Movement
            </label>
          </div>
          <div class="setting-group">
            <label>Camera Speed: <span id="camera-speed-value">1.0</span></label>
            <input type="range" id="camera-speed" min="0.1" max="3.0" step="0.1" value="1.0">
          </div>
          <div class="setting-group">
            <label>Field of View: <span id="fov-value">75</span></label>
            <input type="range" id="fov" min="45" max="120" step="5" value="75">
          </div>
        </div>

        <div class="settings-section" id="color-section">
          <h3>🎨 Color Settings</h3>
          <div class="setting-group">
            <label>Color Palette:</label>
            <select id="color-palette">
              <option value="cosmic">Cosmic (Default)</option>
              <option value="neon">Neon Synthwave</option>
              <option value="warm">Warm Sunset</option>
              <option value="cool">Cool Ocean</option>
              <option value="rainbow">Rainbow Spectrum</option>
              <option value="monochrome">Monochrome</option>
              <option value="custom">Custom Colors</option>
            </select>
          </div>
          <div class="setting-group" id="custom-colors" style="display: none;">
            <label>Custom Color 1: <input type="color" id="color1" value="#ff6b6b"></label>
            <label>Custom Color 2: <input type="color" id="color2" value="#4ecdc4"></label>
            <label>Custom Color 3: <input type="color" id="color3" value="#45b7d1"></label>
          </div>
          <div class="setting-group">
            <label>
              <input type="checkbox" id="key-color-mapping" checked>
              Musical Key → Color Mapping
            </label>
          </div>
        </div>

        <div class="settings-section" id="performance-section">
          <h3>⚡ Performance</h3>
          <div class="setting-group">
            <label>Quality Preset:</label>
            <select id="quality-preset">
              <option value="low">Low (30 FPS)</option>
              <option value="medium">Medium (45 FPS)</option>
              <option value="high" selected>High (60 FPS)</option>
              <option value="ultra">Ultra (90+ FPS)</option>
            </select>
          </div>
          <div class="setting-group">
            <label>
              <input type="checkbox" id="adaptive-quality" checked>
              Adaptive Quality (Auto-adjust for performance)
            </label>
          </div>
          <div class="setting-group">
            <label>Target FPS: <span id="target-fps-value">60</span></label>
            <input type="range" id="target-fps" min="30" max="120" step="10" value="60">
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button class="preset-btn" id="save-preset">Save Preset</button>
        <button class="preset-btn" id="load-preset">Load Preset</button>
        <button class="preset-btn" id="reset-settings">Reset to Default</button>
      </div>
    `;

    document.body.appendChild(this.panel);
  }

  private setupEventListeners(): void {
    // Audio settings
    this.addSliderListener('bass-boost', 'bassBoost', 'bass-value');
    this.addSliderListener('mid-boost', 'midBoost', 'mid-value');
    this.addSliderListener('treble-boost', 'trebleBoost', 'treble-value');
    this.addSliderListener('beat-sensitivity', 'beatSensitivity', 'beat-value');

    // Visual settings
    this.addSliderListener('particle-count', 'particleCount', 'particle-count-value');
    this.addSliderListener('bloom-intensity', 'bloomIntensity', 'bloom-value');
    this.addCheckboxListener('cosmic-effects', 'cosmicEffectsEnabled');
    this.addCheckboxListener('avatars-enabled', 'avatarsEnabled');

    // Camera settings
    this.addCheckboxListener('camera-movement', 'cameraMovement');
    this.addSliderListener('camera-speed', 'cameraSpeed', 'camera-speed-value');
    this.addSliderListener('fov', 'fov', 'fov-value');

    // Color settings
    this.addSelectListener('color-palette', 'colorPalette');
    this.addCheckboxListener('key-color-mapping', 'keyColorMapping');

    // Performance settings
    this.addSelectListener('quality-preset', 'quality');
    this.addCheckboxListener('adaptive-quality', 'adaptiveQuality');
    this.addSliderListener('target-fps', 'targetFPS', 'target-fps-value');

    // Color palette change handler
    document.getElementById('color-palette')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      const customColors = document.getElementById('custom-colors');
      if (customColors) {
        customColors.style.display = value === 'custom' ? 'block' : 'none';
      }
    });

    // Panel controls
    document.getElementById('close-settings')?.addEventListener('click', () => {
      this.hide();
    });

    document.getElementById('save-preset')?.addEventListener('click', () => {
      this.savePreset();
    });

    document.getElementById('load-preset')?.addEventListener('click', () => {
      this.loadPresetDialog();
    });

    document.getElementById('reset-settings')?.addEventListener('click', () => {
      this.resetToDefault();
    });
  }

  private addSliderListener(elementId: string, settingKey: keyof VisualizationSettings, valueDisplayId: string): void {
    const slider = document.getElementById(elementId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueDisplayId);

    slider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      (this.settings[settingKey] as number) = value;
      if (valueDisplay) {
        valueDisplay.textContent = value.toString();
      }
      this.onSettingsChange(this.settings);
    });
  }

  private addCheckboxListener(elementId: string, settingKey: keyof VisualizationSettings): void {
    const checkbox = document.getElementById(elementId) as HTMLInputElement;
    checkbox?.addEventListener('change', (e) => {
      (this.settings[settingKey] as boolean) = (e.target as HTMLInputElement).checked;
      this.onSettingsChange(this.settings);
    });
  }

  private addSelectListener(elementId: string, settingKey: keyof VisualizationSettings): void {
    const select = document.getElementById(elementId) as HTMLSelectElement;
    select?.addEventListener('change', (e) => {
      (this.settings[settingKey] as string) = (e.target as HTMLSelectElement).value;
      this.onSettingsChange(this.settings);
    });
  }

  public show(): void {
    this.panel.classList.add('visible');
  }

  public hide(): void {
    this.panel.classList.remove('visible');
  }

  public toggle(): void {
    this.panel.classList.contains('visible') ? this.hide() : this.show();
  }

  private getDefaultSettings(): VisualizationSettings {
    return {
      particleCount: 1450,
      particleSize: 2,
      particleSpeed: 1.0,
      bassBoost: 1.0,
      midBoost: 1.0,
      trebleBoost: 1.0,
      beatSensitivity: 1.0,
      bloomIntensity: 1.5,
      cosmicEffectsEnabled: true,
      avatarsEnabled: true,
      nebulaeIntensity: 1.0,
      portalThreshold: 0.8,
      cameraMovement: true,
      cameraSpeed: 1.0,
      fov: 75,
      autoRotate: true,
      colorPalette: 'cosmic',
      keyColorMapping: true,
      customColors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
      quality: 'high',
      targetFPS: 60,
      adaptiveQuality: true
    };
  }
}
```

### Step 2: Preset Management System
Create `src/renderer/ui/preset-manager.ts`:
```typescript
export interface VisualizationPreset {
  name: string;
  description: string;
  settings: VisualizationSettings;
  thumbnail?: string;
  author?: string;
  created: Date;
}

export class PresetManager {
  private presets: Map<string, VisualizationPreset> = new Map();
  private currentPreset: string | null = null;

  constructor() {
    this.loadBuiltInPresets();
    this.loadUserPresets();
  }

  private loadBuiltInPresets(): void {
    const builtInPresets: VisualizationPreset[] = [
      {
        name: 'Cosmic Journey',
        description: 'Default cosmic experience with all effects',
        settings: {
          particleCount: 1450,
          bassBoost: 1.0,
          midBoost: 1.0,
          trebleBoost: 1.0,
          cosmicEffectsEnabled: true,
          avatarsEnabled: true,
          colorPalette: 'cosmic',
          quality: 'high'
        } as VisualizationSettings,
        author: 'System',
        created: new Date()
      },
      {
        name: 'Neon Dreams',
        description: 'Synthwave-inspired neon visualization',
        settings: {
          particleCount: 2000,
          bassBoost: 1.5,
          midBoost: 0.8,
          trebleBoost: 1.2,
          cosmicEffectsEnabled: true,
          avatarsEnabled: false,
          colorPalette: 'neon',
          bloomIntensity: 2.5,
          quality: 'high'
        } as VisualizationSettings,
        author: 'System',
        created: new Date()
      },
      {
        name: 'Minimal Zen',
        description: 'Clean, minimalist visualization',
        settings: {
          particleCount: 500,
          bassBoost: 0.7,
          midBoost: 1.0,
          trebleBoost: 0.8,
          cosmicEffectsEnabled: false,
          avatarsEnabled: false,
          colorPalette: 'monochrome',
          cameraMovement: false,
          quality: 'medium'
        } as VisualizationSettings,
        author: 'System',
        created: new Date()
      },
      {
        name: 'Performance Mode',
        description: 'Optimized for lower-end hardware',
        settings: {
          particleCount: 800,
          bassBoost: 1.0,
          midBoost: 1.0,
          trebleBoost: 1.0,
          cosmicEffectsEnabled: false,
          avatarsEnabled: false,
          bloomIntensity: 1.0,
          quality: 'low',
          targetFPS: 30,
          adaptiveQuality: true
        } as VisualizationSettings,
        author: 'System',
        created: new Date()
      },
      {
        name: 'Maximum Spectacle',
        description: 'All effects enabled for powerful hardware',
        settings: {
          particleCount: 5000,
          bassBoost: 1.8,
          midBoost: 1.5,
          trebleBoost: 1.3,
          cosmicEffectsEnabled: true,
          avatarsEnabled: true,
          bloomIntensity: 3.0,
          nebulaeIntensity: 1.5,
          quality: 'ultra',
          targetFPS: 90
        } as VisualizationSettings,
        author: 'System',
        created: new Date()
      }
    ];

    builtInPresets.forEach(preset => {
      this.presets.set(preset.name, preset);
    });
  }

  public savePreset(name: string, description: string, settings: VisualizationSettings): void {
    const preset: VisualizationPreset = {
      name,
      description,
      settings: { ...settings },
      author: 'User',
      created: new Date()
    };

    this.presets.set(name, preset);
    this.saveUserPresets();
  }

  public loadPreset(name: string): VisualizationSettings | null {
    const preset = this.presets.get(name);
    if (preset) {
      this.currentPreset = name;
      return { ...preset.settings };
    }
    return null;
  }

  public getAllPresets(): VisualizationPreset[] {
    return Array.from(this.presets.values());
  }

  private saveUserPresets(): void {
    const userPresets = Array.from(this.presets.values())
      .filter(preset => preset.author === 'User');
    
    localStorage.setItem('visualizer-presets', JSON.stringify(userPresets));
  }

  private loadUserPresets(): void {
    const saved = localStorage.getItem('visualizer-presets');
    if (saved) {
      try {
        const userPresets: VisualizationPreset[] = JSON.parse(saved);
        userPresets.forEach(preset => {
          this.presets.set(preset.name, preset);
        });
      } catch (error) {
        console.error('Failed to load user presets:', error);
      }
    }
  }
}
```

### Step 3: Performance Monitor
Create `src/renderer/ui/performance-monitor.ts`:
```typescript
export class PerformanceMonitor {
  private fpsDisplay: HTMLElement;
  private memoryDisplay: HTMLElement;
  private particleDisplay: HTMLElement;
  private fpsHistory: number[] = [];
  private memoryHistory: number[] = [];
  private lastTime: number = 0;
  private frameCount: number = 0;

  constructor() {
    this.createMonitorUI();
    this.startMonitoring();
  }

  private createMonitorUI(): void {
    const monitor = document.createElement('div');
    monitor.className = 'performance-monitor';
    monitor.innerHTML = `
      <div class="perf-item">
        <span class="perf-label">FPS:</span>
        <span class="perf-value" id="fps-display">60</span>
      </div>
      <div class="perf-item">
        <span class="perf-label">Memory:</span>
        <span class="perf-value" id="memory-display">0 MB</span>
      </div>
      <div class="perf-item">
        <span class="perf-label">Particles:</span>
        <span class="perf-value" id="particle-display">1450</span>
      </div>
      <div class="perf-graph" id="fps-graph"></div>
    `;

    document.body.appendChild(monitor);

    this.fpsDisplay = document.getElementById('fps-display')!;
    this.memoryDisplay = document.getElementById('memory-display')!;
    this.particleDisplay = document.getElementById('particle-display')!;
  }

  private startMonitoring(): void {
    const updatePerformance = (currentTime: number) => {
      this.frameCount++;
      
      if (currentTime - this.lastTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
        this.updateFPS(fps);
        
        this.frameCount = 0;
        this.lastTime = currentTime;
        
        // Update memory usage
        if ((performance as any).memory) {
          const memory = (performance as any).memory;
          const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
          this.updateMemory(usedMB);
        }
      }
      
      requestAnimationFrame(updatePerformance);
    };
    
    requestAnimationFrame(updatePerformance);
  }

  private updateFPS(fps: number): void {
    this.fpsDisplay.textContent = fps.toString();
    
    // Update FPS history for graph
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
    
    // Color code based on performance
    this.fpsDisplay.className = 'perf-value';
    if (fps < 30) {
      this.fpsDisplay.classList.add('perf-poor');
    } else if (fps < 45) {
      this.fpsDisplay.classList.add('perf-fair');
    } else {
      this.fpsDisplay.classList.add('perf-good');
    }
  }

  private updateMemory(memory: number): void {
    this.memoryDisplay.textContent = `${memory} MB`;
    
    // Warn if memory usage is high
    if (memory > 500) {
      this.memoryDisplay.classList.add('perf-warning');
    } else {
      this.memoryDisplay.classList.remove('perf-warning');
    }
  }

  public updateParticleCount(count: number): void {
    this.particleDisplay.textContent = count.toString();
  }

  public show(): void {
    const monitor = document.querySelector('.performance-monitor') as HTMLElement;
    if (monitor) {
      monitor.style.display = 'block';
    }
  }

  public hide(): void {
    const monitor = document.querySelector('.performance-monitor') as HTMLElement;
    if (monitor) {
      monitor.style.display = 'none';
    }
  }
}
```

### Step 4: Hotkey System
Create `src/renderer/ui/hotkey-manager.ts`:
```typescript
export class HotkeyManager {
  private shortcuts: Map<string, () => void> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    this.setupDefaultShortcuts();
    this.bindEventListeners();
  }

  private setupDefaultShortcuts(): void {
    this.shortcuts.set('Space', () => {
      // Toggle play/pause
      window.electronAPI?.audio.pause();
    });

    this.shortcuts.set('KeyS', () => {
      // Toggle settings panel
      const settingsPanel = document.querySelector('.settings-panel');
      if (settingsPanel) {
        settingsPanel.classList.toggle('visible');
      }
    });

    this.shortcuts.set('KeyP', () => {
      // Toggle performance monitor
      const perfMonitor = document.querySelector('.performance-monitor') as HTMLElement;
      if (perfMonitor) {
        perfMonitor.style.display = perfMonitor.style.display === 'none' ? 'block' : 'none';
      }
    });

    this.shortcuts.set('KeyF', () => {
      // Toggle fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    });

    this.shortcuts.set('KeyR', () => {
      // Reset camera position
      // This would call a method on the visualizer
    });

    this.shortcuts.set('Digit1', () => {
      // Load preset 1
      this.loadPresetByIndex(0);
    });

    this.shortcuts.set('Digit2', () => {
      // Load preset 2
      this.loadPresetByIndex(1);
    });

    // ... more number shortcuts for presets
  }

  private bindEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isEnabled) return;
      
      // Don't trigger shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const shortcut = this.shortcuts.get(event.code);
      if (shortcut) {
        event.preventDefault();
        shortcut();
      }
    });
  }

  public addShortcut(key: string, callback: () => void): void {
    this.shortcuts.set(key, callback);
  }

  public removeShortcut(key: string): void {
    this.shortcuts.delete(key);
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  private loadPresetByIndex(index: number): void {
    // This would interface with the preset manager
    console.log(`Loading preset ${index + 1}`);
  }
}
```

### Step 5: File Browser and Export System
Create `src/renderer/ui/file-manager.ts`:
```typescript
export class FileManager {
  private supportedFormats: string[] = ['.wav', '.mp3', '.flac', '.ogg'];
  private recentFiles: string[] = [];

  constructor() {
    this.loadRecentFiles();
    this.createFileDropZone();
  }

  private createFileDropZone(): void {
    const dropZone = document.createElement('div');
    dropZone.className = 'file-drop-zone';
    dropZone.innerHTML = `
      <div class="drop-content">
        <h3>🎵 Drop Audio Files Here</h3>
        <p>Supported formats: WAV, MP3, FLAC, OGG</p>
        <button class="browse-btn" id="browse-files">Browse Files</button>
      </div>
    `;

    document.body.appendChild(dropZone);

    // Setup drag and drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer?.files || []);
      this.handleFileSelection(files);
    });

    // Browse button
    document.getElementById('browse-files')?.addEventListener('click', async () => {
      const result = await window.electronAPI.openFileDialog();
      if (result.success && !result.canceled) {
        this.loadAudioFile(result.filePath);
      }
    });
  }

  private handleFileSelection(files: File[]): void {
    const audioFiles = files.filter(file => 
      this.supportedFormats.some(format => 
        file.name.toLowerCase().endsWith(format)
      )
    );

    if (audioFiles.length > 0) {
      // For now, load the first audio file
      const file = audioFiles[0];
      this.loadAudioFile(file.path || file.name);
    }
  }

  private async loadAudioFile(filePath: string): Promise<void> {
    try {
      const result = await window.electronAPI.audio.loadFile(filePath);
      if (result.success) {
        this.addToRecentFiles(filePath);
        this.hideDropZone();
      }
    } catch (error) {
      console.error('Failed to load audio file:', error);
    }
  }

  private addToRecentFiles(filePath: string): void {
    // Remove if already exists
    this.recentFiles = this.recentFiles.filter(f => f !== filePath);
    
    // Add to beginning
    this.recentFiles.unshift(filePath);
    
    // Keep only last 10
    if (this.recentFiles.length > 10) {
      this.recentFiles = this.recentFiles.slice(0, 10);
    }
    
    this.saveRecentFiles();
  }

  private loadRecentFiles(): void {
    const saved = localStorage.getItem('recent-audio-files');
    if (saved) {
      try {
        this.recentFiles = JSON.parse(saved);
      } catch (error) {
        this.recentFiles = [];
      }
    }
  }

  private saveRecentFiles(): void {
    localStorage.setItem('recent-audio-files', JSON.stringify(this.recentFiles));
  }

  private hideDropZone(): void {
    const dropZone = document.querySelector('.file-drop-zone') as HTMLElement;
    if (dropZone) {
      dropZone.style.display = 'none';
    }
  }

  public showDropZone(): void {
    const dropZone = document.querySelector('.file-drop-zone') as HTMLElement;
    if (dropZone) {
      dropZone.style.display = 'flex';
    }
  }

  public exportScreenshot(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `cosmic-visualizer-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  }

  public startVideoRecording(): void {
    // This would require additional implementation for video recording
    // Using MediaRecorder API with canvas stream
    console.log('Video recording feature to be implemented');
  }
}
```

## CSS Styling for UI Components
Update `src/renderer/styles/main.css` with UI styles:
```css
/* Settings Panel */
.settings-panel {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  transition: right 0.3s ease;
  z-index: 2000;
  overflow-y: auto;
}

.settings-panel.visible {
  right: 0;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-section {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-group {
  margin-bottom: 15px;
}

.setting-group label {
  display: block;
  margin-bottom: 5px;
  color: #fff;
  font-size: 14px;
}

.setting-group input[type="range"] {
  width: 100%;
  margin-top: 5px;
}

/* Performance Monitor */
.performance-monitor {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
}

.perf-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.perf-value.perf-good { color: #4ecdc4; }
.perf-value.perf-fair { color: #f39c12; }
.perf-value.perf-poor { color: #e74c3c; }

/* File Drop Zone */
.file-drop-zone {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.file-drop-zone.drag-over {
  background: rgba(78, 205, 196, 0.2);
}

.drop-content {
  text-align: center;
  padding: 40px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
}
```

## Acceptance Criteria
- [ ] **Comprehensive Settings**: 20+ customizable parameters
- [ ] **Real-time Updates**: Settings apply immediately without restart
- [ ] **Preset System**: Built-in presets + custom preset saving
- [ ] **Performance Monitor**: Real-time FPS, memory, particle count display
- [ ] **Hotkey Support**: Keyboard shortcuts for common actions
- [ ] **File Management**: Drag & drop, recent files, file browser
- [ ] **Export Features**: Screenshot export functionality
- [ ] **Responsive Design**: Works on different window sizes
- [ ] **Persistence**: Settings and presets saved between sessions

## Status Tracking
- [ ] **TODO**: Implement all UI components
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified across different use cases

## Dependencies for Next Sub-task
This provides the user interface foundation for Sub-task 4.2 (Performance Polish), which will optimize the overall system performance and add final touches. 