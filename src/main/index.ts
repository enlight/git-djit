// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { app, BrowserWindow } from 'electron';
import { enableLiveReload } from 'electron-compile';

let appWindow: Electron.BrowserWindow | null = null;

const isDevMode = process.execPath.match(/[\\/]electron/);

if (isDevMode) {
  enableLiveReload({ strategy: 'react-hmr' });
}

const createWindow = async () => {
  appWindow = new BrowserWindow({ width: 800, height: 600 });

  appWindow.loadURL(`file://${__dirname}/../../static/index.html`);

  if (isDevMode) {
    // await installExtension(REACT_DEVELOPER_TOOLS);
    appWindow.webContents.openDevTools();
  }

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