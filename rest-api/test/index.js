

const app = {};

app.tests = {};

app.tests.unit = require('./unit');

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

  return counter;
};

app.produceTestReport = (limit, successes, errors) => {
  console.log('');
  console.log('---- TEST REPORT ----');
  console.log('');

  console.log('Test\'s count:', limit);
  console.log('\x1b[32mPassed: %s\x1b[0m', successes);
  console.log('\x1b[31mFailed: %s\x1b[0m', errors.length);

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
              console.log('\x1b[32m%s\x1b[0m', testName);
              counter++;
              successes++;
              if(counter === limit) {
                app.produceTestReport(limit, successes, errors);
              }
            });
          } catch (e) {
            console.log('\x1b[31m%s\x1b[0m', testName);
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

app.runTests();