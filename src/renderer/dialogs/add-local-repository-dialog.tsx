// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Button, Dialog, Intent } from '@blueprintjs/core';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import * as path from 'path';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import FilePathInputView, { FilePathInput } from '../components/file-path-input';
import { getTopLevelWorkingDirectory } from '../git';
import { IRepositoryStore } from '../storage/repository-store';
import { IUiStore } from '../storage/ui-store';
import RendererSystemDialogService from '../system-dialog-service';

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

  private repositoryStore: IRepositoryStore;
  private uiStore: IUiStore;

  constructor(args: {
    repositoryStore: IRepositoryStore;
    uiStore: IUiStore;
    systemDialogService: RendererSystemDialogService;
  }) {
    this.repositoryStore = args.repositoryStore;
    this.uiStore = args.uiStore;
    this.repositoryInput = new FilePathInput(args.systemDialogService, { label: 'Local Path' });
  }

  @action.bound
  async onOK() {
    const dirPath = path.resolve(this.repositoryInput.filePath);
    // check if there's already a repository model with the same path in the store
    const repository = this.repositoryStore.repositories.find(repo => repo.localPath === dirPath);
    if (!repository) {
      // TODO: show error if validation fails, even better: validate before enabling the OK button
      let gitDir = await getTopLevelWorkingDirectory(dirPath);
      if (gitDir === null) {
        return;
      }
      gitDir = path.normalize(gitDir);
      if (dirPath !== gitDir) {
        return;
      }
      await this.repositoryStore.addRepository({
        localPath: dirPath,
        name: path.basename(dirPath)
      });
    }
    this.isOpen = false;
    this.uiStore.selectRepository(repository);
  }

  @action.bound
  onCancel() {
    this.isOpen = false;
  }
}

export function showAddLocalRepositoryDialog(args: {
  repositoryStore: IRepositoryStore;
  uiStore: IUiStore;
  systemDialogService: RendererSystemDialogService;
}) {
  const dialog = new AddLocalRepositoryDialog(args);
  ReactDOM.render(
    <AddLocalRepositoryDialogObserver model={dialog} />,
    document.getElementById('dialogContainer')
  );
}
