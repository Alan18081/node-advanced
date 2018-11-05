const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
const os = require('os');
const v8 = require('v8');
const _data = require('./data');

class CustomEvents extends events {}

const e = new CustomEvents();

const COMMANDS = {
  man: 'man',
  help: 'help',
  exit: 'exit',
  stats: 'stats',
  listUsers: 'list users',
  moreUserInfo: 'more user info',
  listChecks: 'list checks',
  moreCheckInfo: 'more check info',
  listLogs: 'list logs',
  moreLogsInfo: 'more log info'
};

const cli = {};

e.on(COMMANDS.man, () => {
	cli.responders.help();
});

e.on(COMMANDS.help, () => {
	cli.responders.help();
});

e.on(COMMANDS.stats, () => {
	cli.responders.stats();
});

e.on(COMMANDS.listUsers, () => {
	cli.responders.listUsers();
});

e.on(COMMANDS.moreUserInfo, str => {
	cli.responders.moreUserInfo(str);
});

e.on(COMMANDS.listChecks, str => {
	cli.responders.listChecks(str);
});

e.on(COMMANDS.moreCheckInfo, str => {
	cli.responders.moreCheckInfo(str);
});

e.on('exit', () => {
	cli.responders.exit();
});

cli.responders = {
	help() {
		const commandsDescriptions = {
			[COMMANDS.exit]: 'Kill the cli (and whole app)',
			[COMMANDS.man]: 'Display available commands for that cli',
			[COMMANDS.help]: 'Alias for "man"',
			[COMMANDS.stats]: 'Shows statistic for computer resources, that are consumed and available',
			[COMMANDS.listUsers]: 'Show list of all available users',
			[`${COMMANDS.moreUserInfo} --{userId}`] : 'Show info for particular user',
			[`${COMMANDS.listChecks} --up --down`]: 'Show list of all checks ("--up" and "--down" are optional)',
			[`${COMMANDS.moreCheckInfo} --{checkId}`]: 'Show info for particular check',
      [`${COMMANDS.listLogs} --compressed --uncompressed`]: 'Show list of all logs (compressed and uncompressed)',
      [`${COMMANDS.moreLogsInfo} --{logId}`] : 'Show info for particular log',
		};

		cli.horizontalLine();
		cli.centered('CLI MANUAL');
		cli.horizontalLine();
		cli.verticalSpace(2);

		cli.renderList(commandsDescriptions);

		cli.verticalSpace(1);
		cli.horizontalLine();
	},
	stats() {

		const v8Stats = v8.getHeapStatistics();

		const stats = {
			'Load Average': os.loadavg().join(' '),
			'CPU Count': os.cpus().length,
			'Free memory': os.freemem(),
			'Current Malloced Memory': v8Stats.malloced_memory,
			'Peak Malloced Memory': v8Stats.peak_malloced_memory,
			'Allocated Heap Used (%)': Math.round(v8Stats.used_heap_size / v8Stats.total_heap_size * 100),
			'Available Heap Allocated (%)': Math.round(v8Stats.total_heap_size / v8Stats.heap_size_limit * 100),
			'Uptime': os.uptime() + ' seconds'
		};

		cli.header('STATS');

		cli.renderList(stats);
	},
	listUsers() {
		cli.header('ALL USERS');

		_data.list('users', (err, usersList) => {
			if(!err && usersList && usersList.length > 0) {
				usersList.forEach(filename => {
					_data.read('users', filename, (err, userData) => {
						if(!err && userData) {
							const checksList = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
							console.log(`
								Name: ${userData.firstName} ${userData.lastName}\n
								Phone: ${userData.phone}\n
								Number of checks: ${checksList.length}
							`);
						} else {
							cli.error('Failed to load user info', err);
						}
					});
				});
			} else {
        cli.error('Failed to load user\'s list', err);
			}
		});
	},
	moreUserInfo(str) {
		const commandsArray = str.split('--');
		const userId = typeof commandsArray[1] === 'string' && commandsArray.length > 0 ? commandsArray[1] : false;
		if(userId) {
			_data.read('users', userId, (err, userData) => {
				if(!err && userData) {
					console.dir(userData, { colors: true });
				} else {
					cli.error('Failed to get user by id');
				}
			});
		} else {
			cli.error('Invalid user phone');
		}
	},
	listChecks(str) {
		_data.list('checks', (err, checksIds) => {
			if(!err && checksIds && checksIds.length > 0) {
				cli.verticalSpace();
				checksIds.forEach(checkId => {
					_data.read('checks', checkId, (err, checkData) => {
						let includeCheck = false;
						const lowerString = str.toLowerCase();

						const state = typeof checkData.state === 'string' ? checkData.state : 'down';

						const stateOrUnknown = typeof checkData.state === 'string' ? checkData.state : 'unknown';

						if(lowerString.indexOf('--' + state) > -1 || (lowerString.indexOf('--down') === -1 && lowerString.indexOf('--up') === -1)) {
							const line = `
								ID: ${checkData.id}\n
								Url: ${checkData.protocol}://${checkData.url}\n
								State: ${stateOrUnknown}
							`;
							console.log(line);
							cli.verticalSpace();
						}
					});
				});
			}
		});
	},
	moreCheckInfo(str) {
    const commandsArray = str.split('--');
    const checkId = typeof commandsArray[1] === 'string' && commandsArray.length > 0 ? commandsArray[1] : false;
    if(checkId) {
      _data.read('checks', checkId, (err, checkData) => {
        if(!err && checkData) {
          console.dir(checkData, { colors: true });
        } else {
          cli.error('Failed to get check by id');
        }
      });
    } else {
      cli.error('Invalid check\'s id');
    }
	},
	listLogs(str) {
    cli.header('ALL LOGS');

    _data.list('users', (err, usersList) => {
      if(!err && usersList && usersList.length > 0) {
        usersList.forEach(filename => {
          _data.read('users', filename, (err, userData) => {
            if(!err && userData) {
              const checksList = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
              console.log(`
								Name: ${userData.firstName} ${userData.lastName}\n
								Phone: ${userData.phone}\n
								Number of checks: ${checksList.length}
							`);
            } else {
              cli.error('Failed to load user info', err);
            }
          });
        });
      } else {
        cli.error('Failed to load user\'s list', err);
      }
    });
	}
};


