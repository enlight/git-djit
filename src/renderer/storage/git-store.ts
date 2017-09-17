// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { applySnapshot, getSnapshot, process, types } from 'mobx-state-tree';

import { getCommit, getStatus, ICommit, IStatusResult } from '../git';

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

/** Stores information about the commits and branches of a Git repository. */
export const GitStore = types
  .model('GitStore', {
    /** Absolute path to the root working directory of the repository. */
    localPath: types.string,
    branches: types.optional(types.array(BranchModel), () => []),
    isStatusLoaded: false,
    isStatusLoading: false,
    tip: types.optional(TipModel, () => TipModel.create({ kind: TipState.Unknown }))
  })
  .actions(self => {
    function* refreshStatus() {
      if (self.isStatusLoading) {
        return;
      }
      self.isStatusLoading = true;

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
      } catch {
        self.isStatusLoaded = false;
      } finally {
        self.isStatusLoading = false;
      }
    }

    return {
      refreshStatus: process<void>(refreshStatus)
    };
  });

export type IGitStore = typeof GitStore.Type;
