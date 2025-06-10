export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pauseTime = 0;
  private currentTime = 0;
  private duration = 0;
  private onAudioDataCallback: ((audioData: Float32Array) => void) | null = null;
  private onAudioEndedCallback: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private isManualStop = false; // Flag to distinguish manual stop from natural ending

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      console.log('Audio context created:', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      });
      
      // Create analyzer node for visualization
      this.analyzerNode = this.audioContext.createAnalyser();
      this.analyzerNode.fftSize = 2048;
      this.analyzerNode.smoothingTimeConstant = 0.3;
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      
      // IMPORTANT: Connect analyzer -> gain -> destination for actual audio output
      this.analyzerNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('Audio nodes connected successfully:', {
        analyzerNode: !!this.analyzerNode,
        gainNode: !!this.gainNode,
        destination: !!this.audioContext.destination
      });
      
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw error;
    }
  }

  public async loadAudioFile(arrayBuffer: ArrayBuffer): Promise<void> {
    console.log('Loading audio file, buffer size:', arrayBuffer.byteLength);
    
    if (!this.audioContext) {
      console.log('No audio context, initializing...');
      await this.initializeAudioContext();
    }

    try {
      if (this.audioContext) {
        console.log('Decoding audio data...');
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.duration = this.audioBuffer.duration;
        this.currentTime = 0;
        this.pauseTime = 0; // Reset pause time for new audio file
        console.log(`Audio loaded successfully: ${this.duration.toFixed(2)}s duration, ${this.audioBuffer.sampleRate}Hz, ${this.audioBuffer.numberOfChannels} channels`);
      }
    } catch (error) {
      console.error('Failed to decode audio data:', error);
      throw error;
    }
  }

  public async play(): Promise<void> {
    console.log('AudioPlayer.play() called', {
      hasAudioContext: !!this.audioContext,
      hasAudioBuffer: !!this.audioBuffer,
      isCurrentlyPlaying: this.isPlaying,
      audioContextState: this.audioContext?.state
    });

    if (!this.audioContext || !this.audioBuffer) {
      console.error('Missing audio context or buffer');
      return;
    }
    
    if (this.isPlaying) {
      console.log('Already playing, ignoring play request');
      return;
    }

    try {
      // Resume audio context if suspended (required by browsers for user interaction)
      if (this.audioContext.state === 'suspended') {
        console.log('Resuming suspended audio context');
        await this.audioContext.resume();
        console.log('Audio context resumed, state:', this.audioContext.state);
      }

      // Create new source node
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      
      // CRITICAL: Connect source to analyzer (which is already connected to speakers)
      this.sourceNode.connect(this.analyzerNode!);
      
      console.log('Audio source connected to analyzer');
      
      // Handle playback end
      this.sourceNode.onended = () => {
        console.log('Audio source ended, isManualStop:', this.isManualStop);
        if (!this.isManualStop) {
          // Only call stop and callback if this was a natural ending, not a manual pause
          console.log('Audio playback ended naturally');
          this.stop();
          if (this.onAudioEndedCallback) {
            this.onAudioEndedCallback();
          }
        } else {
          // Reset the flag for next time
          this.isManualStop = false;
        }
      };

      // Calculate start offset for resume/seek functionality
      // Use pauseTime if it's set (either from pause or seek), otherwise start from beginning
      const offset = this.pauseTime;
      console.log('Starting audio source with offset:', offset, {
        pauseTime: this.pauseTime,
        isPaused: this.isPaused,
        audioContextTime: this.audioContext.currentTime,
        willStartFrom: offset
      });
      
      // Start the audio source
      this.sourceNode.start(0, offset);
      
      this.startTime = this.audioContext.currentTime - offset;
      this.isPlaying = true;
      this.isPaused = false;
      
      // Start audio analysis loop
      this.startAudioAnalysis();
      
      console.log('Audio playback started successfully', {
        startTime: this.startTime,
        currentTime: this.audioContext.currentTime
      });
      
    } catch (error) {
      console.error('Failed to start audio playback:', error);
      throw error;
    }
  }

  public pause(): void {
    if (!this.isPlaying || !this.sourceNode || !this.audioContext) return;

    // Calculate the current playback position
    const currentPlaybackTime = this.audioContext.currentTime - this.startTime;
    this.pauseTime = currentPlaybackTime;
    
    console.log('Pausing audio:', {
      audioContextTime: this.audioContext.currentTime,
      startTime: this.startTime,
      calculatedPauseTime: currentPlaybackTime,
      previousPauseTime: this.pauseTime
    });
    
    // Set flag to indicate this is a manual stop, not a natural ending
    this.isManualStop = true;
    this.sourceNode.stop();
    this.sourceNode = null;
    this.isPlaying = false;
    this.isPaused = true;
    this.stopAudioAnalysis();
    
    console.log('Audio playback paused at position:', this.pauseTime);
  }

  public stop(): void {
    if (this.sourceNode) {
      // Set flag to indicate this is a manual stop
      this.isManualStop = true;
      this.sourceNode.stop();
      this.sourceNode = null;
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseTime = 0;
    this.currentTime = 0;
    this.stopAudioAnalysis();
    
    console.log('Audio playback stopped');
  }

  public seek(timeInSeconds: number): void {
    const wasPlaying = this.isPlaying;
    
    if (this.isPlaying) {
      this.pause();
    }
    
    this.pauseTime = Math.max(0, Math.min(timeInSeconds, this.duration));
    this.currentTime = this.pauseTime;
    
    // Set isPaused to true when seeking to maintain the seek position
    if (!wasPlaying) {
      this.isPaused = true;
    }
    
    console.log('Seek completed:', {
      seekTime: timeInSeconds,
      actualTime: this.pauseTime,
      wasPlaying,
      isPaused: this.isPaused
    });
    
    if (wasPlaying) {
      this.play();
    }
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public getCurrentTime(): number {
    if (this.isPlaying && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  public getDuration(): number {
    return this.duration;
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public onAudioData(callback: (audioData: Float32Array) => void): void {
    this.onAudioDataCallback = callback;
  }

  public onAudioEnded(callback: () => void): void {
    this.onAudioEndedCallback = callback;
  }

  private startAudioAnalysis(): void {
    if (!this.analyzerNode) return;

    const bufferLength = this.analyzerNode.frequencyBinCount;
    const audioData = new Float32Array(bufferLength);

    const analyze = () => {
      if (!this.isPlaying || !this.analyzerNode) return;

      // Get time domain data for waveform analysis
      this.analyzerNode.getFloatTimeDomainData(audioData);
      
      // Get frequency domain data for spectral analysis
      const frequencyData = new Float32Array(bufferLength);
      this.analyzerNode.getFloatFrequencyData(frequencyData);
      
      // Update current time
      this.currentTime = this.getCurrentTime();
      
      // Send audio data to callback for visualization
      if (this.onAudioDataCallback) {
        console.log('Audio analysis data:', {
          timeDataSample: audioData.slice(0, 5),
          freqDataSample: frequencyData.slice(0, 5),
          isPlaying: this.isPlaying
        });
        this.onAudioDataCallback(audioData);
      }
      
      // Continue analysis loop
      this.animationFrameId = requestAnimationFrame(analyze);
    };

    console.log('Starting audio analysis loop');
    analyze();
  }

  private stopAudioAnalysis(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getFrequencyData(): Float32Array | null {
    if (!this.analyzerNode || !this.isPlaying) return null;
    
    const bufferLength = this.analyzerNode.frequencyBinCount;
    const frequencyData = new Float32Array(bufferLength);
    this.analyzerNode.getFloatFrequencyData(frequencyData);
    
    return frequencyData;
  }

  public getTimeData(): Float32Array | null {
    if (!this.analyzerNode || !this.isPlaying) return null;
    
    const bufferLength = this.analyzerNode.frequencyBinCount;
    const timeData = new Float32Array(bufferLength);
    this.analyzerNode.getFloatTimeDomainData(timeData);
    
    return timeData;
  }

  public destroy(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioBuffer = null;
    this.onAudioDataCallback = null;
    this.onAudioEndedCallback = null;
  }
} 