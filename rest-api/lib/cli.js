const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');

class CustomEvents extends events {}

const e = new CustomEvents();

const cli = {};

e.on('man', str => {
	cli.responders.help();
});

e.on('exit', () => {
	cli.responders.exit();
});

cli.responders = {

};



cli.processInput = str => {
	str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : false;

	if(str) {
		const uniqInputs = [
			'man',
			'help',
			'exit',
			'stats',
			'list users',
			'more user info',
			'list checks',
			'more check info',
			'list logs',
			'more log info'
		];

		let matchFound = false;
		let counter = 0;
		uniqInputs.some(input => {
			if(str.indexOf(input) > -1) {
				matchFound = true;
				e.emit(input, str);

				return true;
			}
		});

		if(!matchFound) {
			console.log('Sorry. Invalid command, try again');
		}
	}
};

cli.init = () => {
	debug('\x1b[34m%s\x1b[0m', `CLI is running`);

	const _interface = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: ''
	});

	_interface.prompt();

	_interface.on('line', str => {
		cli.processInput(str);

		_interface.prompt();
	});

	_interface.on('close', () => {
		process.exit(0);
	});

};

module.exports = cli;