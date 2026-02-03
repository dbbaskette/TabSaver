<div align="center">

# 📑 TabSaver

### *Modern Tab Management for Chrome*

[![Svelte](https://img.shields.io/badge/Svelte-4.0-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WXT](https://img.shields.io/badge/WXT-Framework-3B82F6?style=for-the-badge)](https://wxt.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

*A beautiful, "Liquid Glass" styled extension to organize your browser tabs into native Chrome Bookmarks or Obsidian notes.*

</div>

---

## 📖 Overview

**TabSaver** solves the problem of tab clutter by allowing you to quickly save, organize, and close open tabs. Unlike standard tab managers, TabSaver offers a premium user experience with two robust storage options:

1.  **Native Chrome Bookmarks**: Save tabs into timestamped folders within your browser's "Other Bookmarks" section.
2.  **Obsidian Vault Sync**: Save tabs directly into your Obsidian vault as markdown collections (requires local configuration).

All wrapped in a stunning **Liquid Glass UI** that feels modern, responsive, and native to the OS.

---

## ✨ Key Features

### 🚀 **Tab Management**
*   **Batch Operations**: Select specific tabs or "Select All" to close or save in bulk.
*   **Smart Saving**: Automatically groups tabs into folders (e.g., `Research Session 2024-03-20`).
*   **Custom Collections**: Name your collections before saving for better organization.
*   **Instant Cleanup**: "Save & Close" workflow clears your workspace in seconds.

### � **Flexible Storage**
*   **Chrome Bookmarks Mode**:
    *   Target folder: `Other Bookmarks / [Collection Name] [Timestamp]`
    *   Fully searchable via Chrome's Omnibox.
    *   Syncs across devices if Chrome Sync is enabled.
*   **Obsidian Mode**:
    *   Creates a markdown file for the collection.
    *   Lists tabs as checkboxes `- [ ] [Title](URL)`.
    *   Perfect for research workflows and knowledge management.

### 🎨 **Modern Design**
*   **Glassmorphism**: Dark, semi-transparent panels with background blur.
*   **Responsive Sidebar**: clean navigation between Tabs, Archive, and Settings.
*   **Smooth Animations**: Polished hover states and transitions.
*   **Dark Mode Native**: Designed from the ground up for dark mode enthusiasts.

---

## 🛠️ Project Structure

The project uses a modern **WXT + Svelte** architecture. Legacy files have been removed for clarity.

```
TabSaver/
├── 📁 entrypoints/           # WXT Entry Points
│   ├── ⚙️ background.ts     # Extension logic (Bookmarks/Storage API)
│   └── 🎨 popup/            # UI Frontend
│       ├── App.svelte       # Main Svelte Application
│       └── components/      # UI Components (ArchiveView, Settings, etc.)
├── 📚 lib/                  # Shared Utilities
│   ├── stores.ts            # Svelte State Stores
│   └── types.ts            # TypeScript Interfaces
├── 🎨 assets/               # Icons and Global Styles
└── ⚙️ wxt.config.ts         # WXT Build Configuration
```

---

## 🚀 Installation & Development

### **Prerequisites**
*   Node.js 18+
*   npm or pnpm

### **1. Setup**
```bash
git clone https://github.com/dbbaskette/TabSaver.git
cd TabSaver
npm install
```

### **2. Development (Hot Reload)**
Start the dev server. Chrome will open automatically with the extension loaded.
```bash
npm run dev
```

### **3. Production Build**
Build a production-ready zip file.
```bash
npm run build
# Output is located in: .output/
```

### **4. Loading into Chrome**
1.  Go to `chrome://extensions/`
2.  Enable **Developer Mode** (top right).
3.  Click **Load Unpacked**.
4.  Select the `.output/chrome-mv3` directory required after building.

---

## 💡 Usage Guide

1.  **Open TabSaver**: Click the icon in your toolbar.
2.  **Select Tabs**: Check the boxes for the tabs you want to save (or click Select All).
3.  **Choose Name** (Optional): Enter a name like "Project X" in the sidebar input.
4.  **Save**:
    *   Click **Save** to archive them without closing.
    *   Click **Save & Close** to archive and clear your workspace.
5.  **View Archive**: Click the "Archive" button in the sidebar to view previously saved bookmark folders.

---

## 🤝 Contributing

Contributions are welcome! Please follow the standard pull request workflow:

1.  Fork the repo.
2.  Create a feature branch (`git checkout -b feature/NewGlassUI`).
3.  Commit changes.
4.  Push and open a PR.

---

<div align="center">

*Built with ❤️ using [WXT](https://wxt.dev) and [Svelte](https://svelte.dev)*

</div>