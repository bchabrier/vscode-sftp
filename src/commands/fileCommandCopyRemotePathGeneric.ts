import * as vscode from 'vscode';
import { COMMAND_COPY_REMOTE_PATH_GENERIC } from '../constants';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_COPY_REMOTE_PATH_GENERIC,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile(ctx) {
    await vscode.env.clipboard.writeText(ctx.target.remoteFsPath);
  },
});

