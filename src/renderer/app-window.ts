// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Classes as BlueprintClasses } from '@blueprintjs/core';
import { SplitPanel, Widget } from '@phosphor/widgets';
import { ipcRenderer } from 'electron';
import { forceRenderStyles, style } from 'typestyle';

import { IpcChannel } from '../common/ipc';
import MenuItemId from '../common/menu-item-ids';
import { showAddLocalRepositoryDialog } from './add-local-repository-dialog';
import ReactWidget from './react-widget';
import { AppDatabase } from './storage/app-database';
import { IRepositoryStore, RepositoryStore } from './storage/repository-store';
import { injectCssRules } from './style';
import StyledDockPanel from './styled-dock-panel';
import RendererSystemDialogService from './system-dialog-service';

class RepositoryListWidget extends ReactWidget {
  constructor(repositoryStore: IRepositoryStore) {
    super(require('./repository-list-view').default, { store: repositoryStore });
    this.addClass(BlueprintClasses.TAB_PANEL);
    this.node.setAttribute('role', 'tabpanel');
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
    this.rootPanel.addClass(
      style({
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'row'
      })
    );

    const leftDockPanel = new StyledDockPanel();
    leftDockPanel.addWidget(repoList);

    const rightDockPanel = new StyledDockPanel();
    // rightDockPanel.addWidget(historyList /*, { mode: 'split-right', ref: repoList }*/);

    SplitPanel.setStretch(leftDockPanel, 1);
    SplitPanel.setStretch(rightDockPanel, 4);
    this.rootPanel.addWidget(leftDockPanel);
    this.rootPanel.addWidget(rightDockPanel);
    // NOTE: Phosphor docs don't explain the difference between setStretch() and
    // setRelativeSizes(), but from my experiments it appears setStretch() is more
    // reliable. While setRelativeSizes() initially resizes things as expected the
    // relative sizes aren't reliably enforced when the window is resized. So, it
    // would appear setRelativeSizes() is designed to achieve an immediate one off
    // effect.
    // this.rootPanel.setRelativeSizes([1, 4]);

    window.addEventListener('resize', this.onWindowResize);

    injectCssRules();
    // Force TypeStyle to update styles immediately, otherwise the Phosphor layout
    // gets screwed up for some reason.
    forceRenderStyles();

    const appWindowContainer = document.getElementById('appWindowContainer');
    if (appWindowContainer) {
      // Enable the Dark Blueprint theme
      appWindowContainer.classList.add(BlueprintClasses.DARK);
      Widget.attach(this.rootPanel, appWindowContainer);
    }
  }
}
