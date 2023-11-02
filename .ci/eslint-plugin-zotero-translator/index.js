/**
 * @fileoverview Checks Zotero translators for errors and recommended style
 * @author Emiliano Heyns
 */

'use strict';

const requireDir = require('require-dir');

module.exports = {
	rules: requireDir('./rules'),
  processors: {
    translator: require('./processor'),
  },
};
