const path = require('path');

process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || path.join(__dirname, '../../tsconfig.face-routes.json');
require('ts-node/register/transpile-only');

const tsModule = require('./attendance-face.ts');
module.exports = tsModule.default || tsModule;
