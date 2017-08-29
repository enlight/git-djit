// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { AppWindow as AppWindowComponent } from './app-window';
import { AppContainer } from './react-hot-loader';

const render = () => {
  const AppWindow: typeof AppWindowComponent = require('./app-window').AppWindow;
  ReactDOM.render(
    React.createElement(AppContainer, {}, React.createElement(AppWindow)),
    document.getElementById('AppWindowContainer')
  );
};

render();

// Enable hot reloading.
if (module.hot) {
  module.hot.accept(render);
}
