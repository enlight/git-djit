// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Message } from '@phosphor/messaging';
import { Widget } from '@phosphor/widgets';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { style } from 'typestyle';

import { AppContainer } from './react-hot-loader';
import { appBackgroundColor } from './style';

const cssClass = style({
  backgroundColor: appBackgroundColor,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '50px',
  minWidth: '50px',
  padding: '4px',
  $nest: {
    '&>div': {
      flex: '1 1 auto',
      overflow: 'auto'
    }
  }
});

/**
 * PhosphorJS widget that wraps a React component.
 */
export default class ReactWidget<TProps = {}> extends Widget {
  constructor(private component: React.ComponentClass<any>, private props?: TProps) {
    super();
    this.addClass(cssClass);
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
