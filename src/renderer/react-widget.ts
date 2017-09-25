// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Message } from '@phosphor/messaging';
import { Widget } from '@phosphor/widgets';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { style } from 'typestyle';

import { AppContainer } from './react-hot-loader';
import { appBackgroundColor } from './style';

/**
 * PhosphorJS widget that wraps a React component.
 */
export default class ReactWidget<TProps = {}> extends Widget {
  private _cssClass = style({
    backgroundColor: appBackgroundColor,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '50px',
    minWidth: '50px',
    padding: '4px'
  });

  constructor(private component: React.ComponentClass<TProps>, private props?: TProps) {
    super();
    this.addClass(this._cssClass);
  }

  protected onAfterAttach(_: Message): void {
    this.update();
  }

  protected onBeforeDetach(_: Message): void {
    ReactDOM.unmountComponentAtNode(this.node);
  }

  protected onUpdateRequest(_: Message): void {
    ReactDOM.render(
      React.createElement(AppContainer, {}, React.createElement(this.component, this.props)),
      this.node
    );
  }
}
