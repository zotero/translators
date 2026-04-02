import { promises as fs } from 'node:fs';

// Same regex used by translator-server.mjs to find the JSON header
const headerRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;

// Markers for the test cases block
const BEGIN_TEST_CASES = '/** BEGIN TEST CASES **/';
const END_TEST_CASES = '/** END TEST CASES **/';

/**
 * Read and parse a translator file into its component parts.
 * Returns { header, headerRaw, headerLineCount, code, testCases, testCasesRaw, raw, metaJsonPath }
 *
 * If a .meta.json sidecar exists, the header is read from it instead of
 * parsing the top of the .js file.
 */
export async function readTranslator(filePath) {
	const raw = await fs.readFile(filePath, 'utf-8');
	const metaJsonPath = filePath.replace(/\.js$/, '.meta.json');
	let metaHeader;
	try {
		metaHeader = JSON.parse(await fs.readFile(metaJsonPath, 'utf-8'));
	}
	catch {
		// No .meta.json or invalid - fall back to parsing from JS
	}

	if (metaHeader) {
		const result = parseTranslator(raw);
		result.header = metaHeader;
		result.metaJsonPath = metaJsonPath;
		return result;
	}

	return parseTranslator(raw);
}

/**
 * Parse translator content string into its component parts.
 */
export function parseTranslator(raw) {
	const result = {
		header: null,
		headerRaw: '',
		headerLineCount: 0,
		code: '',
		testCases: [],
		testCasesRaw: '',
		raw,
	};

	// Parse header
	const headerMatch = headerRe.exec(raw);
	if (headerMatch) {
		result.headerRaw = headerMatch[0];
		result.headerLineCount = result.headerRaw.split('\n').length - 1;
		try {
			result.header = JSON.parse(result.headerRaw);
		}
		catch {
			// Leave header as null if parse fails
		}
	}

	// Parse test cases
	const beginIdx = raw.indexOf(BEGIN_TEST_CASES);
	const endIdx = raw.indexOf(END_TEST_CASES);
	if (beginIdx !== -1 && endIdx !== -1) {
		result.testCasesRaw = raw.substring(beginIdx, endIdx + END_TEST_CASES.length);
		const tcContent = raw.substring(
			beginIdx + BEGIN_TEST_CASES.length,
			endIdx
		);
		// Extract the var testCases = [...] part
		const arrayMatch = tcContent.match(/var\s+testCases\s*=\s*(\[[\s\S]*\])/);
		if (arrayMatch) {
			try {
				result.testCases = JSON.parse(arrayMatch[1]);
			}
			catch {
				// Leave as empty array
			}
		}

		// Code is between header and test cases
		result.code = raw.substring(result.headerRaw.length, beginIdx);
	}
	else {
		// No test cases block - code is everything after header
		result.code = raw.substring(result.headerRaw.length);
	}

	return result;
}

/**
 * Serialize a translator back to a string.
 */
export function serializeTranslator({ header, code, testCases }) {
	const parts = [];

	// Header
	parts.push(JSON.stringify(header, null, '\t'));
	parts.push('\n');

	// Code (should already have leading/trailing newlines as needed)
	parts.push(code);

	// Test cases
	if (!code.endsWith('\n')) parts.push('\n');
	parts.push(serializeTestCases(testCases));
	parts.push('\n');

	return parts.join('');
}

/**
 * Format test cases as the standard block.
 */
export function serializeTestCases(testCases) {
	const json = JSON.stringify(testCases, null, '\t');
	return `${BEGIN_TEST_CASES}\nvar testCases = ${json}\n${END_TEST_CASES}`;
}

/**
 * Write a translator file, preserving the code portion and replacing header/testCases.
 */
export async function writeTranslator(filePath, { header, code, testCases }) {
	const content = serializeTranslator({ header, code, testCases });
	await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Update specific header fields in a translator file without touching code or test cases.
 * Returns the updated header object.
 */
export async function updateHeader(filePath, updates) {
	const translator = await readTranslator(filePath);
	if (!translator.header) {
		throw new Error(`Could not parse header in ${filePath}`);
	}

	Object.assign(translator.header, updates);

	if (translator.metaJsonPath) {
		// Header lives in .meta.json
		await fs.writeFile(
			translator.metaJsonPath,
			JSON.stringify(translator.header, null, '\t') + '\n',
			'utf-8'
		);
	}
	else {
		// Header is embedded in the .js file
		const raw = translator.raw;
		const newHeader = JSON.stringify(translator.header, null, '\t') + '\n';
		const rest = raw.substring(translator.headerRaw.length);
		await fs.writeFile(filePath, newHeader + rest, 'utf-8');
	}

	return translator.header;
}
