// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Classes as BlueprintClasses, ITreeNode, Tree } from '@blueprintjs/core';
import { computed } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';

import ReactWidget from './react-widget';
import { IAppStore } from './storage/app-store';
import { IRepositoryStore } from './storage/repository-store';
import { IUiStore } from './storage/ui-store';

export interface IRepositoryListProps {
  repositoryStore: IRepositoryStore;
  uiStore: IUiStore;
}

@observer
class RepositoryList extends React.Component<IRepositoryListProps> {
  @computed
  get items(): ITreeNode[] {
    return this.props.repositoryStore.repositories.map<ITreeNode>(repo => ({
      id: repo.id,
      label: repo.name,
      isSelected: this.props.uiStore.selectedRepository === repo
    }));
  }

  onRepositoryClick = (node: ITreeNode) => {
    const repository = this.props.repositoryStore.repositories.find(repo => node.id === repo.id);
    if (repository) {
      this.props.uiStore.selectRepository(repository);
    }
  };

  render() {
    return <Tree contents={this.items} onNodeClick={this.onRepositoryClick} />;
  }
}

export class RepositoryListWidget extends ReactWidget<IRepositoryListProps> {
  constructor(appStore: IAppStore) {
    super(RepositoryList, { repositoryStore: appStore.repositories!, uiStore: appStore.ui! });
    this.addClass(BlueprintClasses.TAB_PANEL);
    this.node.setAttribute('role', 'tabpanel');
    this.id = 'repoList';
    this.title.label = 'Repositories';
  }
}
