const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const _data = require('./data');
const _logs = require('./logs');
const url = require('url');
const util = require('util');

const debug = util.debuglog('workers');

const workers = {
	loop() {
		setInterval(() => {
			workers.gatherAllChecks();
		}, 1000 * 60);
	},

	validateCheckData(origCheckData) {
		origCheckData = typeof origCheckData === 'object' && origCheckData !== null ? origCheckData : {};

		origCheckData.id = typeof origCheckData.id === 'string' ? origCheckData.id : false;
		origCheckData.userPhone = typeof origCheckData.userPhone === 'string' && origCheckData.userPhone.trim().length === 10 ? origCheckData.userPhone.trim() : false;
		origCheckData.protocol = typeof origCheckData.protocol === 'string' && ['http', 'https'].indexOf(origCheckData.protocol) ? origCheckData.protocol : false;
		origCheckData.url = typeof origCheckData.url === 'string' && origCheckData.url.trim().length > 0 ? origCheckData.url.trim() : false;
		origCheckData.method = typeof origCheckData.method === 'string' &&  ['get', 'post', 'put', 'delete'].indexOf(origCheckData.method.trim()) ? origCheckData.protocol : false;
		origCheckData.successCodes = origCheckData.successCodes instanceof Array && origCheckData.successCodes.length > 0 ? origCheckData.successCodes : false;
		origCheckData.timeoutSeconds = typeof origCheckData.timeoutSeconds === 'number' && origCheckData.timeoutSeconds >= 1 && origCheckData.timeoutSeconds <= 5 ? origCheckData.timeoutSeconds : false;

		origCheckData.state = typeof origCheckData.state === 'string' && ['up', 'down'].indexOf(origCheckData.state) ? origCheckData.state : 'down';
		origCheckData.lastChecked = typeof origCheckData.lastChecked === 'number' && origCheckData.lastChecked >= 1 && origCheckData.lastChecked <= 5 ? origCheckData.lastChecked : false;

		if(
			origCheckData.id &&
			origCheckData.userPhone &&
			origCheckData.protocol &&
			origCheckData.url &&
			origCheckData.method &&
			origCheckData.successCodes &&
			origCheckData.timeoutSeconds
		) {
			workers.performCheck(origCheckData);
		}



	},

	performCheck(checkData) {
		const checkOutcome = {
			error: false,
			responseCode: false
		};

		let outcomeSent = false;

		const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`);
		const hostname = parsedUrl.hostname;
		const path = parsedUrl.path;

		const requestConfig = {
			protocol: `${checkData}:`,
			hostname,
			method: checkData.method,
			path,
			timeout: checkData.timeoutSeconds * 1000
		};

		const requestModule = checkData.protocol === 'http' ? http : https;

		const req = requestModule.request(requestConfig, res => {
			const { statusCode } = res;
			checkOutcome.responseCode = statusCode;
			if(!outcomeSent) {
				workers.processCheckOutcome(checkData, checkData);
				outcomeSent = true;
			}
		});

		req.on('error', err => {
			checkOutcome.error = {
				error: true,
				value: err
			};

			if(!outcomeSent) {
				workers.processCheckOutcome(checkData, checkOutcome);
				outcomeSent = true;
			}
		});

		req.on('timeout', () => {
			checkOutcome.error = {
				error: true,
				value: 'Timeout'
			};

			if(!outcomeSent) {
				workers.processCheckOutcome(checkData, checkOutcome);
				outcomeSent = true;
			}
		});

		req.end();
	},

	processCheckOutcome(checkData, checkOutcome) {
		const state = !checkOutcome.error
			&& checkOutcome.responseCode
			&& checkData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

		const alertWarranted = checkData.lastChecked && checkData.state !== state;
		const timeOfCheck = Date.now();

		workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck);

		const newCheckData = checkData;
		newCheckData.state = state;
		newCheckData.lastChecked = timeOfCheck;



		_data.update('checks', newCheckData.id, newCheckData, err => {
			if(!err) {
				if(alertWarranted) {
					workers.alertUserWhenStatusChange(newCheckData);
				}
			} else {
				debug('Error', err);
			}
		});
	},

	alertUserWhenStatusChange(checkData) {
		const msg = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`;
		helpers.sendTwilioSMS(checkData.userPhone, msg, (err) => {
			if(!err) {
				debug('Success: SMS has been successfully sent');
			} else {
				debug('Error: Failed to send SMS to user ', err);
			}
		});
	},

	log(checkData, checkOutcome, state, alertWarranted, timeOfCheck) {
		const logData = {
			check: checkData,
			outcome: checkOutcome,
			state,
			alert: alertWarranted,
			time: timeOfCheck
		};

		const logString = JSON.stringify(logData);
		const logFilename = checkData.id;

		_logs.append(logFilename, logString, err => {

		});
	},

	gatherAllChecks() {
		_data.list('checks', (err, checks) => {
			if(!err && checks && checks.length > 0) {
				checks.forEach(check => {
					_data.read('checks', check, (err, origCheckData) => {
						if(!err && origCheckData) {
							workers.validateCheckData(origCheckData);
						} else {
							debug('Error while reading one of the checks data');
						}
					});
				});
			} else {
				debug('Error: could not find checks to process');
			}
		});
	},

	rotateLogs() {
		_logs.list(false, (err, logs) => {
			if(!err && logs && logs.length) {
				logs.forEach(filename => {
					const logId = filename.replace('.log', '');
					const newFileId = `${logId}-${Date.now()}`;
					_logs.compress(logId, newFileId, (err) => {
						if(!err) {
							_logs.truncate(logId, err => {
								if(!err) {
									debug('Success truncating file');
								} else {
									debug('Failed to truncate log file', err);
								}
							});
						} else {
							debug('Failed to compress files: ', err);
						}
					})
				});
			} else {
				debug('Error: Could not find logs to rotate');
			}
		});
	},

	logRotationLoops() {
		setInterval(() => {
			workers.rotateLogs();
		}, 1000 * 60 * 60 * 24)
	},

	init() {

		debug('\x1b[33m%s\x1b[0m', 'Background workers are running');

		workers.gatherAllChecks();

		workers.loop();

		workers.rotateLogs();

		workers.logRotationLoops();
	}
};

module.exports = workers;