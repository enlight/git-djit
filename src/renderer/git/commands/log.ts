// Copyright (c) GitHub, Inc.
// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { git } from '../core';

export interface ICommitIdentity {
  name: string;
  email: string;
  date: Date;
  tzOffset: number;
}

export interface ICommit {
  /** Commit SHA */
  sha: string;
  /** First line of the commit message */
  summary: string;
  /** Commit message without the first line and CR */
  body: string;
  /** Information about the author of this commit */
  author: ICommitIdentity;
  /** SHAs for the parents of the commit */
  parentSHAs: string[];
}

/**
 * Get the repository's commits using `revisionRange` and limited to `limit`
 */
export async function getCommits(
  localPath: string,
  revisionRange: string,
  limit: number,
  additionalArgs: ReadonlyArray<string> = []
): Promise<ICommit[]> {
  const delimiter = '1F';
  const delimiterString = String.fromCharCode(parseInt(delimiter, 16));
  const prettyFormat = [
    '%H', // SHA
    '%s', // summary
    '%b', // body
    // author identity string, matching format of GIT_AUTHOR_IDENT.
    //   author name <author email> <author date>
    // author date format dependent on --date arg, should be raw
    '%an <%ae> %ad',
    '%P' // parent SHAs
  ].join(`%x${delimiter}`);

  const result = await git(
    [
      'log',
      revisionRange,
      `--date=raw`,
      `--max-count=${limit}`,
      `--pretty=${prettyFormat}`,
      '-z',
      '--no-color',
      ...additionalArgs
    ],
    localPath,
    'getCommits',
    { successExitCodes: new Set([0, 128]) }
  );

  // if the repository has an unborn HEAD, return an empty history of commits
  if (result.exitCode === 128) {
    return [];
  }

  const out = result.stdout;
  const lines = out.split('\0');
  // Remove the trailing empty line
  lines.splice(-1, 1);

  const commits = lines.map(line => {
    const pieces = line.split(delimiterString);
    const sha = pieces[0];
    const summary = pieces[1];
    const body = pieces[2];
    const authorIdentity = pieces[3];
    const shaList = pieces[4];
    const parentSHAs = shaList.length ? shaList.split(' ') : [];
    const author = parseIdentity(authorIdentity);

    if (!author) {
      throw new Error(`Couldn't parse author identity ${authorIdentity}`);
    }

    return { sha, summary, body, author, parentSHAs };
  });

  return commits;
}

/**
 * Get the commit for the given ref.
 *
 * @return Commit details, or `null` if no matching commit was found.
 */
export async function getCommit(localPath: string, ref: string): Promise<ICommit | null> {
  const commits = await getCommits(localPath, ref, 1);
  return commits.length < 1 ? null : commits[0];
}

/**
 * Parses a Git ident string (GIT_AUTHOR_IDENT or GIT_COMMITTER_IDENT)
 * into a commit identity. Returns null if string could not be parsed.
 */
function parseIdentity(identity: string): ICommitIdentity | null {
  // See fmt_ident in ident.c:
  //  https://github.com/git/git/blob/3ef7618e6/ident.c#L346
  //
  // Format is "NAME <EMAIL> DATE"
  //  Markus Olsson <j.markus.olsson@gmail.com> 1475670580 +0200
  //
  // Note that `git var` will strip any < and > from the name and email, see:
  //  https://github.com/git/git/blob/3ef7618e6/ident.c#L396
  //
  // Note also that this expects a date formatted with the RAW option in git see:
  //  https://github.com/git/git/blob/35f6318d4/date.c#L191
  //
  const m = identity.match(/^(.*?) <(.*?)> (\d+) (\+|-)?(\d{2})(\d{2})/);
  if (!m) {
    return null;
  }
  const name = m[1];
  const email = m[2];
  // The date is specified as seconds from the epoch,
  // Date() expects milliseconds since the epoch.
  const date = new Date(parseInt(m[3], 10) * 1000);
  // The RAW option never uses alphanumeric timezone identifiers and in my
  // testing I've never found it to omit the leading + for a positive offset
  // but the docs for strprintf seems to suggest it might on some systems so
  // we're playing it safe.
  const tzSign = m[4] === '-' ? '-' : '+';
  const tzHH = m[5];
  const tzmm = m[6];
  const tzMinutes = parseInt(tzHH, 10) * 60 + parseInt(tzmm, 10);
  const tzOffset = tzMinutes * (tzSign === '-' ? -1 : 1);
  return { name, email, date, tzOffset };
}
