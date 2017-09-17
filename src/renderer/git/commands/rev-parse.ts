// Copyright (c) GitHub, Inc.
// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { RepositoryDoesNotExistErrorCode } from 'dugite';
import * as path from 'path';

import { git } from '../core';

/**
 * Get the absolute path to the top level working directory of a Git repository.
 *
 * @param dirPath The path to a presumptive Git repository, either the root
 *                of the repository or any path within that repository.
 *
 * @returns An absolute path, or `null` if `dirPath` doesn't reside within a Git repository.
 */
export async function getTopLevelWorkingDirectory(dirPath: string): Promise<string | null> {
  let result;

  try {
    // Note, we use --show-cdup here instead of --show-toplevel because show-toplevel
    // dereferences symlinks and we want to resolve a path as closely as possible to
    // what the user gave us.
    result = await git(['rev-parse', '--show-cdup'], dirPath, 'getTopLevelWorkingDirectory', {
      successExitCodes: new Set([0, 128])
    });
  } catch (err) {
    if (err.code === RepositoryDoesNotExistErrorCode) {
      return null;
    }

    throw err;
  }

  // Exit code 128 means it was run in a directory that's not a Git repository.
  if (result.exitCode === 128) {
    return null;
  }

  const relativePath = result.stdout.trim();

  // No output means we're already at the root
  if (!relativePath) {
    return dirPath;
  }

  return path.resolve(dirPath, relativePath);
}

/**
 * Check if the given directory path a git repository.
 *
 * @return A promise that will be resolved with a boolean value when the operation completes.
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
  return (await getTopLevelWorkingDirectory(dirPath)) !== null;
}
