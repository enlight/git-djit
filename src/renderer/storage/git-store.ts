// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { applySnapshot, getSnapshot, process, types } from 'mobx-state-tree';

import { getCommit, getCommitCount, getCommits, getStatus, ICommit, IStatusResult } from '../git';

export const CommitModel = types.model('Commit', {
  /** Commit SHA */
  id: types.identifier(types.string),
  /** First line of the commit message */
  summary: types.string,
  /** Commit message (excluding the first line) */
  body: types.string,
  /** SHAs of the parents of the commit */
  parentIds: types.array(types.string),
  authorName: types.string,
  authorEmail: types.string,
  date: types.Date,
  tzOffset: types.number
});

export type ICommitModel = typeof CommitModel.Type;

export enum BranchKind {
  Local = 0,
  Remote
}

export const BranchKindModel = types.union(
  types.literal(BranchKind.Local),
  types.literal(BranchKind.Remote)
);

export const BranchModel = types.model('Branch', {
  /** Short name of the branch, e.g. `master` */
  name: types.string,
  /** Remote-prefixed upstream name, e.g. `origin/master` */
  upstream: types.maybe(types.string),
  /** Most recent commit on this branch */
  tip: CommitModel,
  kind: BranchKindModel
});

export type IBranchModel = typeof BranchModel.Type;

export enum TipState {
  Unknown = 0,
  Unborn,
  Detached,
  Valid
}

export const UnknownRepositoryModel = types.model('UnknownRepository', {
  kind: types.literal(TipState.Unknown)
});

export const UnbornRepositoryModel = types.model('UnbornRepository', {
  kind: types.literal(TipState.Unborn),
  /**
   * Symbolic reference that the unborn repository points to currently.
   *
   * Typically this will be `master` but a user can easily create orphaned
   * branches externally.
   */
  ref: types.string
});

export const DetachedHeadRepositoryModel = types.model('DetachedHeadRepository', {
  kind: types.literal(TipState.Detached),
  /** Commit SHA of the current tip of the repository */
  commitId: types.string
});

export const ValidBranchRepositoryModel = types.model('ValidBranchRepository', {
  kind: types.literal(TipState.Valid),
  /** Branch of the current tip of the repository */
  branch: BranchModel
});

export const TipModel = types.union(
  UnknownRepositoryModel,
  UnbornRepositoryModel,
  DetachedHeadRepositoryModel,
  ValidBranchRepositoryModel
);

export type IUnknownRepositoryModel = typeof UnknownRepositoryModel.Type;
export type IUnbornRepositoryModel = typeof UnbornRepositoryModel.Type;
export type IDetachedHeadRepositoryModel = typeof DetachedHeadRepositoryModel.Type;
export type IValidBranchRepositoryModel = typeof ValidBranchRepositoryModel.Type;
export type ITipModel = typeof TipModel.Type;

export function isTipBranchValid(tip: ITipModel | null): tip is IValidBranchRepositoryModel {
  return !!tip && tip.kind === TipState.Valid;
}

const HISTORY_BATCH_SIZE = 100;

/** Options that can be passed in to GitStore.loadNextHistoryBatch(). */
export interface ILoadNextHistoryBatchOptions {
  /**
   * If specified the next batch of commits that will be loaded will be large enough to grow the
   * loaded history to the specified size. This can be useful to ensure that a sufficiently large
   * range of commits is loaded without having to call loadNextHistoryBatch() over and over again.
   */
  minHistorySize?: number;
}

