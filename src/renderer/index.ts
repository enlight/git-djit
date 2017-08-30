// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Message } from '@phosphor/messaging';
import { DockPanel, SplitPanel, Widget } from '@phosphor/widgets';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { AppWindow as AppWindowComponent } from './app-window';
import { AppContainer } from './react-hot-loader';

class AppWindowWidget extends Widget {
  constructor() {
    super();
    this.addClass('content');
  }

  protected onAfterAttach(_: Message): void {
    this.update();
  }

  protected onBeforeDetach(_: Message): void {
    ReactDOM.unmountComponentAtNode(this.node);
  }

  protected onUpdateRequest(_: Message): void {
    const AppWindow: typeof AppWindowComponent = require('./app-window').AppWindow;
    ReactDOM.render(
      React.createElement(AppContainer, {}, React.createElement(AppWindow)),
      this.node
    );
  }
}

let rootPanel: SplitPanel | null = null;

function onWindowResize(): void {
  if (rootPanel) {
    rootPanel.update();
  }
}

function load(): void {
  const repoList = new AppWindowWidget();
  repoList.id = 'repoList';
  repoList.title.label = 'Repositories';
  const historyList = new AppWindowWidget();
  historyList.id = 'historyPanel';
  historyList.title.label = 'History';
  rootPanel = new SplitPanel({ orientation: 'horizontal' });
  rootPanel.id = 'root';

  const leftDockPanel = new DockPanel();
  leftDockPanel.addWidget(repoList);

  const rightDockPanel = new DockPanel();
  rightDockPanel.addWidget(historyList /*, { mode: 'split-right', ref: repoList }*/);

  rootPanel.addWidget(leftDockPanel);
  rootPanel.addWidget(rightDockPanel);
  rootPanel.setRelativeSizes([1, 3]);

  window.addEventListener('resize', onWindowResize);
  Widget.attach(rootPanel, document.body);
}

load();

// Enable hot reloading.
if (module.hot) {
  function unload(): void {
    window.removeEventListener('resize', onWindowResize);
    if (rootPanel) {
      Widget.detach(rootPanel);
      rootPanel.dispose();
      rootPanel = null;
    }
  }
  module.hot.accept(() => {
    unload();
    load();
  });
}
