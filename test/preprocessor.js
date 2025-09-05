const ts = require('typescript');
const tsConfig = require('../tsconfig.json');

module.exports = {
  process(src, filename) {
    if (filename.endsWith('.ts')) {
      const res = ts.transpileModule(src, {
        compilerOptions: tsConfig.compilerOptions,
        fileName: filename,
        reportDiagnostics: false,
      });
      return { code: res.outputText };
    }
    return { code: src };
  },
};
