// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { process, types } from 'mobx-state-tree';

import { AppDatabase } from './app-database';
import { RepositoryStore } from './repository-store';
import { UiStore } from './ui-store';

export interface IAppStoreEnv {
  /** The database the store should use for persistance. */
  db: AppDatabase;
}

/**
 * The uber store, creates and manages all the other stores.
 *
 * Invoke the async `load()` action to initialize contents after the store is created.
 */
export const AppStore = types
  .model('AppStore', {
    ui: types.maybe(UiStore),
    repositories: types.maybe(RepositoryStore)
  })
  .actions(self => {
    function* load() {
      self.repositories = RepositoryStore.create();
      yield self.repositories.load();
      // UiStore has references to the RepositoryStore so it must be created last.
      self.ui = UiStore.create();
    }

    return {
      load: process<void>(load)
    };
  });

export type IAppStore = typeof AppStore.Type;
