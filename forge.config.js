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

      const entitlements = path.join(__dirname, 'entitlements.plist');

      const sign = (target, withEntitlements = false) => {
        const args = ['--sign', '-', '--force', '--timestamp=none'];
        if (withEntitlements) args.push('--entitlements', entitlements);
        args.push(target);
        const result = spawnSync('/usr/bin/codesign', args, { encoding: 'utf8' });
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

        // 1. Dylibs — leaf nodes, JIT entitlement не нужен (JIT — per-process, не per-library)
        const dylibs = execSync(`find "${appPath}" -name "*.dylib"`, { encoding: 'utf8' })
          .trim().split('\n').filter(Boolean);
        for (const dylib of dylibs) sign(dylib);

        // 2. Electron Framework — фреймворк, не executable, entitlements не принимает
        const framework = path.join(appPath, 'Contents', 'Frameworks', 'Electron Framework.framework');
        if (fs.existsSync(framework)) sign(framework);

        // 3. Helper .app — отдельные процессы, тоже запускают V8/JIT, нужен allow-jit
        const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
        if (fs.existsSync(frameworksDir)) {
          for (const f of fs.readdirSync(frameworksDir)) {
            if (f.endsWith('.app')) sign(path.join(frameworksDir, f), true);
          }
        }

        // 4. Основной бандл — allow-jit для V8 snapshot loading, без этого CS_KILL убивает процесс
        sign(appPath, true);
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
            entry: 'src/main.ts',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.ts',
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
