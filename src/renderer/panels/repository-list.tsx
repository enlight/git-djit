// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Classes as BlueprintClasses, ITreeNode, Tree } from '@blueprintjs/core';
import { computed } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import { style } from 'typestyle';

import { ContextMenu } from '../context-menu';
import ReactWidget from '../react-widget';
import RendererContextMenuService from '../services/context-menu-service';
import { IAppStore } from '../storage/app-store';
import { IRepositoryStore } from '../storage/repository-store';
import { IUiStore } from '../storage/ui-store';

enum TreeNodeType {
  Repository = 0,
  RepositoryFolder = 1
}

interface ITypedTreeNode extends ITreeNode {
  id: number;
  nodeType: TreeNodeType;
}

export interface IRepositoryListProps {
  appStore: IAppStore;
  repositoryStore: IRepositoryStore;
  uiStore: IUiStore;
  contextMenuService: RendererContextMenuService;
}

@observer
class RepositoryList extends React.Component<IRepositoryListProps> {
  private _cssClass = style({
    flex: '1 1 auto',
    overflow: 'auto'
  });

  @computed
  get items(): ITypedTreeNode[] {
    return this.props.repositoryStore.repositories.map<ITypedTreeNode>(repo => ({
      id: repo.id,
      label: repo.name,
      secondaryLabel: repo.currentBranch ? repo.currentBranch.name : undefined,
      isSelected: this.props.uiStore.selectedRepository === repo,
      nodeType: TreeNodeType.Repository
    }));
  }

  onClick = (node: ITypedTreeNode) => {
    switch (node.nodeType) {
      case TreeNodeType.Repository:
        const repository = this.props.repositoryStore.findById(node.id);
        if (repository) {
          this.props.appStore.selectRepository(repository);
        }
        break;
    }
  };

  onContextMenu = (node: ITypedTreeNode) => {
    switch (node.nodeType) {
      case TreeNodeType.Repository:
        const repository = this.props.repositoryStore.findById(node.id);
        if (repository) {
          const menu = new ContextMenu();
          menu.item('Remove', { action: () => this.props.appStore.removeRepository(repository) });
          // TODO: pass the context up the tree to let parent nodes append items to the menu
          // node.parentNode.extendContextMenu(menu);
          this.props.contextMenuService.show(menu);
        }
        break;
    }
  };

  render() {
    return (
      <Tree
        className={this._cssClass}
        contents={this.items}
        onNodeClick={this.onClick}
        onNodeContextMenu={this.onContextMenu}
      />
    );
  }
}

export class RepositoryListWidget extends ReactWidget<IRepositoryListProps> {
  constructor(appStore: IAppStore, contextMenuService: RendererContextMenuService) {
    super(RepositoryList, {
      appStore,
      repositoryStore: appStore.repositories!,
      uiStore: appStore.ui!,
      contextMenuService
    });
    this.addClass(BlueprintClasses.TAB_PANEL);
    // BlueprintClasses.TAB_PANEL will add a top margin that's going to throw off whatever
    // computations Phosphor does to absolutely position this widget, as a result content
    // gets cut off at the bottom of the panel. To work around this mess replace the margin with
    // padding.
    this.addClass(style({ marginTop: 0, paddingTop: 20 }));
    this.node.setAttribute('role', 'tabpanel');
    this.id = 'repoList';
    this.title.label = 'Repositories';
  }
}
