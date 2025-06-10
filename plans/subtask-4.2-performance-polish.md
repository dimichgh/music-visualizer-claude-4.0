# Sub-task 4.2: Performance Polish - Optimization & Final Touches

## Objective
Optimize the entire music visualizer system for maximum performance, implement adaptive quality controls, add final polish features, and ensure smooth operation across different hardware configurations.

## Technical Requirements
- Adaptive quality system based on real-time performance
- Memory management and garbage collection optimization
- GPU performance optimization and fallback systems
- Audio processing optimization and latency reduction
- Background/foreground operation modes
- Error handling and recovery systems
- Final UI polish and animations
- Cross-platform compatibility testing

## Implementation Steps

### Step 1: Performance Monitoring & Adaptive Quality System
Create `src/renderer/performance/adaptive-quality.ts`:
```typescript
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  gpuMemoryUsage?: number;
  audioLatency: number;
  particleCount: number;
  renderCalls: number;
}

export interface QualityProfile {
  name: string;
  particleCount: number;
  bloomEnabled: boolean;
  cosmicEffectsEnabled: boolean;
  avatarsEnabled: boolean;
  shadowsEnabled: boolean;
  antialiasingEnabled: boolean;
  maxRenderDistance: number;
  textureQuality: number;
}

export class AdaptiveQualityManager {
  private currentProfile: QualityProfile;
  private targetFPS: number = 60;
  private performanceHistory: PerformanceMetrics[] = [];
  private lastAdjustmentTime: number = 0;
  private adjustmentCooldown: number = 5000; // 5 seconds
  private isAdaptiveEnabled: boolean = true;

  private qualityProfiles: { [key: string]: QualityProfile } = {
    ultra: {
      name: 'Ultra',
      particleCount: 5000,
      bloomEnabled: true,
      cosmicEffectsEnabled: true,
      avatarsEnabled: true,
      shadowsEnabled: true,
      antialiasingEnabled: true,
      maxRenderDistance: 1000,
      textureQuality: 1.0
    },
    high: {
      name: 'High',
      particleCount: 2500,
      bloomEnabled: true,
      cosmicEffectsEnabled: true,
      avatarsEnabled: true,
      shadowsEnabled: true,
      antialiasingEnabled: true,
      maxRenderDistance: 500,
      textureQuality: 0.8
    },
    medium: {
      name: 'Medium',
      particleCount: 1500,
      bloomEnabled: true,
      cosmicEffectsEnabled: true,
      avatarsEnabled: false,
      shadowsEnabled: false,
      antialiasingEnabled: false,
      maxRenderDistance: 300,
      textureQuality: 0.6
    },
    low: {
      name: 'Low',
      particleCount: 800,
      bloomEnabled: false,
      cosmicEffectsEnabled: false,
      avatarsEnabled: false,
      shadowsEnabled: false,
      antialiasingEnabled: false,
      maxRenderDistance: 200,
      textureQuality: 0.4
    }
  };

  constructor(initialProfile: string = 'high') {
    this.currentProfile = this.qualityProfiles[initialProfile];
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      if (this.isAdaptiveEnabled) {
        this.evaluatePerformance();
      }
    }, 1000);
  }

  public updateMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep only last 10 seconds of history
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }
  }

  private evaluatePerformance(): void {
    if (this.performanceHistory.length < 5) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastAdjustmentTime < this.adjustmentCooldown) return;

    const avgFPS = this.performanceHistory.reduce((sum, m) => sum + m.fps, 0) / this.performanceHistory.length;
    const avgMemory = this.performanceHistory.reduce((sum, m) => sum + m.memoryUsage, 0) / this.performanceHistory.length;

    // Determine if adjustment is needed
    if (avgFPS < this.targetFPS * 0.8) {
      // Performance is poor, reduce quality
      this.downgradeQuality();
    } else if (avgFPS > this.targetFPS * 1.1 && avgMemory < 300) {
      // Performance is good and memory is available, increase quality
      this.upgradeQuality();
    }
  }

  private downgradeQuality(): void {
    const profiles = Object.keys(this.qualityProfiles);
    const currentIndex = profiles.indexOf(this.currentProfile.name.toLowerCase());
    
    if (currentIndex < profiles.length - 1) {
      const newProfile = profiles[currentIndex + 1];
      this.setQualityProfile(newProfile);
      console.log(`Performance: Downgraded to ${newProfile} quality`);
      this.lastAdjustmentTime = Date.now();
    }
  }

  private upgradeQuality(): void {
    const profiles = Object.keys(this.qualityProfiles);
    const currentIndex = profiles.indexOf(this.currentProfile.name.toLowerCase());
    
    if (currentIndex > 0) {
      const newProfile = profiles[currentIndex - 1];
      this.setQualityProfile(newProfile);
      console.log(`Performance: Upgraded to ${newProfile} quality`);
      this.lastAdjustmentTime = Date.now();
    }
  }

  public setQualityProfile(profileName: string): void {
    const profile = this.qualityProfiles[profileName.toLowerCase()];
    if (profile) {
      this.currentProfile = profile;
      this.applyQualitySettings();
    }
  }

  private applyQualitySettings(): void {
    // This would communicate with the main visualizer to apply settings
    const event = new CustomEvent('qualityChanged', {
      detail: this.currentProfile
    });
    document.dispatchEvent(event);
  }

  public getCurrentProfile(): QualityProfile {
    return this.currentProfile;
  }

  public setAdaptiveEnabled(enabled: boolean): void {
    this.isAdaptiveEnabled = enabled;
  }

  public setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }
}
```

