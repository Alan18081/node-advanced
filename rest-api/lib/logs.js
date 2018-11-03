const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const logs = {

	baseDir: path.join(__dirname, '../.logs/'),

	append(filename, str, callback) {
		fs.open(`${logs.baseDir}${filename}.log`, (err, fileDescr) => {
			if(!err && fileDescr) {
				fs.appendFile(fileDescr, str + '\n', err => {
					if(!err) {

					} else {
						callback('Error appending file');
					}
				});
			} else {
				callback(err);
			}
		});
	},

	list(includeCompressedLogs, callback) {
		fs.readdir(logs.baseDir, (err, data) => {
			if(!err && data && data.length) {
				const trimmedFilenames = [];

				data.forEach(filename => {
					if(filename.indexOf('.log') > -1) {
						trimmedFilenames.push(filename.replace('.log', ''));
					}

					if(filename.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
						trimmedFilenames.push(filename.replace('.gz.b64', ''));
					}
				});
			} else {
				callback(err, data);

			}
		});
	},

	compress(logId, newFileId, callback) {
		const srcFilename = logId + '.log';
		const distFilename = newFileId + '.gz.base64';

		fs.readFile(logs.baseDir+srcFilename, 'utf-8', (err, data) => {
			if(!err && data) {
				zlib.gzip(data, (err, buffer) => {
					if(!err && buffer) {
						fs.openFile(logs.baseDir + distFilename, 'wx', (err, fileDescr) => {
							if(!err && fileDescr) {
								fs.writeFile(fileDescr, buffer.toString('base64'), err => {
									if(!err) {
										fs.close(fileDescr, (err) => {
											if(!err) {
												callback(false)
											} else {
												callback(err);
											}
										});
									} else {
										callback(err);
									}
								});
							} else {
								callback(err);
							}
						})
					} else {
						callback(err);
					}
				});
			} else {
				callback(err);
			}
		});
	},

	decompress(fileId, callback) {
		const fileName = fileId + '.gz.base64';

		fs.readFile(logs.baseDir + fileName, 'utf8', (err, str) => {
			if(!err && str) {
				const inputBuffer = Buffer.from(str, 'base64');
				zlib.unzip(inputBuffer, (err, outputBuffer) => {
					if(!err && outputBuffer) {
						const str = outputBuffer.toString();
						callback(false, str);
					} else {
						callback(err);
					}
				});
			} else {
				callback(err);
			}
		});
	}
};

module.exports = logs;