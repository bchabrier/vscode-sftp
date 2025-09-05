import * as vscode from 'vscode';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { UResource } from '../core';
import { getFileService } from '../modules/serviceManager';
import localFs from '../core/localFs';
import { transfer, TransferDirection } from '../fileHandlers/transfer/transfer';

export default checkFileCommand({
  id: 'sftp.download.fileAs',
  getFileTarget: uriFromExplorerContextOrEditorContext,
  async handleFile(ctx) {
    const remoteUri = ctx.target.remoteUri;
    const res = UResource.makeResource(remoteUri);
    const save = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(res.fsPath.split('/').pop() || 'download') });
    if (!save) return;
    const fsService = getFileService(remoteUri);
    const remotefs = await fsService.getRemoteFileSystem(ctx.config);
    const scheduler = fsService.createTransferScheduler(1);
    await transfer({ srcFsPath: res.fsPath, srcFs: remotefs, targetFsPath: save.fsPath, targetFs: localFs, transferOption: { perserveTargetMode: false } as any, transferDirection: TransferDirection.REMOTE_TO_LOCAL }, t => scheduler.add(t));
    await scheduler.run();
  }
});

