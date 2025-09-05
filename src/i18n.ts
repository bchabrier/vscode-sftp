import * as vscode from 'vscode';

function isJa(): boolean {
  try {
    const lang = (vscode.env.language || '').toLowerCase();
    return lang.startsWith('ja');
  } catch {
    return false;
  }
}

export function t(key: string, fallback: string): string {
  if (isJa()) {
    switch (key) {
      case 'confirm.newerRemote.message':
        return 'リモートのファイルはローカルより新しいようです。上書きしてアップロードしますか？';
      case 'confirm.newerRemote.confirm':
        return '上書きしてアップロード';
      case 'confirm.newerRemote.cancel':
        return 'スキップ';
      default:
        return fallback;
    }
  }
  return fallback;
}

