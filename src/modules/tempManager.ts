import * as vscode from 'vscode';
import * as fse from 'fs-extra';

const temps = new Set<string>();

export function registerTempManager(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(async doc => {
      if (doc.uri.scheme !== 'file') return;
      const fsPath = doc.uri.fsPath;
      if (!temps.has(fsPath)) return;
      temps.delete(fsPath);
      try { await fse.remove(fsPath); } catch { /* ignore */ }
    })
  );
}

export function trackTempFile(fsPath: string) {
  temps.add(fsPath);
}

