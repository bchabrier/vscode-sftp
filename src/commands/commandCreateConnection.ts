import { window } from 'vscode';
import { checkCommand } from './abstract/createCommand';
import { COMMAND_CONFIG } from '../constants';
import { executeCommand } from '../host';

export default checkCommand({
  id: 'sftp.createConnection',
  async handleCommand() {
    await executeCommand(COMMAND_CONFIG);
    window.showInformationMessage('Open sftp.json to create a connection.');
  }
});

