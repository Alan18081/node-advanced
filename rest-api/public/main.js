
	console.log('App.js is initialized');
	const app = {};

	app.config = {
		sessionToken: false
	};

	app.client = {
		request(headers, path, method, queryObject, payload, callback) {
			headers = typeof headers === 'object' && headers !== null ? headers : {};
			path = typeof path === 'string' ? path : '/';
			method = typeof method === 'string' && ['GET', 'POST', 'PUT', 'DELETE'].indexOf(method) > -1 ? method : 'GET';
			queryObject = typeof queryObject === 'object' && queryObject !== null ? queryObject : {};
			payload = typeof payload === 'object' && payload !== null ? payload : {};
			callback = typeof callback === 'function' ? callback : false;

			let reqUrl = path + '?';
			let counter = 0;
			for(const key in queryObject) {
				if(queryObject.hasOwnProperty(key)) {
					counter++;
					if(counter > 1) {
						reqUrl += '&';
					}

					reqUrl += `${key}=${queryObject[key]}`;
				}
			}

			const xhr = new XMLHttpRequest();

			xhr.open(method, reqUrl, true);
			xhr.setRequestHeader('Content-Type', 'application/json');
			for(const key in headers) {
				if(headers.hasOwnProperty(key)) {
					xhr.setRequestHeader(key, headers[key]);
				}
			}

			if(app.config.sessionToken) {
				xhr.setRequestHeader('token', app.config.sessionToken.id);
			}

			xhr.onreadystatechange = () => {
				if(xhr.readyState === XMLHttpRequest.DONE) {
					const statusCode = xhr.status;
					const response = xhr.responseText;

					if(callback) {
						try {
							const parsedResponse = JSON.parse(response);
							callback(statusCode, parsedResponse);
						} catch (e) {
							callback(statusCode, false);
						}
					}
				}
			};

			const payloadString = JSON.stringify(payload);

			xhr.send(payloadString);
		}
	};