import * as vscode from 'vscode';
import { COMMAND_COPY_LOCAL_REL_PATH } from '../constants';
import { pathRelativeToWorkspace } from '../host';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_COPY_LOCAL_REL_PATH,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile(ctx) {
    const rel = pathRelativeToWorkspace(ctx.target.localFsPath);
    await vscode.env.clipboard.writeText(rel);
  },
});

