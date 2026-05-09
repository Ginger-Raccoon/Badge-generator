module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.badgeek.app',
    extraResource: ['public/fonts'],
    executableName: 'badjeek',
    productName: 'Бейджик',
    icon: './icon',
    osxSign: false,
  },
  hooks: {
    postPackage: async (_, options) => {
      if (process.platform !== 'darwin') return;
      const { spawnSync, execSync } = require('child_process');
      const path = require('path');
      const fs = require('fs');

      const sign = (target) => {
        const result = spawnSync('/usr/bin/codesign', [
          '--sign', '-', '--force', '--timestamp=none', target,
        ], { encoding: 'utf8' });
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        if (result.error) throw result.error;
        if (result.status !== 0 || result.signal) {
          throw new Error(`codesign failed for ${path.basename(target)} (exit=${result.status} signal=${result.signal})\n${result.stderr}`);
        }
      };

      for (const outputPath of options.outputPaths) {
        const appName = fs.readdirSync(outputPath).find(f => f.endsWith('.app'));
        if (!appName) continue;
        const appPath = path.join(outputPath, appName);

        // 1. Dylibs — leaf nodes, sign first
        const dylibs = execSync(`find "${appPath}" -name "*.dylib"`, { encoding: 'utf8' })
          .trim().split('\n').filter(Boolean);
        for (const dylib of dylibs) sign(dylib);

        // 2. Electron Framework (references the dylibs above in its CodeResources)
        const framework = path.join(appPath, 'Contents', 'Frameworks', 'Electron Framework.framework');
        if (fs.existsSync(framework)) sign(framework);

        // 3. Helper .app bundles
        const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
        if (fs.existsSync(frameworksDir)) {
          for (const f of fs.readdirSync(frameworksDir)) {
            if (f.endsWith('.app')) sign(path.join(frameworksDir, f));
          }
        }

        // 4. Outer app bundle
        sign(appPath);
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
