# 3D Booth Viewer

An interactive 3D booth and stage viewer built with **Next.js**, **React Three Fiber**, **Three.js**, and **Tailwind CSS**. Designed for client design reviews, spatial planning, and interactive booth presentations with custom video displays and live web surfaces.

---

## Features

### 1. 3D Model Viewer & Navigation
- **Orbit Mode**: Inspect booths and stages from any angle with smooth zoom, pan, and rotation.
- **Walk Mode**: First-person walkthrough experience with:
  - Pointer lock mouse-look.
  - `W` / `A` / `S` / `D` movement and collision detection with booth geometry and walls.
  - Configurable eye height and movement speed.
- **Model Loading & Unit Calibration**:
  - Drag-and-drop `.glb` and `.gltf` 3D models.
  - Built-in sample booth model for immediate testing.
  - Native unit scaling (Meters, Centimeters, Millimeters, Inches, Feet) with automatic bounding-box centering.
  - Mesh inspection and hierarchy tree viewer.

### 2. Custom 3D Screen System
- **Create & Size Displays**: Place custom flat screens anywhere in the 3D scene, specified in physical real-world meters.
- **Aspect Ratio Presets**: 16:9, 21:9, 4:3, 1:1, 9:16, or custom dimensions.
- **3D Transform Gizmo**:
  - Interactive Drei `TransformControls` for translate and rotate.
  - "Flip facing" (180° rotation) and local/world orientation.
- **Adopt Existing Meshes**: Automatically detect and adopt meshes named `SCREEN_*` or `DISPLAY_*` from the 3D model.
- **Layout Import & Export**: Save and export screen setups as JSON files, with auto-save to browser local storage.

### 3. Video Playback
- **Local File & URL Support**: Upload local video files (`.mp4`, `.webm`) or link remote video streams.
- **Persistent Offline Storage**: Local video files are cached in IndexedDB (`idb-keyval`) and persist across page refreshes.
- **Playback Controls**: Fit modes (`contain` / `cover`), loop, mute toggle, and volume adjustments.

### 4. Live Interactive Web Pages (CSS3D / Html Transform)
- **Live Web App Embedding**: Render live, interactive websites and web apps inside the 3D world using Drei's `<Html transform>`.
- **Physical Scale Calibration**: Precisely calibrated scale formula matching physical screen meters to iframe virtual pixel resolution:
  $$\text{scaleX} = \frac{\text{width}_{\text{meters}} \times 40}{\text{width}_{\text{pixels}}}, \quad \text{scaleY} = \frac{\text{height}_{\text{meters}} \times 40}{\text{height}_{\text{pixels}}}$$
- **Virtual Resolution Controls**: Configure virtual resolution (e.g. $1920 \times 1080$, $1280 \times 720$) to adjust UI density and sharpness.
- **Occlusion & Distance Culling**:
  - 5-point raycast occlusion test against booth geometry hides blocked iframes.
  - Automatic back-face and 25m distance culling.
  - Concurrency cap: Top 3 nearest visible screens remain live; occluded screens switch to `visibility: hidden` (preserving DOM form and scroll state) with a fallback 3D placeholder.
- **Seamless Walk & Orbit Interaction**:
  - **Walk Mode**: Walk within 6m of a web screen, aim at it, and press **`E`** to interact. Movement halts and pointer lock releases. Click **"Exit screen"** or the 3D canvas to immediately resume walking.
  - **Orbit Mode**: Click **"Interact with Screen"** in the panel or double-click the screen in presentation mode.

---

## Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Turbopack)
- **3D Engine**: [Three.js](https://threejs.org/) & [@react-three/fiber](https://r3f.docs.pmnd.rs/)
- **3D Helpers**: [@react-three/drei](https://github.com/pmndrs/drei) (`TransformControls`, `Html`)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Offline Storage**: [idb-keyval](https://github.com/jakearchibald/idb-keyval)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/)

---

## Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- `pnpm` (recommended), `npm`, or `yarn`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/3d-booth-viewer.git
   cd 3d-booth-viewer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Guide

### Controls
| Action | Walk Mode | Orbit Mode |
| :--- | :--- | :--- |
| **Move / Pan** | `W` `A` `S` `D` | Right-click + Drag |
| **Look / Rotate** | Mouse-look (Pointer lock) | Left-click + Drag |
| **Interact with Web Screen** | Aim within 6m & press **`E`** | Click "Interact" button / Double-click |
| **Exit Screen Interaction** | Click **"Exit screen"** or Canvas | Click **"Exit screen"** or Canvas |
| **Toggle Mode** | Switch via top bar or shortcut | Switch via top bar or shortcut |

### Adding a Screen
1. Click **+ Add Screen** in the right-side Screens panel.
2. Select your desired aspect ratio or type custom meter dimensions.
3. Use the 3D transform gizmo to position and rotate the screen inside the booth.
4. Choose the content type:
   - **Video**: Upload a video file or enter an MP4 URL.
   - **Web page**: Paste a URL (e.g. `https://example.com` or a local web app) and click **Apply**.

> [!NOTE]
> Web pages that set restrictive security headers (`X-Frame-Options: SAMEORIGIN` or `frame-ancestors 'none'`, e.g., Google or GitHub) cannot be embedded in iframes. Your own web apps, dashboards, and sites configured to permit embedding will load seamlessly.

---

## Scripts

- `pnpm run dev` - Start development server with Turbopack.
- `pnpm run build` - Create optimized production build.
- `pnpm run start` - Run production server.
- `pnpm run lint` - Run ESLint checks.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
