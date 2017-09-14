// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { app, BrowserWindow } from 'electron';
import { enableLiveReload } from 'electron-compile';

import BrowserContextMenuService from './context-menu-service';
import setupDevMode from './dev-mode-bootstrap';
import BrowserSystemDialogService from './system-dialog-service';
import WindowMenuService from './window-menu-service';

let appWindow: Electron.BrowserWindow | null = null;
let windowMenuService: WindowMenuService | null = null;
let contextMenuService: BrowserContextMenuService | null = null;
let systemDialogService: BrowserSystemDialogService | null = null;

const isDevMode = process.execPath.match(/[\\/]electron/);

if (isDevMode) {
  // FIXME: Move this to dev-mode-bootstrap.ts, on first try I started seeing
  //        "Sending message to WebContents with unknown ID 2" in the console after quitting the app,
  //        need to investigate further.
  //        Upon further investigation I suspect the message is emitted because React/Devtron
  //        DevTools aren't hooked into the HMR.
  enableLiveReload({ strategy: 'react-hmr' });
}

const createWindow = async () => {
  if (isDevMode) {
    const bootstrapDevMode: typeof setupDevMode = require('./dev-mode-bootstrap').default;
    await bootstrapDevMode();
  }

  appWindow = new BrowserWindow({ width: 800, height: 600, backgroundColor: '#293742' });
  windowMenuService = new WindowMenuService(app.getName());
  contextMenuService = new BrowserContextMenuService();
  systemDialogService = new BrowserSystemDialogService();

  if (isDevMode) {
    appWindow.webContents.openDevTools();
  }

  windowMenuService.setMenuForWindow(appWindow);
  appWindow.loadURL(`file://${__dirname}/../../static/index.html`);

  appWindow.on('closed', () => {
    appWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (appWindow === null) {
    createWindow();
  }
});
