'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseProgressMessage = undefined;

var _ramda = require('ramda');

var R = _interopRequireWildcard(_ramda);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const progressBarRegExp = /^\s?(?:[a-zA-Z0-9:@.\-_+]+\s)?[0-9.]+(?:\s(?:Ki|Mi)?B)? \/ [0-9.]+(?:\s(?:Ki|Mi)?B)? (?:\[[=>-]+\])?\s+([0-9.]+)%\s?([0-9smh]+)?/;

const parseProgressMessage = exports.parseProgressMessage = str => R.compose(R.ifElse(R.test(progressBarRegExp), R.compose(res => ({
  percentage: res[1] ? parseInt(res[1], 10) : 0,
  estimated: res[2] || 'unknown',
  message: null
}), R.match(progressBarRegExp)), message => R.compose(percentage => ({
  percentage,
  estimated: 0,
  message
}), R.ifElse(R.test(/(downloaded|installed)/i), R.always(100), R.always(0)))(message)), R.replace(/\n/g, ''), R.replace(/\r/g, ''))(str);

exports.default = onProgress => R.pipe(R.split('\n'), R.reject(R.isEmpty), R.map(R.pipe(parseProgressMessage, onProgress)));
//# sourceMappingURL=parseProgressLog.js.map