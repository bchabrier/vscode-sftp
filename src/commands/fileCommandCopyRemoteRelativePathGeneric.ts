import * as vscode from 'vscode';
import { upath } from '../core';
import { COMMAND_COPY_REMOTE_REL_PATH_GENERIC } from '../constants';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_COPY_REMOTE_REL_PATH_GENERIC,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile(ctx) {
    const base = ctx.config.remotePath;
    const rel = upath.relative(base, ctx.target.remoteFsPath);
    await vscode.env.clipboard.writeText(rel || '.');
  },
});

