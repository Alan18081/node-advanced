const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const config = require('../config');
const fs = require('fs');
const helpers = require('./helpers');
const handlers = require('./handlers');
const path = require('path');
const util = require('util');

const debug = util.debuglog('server');

const httpsServerOptions = {
	key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
	cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

const serverHandler = (req, res) => {
	// Get the url and parse it
	const parsedUrl = url.parse(req.url, true);
	// Get the path
	const path = parsedUrl.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g, '');

	// Get the method
	const method = req.method.toLowerCase();

	// Get the query
	const query = parsedUrl.query;

	// Get the headers
	const headers = req.headers;

	// Get payload if any
	const decoder = new StringDecoder('utf-8');
	let buffer = '';

	req.on('data', data => {
		buffer += decoder.write(data);
	});

	req.on('end', () => {
		buffer += decoder.end();

		let chosenHandler = router[trimmedPath] ? router[trimmedPath] : handlers.notFound;

		chosenHandler = trimmedPath.indexOf('public') > -1 ? handlers.public : chosenHandler;


		const data = {
			trimmedPath,
			query,
			method,
			headers,
			payload: helpers.parseJson(buffer)
		};

		debugger;

		chosenHandler(data, (statusCode = 200, payload = {}, contentType = 'json') => {

			const { contentTypeHeader, payloadString } = helpers.getPayload(payload, contentType);
			res.setHeader('Content-Type', contentTypeHeader);
			// debug('Content type', contentTypeHeader, payload);

			res.writeHead(statusCode);

			res.end(payloadString);

			if(statusCode === 200) {
				debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} ${parsedUrl.href}`);
			} else {
				debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} ${parsedUrl.href}`);
			}
		});

	});
	// Send the response
	// Log path
};

const httpServer = http.createServer(serverHandler);
const httpsServer = https.createServer(httpsServerOptions, serverHandler);

const server = {
		init() {
		httpServer.listen(config.httpPort, () => {
			debug('\x1b[36m%s\x1b[0m', `Http server is listening port ${config.httpPort} in ${config.envName} environment`);
		});

		httpsServer.listen(config.httpsPort, () => {
			debug('\x1b[35m%s\x1b[0m', `Https server is listening port ${config.httpsPort} in ${config.envName} environment`);
		});
	}
};

const router = {
	'': handlers.index,
	'account/create': handlers.accountCreate,
	'account/edit': handlers.accountEdit,
	'account/deleted': handlers.accountDeleted,
	'session/create': handlers.sessionCreate,
	'session/deleted': handlers.sessionDeleted,
	'checks/all': handlers.checkList,
	'checks/create': handlers.checksCreate,
	'checks/edit': handlers.checksEdit,
	'ping': handlers.ping,
	'api/users': handlers.users,
	'api/tokens': handlers.tokens,
	'api/checks': handlers.checks,
	'favicon.ico': handlers.favicon,
	'public': handlers.public
};

module.exports = server;