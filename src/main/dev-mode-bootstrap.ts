// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

/**
 * Sets up dev-mode things like React HMR, DevTools extensions etc.
 *
 * This function should be called in the main process after the app emits the `ready` event
 * and before anything else runs.
 */
export default async function setupDevMode(): Promise<void> {
  await installExtension(REACT_DEVELOPER_TOOLS);
}
