const helpers = require('../lib/helpers');
const assert = require('assert');
const logs = require('../lib/logs');

const units = {};

units['helpers.getNumber should return number'] = done => {
  const res = helpers.getNumber();
  assert.equal(res, 1);
  done();
};

units['logs.truncate shouldn\'t throw a TypeError'] = done => {
  assert.doesNotThrow(() => {
    logs.truncate
  }, TypeError);
};

module.exports = units;