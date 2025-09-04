import * as vscode from 'vscode';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { UResource } from '../core';
import { getFileService } from '../modules/serviceManager';

export default checkFileCommand({
  id: 'sftp.remote.chmod',
  getFileTarget: uriFromExplorerContextOrEditorContext,
  async handleFile(ctx) {
    const uri = ctx.target.remoteUri;
    const res = UResource.makeResource(uri);
    const fsService = getFileService(uri);
    if (!fsService) return;
    const remotefs = await fsService.getRemoteFileSystem(ctx.config);
    const modeStr = await vscode.window.showInputBox({ prompt: 'パーミッション (例: 644)', value: '644' });
    if (!modeStr) return;
    const mode = parseInt(modeStr, 8);
    if (isNaN(mode)) return;
    await remotefs.chmod(res.fsPath, mode);
  },
});

