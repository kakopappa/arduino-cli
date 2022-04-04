import * as R from 'ramda';
import { resolve } from 'path';
import * as fse from 'fs-extra';
import { assert } from 'chai';
import which from 'which';

import arduinoCli from '../src/index';

describe('Arduino Cli', () => {
  const PATH_TO_CLI =
    process.env.XOD_ARDUINO_CLI || which.sync('arduino-cli', { nothrow: true });

  if (!PATH_TO_CLI) {
    throw new Error(`
      To run functional tests over "arduino-cli" wrapper you have to:
      1. Download "arduino-cli"
      2. Put "arduino-cli" on $PATH or set env variable "XOD_ARDUINO_CLI" to the binary
      3. Run test again
    `);
  }

  const tmpDir = resolve(__dirname, 'tmp');
  const cfg = {
    directories: {
      user: resolve(tmpDir, 'sketchbook'),
      data: resolve(tmpDir, 'data'),
    },
  };

  describe('Initializes arduino-cli', () => {
    afterEach(() => fse.remove(tmpDir));
    it('with default config', () =>
      arduinoCli(PATH_TO_CLI)
        .dumpConfig()
        .then(res => {
          assert.include(res.directories.user, '/sketchbook');
          assert.include(res.directories.data, '/data');
        }));
    it('with custom config', () =>
      arduinoCli(PATH_TO_CLI, cfg)
        .dumpConfig()
        .then(res => {
          assert.strictEqual(res.directories.user, cfg.directories.user);
          assert.strictEqual(res.directories.data, cfg.directories.data);
        }));
  });

  describe('Update arduino-cli config', () => {
    afterEach(() => fse.remove(tmpDir));
    it('updates config', async () => {
      const cli = arduinoCli(PATH_TO_CLI, cfg);
      const curConf = await cli.dumpConfig();

      assert.strictEqual(curConf.directories.user, cfg.directories.user);
      assert.strictEqual(curConf.directories.data, cfg.directories.data);

      const newDataDir = resolve(tmpDir, 'newData');
      const newConf = R.assocPath(['directories', 'data'], newDataDir, curConf);
      cli.updateConfig(newConf);
      const updatedConf = await cli.dumpConfig();

      assert.strictEqual(updatedConf.directories.user, cfg.directories.user);
      assert.strictEqual(updatedConf.directories.data, newDataDir);

      return cli;
    });
  });

  describe('Installs additional package index', () => {
    afterEach(() => fse.remove(tmpDir));
    const url =
      'http://arduino.esp8266.com/stable/package_esp8266com_index.json';

    it('adds URL into .cli-config.yml', () => {
      const cli = arduinoCli(PATH_TO_CLI, cfg);
      return cli
        .setPackageIndexUrls([url])
        .then(() => cli.dumpConfig())
        .then(res => assert.include(res.board_manager.additional_urls, url));
    });
    it('downloads additional package index', () => {
      const cli = arduinoCli(PATH_TO_CLI, cfg);
      return cli
        .setPackageIndexUrls([url])
        .then(() => cli.core.updateIndex())
        .then(() =>
          fse.pathExists(
            resolve(cfg.directories.data, 'package_esp8266com_index.json')
          )
        )
        .then(assert.isTrue);
    });
  });

  describe('End-to-end test', () => {
    after(() => fse.remove(tmpDir));
    let cli;

    it('Initializes arduino cli', () => {
      cli = arduinoCli(PATH_TO_CLI, cfg);
      return cli;
    });
    it('Updates package index', () =>
      cli.core
        .updateIndex()
        .then(() =>
          fse.pathExists(resolve(cfg.directories.data, 'package_index.json'))
        )
        .then(assert.isTrue));
    it('Returns empty list of installed packages', () =>
      cli.core.list().then(assert.isEmpty));
    it('Installs arduino package', () =>
      cli.core
        .install(
          progressData =>
            assert.hasAllKeys(progressData, [
              'message',
              'percentage',
              'estimated',
            ]),
          'arduino:avr@1.6.21'
        )
        .then(() =>
          fse.pathExists(
            resolve(
              cfg.directories.data,
              'packages',
              'arduino',
              'hardware',
              'avr',
              '1.6.21'
            )
          )
        )
        .then(assert.isTrue));
    it('Returns list with installed package', () =>
      cli.core.list().then(res => {
        assert.lengthOf(res, 1);
        assert.propertyVal(res[0], 'ID', 'arduino:avr');
        assert.propertyVal(res[0], 'Installed', '1.6.21');
        assert.property(res[0], 'Latest');
        assert.propertyVal(res[0], 'Name', 'Arduino AVR Boards');
      }));
    it('Lists all installed boards with cpu options', () =>
      cli.listInstalledBoards().then(res => {
        assert.includeDeepMembers(res, [
          {
            name: 'Arduino/Genuino Uno',
            fqbn: 'arduino:avr:uno',
            options: [],
            disableRts: false,
          },
          {
            name: 'Arduino/Genuino Mega or Mega 2560',
            fqbn: 'arduino:avr:mega',
            options: [
              {
                optionName: 'Processor',
                optionId: 'cpu',
                values: [
                  {
                    name: 'ATmega2560 (Mega 2560)',
                    value: 'atmega2560',
                  },
                  {
                    name: 'ATmega1280',
                    value: 'atmega1280',
                  },
                ],
              },
            ],
            disableRts: false,
          },
        ]);
      }));
  });
});
