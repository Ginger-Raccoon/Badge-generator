module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.badgeek.app',
    extraResource: ['public/fonts'],
    executableName: 'badjeek',
    productName: 'Бейджик',
    icon: './icon',
  },
  hooks: {
    postPackage: async (_, options) => {
      if (process.platform !== 'darwin') return;
      const { execFileSync } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      const entitlements = path.join(__dirname, 'entitlements.plist');
      for (const outputPath of options.outputPaths) {
        const appName = fs.readdirSync(outputPath).find(f => f.endsWith('.app'));
        if (!appName) continue;
        const appPath = path.join(outputPath, appName);
        execFileSync('codesign', [
          '--sign', '-',
          '--force',
          '--deep',
          '--timestamp=none',
          '--entitlements', entitlements,
          appPath,
        ], { stdio: 'inherit' });
      }
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {},
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
  ],
};
