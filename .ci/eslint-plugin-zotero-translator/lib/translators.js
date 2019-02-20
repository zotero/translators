const fs = require('fs');

module.exports = {
	headers: {},
	deleted: new Set(
		fs.readFileSync('../deleted.txt', 'utf-8')
			.split('\n')
			.map(line => line.split(' ')[0])
			.filter(id => id && id.indexOf('-') > 0)
	),
};