### Step 2: Memory Management System
Create `src/renderer/performance/memory-manager.ts`:
```typescript
export class MemoryManager {
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private disposalQueue: Array<{ object: any; timestamp: number }> = [];
  private maxCacheSize: number = 100;
  private disposalDelay: number = 30000; // 30 seconds

  constructor() {
    this.startCleanupRoutine();
    this.monitorMemoryUsage();
  }

  public getCachedGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (!this.geometryCache.has(key)) {
      if (this.geometryCache.size >= this.maxCacheSize) {
        this.evictOldestGeometry();
      }
      this.geometryCache.set(key, factory());
    }
    return this.geometryCache.get(key)!;
  }

  public getCachedMaterial(key: string, factory: () => THREE.Material): THREE.Material {
    if (!this.materialCache.has(key)) {
      if (this.materialCache.size >= this.maxCacheSize) {
        this.evictOldestMaterial();
      }
      this.materialCache.set(key, factory());
    }
    return this.materialCache.get(key)!;
  }

  public getCachedTexture(key: string, factory: () => THREE.Texture): THREE.Texture {
    if (!this.textureCache.has(key)) {
      if (this.textureCache.size >= this.maxCacheSize) {
        this.evictOldestTexture();
      }
      this.textureCache.set(key, factory());
    }
    return this.textureCache.get(key)!;
  }

  public scheduleDisposal(object: any): void {
    this.disposalQueue.push({
      object,
      timestamp: Date.now()
    });
  }

  private startCleanupRoutine(): void {
    setInterval(() => {
      this.cleanupDisposalQueue();
      this.forceGarbageCollection();
    }, 10000); // Every 10 seconds
  }

  private cleanupDisposalQueue(): void {
    const now = Date.now();
    const itemsToDispose = this.disposalQueue.filter(
      item => now - item.timestamp > this.disposalDelay
    );

    itemsToDispose.forEach(item => {
      if (item.object.dispose) {
        item.object.dispose();
      }
    });

    this.disposalQueue = this.disposalQueue.filter(
      item => now - item.timestamp <= this.disposalDelay
    );
  }

  private forceGarbageCollection(): void {
    // Trigger garbage collection if available (Chrome DevTools)
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  private evictOldestGeometry(): void {
    const firstKey = this.geometryCache.keys().next().value;
    const geometry = this.geometryCache.get(firstKey);
    if (geometry) {
      geometry.dispose();
      this.geometryCache.delete(firstKey);
    }
  }

  private evictOldestMaterial(): void {
    const firstKey = this.materialCache.keys().next().value;
    const material = this.materialCache.get(firstKey);
    if (material) {
      material.dispose();
      this.materialCache.delete(firstKey);
    }
  }

  private evictOldestTexture(): void {
    const firstKey = this.textureCache.keys().next().value;
    const texture = this.textureCache.get(firstKey);
    if (texture) {
      texture.dispose();
      this.textureCache.delete(firstKey);
    }
  }

  private monitorMemoryUsage(): void {
    setInterval(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1048576;
        const limitMB = memory.jsHeapSizeLimit / 1048576;
        
        // If memory usage is high, trigger aggressive cleanup
        if (usedMB > limitMB * 0.8) {
          this.performAggressiveCleanup();
        }
      }
    }, 5000);
  }

  private performAggressiveCleanup(): void {
    console.log('Performing aggressive memory cleanup');
    
    // Clear half of each cache
    const geometryKeys = Array.from(this.geometryCache.keys());
    const materialKeys = Array.from(this.materialCache.keys());
    const textureKeys = Array.from(this.textureCache.keys());
    
    geometryKeys.slice(0, Math.floor(geometryKeys.length / 2)).forEach(key => {
      const geometry = this.geometryCache.get(key);
      if (geometry) {
        geometry.dispose();
        this.geometryCache.delete(key);
      }
    });
    
    materialKeys.slice(0, Math.floor(materialKeys.length / 2)).forEach(key => {
      const material = this.materialCache.get(key);
      if (material) {
        material.dispose();
        this.materialCache.delete(key);
      }
    });
    
    textureKeys.slice(0, Math.floor(textureKeys.length / 2)).forEach(key => {
      const texture = this.textureCache.get(key);
      if (texture) {
        texture.dispose();
        this.textureCache.delete(key);
      }
    });
    
    // Force immediate disposal of queued items
    this.disposalQueue.forEach(item => {
      if (item.object.dispose) {
        item.object.dispose();
      }
    });
    this.disposalQueue = [];
    
    this.forceGarbageCollection();
  }

  public clearAllCaches(): void {
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.materialCache.forEach(material => material.dispose());
    this.textureCache.forEach(texture => texture.dispose());
    
    this.geometryCache.clear();
    this.materialCache.clear();
    this.textureCache.clear();
  }

  public getMemoryStats(): any {
    return {
      geometryCache: this.geometryCache.size,
      materialCache: this.materialCache.size,
      textureCache: this.textureCache.size,
      disposalQueue: this.disposalQueue.length,
      jsHeapSize: (performance as any).memory?.usedJSHeapSize || 0
    };
  }
}
```

