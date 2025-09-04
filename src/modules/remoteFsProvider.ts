import * as vscode from 'vscode';
import { Readable } from 'stream';
import { dirname, basename } from 'path';
import { UResource, FileType as CoreFileType } from '../core';
import { REMOTE_SCHEME } from '../constants';
import { getFileServiceById } from './serviceManager';

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
    // Remote watching is not implemented; return a no-op disposable.
    return new vscode.Disposable(() => undefined);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const res = UResource.makeResource(uri);
    const fsService = getFileServiceById(res.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${uri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);
    const stat = await remotefs.lstat(res.fsPath);
    return {
      type: toVscodeType(stat.type),
      ctime: stat.atime,
      mtime: stat.mtime,
      size: stat.size,
    };
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const res = UResource.makeResource(uri);
    const fsService = getFileServiceById(res.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${uri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);
    const list = await remotefs.list(res.fsPath);
    return list.map(e => [basename(e.fspath), toVscodeType(e.type)]);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    const res = UResource.makeResource(uri);
    const fsService = getFileServiceById(res.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${uri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);
    await remotefs.ensureDir(res.fsPath);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const res = UResource.makeResource(uri);
    const fsService = getFileServiceById(res.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${uri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);
    const content = await remotefs.readFile(res.fsPath);
    return typeof content === 'string' ? Buffer.from(content) : content;
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const res = UResource.makeResource(uri);
    const fsService = getFileServiceById(res.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${uri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);

    let exists = true;
    try {
      await remotefs.lstat(res.fsPath);
    } catch {
      exists = false;
    }

    if (!exists && !options.create) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    if (exists && !options.overwrite) {
      throw vscode.FileSystemError.FileExists(uri);
    }

    await remotefs.ensureDir(dirname(res.fsPath));
    const readable = new Readable();
    readable._read = () => undefined;
    readable.push(Buffer.from(content));
    readable.push(null);

    const mode = typeof config.filePerm === 'number' ? config.filePerm : undefined;
    await remotefs.put(readable, res.fsPath, { mode });

    this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }): Promise<void> {
    const res = UResource.makeResource(uri);
    const fsService = getFileServiceById(res.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${uri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);

    const stat = await remotefs.lstat(res.fsPath);
    if (stat.type === CoreFileType.Directory) {
      await remotefs.rmdir(res.fsPath, options.recursive);
    } else {
      await remotefs.unlink(res.fsPath);
    }

    this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, _options: { overwrite: boolean }) {
    const oldRes = UResource.makeResource(oldUri);
    const newRes = UResource.makeResource(newUri);
    if (oldRes.remoteId !== newRes.remoteId) {
      throw vscode.FileSystemError.Unavailable('Cross-remote rename is not supported');
    }
    const fsService = getFileServiceById(oldRes.remoteId);
    if (!fsService) throw vscode.FileSystemError.Unavailable(`No remote found for ${oldUri}`);
    const config = fsService.getConfig();
    const remotefs = await fsService.getRemoteFileSystem(config);
    await remotefs.ensureDir(dirname(newRes.fsPath));
    try {
      // Prefer atomic when available, fallback to normal rename.
      if (typeof (remotefs as any).renameAtomic === 'function') {
        await (remotefs as any).renameAtomic(oldRes.fsPath, newRes.fsPath);
      } else {
        await remotefs.rename(oldRes.fsPath, newRes.fsPath);
      }
    } catch (_e) {
      // Some servers do not support atomic; fallback.
      await remotefs.rename(oldRes.fsPath, newRes.fsPath);
    }

    this._emitter.fire([
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri },
    ]);
  }
}

export function registerRemoteFsProvider(context: vscode.ExtensionContext) {
  const provider = new RemoteFsProvider();
  const disposable = vscode.workspace.registerFileSystemProvider(REMOTE_SCHEME, provider, {
    isCaseSensitive: true,
  });
  context.subscriptions.push(disposable);
}

