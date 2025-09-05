import * as vscode from 'vscode';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { UResource } from '../core';
import { getFileService } from '../modules/serviceManager';
import localFs from '../core/localFs';
import { TransferDirection } from '../core';
import { transfer as runTransfer } from '../fileHandlers/transfer/transfer';

export default checkFileCommand({
  id: 'sftp.download.folderAs',
  getFileTarget: uriFromExplorerContextOrEditorContext,
  async handleFile(ctx) {
    const remoteUri = ctx.target.remoteUri;
    const res = UResource.makeResource(remoteUri);
    const pick = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false });
    if (!pick || !pick[0]) return;
    const dest = pick[0].fsPath;
    const fsService = getFileService(remoteUri);
    const remotefs = await fsService.getRemoteFileSystem(ctx.config);
    const scheduler = fsService.createTransferScheduler(ctx.config.concurrency);
    await runTransfer({ srcFsPath: res.fsPath, srcFs: remotefs, targetFsPath: dest, targetFs: localFs, transferOption: { perserveTargetMode: false } as any, transferDirection: TransferDirection.REMOTE_TO_LOCAL }, t => scheduler.add(t));
    await scheduler.run();
  }
});
