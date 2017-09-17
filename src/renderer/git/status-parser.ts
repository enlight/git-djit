// Copyright (c) GitHub, Inc.
// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

export enum StatusItemKind {
  BranchCommitHeader = 0,
  BranchHeadHeader,
  BranchUpstreamHeader,
  BranchAheadBehindHeader,
  UnknownHeader,
  Entry
}

export interface IBranchCommitStatusHeader {
  kind: StatusItemKind.BranchCommitHeader;
  /** Commit SHA, or `null` for the `initial` commit. */
  commitHash: string | null;
}

export interface IBranchHeadStatusHeader {
  kind: StatusItemKind.BranchHeadHeader;
  /** Branch name, or `null` if the head is detached. */
  branchName: string | null;
}

export interface IBranchUpstreamStatusHeader {
  kind: StatusItemKind.BranchUpstreamHeader;
  branchName: string;
}

export interface IBranchAheadBehindStatusHeader {
  kind: StatusItemKind.BranchAheadBehindHeader;
  ahead: number;
  behind: number;
}

export interface IUnknownStatusHeader {
  kind: StatusItemKind.UnknownHeader;
  value: string;
}

/** A representation of a parsed status entry from git status */
export interface IStatusEntry {
  kind: StatusItemKind.Entry;

  /** The path to the file relative to the repository root */
  path: string;

  /** The two character long status code */
  statusCode: string;

  /** The original path in the case of a renamed file */
  oldPath?: string;
}

export type IStatusHeader =
  | IBranchCommitStatusHeader
  | IBranchHeadStatusHeader
  | IBranchUpstreamStatusHeader
  | IBranchAheadBehindStatusHeader
  | IUnknownStatusHeader;
export type IStatusItem = IStatusHeader | IStatusEntry;

enum EntryKind {
  Changed = '1',
  RenamedOrCopied = '2',
  Unmerged = 'u',
  Untracked = '?',
  Ignored = '!'
}

/** Parses output from git status --porcelain -z into file status entries */
export function parsePorcelainStatus(output: string): ReadonlyArray<IStatusItem> {
  const entries = new Array<IStatusItem>();

  // See https://git-scm.com/docs/git-status
  //
  // In the short-format, the status of each path is shown as
  // XY PATH1 -> PATH2
  //
  // There is also an alternate -z format recommended for machine parsing. In that
  // format, the status field is the same, but some other things change. First,
  // the -> is omitted from rename entries and the field order is reversed (e.g
  // from -> to becomes to from). Second, a NUL (ASCII 0) follows each filename,
  // replacing space as a field separator and the terminating newline (but a space
  // still separates the status field from the first filename). Third, filenames
  // containing special characters are not specially formatted; no quoting or
  // backslash-escaping is performed.

  const fields = output.split('\0');
  let field: string | undefined;

  while ((field = fields.shift())) {
    if (field.startsWith('# ') && field.length > 2) {
      entries.push(parseHeader(field.substr(2)));
      continue;
    }

    const entryKind = field.substr(0, 1);

    switch (entryKind) {
      case EntryKind.Changed:
        entries.push(parseChangedEntry(field));
        break;
      case EntryKind.RenamedOrCopied:
        entries.push(parsedRenamedOrCopiedEntry(field, fields.shift()));
        break;
      case EntryKind.Unmerged:
        entries.push(parseUnmergedEntry(field));
        break;
      case EntryKind.Untracked:
        entries.push(parseUntrackedEntry(field));
        break;
      case EntryKind.Ignored:
        // Ignored, we don't care about these for now
        break;
    }
  }

  return entries;
}

const branchCommitRe = /^branch\.oid (.*)$/;
const branchHeadRe = /^branch.head (.*)$/;
const branchUpstreamRe = /^branch.upstream (.*)$/;
const branchAheadBehindRe = /^branch.ab \+(\d+) -(\d+)$/;

function parseHeader(field: string): IStatusHeader {
  let m = branchCommitRe.exec(field);
  if (m) {
    return {
      kind: StatusItemKind.BranchCommitHeader,
      commitHash: m[1] === '(initial)' ? null : m[1]
    };
  }

  m = branchHeadRe.exec(field);
  if (m) {
    return {
      kind: StatusItemKind.BranchHeadHeader,
      branchName: m[1] === '(detached)' ? null : m[1]
    };
  }

  m = branchUpstreamRe.exec(field);
  if (m) {
    return {
      kind: StatusItemKind.BranchUpstreamHeader,
      branchName: m[1]
    };
  }

  m = branchAheadBehindRe.exec(field);
  if (m) {
    const ahead = parseInt(m[1], 10);
    const behind = parseInt(m[2], 10);

    if (isNaN(ahead) && isNaN(behind)) {
      throw new Error(`Failed to parse status header: ${field}`);
    }

    return {
      kind: StatusItemKind.BranchAheadBehindHeader,
      ahead,
      behind
    };
  }

  return {
    kind: StatusItemKind.UnknownHeader,
    value: field
  };
}

// 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
const changedEntryRe = /^1 ([MADRCU?!.]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) (.*?)$/;

function parseChangedEntry(field: string): IStatusEntry {
  const match = changedEntryRe.exec(field);

  if (!match) {
    throw new Error(`Failed to parse status line for changed entry: ${field}`);
  }

  return {
    kind: StatusItemKind.Entry,
    statusCode: match[1],
    path: match[8]
  };
}

// 2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path><sep><origPath>
const renamedOrCopiedEntryRe = /^2 ([MADRCU?!.]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([RC]\d+) (.*?)$/;

function parsedRenamedOrCopiedEntry(field: string, oldPath: string | undefined): IStatusEntry {
  const match = renamedOrCopiedEntryRe.exec(field);

  if (!match) {
    throw new Error(`Failed to parse status line for renamed or copied entry: ${field}`);
  }

  if (!oldPath) {
    throw new Error('Failed to parse renamed or copied entry, could not parse old path');
  }

  return {
    kind: StatusItemKind.Entry,
    statusCode: match[1],
    oldPath,
    path: match[9]
  };
}

// u <xy> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>
const unmergedEntryRe = /^u ([DAU]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([a-f0-9]+) (.*?)$/;

function parseUnmergedEntry(field: string): IStatusEntry {
  const match = unmergedEntryRe.exec(field);

  if (!match) {
    throw new Error(`Failed to parse status line for unmerged entry: ${field}`);
  }

  return {
    kind: StatusItemKind.Entry,
    statusCode: match[1],
    path: match[10]
  };
}

function parseUntrackedEntry(field: string): IStatusEntry {
  const path = field.substr(2);
  return {
    kind: StatusItemKind.Entry,
    // NOTE: We return ?? instead of ? here to play nice with mapStatus,
    // might want to consider changing this (and mapStatus) in the future.
    statusCode: '??',
    path
  };
}
