import * as path from 'path';
import * as vscode from 'vscode';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { UResource } from '../core';
import { getFileService } from '../modules/serviceManager';
import { refreshRemoteExplorer } from '../fileHandlers/shared';

export default checkFileCommand({
  id: 'sftp.rename.folder',
  getFileTarget: uriFromExplorerContextOrEditorContext,
  async handleFile(ctx) {
    const currentUri = ctx.target.remoteUri;
    const res = UResource.makeResource(currentUri);
    const base = path.posix.basename(res.fsPath);
    const parent = path.posix.dirname(res.fsPath);
    const newName = await vscode.window.showInputBox({ value: base, prompt: '新しいフォルダー名' });
    if (!newName || newName === base) return;
    const newPath = path.posix.join(parent, newName);
    const fsService = getFileService(currentUri);
    if (!fsService) throw new Error('Remote service not found');
    const remotefs = await fsService.getRemoteFileSystem(ctx.config);
    await remotefs.ensureDir(parent);
    if (typeof (remotefs as any).renameAtomic === 'function') await (remotefs as any).renameAtomic(res.fsPath, newPath);
    else await remotefs.rename(res.fsPath, newPath);
    await refreshRemoteExplorer(ctx.target, true);
  },
});
