// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { ipcRenderer } from 'electron';

import {
  IpcChannel,
  IShowOpenDialogRequest,
  IShowOpenDialogResponse,
  OpenDialogPathKind
} from '../common/ipc';

/**
 * Singleton that provides access to the built-in `dialog` module via async IPC.
 *
 * A single instance of this class should be created in each renderer process.
 *
 * @see BrowserSystemDialogService
 */
export default class RendererSystemDialogService {
  /**
   * Open a dialog to let the user select a single directory.
   *
   * @return A directory path, or `null` if the user cancelled the operation.
   */
  promptForSingleDirectory(): Promise<string | null> {
    return new Promise(resolve => {
      ipcRenderer.once(
        IpcChannel.SystemDialog,
        (_: Electron.IpcMessageEvent, response: IShowOpenDialogResponse) => {
          if (response.paths.length > 0) {
            resolve(response.paths[0]);
          } else {
            resolve(null);
          }
        }
      );
      const request: IShowOpenDialogRequest = {
        pathKind: OpenDialogPathKind.Directory
      };
      ipcRenderer.send(IpcChannel.SystemDialog, request);
    });
  }
}
