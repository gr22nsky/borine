const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(projectRoot);

// Allow importing shared packages from the monorepo root
config.watchFolders = [workspaceRoot];

config.resolver.extraNodeModules = {
  '@borine/ui': path.resolve(workspaceRoot, 'packages/ui'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
  'react': path.resolve(workspaceRoot, 'node_modules/react'),
};

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
