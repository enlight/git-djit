// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Classes } from '@blueprintjs/core';
import { ElementAttrs, h, VirtualElement } from '@phosphor/virtualdom';
import { DockPanel, TabBar, Widget } from '@phosphor/widgets';
import { classes, style } from 'typestyle';

class CustomTabBarRenderer extends TabBar.Renderer {
  createTabClass(data: TabBar.IRenderData<any>): string {
    let name = `p-TabBar-tab ${Classes.TAB}`;
    if (data.title.className) {
      name += ` ${data.title.className}`;
    }
    if (data.title.closable) {
      name += ' p-mod-closable';
    }
    return name;
  }

  renderTab(data: TabBar.IRenderData<any>): VirtualElement {
    const tabClass = style({
      height: '30px',
      padding: '1px 6px'
    });
    const attrs: ElementAttrs = {
      key: this.createTabKey(data),
      className: classes(this.createTabClass(data), tabClass),
      title: data.title.caption,
      style: this.createTabStyle(data),
      dataset: this.createTabDataset(data)
    };
    let extraAttrs: any;
    if (data.current) {
      extraAttrs = { role: 'tab', 'aria-selected': 'true' };
    } else {
      extraAttrs = { role: 'tab' };
    }

    return h.li(
      Object.assign(attrs, extraAttrs),
      this.renderIcon(data),
      this.renderLabel(data),
      this.renderCloseIcon(data)
    );
  }
}

let tabRenderer: CustomTabBarRenderer;

function getOrCreateTabRenderer(): CustomTabBarRenderer {
  if (!tabRenderer) {
    tabRenderer = new CustomTabBarRenderer();
  }
  return tabRenderer;
}

class CustomDockPanelRenderer extends DockPanel.Renderer {
  createTabBar(): TabBar<Widget> {
    const bar = new TabBar<Widget>({ renderer: getOrCreateTabRenderer() });
    bar.addClass('p-DockPanel-tabBar');
    bar.addClass(
      style({
        minHeight: '30px',
        maxHeight: '30px'
      })
    );
    const tabList = bar.contentNode;
    tabList.classList.add(Classes.TAB_LIST);
    tabList.setAttribute('role', 'tablist');
    return bar;
  }
}

let dockPanelRenderer: CustomDockPanelRenderer;

function getOrCreateDockPanelRenderer(): CustomDockPanelRenderer {
  if (!dockPanelRenderer) {
    dockPanelRenderer = new CustomDockPanelRenderer();
  }
  return dockPanelRenderer;
}

export default class StyledDockPanel extends DockPanel {
  constructor() {
    super({ renderer: getOrCreateDockPanelRenderer() });
    this.addClass(Classes.TABS);
  }
}