### Step 3: Audio Processing Optimization
Create `src/main/audio/audio-optimizer.ts`:
```typescript
export class AudioOptimizer {
  private processingBuffer: Float32Array;
  private outputBuffer: Float32Array;
  private bufferSize: number = 2048;
  private sampleRate: number = 48000;
  private latencyTarget: number = 50; // ms
  private adaptiveBuffering: boolean = true;

  constructor() {
    this.processingBuffer = new Float32Array(this.bufferSize);
    this.outputBuffer = new Float32Array(this.bufferSize);
    this.optimizeBufferSize();
  }

  private optimizeBufferSize(): void {
    // Calculate optimal buffer size based on target latency
    const targetBufferSize = Math.pow(2, Math.ceil(
      Math.log2((this.latencyTarget / 1000) * this.sampleRate)
    ));
    
    // Ensure buffer size is within reasonable bounds
    this.bufferSize = Math.max(256, Math.min(4096, targetBufferSize));
    
    console.log(`Optimized audio buffer size: ${this.bufferSize} samples`);
  }

  public processAudioChunk(inputData: Float32Array): Float32Array {
    // Use typed arrays for better performance
    const startTime = performance.now();
    
    // Optimize FFT processing
    this.optimizedFFT(inputData);
    
    const processingTime = performance.now() - startTime;
    
    // Adaptive buffer sizing based on processing time
    if (this.adaptiveBuffering) {
      this.adjustBufferSizeIfNeeded(processingTime);
    }
    
    return this.outputBuffer;
  }

  private optimizedFFT(inputData: Float32Array): void {
    // Use pre-allocated buffers to avoid garbage collection
    const inputLength = Math.min(inputData.length, this.processingBuffer.length);
    
    // Copy input data to processing buffer
    for (let i = 0; i < inputLength; i++) {
      this.processingBuffer[i] = inputData[i];
    }
    
    // Zero-pad if necessary
    for (let i = inputLength; i < this.processingBuffer.length; i++) {
      this.processingBuffer[i] = 0;
    }
    
    // Perform FFT (using existing FFT.js implementation)
    // ... FFT processing code ...
  }

  private adjustBufferSizeIfNeeded(processingTime: number): void {
    const targetProcessingTime = (this.bufferSize / this.sampleRate) * 1000 * 0.5; // 50% of buffer duration
    
    if (processingTime > targetProcessingTime * 1.5) {
      // Processing is too slow, increase buffer size
      const newSize = Math.min(4096, this.bufferSize * 2);
      if (newSize !== this.bufferSize) {
        this.updateBufferSize(newSize);
      }
    } else if (processingTime < targetProcessingTime * 0.3) {
      // Processing is fast, decrease buffer size for lower latency
      const newSize = Math.max(256, this.bufferSize / 2);
      if (newSize !== this.bufferSize) {
        this.updateBufferSize(newSize);
      }
    }
  }

  private updateBufferSize(newSize: number): void {
    this.bufferSize = newSize;
    this.processingBuffer = new Float32Array(this.bufferSize);
    this.outputBuffer = new Float32Array(this.bufferSize);
    console.log(`Adjusted audio buffer size to: ${this.bufferSize} samples`);
  }

  public getLatencyEstimate(): number {
    return (this.bufferSize / this.sampleRate) * 1000; // in milliseconds
  }

  public optimizeForRealtime(): void {
    this.bufferSize = 256; // Minimum latency
    this.updateBufferSize(this.bufferSize);
  }

  public optimizeForQuality(): void {
    this.bufferSize = 2048; // Better quality analysis
    this.updateBufferSize(this.bufferSize);
  }
}
```

