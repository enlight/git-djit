// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Button, Classes as BlueprintClasses, InputGroup } from '@blueprintjs/core';
import { action, IReactionDisposer, observable, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import { classes } from 'typestyle';

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
  const formClasses = [BlueprintClasses.FORM_GROUP];
  if (model.validationError) {
    formClasses.push(BlueprintClasses.INTENT_DANGER);
  }
  const browseButton = (
    <Button iconName="folder-open" onClick={model.onBrowse}>
      Browse...
    </Button>
  );
  return (
    <div className={classes(...formClasses)}>
      <label className={BlueprintClasses.LABEL}>
        {model.label}
        <InputGroup
          className={model.validationError ? BlueprintClasses.INTENT_DANGER : ''}
          value={model.filePath}
          rightElement={browseButton}
          onChange={model.onValueChange}
        />
      </label>
      <div className={BlueprintClasses.FORM_HELPER_TEXT}>{model.validationError}</div>
    </div>
  );
}

export default observer(FilePathInputView);

export interface IFilePathInputOptions {
  systemDialogService: RendererSystemDialogService;
  label?: string;
  validate?: (filePath: string) => Promise<string | null>;
}

export class FilePathInput {
  @observable label: string;
  @observable filePath = '';
  @observable isValid = false;
  @observable validationError = '';

  private dialogService: RendererSystemDialogService;
  private disposeValidator: IReactionDisposer | null = null;

  constructor(options: IFilePathInputOptions) {
    this.dialogService = options.systemDialogService;
    this.label = options.label || '';
    if (options.validate) {
      const validate = options.validate;
      this.disposeValidator = reaction(
        () => this.filePath,
        async () => {
          const errorMsg = await validate(this.filePath);
          runInAction('FilePathInputValidator', () => {
            this.isValid = errorMsg === null;
            this.validationError = errorMsg || '';
          });
        },
        { name: 'FilePathInputValidator', delay: 100 }
      );
    }
  }

  dispose() {
    if (this.disposeValidator) {
      this.disposeValidator();
      this.disposeValidator = null;
    }
  }

  @action.bound
  async onBrowse() {
    const filePath = await this.dialogService.promptForSingleDirectory();
    if (filePath !== null) {
      runInAction('onBrowse', () => (this.filePath = filePath || ''));
    }
  }

  @action.bound
  onValueChange(e: React.FormEvent<HTMLInputElement>) {
    this.filePath = e.currentTarget.value;
  }
}
