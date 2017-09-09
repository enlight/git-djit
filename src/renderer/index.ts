// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { AppWindow } from './app-window';

let appWindow: AppWindow | null = null;

function load(): void {
  appWindow = new AppWindow();
  appWindow.initialize();
}

window.onload = load;

// Enable hot reloading.
if (module.hot) {
  function unload(): void {
    if (appWindow) {
      appWindow.dispose();
      appWindow = null;
    }
  }
  module.hot.accept(() => {
    unload();
    load();
  });
}
