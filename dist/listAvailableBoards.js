'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _url = require('url');

var _ramda = require('ramda');

var R = _interopRequireWildcard(_ramda);

var _fsExtra = require('fs-extra');

var fse = _interopRequireWildcard(_fsExtra);

var _tinyVersionCompare = require('tiny-version-compare');

var _tinyVersionCompare2 = _interopRequireDefault(_tinyVersionCompare);

var _config = require('./config');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Module provides one function, that searches and reads all package_*_index.json
 * files and get all board names from them.
 * We need this function, because `arduino-cli board listall` shows only
 * boards of already installed packages.
 *
 * Function accepts a path to the directory with `package_*_index.json` files
 * and returns a Promise with a list of objects like this:
 * {
 *   name: 'Arduino Nano',
 *   package: 'arduino:avr',
 *   version: '1.6.12'
 * }
 */

const ORIGINAL_PACKAGE_INDEX_FILE = 'package_index.json';

// AvailableBoard :: { name :: String, package :: String }

/**
 * Returns a list of paths to the additional package index files.
 *
 * Gets filenames of additional package index files from arduino cli config
 * by parsing URLs and joins filenames with path to packages directory.
 *
 * :: (() -> Promise Object Error) -> Path -> Promise [Path] Error
 */
const getPackageIndexFiles = async (getConfig, packagesDir) => {
  const config = await getConfig();
  const urls = R.pathOr([], _config.ADDITIONAL_URLS_PATH, config);
  const filepaths = R.compose(R.map(fname => _path2.default.join(packagesDir, fname)), R.append(ORIGINAL_PACKAGE_INDEX_FILE), R.map(R.compose(R.last, R.split('/'), R.prop('pathname'), _url.parse)))(urls);
  return filepaths;
};

/**
 * Reads package index json files, take all package object from them and
 * returns one list of packages.
 *
 * :: [Path] -> Promise [Object] Error
 */
const readPackages = R.composeP(R.unnest, R.pluck('packages'), x => Promise.all(R.map(fse.readJson, x)));

const sortByVersion = R.sort(R.useWith(_tinyVersionCompare2.default, [R.prop('version'), R.prop('version')]));

// :: [Object] -> [AvailableBoard]
const getAvailableBoards = R.compose(R.unnest, R.map(pkg => R.compose(R.unnest, R.values, R.map(arch => R.compose(R.map(R.compose(R.assoc('packageName', arch.name), R.assoc('package', `${pkg.name}:${arch.architecture}`), R.assoc('version', arch.version))), R.prop('boards'))(arch)), R.map(R.pipe(sortByVersion, R.last)), R.groupBy(R.prop('architecture')), R.prop('platforms'))(pkg)));

/**
 * Reads all package index json files in the specified directory
 * and returns a promise with a list of Available Boards.
 *
 * :: (() -> Promise Object Error) -> Path -> Promise [AvailableBoard] Error
 */
exports.default = R.composeP(getAvailableBoards, readPackages, getPackageIndexFiles);
//# sourceMappingURL=listAvailableBoards.js.map