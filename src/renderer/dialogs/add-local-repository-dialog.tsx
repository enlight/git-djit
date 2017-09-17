// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Button, Classes as BlueprintClasses, Dialog, Intent } from '@blueprintjs/core';
import { action, computed, observable } from 'mobx';
import { observer } from 'mobx-react';
import { asyncAction } from 'mobx-utils';
import * as path from 'path';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import FilePathInputView, { FilePathInput } from '../components/file-path-input';
import { getTopLevelWorkingDirectory } from '../git';
import RendererSystemDialogService from '../services/system-dialog-service';
import { IAppStore } from '../storage/app-store';
import { IRepositoryModel } from '../storage/repository-store';

interface IAddLocalRepositoryDialogProps {
  model: AddLocalRepositoryDialog;
}

function AddLocalRepositoryDialogView(props: IAddLocalRepositoryDialogProps) {
  const dialog = props.model;
  return (
    <Dialog
      title="Add Local Repository"
      className={BlueprintClasses.DARK}
      isCloseButtonShown={true}
      isOpen={dialog.isOpen}
      onClose={dialog.onCancel}
      canOutsideClickClose={false}>
      <div className={BlueprintClasses.DIALOG_BODY}>
        <FilePathInputView model={dialog.repositoryInput} />
      </div>
      <div className={BlueprintClasses.DIALOG_FOOTER}>
        <div className={BlueprintClasses.DIALOG_FOOTER_ACTIONS}>
          <Button
            text="OK"
            intent={Intent.PRIMARY}
            onClick={dialog.onOK}
            disabled={!dialog.isValid}
          />
          <Button text="Cancel" onClick={dialog.onCancel} />
        </div>
      </div>
    </Dialog>
  );
}

const AddLocalRepositoryDialogObserver = observer(AddLocalRepositoryDialogView);

async function validateRepositoryPath(repositoryPath: string): Promise<string | null> {
  if (repositoryPath.trim() === '') {
    return 'Path is required';
  }
  const dirPath = path.resolve(repositoryPath);
  let repoRoot = await getTopLevelWorkingDirectory(dirPath);
  if (repoRoot === null) {
    return 'Path is not within a Git repository';
  }
  repoRoot = path.normalize(repoRoot);
  if (repositoryPath !== repoRoot) {
    return 'Path is not the root of a Git repository';
  }
  return null;
}

export interface IAddLocalRepositoryDialogOptions {
  appStore: IAppStore;
  systemDialogService: RendererSystemDialogService;
}

class AddLocalRepositoryDialog {
  @observable isOpen = true;
  @observable repositoryInput: FilePathInput;

  @computed
  get isValid(): boolean {
    return this.repositoryInput.isValid;
  }

  private appStore: IAppStore;

  constructor(options: IAddLocalRepositoryDialogOptions) {
    this.onOK = this.onOK.bind(this);
    this.appStore = options.appStore;
    this.repositoryInput = new FilePathInput({
      systemDialogService: options.systemDialogService,
      label: 'Local Path',
      validate: validateRepositoryPath
    });
  }

  dispose() {
    if (this.repositoryInput) {
      this.repositoryInput.dispose();
    }
  }

  @asyncAction
  *onOK() {
    const dirPath = path.resolve(this.repositoryInput.filePath);
    const errorMsg = yield validateRepositoryPath(dirPath);
    if (errorMsg !== null) {
      return;
    }
    // If there's already a repository in the store with the same path don't add another one,
    // just select the existing one.
    const { repositories: repositoryStore } = this.appStore;
    let repository: IRepositoryModel | null = repositoryStore!.repositories.find(
      repo => repo.localPath === dirPath
    );
    if (!repository && repositoryStore) {
      const id = yield repositoryStore.addRepository({
        localPath: dirPath,
        name: path.basename(dirPath)
      });
      repository = repositoryStore.findById(id);
    }
    yield this.appStore.selectRepository(repository);
    this.close();
  }

  @action.bound
  onCancel() {
    this.close();
  }

  private close() {
    this.isOpen = false;
    this.dispose();
  }
}

export function showAddLocalRepositoryDialog(options: IAddLocalRepositoryDialogOptions) {
  const dialog = new AddLocalRepositoryDialog(options);
  ReactDOM.render(
    <AddLocalRepositoryDialogObserver model={dialog} />,
    document.getElementById('dialogContainer')
  );
}
