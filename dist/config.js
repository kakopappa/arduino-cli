'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setPackageIndexUrls = exports.configure = exports.saveConfig = exports.ADDITIONAL_URLS_PATH = undefined;

var _ramda = require('ramda');

var R = _interopRequireWildcard(_ramda);

var _os = require('os');

var _path = require('path');

var _fsExtra = require('fs-extra');

var fse = _interopRequireWildcard(_fsExtra);

var _yamljs = require('yamljs');

var _yamljs2 = _interopRequireDefault(_yamljs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const ADDITIONAL_URLS_PATH = exports.ADDITIONAL_URLS_PATH = ['board_manager', 'additional_urls'];

const getDefaultConfig = configDir => ({
  directories: {
    user: (0, _path.resolve)(configDir, 'sketchbook'),
    data: (0, _path.resolve)(configDir, 'data')
  }
});

const stringifyConfig = cfg => _yamljs2.default.stringify(cfg, 10, 2);

// :: Path -> Object -> { config: Object, path: Path }
const saveConfig = exports.saveConfig = (configPath, config) => {
  const yamlString = _yamljs2.default.stringify(config, 2);

  // Write config
  fse.writeFileSync(configPath, yamlString);

  // Ensure that sketchbook and data directories are exist
  fse.ensureDirSync(config.directories.user);
  fse.ensureDirSync(config.directories.data);

  return {
    config,
    path: configPath
  };
};

// :: Object -> { config: Object, path: Path }
const configure = exports.configure = inputConfig => {
  const configDir = fse.mkdtempSync((0, _path.resolve)((0, _os.tmpdir)(), 'arduino-cli'));
  const configPath = (0, _path.resolve)(configDir, 'arduino-cli.yaml');
  const config = inputConfig || getDefaultConfig(configDir);
  const saved = saveConfig(configPath, config);
  return { config: saved.config, path: saved.path, dir: configDir };
};

// :: Path -> [URL] -> Promise [URL] Error
const setPackageIndexUrls = exports.setPackageIndexUrls = (configPath, urls) => fse.readFile(configPath, { encoding: 'utf8' }).then(_yamljs2.default.parse).then(R.assocPath(ADDITIONAL_URLS_PATH, urls)).then(stringifyConfig).then(data => fse.writeFile(configPath, data)).then(R.always(urls));
//# sourceMappingURL=config.js.map