### Step 4: Background/Foreground Operation
Create `src/renderer/performance/background-manager.ts`:
```typescript
export class BackgroundManager {
  private isInBackground: boolean = false;
  private backgroundFPS: number = 15;
  private foregroundFPS: number = 60;
  private originalAnimationFrame: any = null;
  private backgroundInterval: any = null;

  constructor() {
    this.setupVisibilityListeners();
  }

  private setupVisibilityListeners(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.enterBackgroundMode();
      } else {
        this.enterForegroundMode();
      }
    });

    window.addEventListener('blur', () => {
      this.enterBackgroundMode();
    });

    window.addEventListener('focus', () => {
      this.enterForegroundMode();
    });
  }

  private enterBackgroundMode(): void {
    if (this.isInBackground) return;
    
    this.isInBackground = true;
    console.log('Entering background mode - reducing performance');
    
    // Reduce animation frame rate
    this.switchToBackgroundRendering();
    
    // Reduce particle counts
    document.dispatchEvent(new CustomEvent('backgroundMode', {
      detail: { active: true }
    }));
  }

  private enterForegroundMode(): void {
    if (!this.isInBackground) return;
    
    this.isInBackground = false;
    console.log('Entering foreground mode - full performance');
    
    // Restore normal animation frame rate
    this.switchToForegroundRendering();
    
    // Restore particle counts
    document.dispatchEvent(new CustomEvent('backgroundMode', {
      detail: { active: false }
    }));
  }

  private switchToBackgroundRendering(): void {
    if (this.backgroundInterval) return;
    
    this.backgroundInterval = setInterval(() => {
      // Trigger a limited render update
      document.dispatchEvent(new CustomEvent('backgroundRender'));
    }, 1000 / this.backgroundFPS);
  }

  private switchToForegroundRendering(): void {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
  }

  public isBackgroundActive(): boolean {
    return this.isInBackground;
  }

  public setBackgroundFPS(fps: number): void {
    this.backgroundFPS = fps;
    if (this.isInBackground) {
      this.switchToForegroundRendering();
      this.switchToBackgroundRendering();
    }
  }
}
```

