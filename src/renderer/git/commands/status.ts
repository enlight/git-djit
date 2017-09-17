// Copyright (c) GitHub, Inc.
// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { git } from '../core';
import { parsePorcelainStatus, StatusItemKind } from '../status-parser';

export interface IBranchAheadBehind {
  ahead: number;
  behind: number;
}

/** Output produced by 'git status' command. */
export interface IStatusResult {
  branchName: string | null;
  upstreamBranchName: string | null;
  branchCommitId: string | null;
  branchAheadBehind: IBranchAheadBehind | null;
}

/**
 *  Get the status of the working tree in the given directory.
 */
export async function getStatus(repositoryPath: string): Promise<IStatusResult> {
  const result = await git(
    ['status', '--untracked-files=all', '--branch', '--porcelain=2', '-z'],
    repositoryPath,
    'getStatus'
  );

  let branchName = null;
  let upstreamBranchName = null;
  let branchCommitId = null;
  let branchAheadBehind = null;

  for (const statusItem of parsePorcelainStatus(result.stdout)) {
    switch (statusItem.kind) {
      case StatusItemKind.BranchCommitHeader:
        branchCommitId = statusItem.commitHash;
        break;
      case StatusItemKind.BranchHeadHeader:
        branchName = statusItem.branchName;
        break;
      case StatusItemKind.BranchUpstreamHeader:
        upstreamBranchName = statusItem.branchName;
        break;
      case StatusItemKind.BranchAheadBehindHeader:
        branchAheadBehind = { ahead: statusItem.ahead, behind: statusItem.behind };
        break;
      case StatusItemKind.UnknownHeader:
        // Just ignore it.
        break;
    }
  }

  return {
    branchName,
    branchCommitId,
    upstreamBranchName,
    branchAheadBehind
  };
}
