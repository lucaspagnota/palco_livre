// O motor de cifras fica em ../../packages/cifra e é compartilhado com o site.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const cifra = path.resolve(__dirname, '../../packages/cifra');

config.watchFolders = [cifra];
config.resolver.extraNodeModules = { '@palco/cifra': cifra };
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
