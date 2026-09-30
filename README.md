# Annual Report Flatplan

A self-hosted editorial pitch desk and production flatplan for annual reports and magazines. It runs as a macOS desktop app and stores the complete workspace in a local file selected by the user.

## Features

- Pitch stories, save working copy, and approve or deny ideas
- Add photos, charts, quotes, advertisements, and other page elements
- Drag approved items onto pages and build a basic page layout
- Keep front cover, inside covers, and back cover separate from reader spreads
- Validate that the interior page count is a multiple of four
- Switch between spreads and individual pages
- Search and filter the editorial plan
- Open and save complete `.flatplan` workspace files
- Automatic saving after a project file has been selected
- Automatic reopening of the last project
- Timestamped local backups with **File → Restore Backup**
- Protection when the project file changes outside Flatplan
- Native macOS Open, Save, and Save As dialogs and keyboard shortcuts
- Finder file association and a custom Flatplan app icon
- Browser storage fallback when the desktop wrapper is not used
- Responsive layout for desktop and mobile
- Production dashboard, assigned deadlines and reviews, dated notes, and activity history
- Shared ownership for editorial items, owner progress reporting, and required item completion before print-ready lock
- macOS deadline reminders, print-ready locking, bulk tools, undo/redo, and keyboard shortcuts
- Publication templates, edition duplication, and archived-publication search
- Relative links to InDesign-folder assets with thumbnails, version labels, and missing-file warnings
- Production report, assignments CSV, final preflight, and InDesign manifest exports

## Run the macOS app during development

Requires Node.js 20 or newer.

```sh
npm install
npm start
```

Choose **Save** or **Save As** and select where the `.flatplan` project file should live. From then on, edits are written to that file automatically. **Open file** can load either a `.flatplan` workspace or an older exported `.json` publication.

## Build the installable Mac app

Run this command on a Mac:

```sh
npm install
npm run dist:mac
```

The universal DMG and ZIP are created in `dist/` and run on Apple Silicon or Intel Macs. Because this project does not include an Apple Developer signing identity, macOS may require a right-click → **Open** the first time the app is launched. Add signing and notarization credentials before distributing it broadly; electron-builder will use standard Apple signing and notarization environment variables when they are available.

The app is fully local: it does not start a server, send publication data to a service, or require a hosted database.

## Browser-only mode

Open `index.html` in a browser. The app falls back to browser storage and downloads `.flatplan` files when Save is selected.

## Publish with GitHub Pages

1. Create a GitHub repository and upload these files to its root.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

GitHub will display the published URL when deployment completes.

## Project file format

Each `.flatplan` file is readable JSON containing the current publication, archived publications, deadlines, page reviews, pitches, layouts, and settings. Writes are performed through a temporary file and rename so an interrupted save is less likely to corrupt the project. Before overwriting, Flatplan saves the prior version beside the project in a hidden `.flatplan-backups` folder and retains the latest 20 versions.
