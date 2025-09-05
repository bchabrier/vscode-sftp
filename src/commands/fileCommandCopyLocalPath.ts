import * as vscode from 'vscode';
import { COMMAND_COPY_LOCAL_PATH } from '../constants';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_COPY_LOCAL_PATH,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile(ctx) {
    await vscode.env.clipboard.writeText(ctx.target.localFsPath);
  },
});

