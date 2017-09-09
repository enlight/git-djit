// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Button, InputGroup } from '@blueprintjs/core';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';

import RendererSystemDialogService from '../system-dialog-service';

export interface IFilePathInputProps {
  model: FilePathInput;
}

/**
 * React SFC that renders an input field that displays a file/directory path, and allows the user
 * to edit the path either by browsing the file system or by typing in the path.
 */
export function FilePathInputView(props: IFilePathInputProps) {
  const model = props.model;
  const browseButton = (
    <Button iconName="folder-open" onClick={model.onBrowse}>
      Browse...
    </Button>
  );
  return (
    <label className="pt-label">
      {model.label}
      <InputGroup value={model.filePath} rightElement={browseButton} />
    </label>
  );
}

export default observer(FilePathInputView);

export class FilePathInput {
  @observable label: string;
  @observable filePath = '';

  constructor(private dialogService: RendererSystemDialogService, opts?: { label?: string }) {
    if (opts) {
      this.label = opts.label || '';
    } else {
      this.label = '';
    }
  }

  @action.bound
  async onBrowse() {
    const filePath = await this.dialogService.promptForSingleDirectory();
    this.filePath = filePath || '';
  }
}
