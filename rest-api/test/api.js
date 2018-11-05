process.env.NODE_ENV = 'testing';

const app = require('../index');
const http = require('http');
const { httpPort } = require('../config');
const assert = require('assert');

const api = {};

const helpers = {
  makeGetRequest(path, callback) {
    const reqConfig = {
      protocol: 'http',
      hostname: 'localhost',
      port: httpPort,
      path,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(reqConfig, res => {
      callback(res);
    });
    req.end();
  }
};

api['app.init should run without errors'] = done => {
  assert.doesNotThrow(() => {

  })
};



module.exports = api;

