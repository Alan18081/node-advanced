const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data');

lib.create = (dir, file, data, callback) => {
	fs.open(path.join(lib.baseDir, `/${dir}/${file}.json`), 'wx', (err, fileDescr) => {
		if(!err && fileDescr) {
			const stringData = JSON.stringify(data);

			fs.writeFile(fileDescr, stringData, (err) => {
				if(!err) {
					fs.close(fileDescr, err => {
						if(!err) {
							callback(false);
						} else {
							callback('Error closing new file');
						}
					});
				} else {
					callback('Error writing to new file');
				}
			});
		} else {
			console.log(err);
			callback('Could not create new file, it is already exists');
		}
	});
};

lib.read = (dir, file, callback) => {
	fs.readFile(path.join(lib.baseDir, `/${dir}/${file}.json`), 'utf8', (err, data) => {
		if(!err && data) {
			const parsedData = helpers.parseJson(data);
			callback(null, parsedData);
		} else {
			callback(err, data);
		}
	});
};

lib.update = (dir, file, data, callback) => {
	fs.open(path.join(lib.baseDir, `/${dir}/${file}.json`), 'r+', (err, fileDescr) => {
		if(err) return callback(err);
		const stringData = JSON.stringify(data);

		fs.truncate(fileDescr, 0, err => {
			if(err) return callback(err);

			fs.writeFile(fileDescr, stringData, err => {
				if(err) return callback(err);
				fs.close(fileDescr, err => {
					if(err) return callback(err);
					callback(false);
				});
			});
		});
	});
};

lib.delete = (dir, file, callback) => {
	fs.unlink(path.join(lib.baseDir, `/${dir}/${file}.json`), err => {
		if(err) return callback(err);
		callback(false);
	});
};

lib.list = (dir, callback) => {
	fs.readdir(path.join(lib.baseDir, `/${dir}/`), (err, data) => {
		if(!err && data && data.length > 0) {
			const trimmedFilenames = [];
			data.forEach(filename => trimmedFilenames.push(filename.replace('.json', '')));
			callback(false, trimmedFilenames);
		} else {
			callback(err, data);
		}
	});
};

module.exports = lib;