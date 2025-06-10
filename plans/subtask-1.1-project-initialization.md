# Sub-task 1.1: Project Initialization - TypeScript Electron Setup

## Objective
Set up a complete TypeScript Electron project structure with modern build tools, development environment, and basic window management for the music visualizer application.

## Technical Requirements
- TypeScript 5.x with strict configuration
- Electron 27.x (latest stable)
- Webpack 5.x for bundling
- Hot reload for development
- Electron Builder for packaging
- ESLint + Prettier for code quality

## Implementation Steps

### Step 1: Initialize Node.js Project
```bash
npm init -y
```

### Step 2: Install Core Dependencies
```bash
# Electron and TypeScript
npm install --save-dev electron@latest typescript@latest
npm install --save-dev @types/node@latest

# Build tools
npm install --save-dev webpack@latest webpack-cli@latest
npm install --save-dev ts-loader@latest html-webpack-plugin@latest
npm install --save-dev webpack-dev-server@latest

# Electron specific tools
npm install --save-dev electron-builder@latest
npm install --save-dev concurrently@latest wait-on@latest

# Code quality tools
npm install --save-dev eslint@latest @typescript-eslint/parser@latest
npm install --save-dev @typescript-eslint/eslint-plugin@latest
npm install --save-dev prettier@latest eslint-plugin-prettier@latest
```

### Step 3: TypeScript Configuration
Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "sourceMap": true,
    "declaration": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@main/*": ["main/*"],
      "@renderer/*": ["renderer/*"],
      "@shared/*": ["shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Step 4: Webpack Configuration
Create `webpack.config.js`:
```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = [
  // Main process configuration
  {
    entry: './src/main/main.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@main': path.resolve(__dirname, 'src/main'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    },
    mode: isDevelopment ? 'development' : 'production',
    devtool: isDevelopment ? 'source-map' : false,
  },
  // Renderer process configuration
  {
    entry: './src/renderer/index.ts',
    target: 'electron-renderer',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@renderer': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
      }),
    ],
    mode: isDevelopment ? 'development' : 'production',
    devtool: isDevelopment ? 'source-map' : false,
  },
];
```

### Step 5: Package.json Scripts
Update `package.json` with development and build scripts:
```json
{
  "main": "dist/main.js",
  "scripts": {
    "build": "webpack --mode=production",
    "build:watch": "webpack --mode=development --watch",
    "start": "npm run build && electron .",
    "dev": "concurrently \"npm run build:watch\" \"wait-on dist/main.js && electron .\"",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "test": "echo \"Tests will be implemented in later phases\""
  }
}
```

### Step 6: Project Structure Creation
Create the following directory structure:
```
src/
├── main/
│   ├── main.ts
│   ├── window-manager.ts
│   ├── audio/
│   └── utils/
├── renderer/
│   ├── index.ts
│   ├── index.html
│   ├── components/
│   ├── visualizers/
│   ├── shaders/
│   └── styles/
│       └── main.css
└── shared/
    ├── types/
    │   ├── audio.ts
    │   ├── visualizer.ts
    │   └── index.ts
    └── utils/
```

### Step 7: Basic Main Process Implementation
Create `src/main/main.ts`:
```typescript
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { WindowManager } from './window-manager';

class MusicVisualizerApp {
  private windowManager: WindowManager;

  constructor() {
    this.windowManager = new WindowManager();
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
  }
}

new MusicVisualizerApp();
```

### Step 8: Window Manager Implementation
Create `src/main/window-manager.ts`:
```typescript
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
```

### Step 9: Basic Renderer Setup
Create `src/renderer/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Music Visualizer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <div id="app">
        <h1>Music Visualizer</h1>
        <div id="visualizer-container"></div>
        <div id="controls-panel"></div>
    </div>
    <script src="renderer.js"></script>
</body>
</html>
```

Create `src/renderer/index.ts`:
```typescript
import './styles/main.css';

class MusicVisualizerRenderer {
  constructor() {
    this.initialize();
  }

  private initialize(): void {
    console.log('Music Visualizer Renderer initialized');
    this.setupUI();
  }

  private setupUI(): void {
    const app = document.getElementById('app');
    if (app) {
      // Basic UI setup - will be expanded in later phases
      console.log('UI setup complete');
    }
  }
}

new MusicVisualizerRenderer();
```

### Step 10: Basic Styling
Create `src/renderer/styles/main.css`:
```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
  color: #ffffff;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

#visualizer-container {
  flex: 1;
  position: relative;
}

#controls-panel {
  height: 80px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

h1 {
  text-align: center;
  padding: 20px;
  font-weight: 300;
  letter-spacing: 2px;
}
```

### Step 11: Shared Types Setup
Create `src/shared/types/index.ts`:
```typescript
export * from './audio';
export * from './visualizer';
```

## Acceptance Criteria
- [x] TypeScript Electron project successfully initializes
- [x] Webpack builds both main and renderer processes
- [x] Development environment with hot reload works
- [x] Basic window opens and displays
- [x] Project structure follows architecture plan
- [x] Code quality tools (ESLint, Prettier) are configured
- [x] Build scripts work for development and production

## Testing Commands
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
npm start

# Code quality
npm run lint
npm run format
```

## Status Tracking
- [ ] **TODO**: Implement all steps above
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified working in development and production

## Dependencies for Next Sub-task
This sub-task must be completed before starting Sub-task 1.2 (Audio Infrastructure), as it provides the foundational project structure and build system that the audio components will integrate with.

## Notes
- Keep development dependencies up to date
- Ensure TypeScript strict mode is enforced
- Test hot reload functionality thoroughly
- Verify Electron security best practices are followed 