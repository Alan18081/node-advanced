const helpers = require('../lib/helpers');
const assert = require('assert');

const app = {};

app.tests = {};

app.tests.unit = {};

app.tests.unit['helpers.getNumber should return number'] = done => {
  const res = helpers.getNumber();
  assert.equal(res, 1);
  done();
};

app.getTestsCount = () => {
  let counter = 0;
  for(const key in app.tests) {
    if(app.tests.hasOwnProperty(key)) {
      for(const testName in app.tests[key]) {
        if(app.tests[key].hasOwnProperty(testName)) {
          counter++;
        }
      }
    }
  }
};

app.runTests = () => {
  const limit = app.getTestsCount();
  let counter = 0;
  let successes = 0;
  const errors = [];

  for(const key in app.tests) {
    if(app.tests.hasOwnProperty(key)) {
      const subTests = app.tests[key];
      for(const testName in subTests) {
        if(subTests.hasOwnProperty(testName)) {
          try {
            subTests[testName](() => {
              counter++;
              successes++;
              if(counter === limit) {
                app.produceTestReport(limit, successes, errors);
              }
            });
          } catch (e) {
            counter++;
            errors.push({
              name: testName,
              error: e
            });
            if(counter === limit) {
              app.produceTestReport(limit, successes, errors);
            }
          }
        }
      }
    }
  }
};