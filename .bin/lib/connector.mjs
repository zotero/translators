import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { REPO_ROOT } from './common.mjs';
import {
	EXTENSION_ID,
	CHROME_EXTENSION_KEY,
	TRANSLATOR_SERVER_URL,
	CONNECTOR_BUILD_ENV,
} from '../../.ci/constants.mjs';

export { EXTENSION_ID, CHROME_EXTENSION_KEY };

const CI_DIR = path.join(REPO_ROOT, '.ci', 'pull-request-check');
export const CONNECTORS_DIR = path.join(CI_DIR, 'connectors');
export const CONNECTOR_BUILD_DIR = path.join(CONNECTORS_DIR, 'build', 'manifestv3');

/**
 * Check if the existing build has the correct config baked in.
 */
function isBuildValid() {
	const configPath = path.join(CONNECTOR_BUILD_DIR, 'zotero_config.js');
	if (!existsSync(configPath)) return false;
	const config = readFileSync(configPath, 'utf-8');
	return config.includes(`REPOSITORY_URL: "${TRANSLATOR_SERVER_URL}"`)
		&& config.includes('ALWAYS_FETCH_FROM_REPOSITORY: true');
}

/**
 * Ensure the Zotero Connector extension is built with the correct config.
 * Returns the path to the built extension directory.
 */
export async function ensureConnectorBuild({ rebuild = false } = {}) {
	if (!rebuild && isBuildValid()) {
		return CONNECTOR_BUILD_DIR;
	}

	console.error('Building Zotero Connector extension (this may take a minute)...');

	const execOpts = {
		cwd: CONNECTORS_DIR,
		stdio: 'inherit',
		encoding: 'utf-8',
		env: { ...process.env, ...CONNECTOR_BUILD_ENV },
	};

	if (existsSync(path.join(CONNECTORS_DIR, '.git'))) {
		execSync('git config url."https://".insteadOf git://', execOpts);
		execSync('git pull', execOpts);
		execSync('git submodule update', execOpts);
		execSync('git -C src/zotero/ submodule update -- resource/schema/global', execOpts);
		execSync('git -C src/zotero submodule update -- resource/SingleFile', execOpts);
		execSync('npm ci', execOpts);
	}
	else {
		execSync(`git clone https://github.com/zotero/zotero-connectors.git --depth 1 "${CONNECTORS_DIR}"`,
			{ cwd: CI_DIR, stdio: 'inherit', env: { ...process.env, ...CONNECTOR_BUILD_ENV } });
		execSync('git config url."https://".insteadOf git://', execOpts);
		execSync('git submodule update --init --depth 1', execOpts);
		execSync('git -C src/zotero submodule update --init --depth 1 -- resource/schema/global', execOpts);
		execSync('git -C src/zotero submodule update --init --depth 1 -- resource/SingleFile', execOpts);
		execSync('npm ci', execOpts);
	}

	execSync('./build.sh -p b -d', execOpts);

	if (!isBuildValid()) {
		throw new Error('Connector build failed or has wrong config');
	}

	return CONNECTOR_BUILD_DIR;
}
