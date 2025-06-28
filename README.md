# 🚀 SwiftBill v1.2

**SwiftBill** is a modern, cross-platform desktop application for managing invoices, clients, and items — built with React, Vite, Electron, and TypeScript.

---

## ✨ Features

- 🧾 Create, view, and manage invoices  
- 📄 Export invoices and monthly statements as professional PDFs  
- 💾 Automatic PDF backup to a user-specified folder  
- 🏢 Customizable company and client details  
- 🎨 Modern, responsive UI using shadcn-ui and Tailwind CSS  
- 🖥️ Electron-powered native app for Windows, macOS, and Linux  
- 📥 CSV import functionality for bulk item management  
- 🔄 Backup and restore system for complete data safety  

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)  
- [npm](https://www.npmjs.com/) (comes with Node.js)  
- [Git](https://git-scm.com/) (for cloning the repository)  

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/RangaSaravanaShetty/swiftbill.git
cd swiftbill
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run in Development Mode

```bash
npm run electron-dev
```

> This launches both the React frontend and Electron shell. Some features (like packaging) work best in production.

### 4. Build & Package the App

```bash
npm run build         # Compiles the frontend into the dist/ folder
npm run dist          # Packages the app using electron-builder
```

> Output installers will be in the `dist/` or `release/` folder (e.g., `.exe`, `.dmg`, or `.AppImage`).

---

## 🧠 Usage Tips

- On first launch, configure the **export folder** in settings.  
- Use the intuitive dashboard to manage clients, items, and invoices.  
- All data is stored **locally**, ensuring privacy and fast performance.  

---

## 🛠 Tech Stack

- [React](https://react.dev/)  
- [Vite](https://vitejs.dev/)  
- [TypeScript](https://www.typescriptlang.org/)  
- [Electron](https://www.electronjs.org/)  
- [shadcn-ui](https://ui.shadcn.com/)  
- [Tailwind CSS](https://tailwindcss.com/)  
- [pdfmake](https://pdfmake.github.io/docs/)  

---

## 🐞 Troubleshooting

- **Blank screen at launch?**  
  Ensure dependencies are installed and try `npm run electron-dev`.

- **PDF export not working?**  
  Verify export folder is set and you have write permissions.

- **Electron/Node errors?**  
  Ensure you're using **Node.js v16+**, and reinstall dependencies.

---

## 📝 TODO Roadmap

- [ ] Regular automated database backups  
- [ ] First-time setup wizard  
- [ ] Expanded documentation and visual guides  
- [ ] Multi-user or team access support  
- [ ] Enhanced error handling and user notifications  
- [ ] Dark mode toggle  
- [x] Improved PDF export  
- [ ] Unit and integration test coverage  
- [ ] Import/export via CSV/JSON  
- [ ] UI polish and visual refinements  
- [ ] Auto-update mechanism  

---

## 🤝 Contributing

Pull requests, issues, and suggestions are welcome. Let’s make SwiftBill better together!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
