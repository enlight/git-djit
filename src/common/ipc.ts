// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

export enum IpcChannel {
  ContextMenu = 'context-menu',
  WindowMenu = 'window-menu',
  SystemDialog = 'system-dialog'
}

export enum OpenDialogPathKind {
  File = 'file',
  Directory = 'dir',
  Any = 'any'
}

export interface IShowOpenDialogRequest {
  /**
   * If `true` the dialog will be owned by the window from which the request
   * originated, otherwise the dialog won't have a parent window.
   */
  isOwned?: boolean;
  /** Title of the dialog, e.g. 'Open File' */
  title?: string;
  /** Default path that should be displayed in the dialog. */
  defaultPath?: string;
  /**
   * The kind of paths the dialog should allow the user to select.
   * - `file` will only allow the user to select files.
   * - `dir` will only allow the user to select directories.
   * - `any` will allow the user to select both files and directories.
   */
  pathKind: OpenDialogPathKind;
}

export interface IShowOpenDialogResponse {
  paths: string[];
}

export interface ISerializedMenuItem extends Electron.MenuItemConstructorOptions {
  id: string;
  submenu?: ISerializedMenuItem[];
}

export interface IShowContextMenuRequest {
  items: ISerializedMenuItem[];
}

export interface IContextMenuActionRequest {
  /**
   * Identifier of the context menu item that was activated.
   */
  id: string;
  /**
   * Indicates whether the menu item is currently checked.
   */
  checked?: boolean;
}