### Step 5: Error Handling & Recovery System
Create `src/renderer/performance/error-recovery.ts`:
```typescript
export class ErrorRecoverySystem {
  private errorCount: number = 0;
  private maxErrors: number = 5;
  private recoveryStrategies: Array<() => void> = [];
  private lastErrorTime: number = 0;
  private errorResetInterval: number = 60000; // 1 minute

  constructor() {
    this.setupErrorHandlers();
    this.setupRecoveryStrategies();
  }

  private setupErrorHandlers(): void {
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'JavaScript Error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'Unhandled Promise Rejection');
    });

    // WebGL context loss handler
    document.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.handleWebGLContextLoss();
    });

    document.addEventListener('webglcontextrestored', () => {
      this.handleWebGLContextRestored();
    });
  }

  private setupRecoveryStrategies(): void {
    this.recoveryStrategies = [
      () => {
        // Strategy 1: Reduce quality
        console.log('Recovery: Reducing quality settings');
        document.dispatchEvent(new CustomEvent('forceQualityReduction'));
      },
      () => {
        // Strategy 2: Clear caches
        console.log('Recovery: Clearing caches');
        document.dispatchEvent(new CustomEvent('clearAllCaches'));
      },
      () => {
        // Strategy 3: Restart visualization engine
        console.log('Recovery: Restarting visualization engine');
        document.dispatchEvent(new CustomEvent('restartVisualizer'));
      },
      () => {
        // Strategy 4: Fallback to minimal mode
        console.log('Recovery: Switching to fallback mode');
        document.dispatchEvent(new CustomEvent('fallbackMode'));
      },
      () => {
        // Strategy 5: Complete reset
        console.log('Recovery: Complete system reset');
        this.performCompleteReset();
      }
    ];
  }

  private handleError(error: any, type: string): void {
    console.error(`${type}:`, error);
    
    const currentTime = Date.now();
    
    // Reset error count if enough time has passed
    if (currentTime - this.lastErrorTime > this.errorResetInterval) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = currentTime;
    
    // Apply recovery strategy based on error count
    if (this.errorCount <= this.recoveryStrategies.length) {
      const strategy = this.recoveryStrategies[this.errorCount - 1];
      setTimeout(strategy, 1000); // Delay to avoid rapid recovery attempts
    } else {
      // Too many errors, show error message to user
      this.showCriticalErrorMessage();
    }
  }

  private handleWebGLContextLoss(): void {
    console.warn('WebGL context lost - attempting recovery');
    
    // Show user message
    this.showUserMessage('Graphics context lost. Attempting to recover...', 'warning');
    
    // Try to recreate context
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('recreateWebGLContext'));
    }, 2000);
  }

  private handleWebGLContextRestored(): void {
    console.log('WebGL context restored');
    this.showUserMessage('Graphics recovered successfully!', 'success');
    
    // Reinitialize graphics systems
    document.dispatchEvent(new CustomEvent('reinitializeGraphics'));
  }

  private performCompleteReset(): void {
    // Clear all data and restart
    localStorage.removeItem('visualizer-settings');
    localStorage.removeItem('visualizer-presets');
    
    this.showUserMessage('System reset. Refreshing application...', 'info');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  private showCriticalErrorMessage(): void {
    const errorModal = document.createElement('div');
    errorModal.className = 'error-modal';
    errorModal.innerHTML = `
      <div class="error-content">
        <h2>⚠️ Critical Error</h2>
        <p>The visualizer has encountered multiple errors and cannot continue safely.</p>
        <p>Please refresh the application to restart.</p>
        <button onclick="window.location.reload()">Refresh Application</button>
      </div>
    `;
    
    document.body.appendChild(errorModal);
  }

  private showUserMessage(message: string, type: 'info' | 'warning' | 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  public reset(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  public getErrorCount(): number {
    return this.errorCount;
  }
}
```

