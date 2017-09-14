// Copyright (c) 2016-2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { BrowserWindow, ipcMain, Menu } from 'electron';
import {
  IContextMenuActionRequest,
  IpcChannel,
  ISerializedMenuItem,
  IShowContextMenuRequest
} from '../common/ipc';

/**
 * Works in conjunction with RendererContextMenuService to allow context menus to be created and
 * shown from a renderer process.
 */
export default class BrowserContextMenuService {
  constructor() {
    ipcMain.on(IpcChannel.ContextMenu, this._onShowMenu);
  }

  dispose(): void {
    ipcMain.removeListener(IpcChannel.ContextMenu, this._onShowMenu);
  }

  private _setClickCallback(items: ISerializedMenuItem[]): void {
    items.forEach(item => {
      if (item.type === 'normal') {
        item.click = this._onDidClick;
      } else if (item.type === 'checkbox') {
        item.click = this._onDidClickCheckbox;
      } else if (item.submenu && !(item.submenu instanceof Menu)) {
        this._setClickCallback(item.submenu);
      }
    });
  }

  private _onDidClick = (menuItem: Electron.MenuItem, browserWindow: Electron.BrowserWindow) => {
    const request: IContextMenuActionRequest = { id: (menuItem as ISerializedMenuItem).id };
    browserWindow.webContents.send(IpcChannel.ContextMenu, request);
  };

  private _onDidClickCheckbox = (
    menuItem: Electron.MenuItem,
    browserWindow: Electron.BrowserWindow
  ) => {
    const request: IContextMenuActionRequest = {
      id: (menuItem as ISerializedMenuItem).id,
      checked: menuItem.checked
    };
    browserWindow.webContents.send(IpcChannel.ContextMenu, request);
  };

  private _onShowMenu = (event: Electron.IpcMessageEvent, request: IShowContextMenuRequest) => {
    this._setClickCallback(request.items);
    const menu = Menu.buildFromTemplate(request.items);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
  };
}
