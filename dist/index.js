'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ramda = require('ramda');

var R = _interopRequireWildcard(_ramda);

var _path = require('path');

var _promisifyChildProcess = require('promisify-child-process');

var _crossSpawn = require('cross-spawn');

var _crossSpawn2 = _interopRequireDefault(_crossSpawn);

var _yamljs = require('yamljs');

var _yamljs2 = _interopRequireDefault(_yamljs);

var _fsExtra = require('fs-extra');

var _config = require('./config');

var _optionParser = require('./optionParser');

var _listAvailableBoards = require('./listAvailableBoards');

var _listAvailableBoards2 = _interopRequireDefault(_listAvailableBoards);

var _parseProgressLog = require('./parseProgressLog');

var _parseProgressLog2 = _interopRequireDefault(_parseProgressLog);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const spawn = (bin, args, options) => (0, _promisifyChildProcess.promisifyChildProcess)((0, _crossSpawn2.default)(bin, args, options), {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});

const noop = () => {};

/**
 * Initializes object to work with `arduino-cli`
 * @param {String} pathToBin Path to `arduino-cli`
 * @param {Object} config Plain-object representation of `.cli-config.yml`
 */
const ArduinoCli = (pathToBin, config = null) => {
  const configureVal = (0, _config.configure)(config);
  let configPath = configureVal.path;
  let cfg = configureVal.config;
  const configDir = configureVal.dir;
  let runningProcesses = [];

  const appendProcess = proc => {
    runningProcesses = R.append(proc, runningProcesses);
  };
  const deleteProcess = proc => {
    runningProcesses = R.reject(R.equals(proc), runningProcesses);
  };

  const runWithProgress = async (onProgress, args) => {
    const spawnArgs = R.compose(R.concat([`--config-file`, configDir]), R.reject(R.isEmpty))(args);
    const proc = spawn(pathToBin, spawnArgs, {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    proc.stdout.on('data', data => onProgress(data.toString()));
    proc.stderr.on('data', data => onProgress(data.toString()));
    proc.on('exit', () => deleteProcess(proc));

    appendProcess(proc);

    return proc.then(R.prop('stdout'));
  };

  const sketch = name => (0, _path.resolve)(cfg.directories.user, name);

  const runAndParseJson = args => runWithProgress(noop, args).then(JSON.parse);

  const listCores = () => runWithProgress(noop, ['core', 'list', '--format=json']).then(R.when(R.isEmpty, R.always('[]'))).then(JSON.parse);

  const listBoardsWith = (listCmd, boardsGetter) => Promise.all([listCores(), runAndParseJson(['board', listCmd, '--format=json'])]).then(([cores, boards]) => (0, _optionParser.patchBoardsWithOptions)(cfg.directories.data, cores, boardsGetter(boards)));

  const getConfig = () => runWithProgress(noop, ['config', 'dump']).then(_yamljs2.default.parse);

  return {
    getPathToBin: () => pathToBin,
    killProcesses: () => {
      R.forEach(proc => {
        proc.kill('SIGTERM');
        deleteProcess(proc);
      }, runningProcesses);
      return true;
    },
    getRunningProcesses: () => runningProcesses,
    dumpConfig: getConfig,
    updateConfig: newConfig => {
      const newCfg = (0, _config.saveConfig)(configPath, newConfig);
      configPath = newCfg.path;
      cfg = newCfg.config;
      return cfg;
    },
    listConnectedBoards: () => listBoardsWith('list', R.prop('serialBoards')),
    listInstalledBoards: () => listBoardsWith('listall', R.prop('boards')),
    listAvailableBoards: () => (0, _listAvailableBoards2.default)(getConfig, cfg.directories.data),
    compile: (onProgress, fqbn, sketchName, outputDir, verbose = false) => runWithProgress(onProgress, ['compile', `--fqbn=${fqbn}`, outputDir ? `--output-dir=${outputDir}` : '', verbose ? '--verbose' : '', sketch(sketchName)]),
    upload: (onProgress, port, fqbn, sketchName, verbose = false) => runWithProgress(onProgress, ['upload', `--fqbn=${fqbn}`, `--port=${port}`, verbose ? '--verbose' : '', '-t', sketch(sketchName)]),
    core: {
      download: (onProgress, pkgName) =>
      // TODO:
      // Get rid of `remove` the staging directory when
      // arduino-cli fix issue https://github.com/arduino/arduino-cli/issues/43
      (0, _fsExtra.remove)((0, _path.resolve)(cfg.directories.data, 'staging')).then(() => runWithProgress((0, _parseProgressLog2.default)(onProgress), ['core', 'download', pkgName])),
      install: (onProgress, pkgName) =>
      // TODO:
      // Get rid of `remove` the staging directory when
      // arduino-cli fix issue https://github.com/arduino/arduino-cli/issues/43
      (0, _fsExtra.remove)((0, _path.resolve)(cfg.directories.data, 'staging')).then(() => runWithProgress((0, _parseProgressLog2.default)(onProgress), ['core', 'install', pkgName])),
      list: listCores,
      search: query => runWithProgress(noop, ['core', 'search', query, '--format=json']).then(R.prop('Platforms')).then(R.defaultTo([])),
      uninstall: pkgName => runWithProgress(noop, ['core', 'uninstall', pkgName]),
      updateIndex: () => runWithProgress(noop, ['core', 'update-index']),
      upgrade: onProgress => runWithProgress((0, _parseProgressLog2.default)(onProgress), ['core', 'upgrade'])
    },
    version: () => runAndParseJson(['version', '--format=json']).then(R.prop('VersionString')),
    createSketch: sketchName => runWithProgress(noop, ['sketch', 'new', sketch(sketchName)]).then(R.always((0, _path.resolve)(cfg.directories.user, sketchName, `${sketchName}.ino`))),
    setPackageIndexUrls: urls => (0, _config.setPackageIndexUrls)(configPath, urls)
  };
};

exports.default = ArduinoCli;
//# sourceMappingURL=index.js.map