// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { process, types } from 'mobx-state-tree';

import { AppDatabase } from './app-database';
import { IRepositoryModel, RepositoryStore } from './repository-store';
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
  .views(self => ({
    get selectedRepository(): IRepositoryModel | null {
      return self.ui ? self.ui.selectedRepository : null;
    }
  }))
  .actions(self => ({
    /**
     * Change the currently selected repository.
     *
     * @param repository The repository to select, or `null` to deselect the currently selected
     *                   repository.
     * @return A promise that will be resolved when the operation is complete. Note that the
     *         selection will change immediately, but the operation won't be complete until
     *         the status of the newly selected repository is refreshed.
     */
    async selectRepository(repository: IRepositoryModel | null): Promise<void> {
      self.ui!.selectRepository(repository);
      if (repository) {
        await repository.refreshStatus();
        await repository.loadHistory();
      }
    }
  }))
  .actions(self => {
    function* load() {
      self.repositories = RepositoryStore.create();
      yield self.repositories.load();
      // UiStore has references to the RepositoryStore so it must be created last.
      self.ui = UiStore.create();
    }

    async function removeRepository(repository: IRepositoryModel): Promise<void> {
      const uiStore = self.ui!;
      if (repository === uiStore.selectedRepository) {
        self.selectRepository(uiStore.previouslySelectedRepository);
      }
      await self.repositories!.removeRepository(repository.id);
    }

    return {
      /** Populate the store from persistent storage. */
      load: process<void>(load),
      /** Remove the given repository and update the current selection if necessary. */
      removeRepository
    };
  });

export type IAppStore = typeof AppStore.Type;