cli.verticalSpace = lines => {
	const offset = typeof lines === 'number' && lines > 0 ? lines : 1;
	for(let i = 0; i < offset; i++) {
		console.log('');
	}
};

cli.horizontalLine = () => {
	const width = process.stdout.columns;

	let line = '';
	for(let i = 0; i < width; i++) {
		line += '-';
	}
	console.log(line);

};

cli.centered = str => {
	str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : '';

	const width = process.stdout.columns;

	const offset = Math.floor((width - str.length) / 2);

	let line = '';
	for(let i = 0; i < offset; i++) {
		line += ' ';
	}

	line += str;

	console.log(line);

};

cli.error = (errorStr, errorInstance = null) => {
	console.log('\x1b[31m%s\x1b[0m', errorStr, errorInstance);
};

cli.header = title => {
  cli.horizontalLine();
  cli.centered(title);
  cli.horizontalLine();
  cli.verticalSpace(2);
};

cli.renderList = data => {
	data = typeof data === 'object' && data !== null ? data : {};

  for(const key in data) {
    if(data.hasOwnProperty(key)) {
      const value = data[key];
      let line = `\x1b[34m${key}\x1b[0m`;
      const padding = 60 - line.length;


      for(let i = 0; i < padding; i++) {
        line += ' ';
      }

      console.log(line, value);
      cli.verticalSpace(1);
    }
  }
};

cli.processInput = str => {
	str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : false;

	if(str) {


		let matchFound = false;
		let counter = 0;
		Object.values(COMMANDS).some(input => {
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