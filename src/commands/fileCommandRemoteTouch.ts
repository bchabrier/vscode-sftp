import * as path from 'path';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { UResource } from '../core';
import { getFileService } from '../modules/serviceManager';
import { Readable } from 'stream';

export default checkFileCommand({
  id: 'sftp.remote.touch',
  getFileTarget: uriFromExplorerContextOrEditorContext,
  async handleFile(ctx) {
    const baseUri = ctx.target.remoteUri;
    const res = UResource.makeResource(baseUri);
    const dir = res.fsPath;
    const name = await (await import('vscode')).window.showInputBox({ prompt: 'ファイル名', value: 'newfile.txt' });
    if (!name) return;
    const newRes = UResource.updateResource(UResource.makeResource(baseUri), { remotePath: path.posix.join(dir, name) });
    const fsService = getFileService(baseUri);
    const remotefs = await fsService.getRemoteFileSystem(ctx.config);
    await remotefs.ensureDir(path.posix.dirname(newRes.fsPath));
    const stream = new Readable();
    stream._read = () => {};
    stream.push(Buffer.alloc(0));
    stream.push(null);
    await remotefs.put(stream as any, newRes.fsPath, { });
  },
});
