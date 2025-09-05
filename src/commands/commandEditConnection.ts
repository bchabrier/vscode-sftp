import { window } from 'vscode';
import { checkCommand } from './abstract/createCommand';
import { COMMAND_CONFIG } from '../constants';
import { executeCommand } from '../host';

export default checkCommand({
  id: 'sftp.editConnection',
  async handleCommand() {
    await executeCommand(COMMAND_CONFIG);
    window.showInformationMessage('Edit connection in sftp.json.');
  }
});

