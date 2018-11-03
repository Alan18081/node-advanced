const crypto = require('crypto');
const querystring = require('querystring');
const { hashSecret, twilio, templateGlobals } = require('../config');
const https = require('https');
const path = require('path');
const fs = require('fs');

const helpers = {};

helpers.parseJson = (string) => {
	try {
		return JSON.parse(string);
	} catch (e) {
		return {}
	}
};

helpers.hash = (string) => {
	if(typeof string === 'string' && string.length) {
		const hash = crypto
			.createHmac('sha256', hashSecret)
			.update(string).digest('hex');

		return hash;
	} else {
		return false;
	}
};

helpers.createRandomString = len => {
	const letters = 'abcdefghijklmnopqrstuvwxyz1234567890';
	let string = '';
	for(let i = 0; i < len; i++) {
		string += letters.charAt(Math.random() * letters.length);
	}
	return string;
};

helpers.sendTwilioSMS = (phone, msg, callback) => {
	phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false;
	msg = typeof msg === 'string' && msg.trim().length <= 1600 ? msg.trim() : false;

	if(phone && msg) {
		const payload = {
			From: twilio.fromPhone,
			To: `+38${phone}`,
			Body: msg
		};

		const stringPayload = querystring.stringify(payload);
		const requestConfig = {
			protocol: 'https:',
			hostname: 'api.twilio.com',
			method: 'post',
			pathname: `/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
			auth: twilio.accountSid + ':' + twilio.authToken,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(stringPayload)
			}
		};

		const req = https.request(requestConfig, (res) => {
			const status = res.statusCode;
			if(status === 200 && status === 201) {
				callback(false);
			} else {
				callback('Returned status code was ' + status);
			}
		});

		req.on('error', e => {
			callback(e);
		});

		req.write(stringPayload);
		req.end();

	} else {
		callback('Given parameters were missing or invalid');
	}

};

helpers.getTemplate = (name, callback) => {
	const templateName = typeof name === 'string' && name.length > 1 ? name : false;
	if(templateName) {
		const templatesDir = path.join(__dirname, '/../templates/');
		fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, data) => {
			if(!err && data && data.length > 0) {
				callback(false, data);
			} else {
				callback('Failed to read template');
			}
		});
	} else {
		callback('Template name is invalid');
	}
};

helpers.interpolate = (str, data) => {
	str = typeof str === 'string' ? str : '';
	data = typeof data === 'object' && data !== null ? data : {};

	for(const key in templateGlobals) {
		if(templateGlobals.hasOwnProperty(key)) {
			data[`global.${key}`] = templateGlobals[key];
		}
	}

	for(const key in data) {
		if(data.hasOwnProperty(key)) {
			str = str.replace(`{${key}}`, data[key]);
		}
	}
};

module.exports = helpers;