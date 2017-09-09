// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { applySnapshot, types } from 'mobx-state-tree';

import { IRepositoryModel, RepositoryModel } from './repository-store';

enum StorageKey {
  SelectedRepository = 'selectedRepository'
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
    selectedRepository: types.maybe(types.reference(RepositoryModel))
  })
  .actions(self => {
    function afterCreate() {
      const snap: typeof UiStore.SnapshotType = {
        [StorageKey.SelectedRepository]: loadInt(StorageKey.SelectedRepository)
      };
      applySnapshot(self, snap);
    }

    function selectRepository(repository: IRepositoryModel | null) {
      self.selectedRepository = repository;
      storeInt(
        StorageKey.SelectedRepository,
        self.selectedRepository ? self.selectedRepository.id : null
      );
    }

    return {
      afterCreate,
      selectRepository
    };
  });

export type IUiStore = typeof UiStore.Type;
