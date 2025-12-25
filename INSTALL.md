# How to Build & Install StreamEngine

## Option 1: Download Pre-built (Recommended)
Our automated build server compiles fresh installers for every update.

*   🍎 **[Download for Mac (.dmg)](https://github.com/PopcornTime-SuperSized/stream-engine/releases/download/latest/PopcornTime-StreamEngine-mac.dmg)**
*   🪟 **[Download for Windows (.exe)](https://github.com/PopcornTime-SuperSized/stream-engine/releases/download/latest/PopcornTime-StreamEngine-win.exe)**

> **⚠️ macOS Users:** If you see "App is damaged and can't be opened":
> 1. Open Terminal.
> 2. Run: `xattr -cr /Applications/PopcornTime-StreamEngine.app`
> 3. Open the app again.
> *(This is required because we don't pay Apple $99/year for a developer certificate).*

---

## Option 2: Build from Source
Since **StreamEngine** is open-source software, the most secure way to install it is to build it yourself. We've made this process extremely simple.

## Prerequisites
*   **Node.js** (v16 or higher): [Download Here](https://nodejs.org/)
*   **Git**: [Download Here](https://git-scm.com/)

## 1. Clone the Code
Open your terminal (Command Prompt on Windows, Terminal on Mac) and run:

```bash
git clone https://github.com/PopcornTime-SuperSized/stream-engine.git
cd stream-engine
```

## 2. Install Dependencies
This downloads all the necessary libraries (React, Electron, WebTorrent, etc.).

```bash
npm install
```

## 3. Create the Installer
Run the build command for your operating system.

### For macOS
Creates a `.dmg` file in the `dist` folder.
```bash
npm run dist
```

### For Windows
Creates a `.exe` installer in the `dist` folder.
```bash
npm run dist
```
*(Note: You must run this command ON Windows to build a Windows installer, or use advanced cross-compilation tools).*

## 4. Install
1.  Go to the newly created `dist` folder in your project directory.
2.  **Mac**: Open the `.dmg` and drag StreamEngine to your Applications.
3.  **Windows**: Run the `.exe` setup file.

---

## Why isn't there a mobile app?
StreamEngine uses **Electron**, which is a technology for building Desktop applications using web technologies. It runs on **Windows, macOS, and Linux**.

Mobile apps (iOS/Android) require a different technology stack (like React Native). A mobile version is considered a separate project for the future roadmap.