### Step 6: Final Integration and Polish
Update main visualizer to use all optimization systems:
```typescript
// In src/renderer/visualizers/music-visualizer.ts
export class MusicVisualizer {
  private adaptiveQuality: AdaptiveQualityManager;
  private memoryManager: MemoryManager;
  private backgroundManager: BackgroundManager;
  private errorRecovery: ErrorRecoverySystem;

  constructor(container: HTMLElement) {
    // ... existing initialization ...
    
    // Initialize performance systems
    this.adaptiveQuality = new AdaptiveQualityManager('high');
    this.memoryManager = new MemoryManager();
    this.backgroundManager = new BackgroundManager();
    this.errorRecovery = new ErrorRecoverySystem();
    
    this.setupPerformanceEventListeners();
  }

  private setupPerformanceEventListeners(): void {
    document.addEventListener('qualityChanged', (event: any) => {
      this.applyQualityProfile(event.detail);
    });

    document.addEventListener('backgroundMode', (event: any) => {
      this.setBackgroundMode(event.detail.active);
    });

    document.addEventListener('clearAllCaches', () => {
      this.memoryManager.clearAllCaches();
    });
  }

  private updatePerformanceMetrics(): void {
    const metrics: PerformanceMetrics = {
      fps: this.getCurrentFPS(),
      frameTime: this.getLastFrameTime(),
      memoryUsage: this.getMemoryUsage(),
      audioLatency: this.getAudioLatency(),
      particleCount: this.getTotalParticleCount(),
      renderCalls: this.getRenderCallCount()
    };
    
    this.adaptiveQuality.updateMetrics(metrics);
  }

  private applyQualityProfile(profile: QualityProfile): void {
    // Apply all quality settings to visualization systems
    this.particleSystems.forEach(system => {
      system.setParticleCount(profile.particleCount / this.particleSystems.length);
    });
    
    // Enable/disable effects based on profile
    if (this.cosmicEffects) {
      this.cosmicEffects.setEnabled(profile.cosmicEffectsEnabled);
    }
    
    if (this.avatarManager) {
      this.avatarManager.setEnabled(profile.avatarsEnabled);
    }
  }
}
```

## Final CSS Polish
Add final styling touches:
```css
/* Performance optimized animations */
.settings-panel, .performance-monitor, .file-drop-zone {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU acceleration */
}

/* Error notifications */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 4000;
  animation: slideIn 0.3s ease;
}

.notification.info { background: rgba(52, 152, 219, 0.9); }
.notification.warning { background: rgba(243, 156, 18, 0.9); }
.notification.success { background: rgba(46, 204, 113, 0.9); }
.notification.error { background: rgba(231, 76, 60, 0.9); }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Critical error modal */
.error-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.error-content {
  background: rgba(231, 76, 60, 0.1);
  border: 2px solid #e74c3c;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  max-width: 400px;
}
```

## Acceptance Criteria
- [ ] **Adaptive Quality**: Automatically adjusts settings based on performance
- [ ] **Memory Management**: Efficient caching and garbage collection
- [ ] **Audio Optimization**: < 50ms latency with adaptive buffering
- [ ] **Background Mode**: Reduced performance when not in focus
- [ ] **Error Recovery**: Graceful handling of errors with recovery strategies
- [ ] **Performance Metrics**: Real-time monitoring of all systems
- [ ] **Cross-platform**: Works on different operating systems
- [ ] **Stability**: No memory leaks during extended operation
- [ ] **User Experience**: Smooth operation with minimal stuttering

## Status Tracking
- [ ] **TODO**: Implement all optimization systems
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified on different hardware configurations

## Final Deliverables
Upon completion, the music visualizer will be a fully-featured, production-ready application with:
- Real-time 3D cosmic visualization
- Advanced audio analysis and instrument detection
- Ethereal avatar system
- Comprehensive user controls
- Adaptive performance optimization
- Professional-grade stability and error handling 