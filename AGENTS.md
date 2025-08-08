# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server with hot reload
bun run dev

# Run TypeScript type checking
bun run type-check
```

### Building
```bash
# Build for production
bun run build

# Preview production build
bun run preview

# Prepare for GitHub Pages deployment
bun run deploy
```

## Architecture Overview

This is a 3D orbital mechanics visualization web application that simulates relative motion of satellites using Hill-Clohessy-Wiltshire (HCW) equations.

### Core Components

1. **Simulation Engine** (`/src/simulation/`)
   - `HillEquationSolver.ts`: Implements HCW equations for relative motion physics
   - `OrbitElements.ts`: Handles orbital elements and Keplerian mechanics
   - `FrameTransforms.ts`: Manages coordinate system transformations (ECI, ECEF, LVLH)

2. **3D Visualization** (`/src/visualization/`)
   - `RenderingSystem.ts`: Three.js-based rendering pipeline
   - `CelestialBodies.ts`: Earth and celestial object rendering
   - `TrailRenderer.ts`: Satellite trajectory visualization

3. **User Interaction** (`/src/interaction/`)
   - `UIControls.ts`: Simulation parameter controls
   - `CameraController.ts`: 3D camera navigation
   - `EventHandler.ts`: Event handling and keyboard shortcuts

### Technology Stack
- **Build Tool**: Vite (with TypeScript support)
- **3D Graphics**: Three.js v0.160.0
- **Orbital Mechanics**: satellite.js v6.0.0
- **Language**: TypeScript with ES modules

### Key Concepts
- HCW equations model relative motion between satellites in close proximity (within 1% of orbital radius)
- The simulation operates in 3DOF (position only, no attitude)
- Supports various initial satellite configurations and periodic orbits
- Includes thrust generation and perturbation simulation capabilities