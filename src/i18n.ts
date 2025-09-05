import * as vscode from 'vscode';

// Load package NLS bundles so strings are centralized with other UI text.
// We avoid build-time NLS tooling by reading JSON at runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const en = (() => { try { return require('../package.nls.json'); } catch { return {}; } })();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ja = (() => { try { return require('../package.nls.ja.json'); } catch { return {}; } })();

function selectBundle() {
  const lang = (vscode.env.language || '').toLowerCase();
  return lang.startsWith('ja') ? ja : en;
}

export function t(key: string, fallback: string): string {
  const bundle = selectBundle();
  return (bundle && bundle[key]) || fallback;
}
