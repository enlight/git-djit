// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Button, Dialog, Intent } from '@blueprintjs/core';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import * as path from 'path';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import FilePathInputView, { FilePathInput } from './file-path-input';
import { IRepositoryStore } from './storage/repository-store';
import RendererSystemDialogService from './system-dialog-service';

interface IAddLocalRepositoryDialogProps {
  model: AddLocalRepositoryDialog;
}

function AddLocalRepositoryDialogView(props: IAddLocalRepositoryDialogProps) {
  const dialog = props.model;
  return (
    <Dialog
      className="pt-dark"
      title="Add Local Repository"
      isCloseButtonShown={true}
      isOpen={dialog.isOpen}
      onClose={dialog.onCancel}
      canOutsideClickClose={false}>
      <div className="pt-dialog-body">
        <FilePathInputView model={dialog.repositoryInput} />
      </div>
      <div className="pt-dialog-footer">
        <div className="pt-dialog-footer-actions">
          <Button text="OK" intent={Intent.PRIMARY} onClick={dialog.onOK} />
          <Button text="Cancel" onClick={dialog.onCancel} />
        </div>
      </div>
    </Dialog>
  );
}

const AddLocalRepositoryDialogObserver = observer(AddLocalRepositoryDialogView);

class AddLocalRepositoryDialog {
  @observable isOpen = true;
  @observable repositoryInput: FilePathInput;

  constructor(
    private repositoryStore: IRepositoryStore,
    dialogService: RendererSystemDialogService
  ) {
    this.repositoryInput = new FilePathInput(dialogService, { label: 'Local Path' });
  }

  @action.bound
  onOK() {
    // TODO: normalize the repository path
    const dirPath = this.repositoryInput.filePath;
    // check if there's already a repository model with the same path in the store
    const existingRepo = this.repositoryStore.repositories.find(
      repo => repo.localPath === this.repositoryInput.filePath
    );
    if (existingRepo) {
      // TODO: select/highlight the repo
    } else {
      // TODO: validate repository path, show error if validation fails and prevent dialog closure
      this.repositoryStore.addRepository({ localPath: dirPath, name: path.basename(dirPath) });
    }
    this.isOpen = false;
  }

  @action.bound
  onCancel() {
    this.isOpen = false;
  }
}

export function showAddLocalRepositoryDialog(
  repositoryStore: IRepositoryStore,
  dialogService: RendererSystemDialogService
) {
  const dialog = new AddLocalRepositoryDialog(repositoryStore, dialogService);
  ReactDOM.render(
    <AddLocalRepositoryDialogObserver model={dialog} />,
    document.getElementById('dialogContainer')
  );
}
