import * as vscode from 'vscode';
import * as path from 'path';
import * as fse from 'fs-extra';
import { Readable } from 'stream';
import { getFileServiceById } from './serviceManager';
import { UResource, FileType as CoreFileType, FileEntry } from '../core';
import { REMOTE_SCHEME } from '../constants';
import localFs from '../core/localFs';
import { transfer, TransferDirection } from '../fileHandlers/transfer/transfer';

function toVscodeType(type: CoreFileType): vscode.FileType {
  switch (type) {
    case CoreFileType.Directory:
      return vscode.FileType.Directory;
    case CoreFileType.File:
      return vscode.FileType.File;
    case CoreFileType.SymbolicLink:
      return vscode.FileType.SymbolicLink;
    default:
      return vscode.FileType.Unknown;
  }
}

export class RemoteFsProvider implements vscode.FileSystemProvider {
  private readonly _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

  watch(_uri: vscode.Uri, _options: { recursive: boolean; excludes: string[] }) {
    // Not implemented; return noop disposable.
    return new vscode.Disposable(() => undefined);
  }

  private async getContext(uri: vscode.Uri) {
    const res = UResource.makeResource(uri);
    const fsService = getFileServiceById(res.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${uri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);
    return { res, fsService, config, remotefs };
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const { res, remotefs } = await this.getContext(uri);
    const stat = await remotefs.lstat(res.fsPath);
    return { type: toVscodeType(stat.type), ctime: stat.atime, mtime: stat.mtime, size: stat.size };
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const { res, remotefs } = await this.getContext(uri);
    const list = await remotefs.list(res.fsPath);
    return list.map(e => [path.posix.basename(e.fspath), toVscodeType(e.type)]);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    const { res, remotefs } = await this.getContext(uri);
    await remotefs.ensureDir(res.fsPath);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const { res, remotefs } = await this.getContext(uri);
    const content = await remotefs.readFile(res.fsPath);
    return typeof content === 'string' ? Buffer.from(content) : content;
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const { res, fsService, config, remotefs } = await this.getContext(uri);

    // existence check for create/overwrite semantics
    let exists = true;
    try {
      await remotefs.lstat(res.fsPath);
    } catch {
      exists = false;
    }
    if (!exists && !options.create) throw vscode.FileSystemError.FileNotFound(uri);
    if (exists && !options.overwrite) throw vscode.FileSystemError.FileExists(uri);

    // robust write: write to a local temp file, then reuse our proven transfer pipeline
    const tmpDir = await fse.mkdtemp(path.join(fse.realpathSync.native ? fse.realpathSync.native('/tmp') : '/tmp', 'sftp-'));
    const tmpFile = path.join(tmpDir, path.basename(res.fsPath));
    await fse.outputFile(tmpFile, Buffer.from(content));

    const scheduler = fsService.createTransferScheduler(1);
    await transfer(
      {
        srcFsPath: tmpFile,
        srcFs: localFs,
        targetFsPath: res.fsPath,
        targetFs: remotefs,
        transferDirection: TransferDirection.LOCAL_TO_REMOTE,
        filePerm: config.filePerm,
        dirPerm: config.dirPerm,
        transferOption: {
          perserveTargetMode: config.protocol === 'sftp' && !config.filePerm && !config.dirPerm,
          useTempFile: config.useTempFile,
          openSsh: config.openSsh,
          ignore: config.ignore,
        },
      },
      t => scheduler.add(t)
    );
    await scheduler.run();

    await fse.remove(tmpDir).catch(() => undefined);
    this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }): Promise<void> {
    const { res, remotefs } = await this.getContext(uri);
    const st = await remotefs.lstat(res.fsPath);
    if (st.type === CoreFileType.Directory) await remotefs.rmdir(res.fsPath, options.recursive);
    else await remotefs.unlink(res.fsPath);
    this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, _options: { overwrite: boolean }): Promise<void> {
    const { res: oldRes, remotefs } = await this.getContext(oldUri);
    const { res: newRes } = await this.getContext(newUri);
    if (oldRes.remoteId !== newRes.remoteId) throw vscode.FileSystemError.Unavailable('Cross-remote rename is not supported');
    await remotefs.ensureDir(path.posix.dirname(newRes.fsPath));
    if (typeof (remotefs as any).renameAtomic === 'function') await (remotefs as any).renameAtomic(oldRes.fsPath, newRes.fsPath);
    else await remotefs.rename(oldRes.fsPath, newRes.fsPath);
    this._emitter.fire([
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri },
    ]);
  }
}

export function registerRemoteFsProvider(context: vscode.ExtensionContext) {
  const provider = new RemoteFsProvider();
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(REMOTE_SCHEME, provider, { isCaseSensitive: true })
  );
}

