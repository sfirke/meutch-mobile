const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep Metro from crawling agent worktrees under .claude/, which exhausts inotify watchers.
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /\/\.claude\/.*/,
];

module.exports = config;
