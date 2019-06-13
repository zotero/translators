'use strict';

// this is a very simplistic rule to find 'unnecessary use of indexOf' until I find a better eslint plugin that does this
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'suggest alternative to unnecessary use of indexOf',
			category: 'Stylistic Issues',
		},
	},

	create: function (context) {
		return {
			Program: function (node) {
				let lineno = 0;
				for (const line of context.getSourceCode().getText().split('\n')) { // eslint-disable-line newline-per-chained-call
					lineno += 1;

					const m = line.match(/\.indexOf(.*) *(=+ *-1|!=+ *-1|> *-1|>= *0|< *0)/);
					if (m) {
						context.report({
							node,
							message: "Unnecessary '.indexOf()', use '.includes()' instead",
							loc: { start: { line: lineno, column: line.indexOf(m[0]) + 1 } },
						});
					}
				}
			}
		};
	},
};
