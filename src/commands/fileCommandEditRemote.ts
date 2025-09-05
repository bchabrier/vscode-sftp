import { COMMAND_EDIT_REMOTE } from '../constants';
import { showTextDocument } from '../host';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_EDIT_REMOTE,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile(ctx) {
    await showTextDocument(ctx.target.remoteUri, { preview: true });
  },
});

