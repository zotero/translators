#!/usr/bin/env node

process.chdir(__dirname);
 
// async main wrapper
function main(asyncMain) {
	asyncMain().catch(err => {
		console.log('error:', err);
		process.exit(1);
	});
}

// complain if input cannot be converted to an int
function int(n) {
	const _n = parseInt(n);
	if (isNaN(_n)) throw new Error(`Cannot parse ${JSON.stringify(n)} to integer`);
	return _n;
}

const git = require('simple-git')();
const exec = require('node-exec-promise').exec;
const fs = require('fs');

main(async () => {
	const term = await (require('terminal-kit').getDetectedTerminal());
	const master = 'master';

	// report message with colored status. terminal-kit will ignore coloring when the script is not ran in a terminal. Optionally exit with status.
	function report(status, message, exit_status=null) {
		term[{'ok': 'green', 'not ok': 'red', 'skip': 'yellow'}[status]](status);
		term(` - ${message}\n`);
		if (typeof exit_status === 'number') process.exit(exit_status);
	}

	const branches = await new Promise((reject, resolve) => git.branch((_branches, err) => err ? reject(err) : resolve(_branches)));

	if (branches.current === master) {
		report('skip', `Can only check deleted.txt when not on '${master}' branch`, 0);
	}

	if (!branches.all.includes(master)) {
		report('skip', `Can only check deleted.txt when '${master}' branch is also available for comparison`, 0);
	}

	const deletions = (await exec(`git diff-index --diff-filter=D --name-only --find-renames ${master}`))
		.stdout
		.split('\n')
		.filter(line => !line.includes('.ci') && line.endsWith('.js'));

	let failed = 0;

	if (deletions.length) {
		let curVersion = null;
		const deleted = new Set(
			fs.readFileSync('../deleted.txt', 'utf-8')
				.split('\n')
				.map(line => line.split(' ')[0])
				.filter(id => {
					if (!curVersion && id && id.match(/^[0-9]+$/)) curVersion = id;
					return id && id.indexOf('-') > 0;
				})
		);
		curVersion = int(curVersion);

		for (const f of deletions) {
			let id = null;
			for (const line of (await exec(`git show ${master}:"${f}"`)).stdout.split('\n')) {
				const m = line.match(/^\s*"translatorID"\s*:\s*"([^"])+"\s*,?\s*$/);
				if (m) {
					id = m[1];
					break;
				}
			}

			if (!id) {
				report('not ok', `${f} does not have an translatorID`);
				failed += 1;
			} else if (!deleted.has(id)) {
				report('not ok', `${id} (${f}) should be added to deleted.txt`);
				failed += 1;
			}
		}

		// first field of the first line has the version
		const origVersion = int((await exec(`git show "${master}:deleted.txt"`)).stdout.split('\n')[0].split(' ')[0]);
		if (curVersion <= origVersion) {
			report('not ok', `version in deleted.txt needs to be increased`);
			failed += 1;
		}
	}

	if (!failed) {
		report('ok', `deleted.txt`);
	}

	process.exit(failed);
});
