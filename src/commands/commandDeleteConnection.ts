import { window } from 'vscode';
import { checkCommand } from './abstract/createCommand';
import { COMMAND_CONFIG } from '../constants';
import { executeCommand } from '../host';

export default checkCommand({
  id: 'sftp.deleteConnection',
  async handleCommand() {
    await executeCommand(COMMAND_CONFIG);
    window.showInformationMessage('Remove connection entry from sftp.json.');
  }
});

