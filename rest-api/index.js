const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');

const app = {
	init() {
		server.init();
		workers.init();

		setTimeout(() => {
			cli.init();
		}, 50);
	}
};


console.log(require.main);

if(require.main === module) {
  app.init();
}

module.exports = app;