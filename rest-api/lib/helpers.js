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


helpers.addUniversalTemplates = (str, data, callback) => {
	str = typeof str === 'string' && str.length > 0 ? str : '';
	data = typeof data === 'object' && data !== null ? data : {};

	helpers.getTemplate( '_header', data, (err, header) => {
		if(!err && header) {
			helpers.getTemplate('_footer', data, (err, footer) => {
				if(!err && footer) {
					const interpolatedTemplate = header + str + footer;
					callback(false, interpolatedTemplate);
				} else {
					callback(err);
				}
			});
		} else {
			callback(err);
		}
	});
};

helpers.getTemplate = (name, data, callback) => {
	const templateName = typeof name === 'string' && name.length > 1 ? name : false;
	const dataObj = typeof data === 'object' ? data : {};

	if(templateName) {
		const templatesDir = path.join(__dirname, '/../templates/');
		fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, template) => {
			if(!err && template && template.length > 0) {
				const str = helpers.interpolate(template, dataObj);
				callback(false, str);
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

	return str;
};

helpers.getPayload = (payload, contentType) => {
	let payloadString;
	let contentTypeHeader;

	if(contentType === 'json') {
		contentTypeHeader = 'application/json';
		payloadString = JSON.stringify(payload);
	}

	if(contentType === 'html') {
		contentTypeHeader = 'text/html';
		payloadString = typeof payload === 'string' ? payload : '';
	}

	if(contentType === 'favicon') {
		contentTypeHeader = 'image/x-icon';
		payloadString = !!payload ? payload : '';
	}

	if(contentType === 'png') {
		contentTypeHeader = 'image/png';
		payloadString = !!payload ? payload : '';
	}

	if(contentType === 'css') {
		contentTypeHeader = 'text/css';
		payloadString = !!payload ? payload : '';
	}

	if(contentType === 'jpg') {
		contentTypeHeader = 'image/jpg';
		payloadString = !!payload ? payload : '';
	}

	if(contentType === 'js') {
		contentTypeHeader = 'application/javascript';
		payloadString = !!payload ? payload : '';
	}

	if(contentType === 'plain') {
		contentTypeHeader = 'text/plain';
		payloadString = typeof payload === 'string' ? payload : '';
	}


	return {
		contentTypeHeader,
		payloadString
	}
};

helpers.getStaticAsset = (filename, callback) => {
	filename = typeof filename === 'string' && filename.length > 0 ? filename : false;
	if(filename) {
		fs.readFile(path.join(__dirname, '../public/' + filename), (err, data) => {
			if(!err && data) {
				callback(false, data);
			} else {
				callback(err);
			}
		});
	} else {
		callback('Invalid filename');
	}
};

module.exports = helpers;