/** Stores information about the commits and branches of a Git repository. */
export const GitStore = types
  .model('GitStore', {
    /** Absolute path to the root working directory of the repository. */
    localPath: types.string,
    branches: types.optional(types.array(BranchModel), () => []),
    isStatusLoaded: false,
    tip: types.optional(TipModel, () => TipModel.create({ kind: TipState.Unknown })),
    /** Maps commit id to commit model. */
    commitMap: types.optional(types.map(CommitModel), () => ({})),
    /** All the currently loaded commits, the most recent commit will be the first item in the list. */
    loadedCommits: types.optional(types.array(CommitModel), () => []),
    /** Total number of commits that can be loaded from the Git repository. */
    totalHistorySize: types.optional(types.number, () => 0)
  })
  .actions(self => {
    let isStatusLoading = false;
    let isFirstHistoryBatchLoading = false;
    let isNextHistoryBatchLoading = false;
    let minRequestedHistorySize = 0;

    function* refreshStatus() {
      if (isStatusLoading) {
        return;
      }
      isStatusLoading = true;

      try {
        const status: IStatusResult = yield getStatus(self.localPath);
        const { branchName, branchCommitId, upstreamBranchName } = status;

        if (branchName || branchCommitId) {
          if (branchName && branchCommitId) {
            const branchCommit: ICommit = yield getCommit(self.localPath, branchCommitId);
            if (!branchCommit) {
              throw new Error(`Failed to load commit ${branchCommitId}`);
            }
            const tip = CommitModel.create({
              id: branchCommit.sha,
              summary: branchCommit.summary,
              body: branchCommit.body,
              parentIds: branchCommit.parentSHAs,
              authorName: branchCommit.author.name,
              authorEmail: branchCommit.author.email,
              date: branchCommit.author.date,
              tzOffset: branchCommit.author.tzOffset
            });
            let branch = self.branches.find(
              b => b.name === branchName && b.kind === BranchKind.Local
            );
            if (branch) {
              const snapshot = getSnapshot<typeof BranchModel.SnapshotType>(branch);
              applySnapshot(branch, Object.assign(snapshot, { upstream: upstreamBranchName, tip }));
            } else {
              branch = BranchModel.create({
                name: branchName,
                upstream: upstreamBranchName,
                tip,
                kind: BranchKind.Local
              });
            }
            self.tip = TipModel.create({ kind: TipState.Valid, branch });
          } else if (branchCommitId) {
            self.tip = TipModel.create({ kind: TipState.Detached, commitId: branchCommitId });
          } else if (branchName) {
            self.tip = TipModel.create({ kind: TipState.Unborn, ref: branchName });
          }
        } else {
          self.tip = TipModel.create({ kind: TipState.Unknown });
        }
      } catch (e) {
        self.isStatusLoaded = false;
        throw e;
      } finally {
        isStatusLoading = false;
      }
    }

    function createSnapshotFromCommit(commit: ICommit) {
      return {
        id: commit.sha,
        summary: commit.summary,
        body: commit.body,
        parentIds: commit.parentSHAs,
        authorName: commit.author.name,
        authorEmail: commit.author.email,
        date: commit.author.date,
        tzOffset: commit.author.tzOffset
      };
    }

    function* loadFirstHistoryBatch() {
      if (isFirstHistoryBatchLoading) {
        return;
      }
      isFirstHistoryBatchLoading = true;
      try {
        self.totalHistorySize = yield getCommitCount(self.localPath);
        // Load commits in reverse chronological order.
        const commits: ICommit[] = yield getCommits(self.localPath, 'HEAD', {
          maxCount: HISTORY_BATCH_SIZE
        });
        const shaSnapshotPairs = commits.map(
          c => [c.sha, createSnapshotFromCommit(c)] as [string, ICommitModel]
        );
        self.commitMap.replace(shaSnapshotPairs);
        self.loadedCommits.replace(shaSnapshotPairs.map(([_, snapshot]) => snapshot));
      } catch (e) {
        // TODO: log
        throw e;
      } finally {
        isFirstHistoryBatchLoading = false;
      }
      if (self.loadedCommits.length < minRequestedHistorySize) {
        yield* loadNextHistoryBatch();
      } else {
        minRequestedHistorySize = 0;
      }
    }

    function* loadNextHistoryBatch(options?: ILoadNextHistoryBatchOptions): any {
      if (self.totalHistorySize <= self.loadedCommits.length) {
        // nothing to do, everything has already been loaded or will be soon
        return;
      }
      if (options && options.minHistorySize) {
        minRequestedHistorySize = Math.max(minRequestedHistorySize, options.minHistorySize);
        if (self.loadedCommits.length >= minRequestedHistorySize) {
          return;
        }
      }
      if (isFirstHistoryBatchLoading || isNextHistoryBatchLoading) {
        return;
      }

      let minCommitsToLoad;
      if (minRequestedHistorySize === 0) {
        minCommitsToLoad = HISTORY_BATCH_SIZE;
      } else {
        minCommitsToLoad = minRequestedHistorySize - self.loadedCommits.length;
      }
      let batchSize = HISTORY_BATCH_SIZE;
      if (minCommitsToLoad > batchSize) {
        batchSize = (Math.floor(minCommitsToLoad / HISTORY_BATCH_SIZE) + 1) * HISTORY_BATCH_SIZE;
      } else if (minCommitsToLoad <= 0) {
        return;
      }

      isNextHistoryBatchLoading = true;
      // minRequestedHistorySize may be modified while the current batch is loaded,
      // store the current value so that we can check if the full batch was loaded or not.
      const initialRequestedHistorySize = minRequestedHistorySize;
      try {
        const lastLoadedCommitIdx = self.loadedCommits.length - 1;
        const lastLoadedCommitId = self.loadedCommits[lastLoadedCommitIdx].id;
        console.log(
          `Loading up to ${batchSize} commits after ${lastLoadedCommitId} at index ${lastLoadedCommitIdx}`
        );
        const commits: ICommit[] = yield getCommits(self.localPath, 'HEAD', {
          skipCount: lastLoadedCommitIdx + 1,
          maxCount: batchSize
        });
        const shaSnapshotPairs = commits.map(
          c => [c.sha, createSnapshotFromCommit(c)] as [string, ICommitModel]
        );
        self.commitMap.merge(shaSnapshotPairs);
        self.loadedCommits.push(...shaSnapshotPairs.map(([_, snapshot]) => snapshot));
        console.log(`Loaded commits [${lastLoadedCommitIdx + 1},${self.loadedCommits.length - 1}]`);
      } catch (e) {
        // TODO: log
        throw e;
      } finally {
        isNextHistoryBatchLoading = false;
      }

      const shouldLoadNextBatch =
        self.loadedCommits.length >= initialRequestedHistorySize &&
        self.loadedCommits.length < minRequestedHistorySize;

      if (shouldLoadNextBatch) {
        yield* loadNextHistoryBatch();
      } else {
        minRequestedHistorySize = 0;
      }
    }

    return {
      refreshStatus: process<void>(refreshStatus),
      loadFirstHistoryBatch: process<void>(loadFirstHistoryBatch),
      loadNextHistoryBatch: process(loadNextHistoryBatch) as (
        options?: ILoadNextHistoryBatchOptions
      ) => Promise<void>
    };
  });

export type IGitStore = typeof GitStore.Type;
