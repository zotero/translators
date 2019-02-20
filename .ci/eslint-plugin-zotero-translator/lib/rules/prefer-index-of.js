'use strict';

const fs = require('fs');
const path = require('path');

// this is a very simplistic rule to find 'unnecesary use of indexOf' until I find a better eslint plugin that does this

module.exports = function(context) {
	return {
		Program: function(node) {
			const filename = path.resolve(context.getFilename());

			let lineno = 0;
			for (const line of fs.readFileSync(filename, 'utf-8').split('\n')) {
				lineno += 1;

				if (line.match(/\.indexOf(.*) *(=+ *-1|!=+ *-1|> *-1|>= *0|< *0)/)) {
					context.report(node, `Unnecessary '.indexOf()', use '.includes()' instead in line ${lineno}`);
					break;
				}
			}
		}
	};
};
