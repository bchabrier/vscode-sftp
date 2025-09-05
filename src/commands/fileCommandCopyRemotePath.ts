import * as vscode from 'vscode';
import { COMMAND_COPY_REMOTE_PATH } from '../constants';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_COPY_REMOTE_PATH,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile(ctx) {
    const remotePath = ctx.target.remoteFsPath;
    await vscode.env.clipboard.writeText(remotePath);
  },
});

