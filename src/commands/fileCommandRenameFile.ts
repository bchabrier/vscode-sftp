import * as path from 'path';
import * as vscode from 'vscode';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { UResource } from '../core';
import { getFileService } from '../modules/serviceManager';

export default checkFileCommand({
  id: 'sftp.rename.file',
  getFileTarget: uriFromExplorerContextOrEditorContext,
  async handleFile(ctx) {
    const currentUri = ctx.target.remoteUri;
    const res = UResource.makeResource(currentUri);
    const base = path.posix.basename(res.fsPath);
    const parent = path.posix.dirname(res.fsPath);
    const newName = await vscode.window.showInputBox({ value: base, prompt: '新しいファイル名' });
    if (!newName || newName === base) return;
    const newRes = UResource.updateResource(UResource.makeResource(currentUri), { remotePath: path.posix.join(parent, newName) });
    // Ensure provider is registered
    const fsService = getFileService(currentUri);
    if (!fsService) throw new Error('Remote service not found');
    await vscode.workspace.fs.rename(currentUri, newRes.uri, { overwrite: false });
  },
});

