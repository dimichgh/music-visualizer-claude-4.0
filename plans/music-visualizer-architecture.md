# Music Visualizer - TypeScript Electron Application Architecture

## Overview
A cross-platform desktop music visualizer built with TypeScript and Electron that creates ethereal, psychedelic, cosmic visual animations synchronized to music. The application will support both live system audio capture and WAV file analysis.

## Technology Stack

### Core Technologies
- **Electron**: Cross-platform desktop application framework
- **TypeScript**: Type-safe JavaScript for better code quality and maintainability
- **Node.js**: Backend runtime for audio processing and file operations
- **HTML5 Canvas/WebGL**: High-performance graphics rendering
- **Web Audio API**: Audio processing and frequency analysis

### Key Libraries
- **Electron Builder**: Application packaging and distribution
- **node-portaudio** or **node-speaker**: System audio capture (macOS)
- **Three.js**: 3D graphics and shader effects for cosmic visuals
- **p5.js** or **Pixi.js**: Alternative for 2D animations and particle systems
- **FFT.js**: Fast Fourier Transform for frequency analysis
- **Tone.js**: Advanced audio analysis and synthesis

## System Architecture

### Application Structure
```
music-visualizer/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main entry point
│   │   ├── audio/           # Audio capture and processing
│   │   └── utils/           # Utilities and helpers
│   ├── renderer/            # Electron renderer process
│   │   ├── components/      # UI components
│   │   ├── visualizers/     # Visualization engines
│   │   ├── shaders/         # WebGL shaders
│   │   └── styles/          # CSS/styling
│   └── shared/              # Shared types and utilities
├── assets/                  # Static assets
├── dist/                    # Built application
├── tests/                   # Test files
└── plans/                   # Project plans and documentation
```

### Core Components

#### 1. Audio Processing Engine
- **System Audio Capture**: Tap into macOS audio output
- **File Audio Processing**: Load and analyze WAV files
- **Real-time FFT Analysis**: Extract frequency spectrum data
- **Beat Detection**: Identify rhythmic patterns and tempo
- **Instrument Classification**: Basic ML for instrument recognition

#### 2. Visualization Engine
- **Particle Systems**: Cosmic dust, nebulae, energy waves
- **Shader Effects**: Fragment shaders for ethereal effects
- **3D Scene Management**: Camera controls and scene composition
- **Animation Timeline**: Sync visuals with audio features
- **Instrument Avatars**: Transparent figures playing instruments

#### 3. User Interface
- **Control Panel**: Audio source selection, visualization settings
- **Real-time Visualizer**: Main display window
- **Settings Menu**: Customization options and preferences
- **File Browser**: WAV file selection and management

## Technical Implementation Plan

### Phase 1: Foundation Setup
**Sub-task 1.1: Project Initialization**
- Set up TypeScript Electron project structure
- Configure build tools (Webpack, Electron Builder)
- Set up development environment and hot reload
- Create basic window management

**Sub-task 1.2: Audio Infrastructure**
- Implement system audio capture for macOS
- Set up WAV file loading and parsing
- Create audio context and Web Audio API integration
- Implement basic FFT analysis pipeline

### Phase 2: Core Visualization Engine
**Sub-task 2.1: Graphics Foundation**
- Set up Three.js scene with WebGL renderer
- Create basic particle system architecture
- Implement camera controls and scene management
- Design shader pipeline for effects

**Sub-task 2.2: Audio-Visual Mapping**
- Map frequency bands to visual parameters
- Implement beat detection and rhythm sync
- Create dynamic color palettes based on audio
- Design amplitude-responsive animations

### Phase 3: Advanced Visualizations
**Sub-task 3.1: Cosmic Effects**
- Nebulae and cosmic dust particles
- Energy wave propagation systems
- Stellar and galactic formations
- Psychedelic color transitions and morphing

**Sub-task 3.2: Instrument Avatars**
- Basic instrument detection algorithms
- Transparent figure/shadow rendering
- Animation systems for instrument playing
- Instrument-specific visual themes

### Phase 4: User Experience
**Sub-task 4.1: Interface Design**
- Modern, minimalist UI design
- Audio source selection interface
- Real-time parameter controls
- Fullscreen visualization mode

**Sub-task 4.2: Performance & Polish**
- GPU performance optimization
- Memory management for long sessions
- Error handling and user feedback
- Application packaging and distribution

## Technical Considerations

### Audio Processing
- **Latency**: Minimize audio-to-visual delay (< 50ms target)
- **Performance**: Efficient FFT computation and frequency binning
- **Quality**: High-resolution spectrum analysis (2048+ FFT size)
- **Compatibility**: macOS system audio integration

### Graphics Performance
- **60+ FPS**: Maintain smooth animations
- **GPU Utilization**: Leverage WebGL shaders for complex effects
- **Memory Management**: Efficient particle system recycling
- **Scalability**: Adaptive quality based on system performance

### Cross-Platform Considerations
- **macOS Focus**: Primary target with system audio integration
- **Future Expansion**: Architecture ready for Windows/Linux ports
- **Hardware Acceleration**: GPU-accelerated rendering where available

## Success Criteria
1. **Functional**: Successfully captures system audio and analyzes WAV files
2. **Visual**: Creates compelling, music-synchronized ethereal visuals
3. **Performance**: Maintains 60+ FPS with complex visualizations
4. **User Experience**: Intuitive interface with rich customization options
5. **Stability**: Handles long listening sessions without memory leaks

## Next Steps
The project will be implemented following the phased approach above. Each sub-task will have detailed implementation plans created as separate markdown files in the plans directory.

**Status**: Architecture Complete - Ready for Implementation
**Language Selected**: TypeScript
**Platform**: Electron Desktop Application
**Target OS**: macOS (with cross-platform architecture) 