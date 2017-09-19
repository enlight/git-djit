// Copyright (c) GitHub, Inc.
// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { git } from '../core';

/** Get the number of commits in HEAD. */
export async function getCommitCount(localPath: string): Promise<number> {
  const result = await git(['rev-list', '--count', 'HEAD'], localPath, 'getCommitCount', {
    successExitCodes: new Set([0, 128])
  });
  // error code 128 is returned if the branch is unborn
  if (result.exitCode === 128) {
    return 0;
  } else {
    const count = result.stdout;
    return parseInt(count.trim(), 10);
  }
}
