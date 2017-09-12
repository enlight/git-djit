// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import MobxReactDevTools from 'mobx-react-devtools';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * Sets up dev-mode things like DevTools extensions etc.
 */
export default function setupDevMode() {
  const mobxDevToolsContainer = document.getElementById('mobxDevToolsContainer');
  ReactDOM.render(React.createElement(MobxReactDevTools), mobxDevToolsContainer);
}
