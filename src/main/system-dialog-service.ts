// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { BrowserWindow, dialog, ipcMain } from 'electron';

import {
  IpcChannel,
  IShowOpenDialogRequest,
  IShowOpenDialogResponse,
  OpenDialogPathKind
} from '../common/ipc';

/**
 * Singleton that provides access to the built-in `dialog` module via async IPC.
 *
 * A single instance of this class should be created in the main process.
 *
 * @see RendererSystemDialogService
 */
export default class BrowserSystemDialogService {
  constructor() {
    ipcMain.on(IpcChannel.SystemDialog, this.handleEvent);
  }

  dispose() {
    ipcMain.removeListener(IpcChannel.SystemDialog, this.handleEvent);
  }

  private handleEvent = (event: Electron.IpcMessageEvent, request: IShowOpenDialogRequest) => {
    this.showOpenDialog(event.sender, request);
  };

  private showOpenDialog(sender: Electron.WebContents, request: IShowOpenDialogRequest) {
    let parentWindow = request.isOwned === true ? BrowserWindow.fromWebContents(sender) : null;
    const properties: Electron.OpenDialogOptions['properties'] = [];

    switch (request.pathKind) {
      case OpenDialogPathKind.File:
        properties.push('openFile');
        break;
      case OpenDialogPathKind.Directory:
        properties.push('openDirectory');
        break;
      case OpenDialogPathKind.Any:
        properties.push('openFile', 'openDirectory');
        break;
    }

    const options: Electron.OpenDialogOptions = {
      defaultPath: request.defaultPath,
      properties,
      title: request.title
    };
    // Apparently on OS X the open dialog shouldn't have a parent window
    if (process.platform === 'darwin') {
      parentWindow = null;
    }
    dialog.showOpenDialog(parentWindow!, options, filePaths => {
      const response: IShowOpenDialogResponse = {
        paths: filePaths && filePaths.length > 0 ? [filePaths[0]] : []
      };
      sender.send(IpcChannel.SystemDialog, response);
    });
  }
}
