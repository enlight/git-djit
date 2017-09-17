// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { applySnapshot, isAlive, types } from 'mobx-state-tree';

import { Omit } from '../../common/typescript-extensions';
import { IRepositoryModel, RepositoryModel } from './repository-store';

/**
 * Keys of values stored in localStorage.
 *
 * These keys must match the property names in UiStore.
 */
enum StorageKey {
  SelectedRepository = '_selectedRepository',
  PreviouslySelectedRepository = '_previouslySelectedRepository'
}

/**
 * Store an integer value in `localStorage`.
 *
 * @param key Key to store the integer value under.
 * @param value An integer to store, or `null` if the existing key/value should be removed.
 */
function storeInt(key: StorageKey, value: number | null) {
  if (value !== null) {
    localStorage.setItem(key, value.toString());
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Load an integer value from `localStorage`.
 * @param key The key associated with value to be retrieved.
 * @return An integer, or `null` if the specified key wasn't found.
 */
function loadInt(key: StorageKey): number | null {
  const value = localStorage.getItem(key);
  if (value !== null) {
    return parseInt(value, 10);
  }
  return null;
}

/**
 * Stores UI state like current selections, window size and layout etc.
 *
 * The store contents are persisted to `localStorage`. Contents are automatically loaded when the
 * store is created.
 */
export const UiStore = types
  .model('UiStore', {
    /** The currently selected repository (if any) */
    _selectedRepository: types.maybe(types.reference(RepositoryModel)),
    /** The previously selected repository (if any) */
    _previouslySelectedRepository: types.maybe(types.reference(RepositoryModel))
  })
  .views(self => {
    return {
      /** The currently selected repository, or `null` if none is currently selected. */
      get selectedRepository(): IRepositoryModel | null {
        // mobx-state-tree throws exceptions when it fails to resolve a reference to a node
        // (because the identifier in the snapshot refers to a model that no longer exists),
        // and when an attempt is made to access a dead node. Since the app can handle the
        // case where no repository is selected just fine these exceptions should be swallowed.
        try {
          const repo = self._selectedRepository;
          return repo && isAlive(repo) ? repo : null;
        } catch {
          // TODO: Log: Previously selected repository not found.
        }
        return null;
      },

      /** The previously selected repository, or `null` if none was previously selected. */
      get previouslySelectedRepository(): IRepositoryModel | null {
        try {
          const repo = self._previouslySelectedRepository;
          return repo && isAlive(repo) ? repo : null;
        } catch {
          // TODO: Log: Previously selected repository not found.
        }
        return null;
      }
    };
  })
  .actions(self => {
    function afterCreate() {
      const snap: typeof UiStore.SnapshotType = {
        [StorageKey.SelectedRepository]: loadInt(StorageKey.SelectedRepository),
        [StorageKey.PreviouslySelectedRepository]: loadInt(StorageKey.PreviouslySelectedRepository)
      };
      applySnapshot(self, snap);
    }

    function selectRepository(repository: IRepositoryModel | null) {
      if (self._selectedRepository === repository) {
        return;
      }
      self._previouslySelectedRepository = self._selectedRepository;
      self._selectedRepository = repository;
      storeInt(StorageKey.SelectedRepository, repository ? repository.id : null);
      storeInt(
        StorageKey.PreviouslySelectedRepository,
        self._previouslySelectedRepository ? self._previouslySelectedRepository.id : null
      );
    }

    return {
      afterCreate,
      /**
       * Select the given repository or deselect the currently selected repository.
       *
       * Should only be called directly by the AppStore, use AppStore.selectRepository()
       * everywhere else.
       */
      selectRepository
    };
  });

export type IUiStore = Omit<
  typeof UiStore.Type,
  '_selectedRepository' | '_previouslySelectedRepository'
>;
