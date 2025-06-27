# Invoice Management Software

A modern, cross-platform desktop application for managing invoices, clients, and items, built with React, Vite, Electron, and TypeScript.

## Features
- Create, view, and manage invoices
- Export invoices and monthly statements as professional PDFs
- Automatic PDF backup to a user-specified folder
- Customizable company and client details
- Modern, responsive UI with shadcn-ui and Tailwind CSS
- Electron-powered: runs as a native desktop app on Windows, Mac, and Linux

## Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/) (for cloning the repository)

## Getting Started

### 1. Clone the Repository
```sh
git clone https://github.com/RangaSaravanaShetty/invoice-management-software.git
cd invoice-management-software
```

### 2. Install Dependencies
```sh
npm install
```

### 3. Run the Application (Development Mode)
This will launch both the React frontend and the Electron desktop window.
```sh
npm run electron-dev
```

### 4. Build and Package the Desktop App
To create a distributable desktop app (for Windows, Mac, or Linux):

```sh
npm run build         # Builds the React/Vite frontend into the dist/ folder
npm run dist          # Packages the Electron app into an installer (requires electron-builder)
```

- The installer (e.g., .exe for Windows) will be created in the `dist/` or `release/` directory.
- You can copy this installer to another PC and run it to install the app.

## Usage
- On first launch, set your export folder in the app settings.
- Create invoices, manage clients/items, and export PDFs as needed.
- All data is stored locally for privacy and speed.

## Tech Stack
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Electron](https://www.electronjs.org/)
- [shadcn-ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [pdf-lib](https://pdf-lib.js.org/)

## Troubleshooting
- **White/blank window on launch:** Ensure all dependencies are installed and try `npm run electron-dev` again.
- **PDF export issues:** Make sure the export folder is set in settings and you have write permissions.
- **Node/Electron errors:** Check your Node.js version (v16+ recommended) and reinstall dependencies with `npm install`.

## TODO
- [ ] Regular backup of database for data redundancy
- [ ] Implement one time setup during installation
- [ ] Add more detailed user documentation and screenshots
- [ ] Implement automatic database backup feature
- [ ] Add support for multi-user or team access
- [ ] Improve error handling and user feedback
- [ ] Add dark mode toggle in settings
- [*] Enhance PDF export customization (logo, footer, etc.)
- [ ] Write more unit and integration tests
- [ ] Support import/export of data (CSV, JSON)
- [ ] Visual Improvements
- [ ] Check for updates and update mechanism


## Contributing
Suggestions, Pull requests and issues are welcome!

## License
MIT
