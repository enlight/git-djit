// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { ipcRenderer } from 'electron';

import { IContextMenuActionRequest, IpcChannel, IShowContextMenuRequest } from '../common/ipc';
import { ContextMenu } from './context-menu';

/**
 * Works in conjunction with BrowserContextMenuService to display native context menus.
 */
export default class RendererContextMenuService {
  private _currentContextMenu: ContextMenu | null = null;

  constructor() {
    ipcRenderer.on(IpcChannel.ContextMenu, this._onActionRequest);
  }

  dispose() {
    ipcRenderer.removeListener(IpcChannel.ContextMenu, this._onActionRequest);
  }

  show(contextMenu: ContextMenu) {
    if (this._currentContextMenu !== contextMenu) {
      this._currentContextMenu = contextMenu;
    }
    const request: IShowContextMenuRequest = {
      items: contextMenu.serialize().items
    };
    ipcRenderer.send(IpcChannel.ContextMenu, request);
  }

  private _onActionRequest = (_: Electron.IpcMessageEvent, request: IContextMenuActionRequest) => {
    if (this._currentContextMenu) {
      this._currentContextMenu.activateItem(request.id, request.checked || false);
    } else {
      // LOG an error
    }
  };
}
