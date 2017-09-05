// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Menu } from 'electron';

import { IpcChannel } from '../common/ipc';
import MenuItemId from '../common/menu-item-ids';

export default class WindowMenuService {
  private menu: Electron.Menu | null = null;

  constructor(private appName: string) {}

  setMenuForWindow(browserWindow: Electron.BrowserWindow) {
    if (!this.menu) {
      this.menu = Menu.buildFromTemplate(this.buildMenuTemplate());
    }

    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(this.menu);
    } else {
      browserWindow.setMenu(this.menu);
    }
  }

  private buildMenuTemplate(): Electron.MenuItemConstructorOptions[] {
    const template: Electron.MenuItemConstructorOptions[] = [];
    const separator: Electron.MenuItemConstructorOptions = { type: 'separator' };

    const macOS = process.platform === 'darwin';

    /* tslint:disable:object-literal-sort-keys */
    if (macOS) {
      template.push({
        label: this.appName,
        submenu: [
          {
            role: 'about'
          },
          separator,
          {
            role: 'hide'
          },
          {
            role: 'hideothers'
          },
          {
            role: 'unhide'
          },
          separator,
          {
            role: 'quit'
          }
        ]
      });
    }

    const fileMenu: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Add Local Repository...',
        click: (_, browserWindow) =>
          browserWindow.webContents.send(IpcChannel.WindowMenu, MenuItemId.AddLocalRepository)
      }
    ];

    if (!macOS) {
      fileMenu.push(separator, {
        role: 'quit'
      });
    }

    template.push({
      label: '&File',
      submenu: fileMenu
    });

    template.push({
      label: '&Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        separator,
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    });

    template.push({
      label: '&Developer',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (_, browserWindow) => browserWindow.reload()
        },
        {
          label: 'Tools',
          submenu: [
            {
              label: 'Toggle Chrome DevTools',
              accelerator: macOS ? 'Alt+Command+I' : 'Ctrl+Shift+I',
              click: (_, browserWindow) => browserWindow.webContents.toggleDevTools()
            },
            {
              label: 'Toggle Mobx DevTools'
            }
          ]
        }
      ]
    });

    const windowMenu: Electron.MenuItemConstructorOptions[] = [
      { role: 'minimize' },
      { role: 'close' }
    ];

    if (macOS) {
      windowMenu.push(separator, { role: 'front' });
    }

    template.push({
      label: '&Window',
      role: 'window',
      submenu: windowMenu
    });

    return template;
  }
}
