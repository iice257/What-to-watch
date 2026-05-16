# There's nothing to watch...

The silver screen's heyday is arguably behind us. Luckily, we have
over a hundred years of cinema to fall back on.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Creative Commons License](https://img.shields.io/badge/License-CC%20BY--NC--SA%203.0-lightgrey.svg)
![ODC Attribution License](https://img.shields.io/badge/License-ODC%20By-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)
![React](https://img.shields.io/badge/React-19.1-blue.svg)
![WebGL](https://img.shields.io/badge/WebGL-enabled-green.svg)

## 🎬 Overview
An experimental WebGL gallery that visualizes tens of thousands of film posters in an interactive force-directed voronoi diagram.

### Key Features

- **Interactive WebGL Visualization**: Real-time rendering of tens of thousands of film posters
- **Custom Voroforce Engine**: Purpose-built force simulation and rendering system with multi-threading support
- **Responsive Design**: Adapts to desktop, tablet, and mobile devices
- **Performance Optimized**: GPU-accelerated rendering with efficient memory management
- **Film Discovery**: Explore movies through visual relationships and clustering
- **Multiple View Modes**: Intro, selection, and preview modes for different user experiences

## 🚀 Quick Start

### Prerequisites

- **Bun** (recommended) or Node.js 18+ with a package manager of your choice (npm, yarn, pnpm, etc.)
- Modern browser with WebGL 2.0 support

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:gnovotny/nothing-to-watch.git
   cd nothing-to-watch
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Install dependencies**
   ```bash
   bun install
   ```

4. **Start development server**
   ```bash
   bun dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server on port 3000 |
| `bun build` | Build for production with TypeScript compilation |
| `bun preview` | Preview production build |
| `bun lint` | Lint code with Biome |
| `bun format` | Format code with Biome |
| `bun check` | Run comprehensive Biome checks |
| `bun check:write` | Auto-fix Biome issues |
| `bun analyze` | Build with bundle analysis |

### Testing Commands

| Command | Description |
|---------|-------------|
| `bun run test` | Run unit tests with Vitest |
| `bun test:unit:coverage` | Run unit tests with coverage |
| `bun test:e2e` | Run end-to-end tests with Playwright |
| `bun test:e2e:headed` | Run E2E tests in headed mode |
| `bun test:e2e:ui` | Run E2E tests with Playwright UI |

## 🏗 Architecture

### Stack

- **React 19** with TypeScript and Vite
- **Tailwind CSS** with Radix UI components (Shadcn)
- **Zustand** for state management

### Engine (Voroforce)

- Custom vanilla JS force simulation and rendering engine
- **OGL** - Lightweight WebGL library for 3D rendering
- **GLSL shaders**
- **Multi-threaded** simulation support

### Project Structure

```
├── app/                    # React application
│   ├── main.tsx           # Entry point
│   ├── app.tsx            # Main App component
│   ├── store/             # Zustand store and slices
│   ├── cmps/              # React components
│   │   ├── common/        # Shared components
│   │   ├── ui/            # Radix UI components
│   │   └── views/         # Main view components
│   ├── vf/                # Voroforce integration layer
│   └── utils/             # Utility functions
├── voroforce/             # Standalone WebGL engine
│   ├── simulation/        # Force simulation logic
│   ├── display/           # Rendering system
│   ├── controls/          # User interaction handling
│   └── utils/             # Engine utilities
└── public/                # Static assets
    ├── json/              # Film data files
    └── media/             # Film poster images
```

### Data Flow

1. **Film Data Loading**: JSON files loaded from `public/json/`
2. **Film Image Serving**: Multi-resolution variants from `public/media/`
3. **Voroforce Processing**: Data processed into engine
4. **React Integration**: Components interact through Zustand store
5. **Mode Management**: User interactions trigger mode changes (intro/select/preview)

## 🎯 Core Components

### Voroforce Engine

The heart of the application is the custom Voroforce engine:

- **Simulation**: Force directed graph with multiple force types
- **Rendering**: WebGL-based poster rendering with efficient batching
- **Controls**: Mouse/touch/keyboard interaction with zoom, pan, and selection
- **Performance**: Multi-threaded simulation with GPU optimization

### State Management

Zustand store organized into slices:

- **UI Slice**: Interface state, modals, settings
- **Voroforce Slice**: Engine integration and control
- **Film Data Slice**: Film data management and loading

### React Component Architecture

- **Layout Components**: Navigation, modals, responsive containers
- **UI Components**: Radix-based design system components
- **View Components**: Main application views and screens

## 🔧 Configuration

### Environment Variables

Create `.env.local` for local development:

```bash
VITE_TEXTURES_BASE_URL=/media
VITE_FILM_INFO_BASE_URL=/json
VITE_MEDIA_VERSION_0_LAYERS=1
VITE_MEDIA_VERSION_1_LAYERS=1
VITE_MEDIA_VERSION_2_LAYERS=1
VITE_EXPERIMENTAL_MEDIA_VERSION_3_ENABLED=1
```

### Performance Tuning

The application includes several performance optimization features:

- **Device Detection**: Recommended presets and settings based on device capabilities
- **Memory Management**: Efficient WebGL resource handling
- **Batch Loading**: Chunked film data & media loading
- **Image Variants**: Multiple resolution options for different scaling levels

## 🧪 Testing

### Unit Tests

Uses **Vitest** with **@testing-library/react**:

```bash
bun test:unit          # Run unit tests
bun test:unit:coverage # With coverage report
```

### End-to-End Tests

Uses **Playwright** for E2E testing:

```bash
bun test:e2e           # Run E2E tests
bun test:e2e:headed    # With visible browser
bun test:e2e:ui        # With Playwright UI
```

### Code Quality

- **Biome**: Linting and formatting
- **TypeScript**: Static type checking
- **Pre-commit hooks**: Automated code quality checks

## 🎨 Styling

### Design System

- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible component primitives
- **Custom CSS variables** for theme management
- **Responsive design** with mobile-first approach

### Theme Support

- Dark/light theme switching
- CSS custom properties for consistent theming
- Radix UI theme integration

## 📱 Browser Support

### Minimum Requirements

- **WebGL 2.0** support
- **ES2018** JavaScript features
- **Modern browsers**: Chrome 70+, Firefox 78+, Safari 14+, Edge 79+

### Performance Considerations

- **GPU Requirements**: Dedicated graphics recommended for optimal performance
- **Memory**: 2GB+ RAM recommended for large datasets
- **Network**: Good connection for media loading

## 🚀 Deployment

### Production Build

```bash
bun build              # Create production build
bun preview            # Preview production build
```

### Security Headers

The application requires specific security headers:

- **COEP**: `require-corp` for production
- **CORS**: Proper media hosting configuration
- **CSP**: Content Security Policy for WebGL applications

## 🤝 Contributing

### Development Setup

1. Follow the [Quick Start](#-quick-start) guide
2. Install development dependencies
3. Run the development server
4. Make your changes
5. Run tests: `bun test:unit && bun test:e2e`
6. Ensure code quality: `bun check`

### Code Style

- **Biome** for linting and formatting
- **Single quotes** for JS/TS strings  
- **2-space indentation**
- **Semicolons** only when needed
- **Tailwind class sorting** enabled

### Commit Guidelines

- Use descriptive commit messages
- Reference issues when applicable
- Include tests for new features
- Ensure all checks pass

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

**Exceptions**: 
- WebGL fragment shaders are licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
- Film data is licensed under the Open Data Commons Attribution License (ODC-By) v1.0.

## 🙋‍♂️ Support

If you have any issues or questions:

- **GitHub Issues**: Open an issue on this repository
- **Email**: Contact at [96j0o1ivb@mozmail.com](mailto:96j0o1ivb@mozmail.com)
