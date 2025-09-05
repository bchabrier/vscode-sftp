import { window } from 'vscode';
import { checkCommand } from './abstract/createCommand';

export default checkCommand({
  id: 'sftp.remoteExplorer.connect',
  async handleCommand() {
    // Placeholder: our FS connects on demand. Show hint.
    window.setStatusBarMessage('SFTP: Connection will be established on first operation.', 2000);
  }
});

