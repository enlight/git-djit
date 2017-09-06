// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { ITreeNode, Tree } from '@blueprintjs/core';
import { computed } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';

import { IRepositoryStore } from './storage/repository-store';

export interface IRepositoryListProps {
  store: IRepositoryStore;
}

@observer
export default class RepositoryList extends React.Component<IRepositoryListProps> {
  @computed
  get items(): ITreeNode[] {
    return this.props.store.repositories.map(repo => ({
      id: repo.id,
      label: repo.name
    }));
  }

  render() {
    return <Tree contents={this.items} />;
  }
}
