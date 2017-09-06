// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { DockPanel, SplitPanel, Widget } from '@phosphor/widgets';
import { ipcRenderer } from 'electron';

import { IpcChannel } from '../common/ipc';
import MenuItemId from '../common/menu-item-ids';
import { showAddLocalRepositoryDialog } from './add-local-repository-dialog';
import ReactWidget from './react-widget';
import { AppDatabase } from './storage/app-database';
import { IRepositoryStore, RepositoryStore } from './storage/repository-store';
import RendererSystemDialogService from './system-dialog-service';

class RepositoryListWidget extends ReactWidget {
  constructor(repositoryStore: IRepositoryStore) {
    super(require('./repository-list-view').default, { store: repositoryStore });
    this.id = 'repoList';
    this.title.label = 'Repositories';
  }
}

export class AppWindow {
  private repositoryStore: IRepositoryStore;
  private systemDialogService = new RendererSystemDialogService();
  private rootPanel: SplitPanel | null = null;

  constructor() {
    ipcRenderer.on(IpcChannel.WindowMenu, this.handleWindowMenuEvent);
    const db = new AppDatabase('AppDatabase');
    this.repositoryStore = RepositoryStore.create({ repositories: [] }, { db });
    this.createDefaultLayout();
    this.repositoryStore.load();
  }

  dispose() {
    ipcRenderer.removeListener(IpcChannel.WindowMenu, this.handleWindowMenuEvent);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.rootPanel) {
      Widget.detach(this.rootPanel);
      this.rootPanel.dispose();
      this.rootPanel = null;
    }
  }

  private onWindowResize = () => {
    if (this.rootPanel) {
      this.rootPanel.update();
    }
  };

  private handleWindowMenuEvent = (_: Electron.IpcMessageEvent, menuItemId: string) => {
    switch (menuItemId) {
      case MenuItemId.AddLocalRepository:
        showAddLocalRepositoryDialog(this.repositoryStore, this.systemDialogService);
        break;
      default:
        throw new Error(`No handler found for menu item '${menuItemId}'`);
    }
  };

  private createDefaultLayout() {
    const repoList = new RepositoryListWidget(this.repositoryStore);
    // const historyList = new HistoryListWidget();
    this.rootPanel = new SplitPanel({ orientation: 'horizontal' });
    this.rootPanel.id = 'root';

    const leftDockPanel = new DockPanel();
    leftDockPanel.addWidget(repoList);

    const rightDockPanel = new DockPanel();
    // rightDockPanel.addWidget(historyList /*, { mode: 'split-right', ref: repoList }*/);

    this.rootPanel.addWidget(leftDockPanel);
    this.rootPanel.addWidget(rightDockPanel);
    this.rootPanel.setRelativeSizes([1, 4]);

    window.addEventListener('resize', this.onWindowResize);
    Widget.attach(this.rootPanel, document.getElementById('appWindowContainer')!);
  }
}
