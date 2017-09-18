// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

declare module 'devtron' {
  /**
   * Install the Devtron DevTools extension.
   *
   * Can be called from main process, or the renderer process,
   * but must only be called after `app` emits the `ready` event.
   *
   * @return The name of the extension.
   */
  function install(): string;
  /**
   * Uninstall the Devtron DevTools extension.
   *
   * Can be called from the main process, or the renderer process,
   * but must only be called after `app` emits the `ready` event.
   */
  function uninstall(): void;
  /**
   * Path to the extension source directory.
   */
  var path: string;
}
