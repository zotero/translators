{
	"translatorID": "5c95b67b-41c5-4f55-b71a-48d5d7183063",
	"label": "CNKI",
	"creator": "Aurimas Vinckevicius, Xingzhong Lin, jiaojiaodubai",
	"target": "https?://.*?(cnki\\.net)?/(kns8?s?|kcms2?|KNavi|xmlRead)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-24 05:40:30"
}

/*
	***** BEGIN LICENSE BLOCK *****
	CNKI(China National Knowledge Infrastructure) Translator
	Copyright © 2013 Aurimas Vinckevicius
	This file is part of Zotero.
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.
	***** END LICENSE BLOCK *****
*/

// Whether user ip is in Chinese Mainland, default is true.
let inMainland = true;

// Platform of CNKI, default to the National Zong Ku Ping Tai(pinyin of "Total Database Platform").
// It may be modified when this Translator called by other translators.
const platform = 'NZKPT';

/**
 * A mapping table of database code to item type.
 * It may be modified when this Translator called by other translators.
 */
const typeMap = {

	/*
	In the following comments,
	"wai wen" indicates the pinyin of Chinese word "外文", meaning "foreign language",
	"zong ku" indicates the pinyin of Chinese word "总库", meaning "total database".
	 */
	// 中国学术期刊全文数据库（China Academic Journal Full-text Database, AKA CAJD, CJZK）
	CJFD: 'journalArticle',
	CJFQ: 'journalArticle',
	// 中国预出版期刊全文数据库（China Advance Publish Journal Full-text Database）
	CAPJ: 'journalArticle',
	// 外文学术期刊数据库（Wai Wen Journal Database）
	WWJD: 'journalArticle',
	// 特色期刊 journal
	CJFN: 'journalArticle',
	// 中国学术辑刊全文数据库（China Collected Journal Database）
	CCJD: 'journalArticle',

	/* thesis */
	// 中国博硕士学位论文全文数据库（China Doctoral Dissertations and Master’s Theses Full-text Database）
	CDMD: 'thesis',
	// 中国博士学位论文全文数据库（China Doctoral Dissertations Full-text Database）
	CDFD: 'thesis',
	// 中国优秀硕士学位论文全文数据库（China Master’s Theses Full-text Database）
	CMFD: 'thesis',
	// 中国重要报纸全文数据库（China Core Newspapers Full-text Database）
	CCND: 'newspaperArticle',

	/* patent */
	// 境内外专利全文数据库（China & Outbound Patent Full-text Database）
	SCOD: 'patent',
	// 中国专利全文数据库（China Patent Full-text Database）
	SCPD: 'patent',
	// 境外专利全文数据库（Outbound Patent Full-text Database）
	SOPD: 'patent',
	// 中国年鉴全文数据库（China Yearbook Full-text Database）
	CYFD: 'bookSection',

	/* conference paper */
	// 国际及国内会议论文全文数据库（Cina & International Important Proceeding Full-text Database）
	CIPD: 'conferencePaper',
	// 中国会议论文全文数据库（Cina Proceeding Full-text Database）
	CPFD: 'conferencePaper',
	// 国际会议论文全文数据库（International Proceeding Full-text Database）
	IPFD: 'conferencePaper',
	// 国外会议全文数据库（Wai Wen Proceeding Full-text Database）
	WWPD: 'conferencePaper',
	// 会议视频（China Proceeding Video Database）
	CPVD: 'conferencePaper',
	// 视频（China Conference Video Database）
	CCVD: 'videoRecording',

	/* book */
	// Book Datab 总库
	BDZK: 'book',
	// 中文图书 book, zh
	WBFD: 'book',
	// 外文图书数据库（wai wen Book Database）
	WWBD: 'book',

	/* Standard */
	// 标准数据总库（Cina & International Stand Database）
	CISD: 'standard',
	// 中国标准全文数据库（China Standard Full-text Database）
	SCSF: 'standard',
	// 中国行业标准全文数据库（China Hang Ye Standard Full-text Database）
	SCHF: 'standard',
	// 中国标准题录数据库（China Standard Full-text Database）
	SCSD: 'standard',
	// 国外标准全文数据库（Outbound Standard Full-text Database）
	SOSD: 'standard',

	/* report */
	// 中国科技项目创新成果鉴定意见数据库（National Science and Technology Project Innovation Achievement Appraisal Opinion Database）
	SNAD: 'report',
	// 科技报告（Chinese pinyin "Ke Ji Bao Gao", means "Science & Technology Report"）
	KJBG: 'report',

	/* statute */
	// 中国政报公报期刊文献总库
	// GWKT: 'statute',
	// 中国法律知识总库（Cina Law Knowledge Database）
	// CLKD: 'statute',

	/* Rare dbcode migrations from previous code or from user-reported cases. */
	CJZK: 'journalArticle',
	// legacy, see sample on https://www.52pojie.cn/thread-1231722-1-1.html
	SJES: 'journalArticle',
	SJPD: 'journalArticle',
	SSJD: 'journalArticle'
};

// A list of databases containing only English literature for language determination.
// It may be modified when this Translator called by other translators.
const enDatabase = ['WWJD', 'IPFD', 'WWPD', 'WWBD', 'SOSD'];

// A list of databases that look like CNKI Scholar.
// It may be modified when this Translator called by other translators.
const scholarLike = ['WWJD', 'WWBD'];

/**
 * A series of identifiers for item, used to request data from APIs.
 */
class ID {
	constructor(doc, url) {
		const frame = {
			dbname: {
				selector: 'input#paramdbname',
				pattern: /[?&](?:db|table)name=([^&#/]*)/i
			},
			filename: {
				selector: 'input#paramfilename',
				pattern: /[?&]filename=([^&#/]*)/i
			},
			dbcode: {
				selector: 'input#paramdbcode',
				pattern: /[?&]dbcode=([^&#/]*)/i
			}
		};
		for (const key in frame) {
			this[key] = attr(doc, frame[key].selector, 'value')
				|| tryMatch(url, frame[key].pattern, 1);
		}
		this.dbcode = this.dbcode || this.dbname.substring(0, 4).toUpperCase();
		this.url = url;
	}

	/**
	 * @returns true when both necessary dbcode and filename are available.
	 */
	toBoolean() {
		return Boolean(this.dbname && this.filename);
	}

	toItemtype() {
		return exports.typeMap[this.dbcode];
	}

	toLanguage() {
		// zh database code: CJFQ,CDFD,CMFD,CPFD,IPFD,CPVD,CCND,WBFD,SCSF,SCHF,SCSD,SNAD,CCJD,CJFN,CCVD
		// en database code: WWJD,IPFD,WWPD,WWBD,SOSD
		return exports.enDatabase.includes(this.dbcode)
			? 'en-US'
			: 'zh-CN';
	}
}

function detectWeb(doc, url) {
	const ids = new ID(doc, url);
	Z.debug('detect ids:');
	Z.debug(ids);
	const multiplePattern = [

		/*
		search
		https://kns.cnki.net/kns/search?dbcode=SCDB
		https://kns.cnki.net/kns8s/
		 */
		/kns8?s?\/search\??/i,

		/* https://kns.cnki.net/kns8s/defaultresult/index?korder=&kw= */
		/kns8?s?\/defaultresult\/index/i,

		/*
		advanced search
		old version: https://kns.cnki.net/kns/advsearch?dbcode=SCDB
		new version: https://kns.cnki.net/kns8s/AdvSearch?classid=WD0FTY92
		 */
		/KNS8?s?\/AdvSearch\?/i,

		/*
		navigation page
		https://navi.cnki.net/knavi/journals/ZGSK/detail?uniplatform=NZKPT
		 */
		/\/KNavi\//i
	];
	// #briefBox for commom search and advanced search,
	// #contentPanel for journal/yearbook navigation,
	// .main_sh for old version
	const searchResult = doc.querySelector('#briefBox, #contentPanel, .main_sh');
	if (searchResult) {
		Z.monitorDOMChanges(searchResult, { childList: true, subtree: true });
	}
	if (ids.toBoolean()) {
		// Sometimes dbcode is not a known type, and the itmType cannot be determined by dbcode.
		// But the itemType does not affect the api request, and we can get its real item type later,
		// so it appears temporarily as a journal article.
		return ids.toItemtype() || 'journalArticle';
	}
	else if (multiplePattern.some(element => element.test(url)) && getSearchResults(doc, url, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, url, checkOnly) {
	const items = {};
	let found = false;
	const multiplePage = [

		/*
		journal navigation
		https://navi.cnki.net/knavi/journals/ZGSK/detail?uniplatform=NZKPT
		 */
		{
			isMatch: /\/journals\/.+\/detail/i.test(url),
			// 过刊浏览，栏目浏览
			row: '#rightCatalog dd, .searchresult-list tbody > tr',
			a: '.name > a',
			cite: 'td[align="center"]:nth-last-child(2)',
			download: 'td[align="center"]:last-child'
		},

		/*
		thesis navigation
		https://navi.cnki.net/knavi/degreeunits/GBEJU/detail?uniplatform=NZKPT
		 */
		{
			isMatch: /\/degreeunits\/.+\/detail/i.test(url),
			row: '#rightCatalog tbody > tr',
			a: '.name > a',
			cite: 'td[align="center"]:nth-last-child(2)',
			download: 'td[align="center"]:last-child'
		},

		/*
		conference navigation
		https://navi.cnki.net/knavi/conferences/030681/proceedings/IKJS202311001/detail?uniplatform=NZKPT
		 */
		{
			isMatch: /\/proceedings\/.+\/detail/i.test(url),
			row: '#rightCatalog tbody > tr',
			a: '.name > a',
			cite: 'td[align="center"]:nth-last-child(2)',
			download: 'td[align="center"]:last-child'
		},

		/*
		newspaper navigation
		https://navi.cnki.net/knavi/newspapers/RMRB/detail?uniplatform=NZKPT
		 */
		{
			isMatch: /\/newspapers\/.+\/detail/i.test(url),
			row: '#rightCatalog tbody > tr',
			a: '.name > a'
		},

		/*
		yearbook navigation
		https://kns.cnki.net/knavi/yearbooks/YHYNJ/detail?uniplatform=NZKPT
		 */
		{
			isMatch: /\/yearbooks\/.+\/detail/i.test(url),
			row: '#rightCatalog .itemNav',
			a: 'a'
		},

		/*
		yearbook search result
		https://kns.cnki.net/kns8s/defaultresult/index?classid=HHCPM1F8&korder=SU&kw=%E7%85%A4%E7%82%AD
		 */
		{
			isMatch: doc.querySelector('.yearbook-title > a'),
			row: 'table.result-table-list tbody tr',
			a: '.yearbook-title > a',
			download: 'td.download'
		},

		/* Search page */
		{
			isMatch: true,
			row: 'table.result-table-list tbody tr',
			a: 'td.name a',
			cite: 'td.quote',
			download: 'td.download'
		}
	].find(page => page.isMatch);
	const rows = doc.querySelectorAll(multiplePage.row);
	if (!rows.length) return false;
	for (let i = 0; i < rows.length; i++) {
		const itemKey = {};
		const header = rows[i].querySelector(multiplePage.a);
		if (!header) continue;
		itemKey.url = header.href;
		const title = header.getAttribute('title') || ZU.trimInternal(header.textContent);
		if (!itemKey.url || !title) continue;
		if (checkOnly) return true;
		found = true;
		// Identifier used for batch export, the format is different for homeland and oversea versions.
		itemKey.cookieName = attr(rows[i], '[name="CookieName"]', 'value');
		// attachment download link.
		itemKey.downloadlink = attr(rows[i], 'td.operat > a.downloadlink', 'href');
		try {
			// citation counts.
			itemKey.cite = text(rows[i], multiplePage.cite);
			// download counts.
			itemKey.download = text(rows[i], multiplePage.download);
		}
		catch (error) {
			Z.debug('Failed to get CNKIcite or download');
		}

		/* Use the item key to store some useful information */
		items[JSON.stringify(itemKey)] = `【${i + 1}】${title}`;
	}
	return found ? items : false;
}

// Css selectors for CNKI Scholar like page, to change the default behavior of CNKI Scholar translator.
// It may be modified when this Translator called by other translators.
const csSelectors = {
	labels: '.brief h3, .row-scholar',
	title: '.h1-scholar',
	abstractNote: '#ChDivSummary',
	publicationTitle: '.top-tip-scholar > span >a',
	pubInfo: '.top-tip-scholar',
	publisher: '.all-source a',
	DOI: 'no-selector-available',
	creators: '.author-scholar > a',
	tags: '[id*="doc-keyword"] a',
	hightlights: 'no-selector-available',
	bookUrl: 'no-selector-available'
};

async function doWeb(doc, url) {
	// for inside and outside Chinese Mainland IP, CNKI uses different APIs.
	inMainland = !/oversea/i.test(url);
	Z.debug(`inMainland: ${inMainland}`);

	if (detectWeb(doc, url) == 'multiple') {
		let items = await Z.selectItems(getSearchResults(doc, url, false));
		if (!items) return;
		await scrapeMulti(items, doc);
	}
	else {
		await scrape(doc);
	}
}

/**
 * For multiple items, prioritize trying to scrape them one by one, as documents always provide more information;
 * if it is not possible to obtain item's document, consider using batch export API.
 * @param {Object} items, items from Zotero.selectedItems().
 */
async function scrapeMulti(items, doc) {
	for (const key in items) {
		const itemKey = JSON.parse(key);
		Z.debug(itemKey);
		try {
			// During debugging, may manually throw an error to guide the program to run inward
			// throw new Error('debug');
			let doc = await requestDocument(itemKey.url);
			// CAPTCHA
			if (doc.querySelector('#verify_pic')) {
				doc = await requestDocument(`https://kns.cnki.net/kcms2/newLink?${tryMatch(itemKey.url, /v=[^&/]+/)}`);
			}
			await scrape(doc, itemKey);
		}
		catch (error) {
			Z.debug('Error encountered while scraping one by one:');
			Z.debug(error);
			if (!Object.keys(items).some(itemKey => JSON.parse(itemKey).cookieName)) {
				throw new Error('This page is not suitable for using batch export API');
			}
			const itemKeys = Object.keys(items)
				.map(element => JSON.parse(element))
				.filter(element => element.cookieName);
			await scrapeWithShowExport(itemKeys, doc);
			// batch export API can request all data at once.
			break;
		}
	}
}

async function scrape(doc, itemKey = { url: '', cite: '', cookieName: '', downloadlink: '' }) {
	const url = doc.location.href;
	const ids = new ID(doc, url);
	if (exports.scholarLike.includes(ids.dbcode)) {
		let translator = Zotero.loadTranslator('web');
		// CNKI Scholar
		translator.setTranslator('b9b97a32-a8aa-4688-bd81-491bec21b1de');
		translator.setDocument(doc);
		translator.setHandler('itemDone', (_obj, item) => {
			item.attachments.push({
				title: 'Snapshot',
				document: doc
			});
			item.complete();
		});
		const cs = await translator.getTranslatorObject();
		cs.selectors = exports.csSelectors;
		cs.typeKey = text(doc, '.top-tip-scholar > span:first-child');
		await cs.scrape(doc, url);
	}
	else if (ids.toItemtype() == 'videoRecording') {
		await scrapeDoc(doc, itemKey);
	}
	else if (url.includes('thinker.cnki')) {
		let translator = Zotero.loadTranslator('web');
		// CNKI thinker
		translator.setTranslator('5393921c-d543-4b3a-a874-070b5d73b03a');
		translator.setDocument(doc);
		translator.setHandler('itemDone', (_obj, item) => {
			item.complete();
		});
		await translator.translate();
	}
	else {
		if (/\/xmlRead\//i.test(url)) {
			doc = await requestDocument(strChild(doc, 'a.details', 'href'));
		}
		try {
			// During debugging, may manually throw an error to guide the program to run inward
			// throw new Error('debug');
			await scrapeWithGetExport(doc, ids, itemKey);
		}
		catch (error1) {
			Z.debug('An error was encountered while using GetExport API:');
			Z.debug(error1);
			try {
				// During debugging, may manually throw an error to guide the program to run inward
				// throw new Error('debug');
				itemKey.cookieName = `${ids.dbname}!${ids.filename}!1!0`;
				await scrapeWithShowExport([itemKey], doc);
			}
			catch (error2) {
				Z.debug('An error was encountered while using ShowExport API:');
				Z.debug(error2);
				await scrapeDoc(doc, itemKey);
			}
		}
	}
}

/**
 * API from the "cite" button of the page.
 * @param {Element} doc
 * @param {ID} ids
 * @param {*} itemKey some extra information from "multiple" page.
 */
async function scrapeWithGetExport(doc, ids, itemKey) {
	Z.debug('use API: GetExport');
	// During debugging, may manually throw an error to guide the program to run inward.
	// throw new Error('debug');

	const postUrl = inMainland
		? '/dm8/API/GetExport'
		: '/kns8/manage/APIGetExport';
	// "1": row's sequence in search result page, defualt 1; "0": index of page in search result pages, defualt 0.
	let postData = inMainland
		? `filename=${attr(doc, '#export-id', 'value')}&uniplatform=${exports.platform}`
		: `filename=${ids.dbname}!${ids.filename}!1!0`;
	// Although there are two data formats that are redundant,
	// it can make the request more "ordinary" to server.
	postData += '&displaymode=GBTREFER%2Celearning%2CEndNote';
	let referText = await requestJSON(
		postUrl,
		{
			method: 'POST',
			body: postData,
			headers: {
				Referer: ids.url
			}
		}
	);

	if (!referText.data || !referText.data.length) {
		throw new ReferenceError(`Failed to retrieve data from API: GetExport\n${JSON.stringify(ids)}\n${JSON.stringify(referText)}`);
	}
	referText = referText.data[2].value[0].replace(/<br>/g, '\n');
	await parseRefer(referText, doc, ids.url, itemKey);
}

/**
 * API from buulk-export button.
 * @param {*} itemKey some extra information from "multiple" page.
 */
async function scrapeWithShowExport(itemKeys, doc) {
	Z.debug('use API: showExport');
	// During debugging, may manually throw an error to guide the program to run inward
	// throw new Error('debug');

	const postUrl = inMainland
		? 'https://kns.cnki.net/dm8/api/ShowExport'
		: `${doc.location.protocol}//${doc.location.host}/kns/manage/ShowExport`;
	const postData = `FileName=${itemKeys.map(key => key.cookieName).join(',')}`
		+ '&DisplayMode=EndNote'
		+ '&OrderParam=0'
		+ '&OrderType=desc'
		+ '&SelectField='
		+ `${inMainland ? `&PageIndex=1&PageSize=20&language=CHS&uniplatform=${exports.platform}` : ''}`
		+ `&random=${Math.random()}`;
	const refer = inMainland
		? 'https://kns.cnki.net/dm8/manage/export.html?'
		: `${doc.location.protocol}//${doc.location.host}/manage/export.html?displaymode=EndNote`;
	let referText = await request(
		postUrl,
		{
			method: 'POST',
			body: postData,
			headers: {
				Referer: refer
			}
		}
	);
	if (!referText.body || !referText.body.length) {
		throw new ReferenceError('Failed to retrieve data from API: ShowExport');
	}
	referText = referText.body
		// prefix
		.replace(/^<ul class='literature-list'>/, '')
		// suffix
		.replace(/<\/ul><input.*>$/, '')
		.match(/<li>.*?<\/li>/g);

	for (let i = 0; i < referText.length; i++) {
		let text = referText[i];
		text = text.replace(/(^<li>\s*|\s*<\/li>$)/g, '').replace(/<br>/g, '\n');
		await parseRefer(
			text,
			doc,
			itemKeys[i].url,
			itemKeys[i]);
	}
}

/**
 * Alternative offline scrapping scheme.
 * @param {Element} doc
 * @param {*} itemKey some extra information from "multiple" page.
 */
async function scrapeDoc(doc, itemKey) {
	Z.debug('scraping from document...');

	const url = doc.location.href;
	const ids = new ID(doc, url);
	const newItem = new Zotero.Item(ids.toItemtype());
	const labels = new Labels(doc, 'div.doc div[class^="row"], li.top-space, .total-inform > span');
	const extra = new Extra();
	Z.debug(labels.data.map(element => [element[0], ZU.trimInternal(element[1].textContent)]));

	richTextTitle(newItem, doc);
	newItem.abstractNote = attr(doc, '#abstract_text', 'value');

	const doi = labels.get('DOI');
	if (ZU.fieldIsValidForType('DOI', newItem.itemType)) {
		newItem.DOI = doi;
	}
	else {
		extra.set('DOI', doi, true);
	}

	/* URL */
	if (!newItem.url || !/filename=/i.test(url)) {
		if (doi) {
			newItem.url = 'https://doi.org/' + doi;
		}
		else {
			newItem.url = 'https://kns.cnki.net/KCMS/detail/detail.aspx?'
				+ `dbcode=${ids.dbcode}`
				+ `&dbname=${ids.dbname}`
				+ `&filename=${ids.filename}`;
		}
	}
	newItem.language = ids.toLanguage();

	/* creators */
	let creators = Array.from(doc.querySelectorAll('#authorpart > span > a[href*="/author/"]')).map(element => ZU.trimInternal(element.textContent).replace(/[\d,\s-]+$/, ''));
	if (!creators.length && doc.querySelectorAll('#authorpart > span').length) {
		creators = Array.from(doc.querySelectorAll('#authorpart > span')).map(element => ZU.trimInternal(element.textContent).replace(/[\d\s,;，；~-]*$/, ''));
	}
	if (!creators.length && doc.querySelector('h3 > span:only-child')) {
		creators = ZU.trimInternal(doc.querySelector('h3 > span:only-child').textContent)
			.replace(/\(.+?\)$/, '')
			// pure Chinese name or English name
			.match(/[\u4e00-\u9fff]+|[a-z .-]+/ig)
			.filter(string => ![
				'institute',
				'institution',
				'organization',
				'company',
				'corporation',
				'firm',
				'laboratory',
				'lab',
				'co.ltd',
				'school',
				'university',
				'college'
			].some(institution => string.toLowerCase().includes(institution)));
	}
	creators.forEach((string) => {
		newItem.creators.push(cleanName(string, 'author'));
	});

	/* tags */
	const tags = [
		Array.from(doc.querySelectorAll('.keywords > a')).map(element => ZU.trimInternal(element.textContent).replace(/[，；,;]$/, '')),
		labels.get(['关键词', '關鍵詞', 'keywords']).split(/[;，；]\s*/)
	].find(arr => arr.length);
	if (tags) newItem.tags = tags;

	/* specific Fields */
	switch (newItem.itemType) {
		case 'journalArticle': {
			const pubInfo = ZU.trimInternal(innerText(doc, '.top-tip'));
			newItem.publicationTitle = tryMatch(pubInfo, /^(.+?)\./, 1).trim().replace(/\(([\u4e00-\u9fff]*)\)$/, '（$1）');
			newItem.volume = tryMatch(pubInfo, /,\s?0*([1-9]\d*)\s*\(/, 1);
			newItem.issue = tryMatch(pubInfo, /\(([A-Z]?\d*)\)/i, 1).replace(/0*(\d+)/, '$1');
			newItem.pages = labels.get(['页码', '頁碼', 'Page$']);
			newItem.date = tryMatch(pubInfo, /\.\s?(\d{4})/, 1);
			break;
		}
		case 'thesis': {
			newItem.university = text(doc, 'h3 >span >  a[href*="/organ/"]').replace(/\(([\u4e00-\u9fff]*)\)$/, '（$1）');
			newItem.thesisType = inMainland
				? {
					CMFD: '硕士学位论文',
					CDFD: '博士学位论文',
					CDMH: '硕士学位论文'
				}[ids.dbcode]
				: {
					CMFD: 'Master thesis',
					CDFD: 'Doctoral dissertation',
					CDMH: 'Master thesis'
				}[ids.dbcode];
			const pubInfo = labels.get('出版信息');
			newItem.date = ZU.strToISO(pubInfo);
			newItem.numPages = labels.get(['页数', '頁數', 'Page']);
			labels.get(['导师', '導師', 'Tutor']).split(/[;，；]\s*/).forEach((supervisor) => {
				newItem.creators.push(cleanName(ZU.trimInternal(supervisor), 'contributor'));
			});
			extra.set('major', labels.get(['学科专业', '學科專業', 'Retraction']));
			break;
		}
		case 'conferencePaper': {
			newItem.abstractNote = labels.get(['摘要', 'Abstract']).replace(/^[〈⟨<＜]正[＞>⟩〉]/, '');
			newItem.date = ZU.strToISO(labels.get(['会议时间', '會議時間', 'ConferenceTime']));
			newItem.proceedingsTitle = attr(doc, '.top-tip > :first-child', 'title');
			newItem.conferenceName = labels.get(['会议名称', '會議名稱', 'ConferenceName']);
			newItem.place = labels.get(['会议地点', '會議地點', 'ConferencePlace']);
			newItem.pages = labels.get(['页码', '頁碼', 'Page$']);
			break;
		}
		case 'newspaperArticle': {
			const subTitle = labels.get(['副标题', '副標題', 'Subtitle']);
			if (subTitle) {
				newItem.shortTitle = newItem.title;
				newItem.title = `${newItem.title}：${subTitle}`;
			}
			newItem.abstractNote = text(doc, '.abstract-text');
			newItem.publicationTitle = text(doc, '.top-tip > a');
			newItem.date = ZU.strToISO(labels.get(['报纸日期', '報紙日期', 'NewspaperDate']));
			newItem.pages = labels.get(['版号', '版號', 'EditionCode']);
			break;
		}
		case 'bookSection':
			newItem.bookTitle = text(doc, '.book-info .book-tit');
			newItem.date = tryMatch(labels.get(['来源年鉴', 'SourceYearbook']), /\d{4}/);
			newItem.pages = labels.get(['页码', '頁碼', 'Page$']);
			newItem.creators = labels.get(['责任说明', '責任說明', 'Statementofresponsibility'])
				.replace(/\s*([主]?编|Editor)$/, '')
				.split(/[,;，；]/)
				.map(creator => cleanName(creator, 'author'));
			break;
		case 'report':
			newItem.abstractNote = labels.get(['成果简介', '成果簡介']);
			newItem.creators = labels.get('成果完成人').split(/[,;，；]/).map(creator => cleanName(creator, 'author'));
			newItem.date = labels.get(['入库时间', '入庫時間']);
			newItem.institution = labels.get(['第一完成单位', '第一完成單位']);
			extra.set('achievementType', labels.get(['成果类别', '成果類別']));
			extra.set('level', labels.get('成果水平'));
			extra.set('evaluation', labels.get(['评价形式', '評價形式']));
			break;
		case 'standard':
			newItem.number = labels.get(['标准号', '標準號', 'StandardNo']);
			if (newItem.number.startsWith('GB')) {
				newItem.number = newItem.number.replace('-', '——');
				newItem.title = newItem.title.replace(/([\u4e00-\u9fff]) ([\u4e00-\u9fff])/, '$1　$2');
			}
			newItem.status = text(doc, 'h1 > .type');
			newItem.date = labels.get(['发布日期', '發佈日期', 'IssuanceDate']);
			newItem.numPages = labels.get(['总页数', '總頁數', 'TotalPages']);
			extra.set('original-title', text(doc, 'h1 > span'));
			newItem.creators = labels.get(['标准技术委员会', '归口单位', '技術標準委員會', '歸口單位', 'StandardTechnicalCommittee'])
				.split(/[;，；、]/)
				.map(creator => ({
					firstName: '',
					lastName: creator.replace(/\(.+?\)$/, ''),
					creatorType: 'author',
					fieldMode: 1
				}));
			extra.set('applyDate', labels.get(['实施日期', '實施日期']), true);
			break;
		case 'patent': {
			newItem.patentNumber = labels.get(['授權公布号', '授權公佈號', '申请公布号', '申請公佈號', 'PublicationNo']);
			newItem.applicationNumber = labels.get(['申请\\(专利\\)号', '申請\\(專利\\)號', 'ApplicationNumber']);
			const translate = Z.loadTranslator('import');
			// CNKI Refer
			translate.setTranslator('7b6b135a-ed39-4d90-8e38-65516671c5bc');
			const { patentCountry } = await translate.getTranslatorObject();
			newItem.place = newItem.country = patentCountry(newItem.patentNumber || newItem.applicationNumber, newItem.language);
			newItem.filingDate = labels.get(['申请日', '申請日', 'ApplicationDate']);
			newItem.issueDate = labels.get(['授权公告日', '授權公告日', 'IssuanceDate']);
			newItem.rights = text(doc, '.claim > h5 + div');
			extra.set('Genre', labels.get(['专利类型', '專利類型']), true);
			labels.get(['发明人', '發明人', 'Inventor'])
				.split(/[;，；]\s*/)
				.forEach((inventor) => {
					newItem.creators.push(cleanName(ZU.trimInternal(inventor), 'inventor'));
				});
			break;
		}
		case 'videoRecording':
			newItem.abstractNote = labels.get(['视频简介', '視頻簡介']).replace(/\s*更多还原$/, '');
			newItem.runningTime = labels.get(['时长', '時長']);
			newItem.date = ZU.strToISO(labels.get(['发布时间', '發佈時間']));
			extra.set('organizer', labels.get(['主办单位', '主辦單位']), true);
			doc.querySelectorAll('h3:first-of-type > span').forEach((element) => {
				newItem.creators.push(cleanName(ZU.trimInternal(element.textContent), 'author'));
			});
			break;
	}

	/* pages */
	if (ZU.fieldIsValidForType('pages', newItem.itemType) && newItem.pages) {
		newItem.pages = newItem.pages
			.replace(/\d+/g, match => match.replace(/0*([1-9]\d*)/, '$1'))
			.replace(/~/g, '-').replace(/\+/g, ', ');
	}

	/* date, advance online */
	if (doc.querySelector('.icon-shoufa')) {
		extra.set('Status', 'advance online publication');
		newItem.date = ZU.strToISO(text(doc, '.head-time'));
	}

	/* extra */
	extra.set('foundation', labels.get('基金'));
	extra.set('download', labels.get(['下载', '下載', 'Download']) || itemKey.download);
	extra.set('album', labels.get(['专辑', '專輯', 'Series']));
	extra.set('CLC', labels.get(['分类号', '分類號', 'ClassificationCode']));
	extra.set('CNKICite', itemKey.cite || attr(doc, '#paramcitingtimes', 'value') || text(doc, '#citations+span').substring(1, -1));
	extra.set('dbcode', ids.dbcode);
	extra.set('dbname', ids.dbname);
	extra.set('filename', ids.filename);
	await addPubDetail(newItem, extra, ids, doc);
	newItem.extra = extra.toString();
	addAttachments(newItem, doc, url, itemKey);
	newItem.complete();
}

/**
 * Call CNKI Refer.js to parse the text returned by API and supplement some fields from doc elements and itemKey.
 * @param {String} referText Refer/BibIX format text from API.
 * @param {Element} doc
 * @param {String} url
 * @param {*} itemKey
 */
async function parseRefer(referText, doc, url, itemKey) {
	let item = {};

	const labels = new Labels(doc, 'div.doc div[class^="row"], li.top-space, .total-inform > span');
	Z.debug('get labels:');
	Z.debug(labels.data.map(element => [element[0], ZU.trimInternal(element[1].textContent)]));
	const extra = new Extra();
	const ids = new ID(doc, url);
	const translator = Zotero.loadTranslator('import');
	// CNKI Refer
	translator.setTranslator('7b6b135a-ed39-4d90-8e38-65516671c5bc');
	translator.setString(referText.replace(/<br>/g, '\n'));
	translator.setHandler('itemDone', (_obj, patchItem) => {
		item = patchItem;
	});
	await translator.translate();

	/* title */
	richTextTitle(item, doc);

	/* url */
	if (!item.url || /\/kcms2\//i.test(item.url)) {
		item.url = 'https://kns.cnki.net/KCMS/detail/detail.aspx?'
			+ `dbcode=${ids.dbcode}`
			+ `&dbname=${ids.dbname}`
			+ `&filename=${ids.filename}`;
	}

	/* specific fields */
	switch (item.itemType) {
		case 'journalArticle':
			if (doc.querySelector('.icon-shoufa')) {
				extra.set('Status', 'advance online publication');
				item.date = ZU.strToISO(text(doc, '.head-time'));
			}
			break;
		case 'thesis':
			item.numPages = labels.get(['页数', '頁數', 'Page']);
			extra.set('major', labels.get(['学科专业', '學科專業', 'Retraction']));
			break;
		case 'conferencePaper': {
			item.proceedingsTitle = attr(doc, '.top-tip > :first-child', 'title');
			item.conferenceName = labels.get(['会议名称', '會議名稱', 'ConferenceName']);
			break;
		}
		case 'newspaperArticle': {
			const subTitle = labels.get(['副标题', '副標題', 'Subtitle']);
			if (subTitle) {
				item.shortTitle = item.title;
				item.title = `${item.title}：${subTitle}`;
			}
			item.abstractNote = text(doc, '.abstract-text');
			item.tags = labels.get(['关键词', '關鍵詞', 'keywords']).split(/[;，；]\s*/);
			break;
		}

		/* yearbook */
		case 'bookSection': {
			item.bookTitle = text(doc, '.book-tit');
			item.creators = labels.get(['责任说明', '責任說明', 'Statementofresponsibility'])
				.replace(/\s*([主]?编|Editor)$/, '')
				.split(/[,;，；]/)
				.map(creator => cleanName(creator, 'author'));
			break;
		}
		case 'report':
			item.creators = labels.get('成果完成人').split(/[,;，；]/).map(creator => cleanName(creator, 'author'));
			item.date = labels.get(['入库时间', '入庫時間']);
			item.institution = labels.get(['第一完成单位', '第一完成單位']);
			extra.set('achievementType', labels.get(['成果类别', '成果類別']));
			extra.set('level', labels.get('成果水平'));
			extra.set('evaluation', labels.get(['评价形式', '評價形式']));
			break;
		case 'standard':
			extra.set('original-title', text(doc, 'h1 > span'));
			item.status = text(doc, '.type');
			item.creators = labels.get(['标准技术委员会', '归口单位', '技術標準委員會', '歸口單位', 'StandardTechnicalCommittee'])
				.split(/[;，；、]/)
				.map(creator => ({
					firstName: '',
					lastName: creator.replace(/\(.+?\)$/, ''),
					creatorType: 'author',
					fieldMode: 1
				}));
			extra.set('applyDate', labels.get(['实施日期', '實施日期']), true);
			break;
		case 'patent':
			// item.place = labels.get('地址');
			item.filingDate = labels.get(['申请日', '申請日', 'ApplicationDate']);
			item.applicationNumber = labels.get(['申请\\(专利\\)号', '申請\\(專利\\)號', 'ApplicationNumber']);
			item.issueDate = labels.get(['授权公告日', '授權公告日', 'IssuanceDate']);
			item.rights = text(doc, '.claim > h5+div');
			break;
	}
	item.language = ids.toLanguage();
	extra.set('foundation', labels.get('基金'));
	extra.set('download', labels.get(['下载', '下載', 'Download']) || itemKey.download);
	extra.set('album', labels.get(['专辑', '專輯', 'Series']));
	extra.set('CLC', labels.get(['分类号', '分類號', 'ClassificationCode']));
	extra.set('CNKICite', itemKey.cite || attr(doc, '#paramcitingtimes', 'value') || text(doc, '#citations+span').substring(1, -1));
	extra.set('dbcode', ids.dbcode);
	extra.set('dbname', ids.dbname);
	extra.set('filename', ids.filename);
	await addPubDetail(item, extra, ids, doc);
	item.extra = extra.toString(item.extra);
	addAttachments(item, doc, url, itemKey);
	item.complete();
}

/*********
 * utils *
 *********/

class Labels {
	constructor(doc, selector) {
		this.data = [];
		this.emptyElm = doc.createElement('div');
		const nodes = doc.querySelectorAll(selector);
		for (const node of nodes) {
			// avoid nesting
			// avoid empty
			if (node.querySelector(selector) || !/\S/.test(node.textContent)) continue;
			const elmCopy = node.cloneNode(true);
			// avoid empty text
			while (![1, 3, 4].includes(elmCopy.firstChild.nodeType) || !/\S/.test(elmCopy.firstChild.textContent)) {
				elmCopy.removeChild(elmCopy.firstChild);
				if (!elmCopy.firstChild) break;
			}
			if (elmCopy.childNodes.length > 1) {
				const key = elmCopy.removeChild(elmCopy.firstChild).textContent.replace(/\s/g, '');
				this.data.push([key, elmCopy]);
			}
			else {
				const text = ZU.trimInternal(elmCopy.textContent);
				const key = tryMatch(text, /^[[【]?.+?[】\]:：]/).replace(/\s/g, '');
				elmCopy.textContent = tryMatch(text, /^[[【]?.+?[】\]:：]\s*(.+)/, 1);
				this.data.push([key, elmCopy]);
			}
		}
	}

	get(label, element = false) {
		if (Array.isArray(label)) {
			const results = label
				.map(aLabel => this.get(aLabel, element));
			const keyVal = element
				? results.find(element => !/^\s*$/.test(element.textContent))
				: results.find(string => string);
			return keyVal
				? keyVal
				: element
					? this.emptyElm
					: '';
		}
		const pattern = new RegExp(label, 'i');
		const keyVal = this.data.find(arr => pattern.test(arr[0]));
		return keyVal
			? element
				? keyVal[1]
				: ZU.trimInternal(keyVal[1].textContent)
			: element
				? this.emptyElm
				: '';
	}
}

class Extra {
	constructor() {
		this.fields = [];
	}

	push(key, val, csl = false) {
		this.fields.push({ key: key, val: val, csl: csl });
	}

	set(key, val, csl = false) {
		const target = this.fields.find(obj => new RegExp(`^${key}$`, 'i').test(obj.key));
		if (target) {
			target.val = val;
		}
		else {
			this.push(key, val, csl);
		}
	}

	get(key) {
		const result = this.fields.find(obj => new RegExp(`^${key}$`, 'i').test(obj.key));
		return result
			? result.val
			: '';
	}

	toString(history = '') {
		this.fields = this.fields.filter(obj => obj.val);
		return [
			this.fields.filter(obj => obj.csl).map(obj => `${obj.key}: ${obj.val}`).join('\n'),
			history,
			this.fields.filter(obj => !obj.csl).map(obj => `${obj.key}: ${obj.val}`).join('\n')
		].filter(obj => obj).join('\n');
	}
}

function richTextTitle(item, doc) {
	let title = doc.querySelector('.wx-tit > h1');
	if (title) {
		title = title.cloneNode(true);
		while (title.querySelector(':not(sup):not(sub):not(i):not(b)')) {
			title.removeChild(title.querySelector(':not(sup):not(sub):not(i):not(b)'));
		}
		item.title = title.innerHTML
			.replace(/<(sup|sub|i|b)[^>]+>/g, '<$1>')
			.replace(/<(sup|sub|i|b)><\/(sup|sub|i|b)>/g, '');
	}
}

function cleanName(string, creatorType) {
	if (!string) return {};
	return /[\u4e00-\u9fff]/.test(string)
		? {
			firstName: '',
			lastName: string.replace(/\s/g, ''),
			creatorType: creatorType,
			fieldMode: 1
		}
		: ZU.cleanAuthor(ZU.capitalizeName(string), creatorType);
}

async function addPubDetail(item, extra, ids, doc) {
	let url;
	let pubDoc;
	try {
		if (!['journalArticle', 'conferencePaper', 'bookSection'].includes(item.itemType)) {
			return;
		}
		switch (item.itemType) {
			case 'journalArticle': {
				url = inMainland
					? doc.querySelector('.top-tip > :first-child > a').href
					: attr(doc, '.top-tip > :first-child > a', 'onclick').replace(
						/^.+\('(.+?)',\s*'(.+?)'\).*$/,
						'/KNavi/JournalDetail?pcode=$1&pykm=$2'
					);
				pubDoc = await requestDocument(url);
				break;
			}
			case 'conferencePaper': {
				if (inMainland) {
					url = doc.querySelector('.top-tip > a').href;
					url = 'https://kns.cnki.net/knavi/conferences/proceedings/catalog'
						// “论文集”code
						+ `?lwjcode=${tryMatch(url, /\/proceedings\/(\w+)\//, 1)}`
						// “会议”code
						+ `&hycode=&pIdx=0`;
					pubDoc = await requestDocument(url);
					const id = attr(pubDoc, 'li[id]', 'id');
					url = 'https://navi.cnki.net/knavi/conferences/baseinfo'
						+ `?lwjcode=${id}`
						+ '&pIdx=0';
				}
				else {
					url = attr(doc, '.top-tip > :first-child > a', 'onclick').replace(
						/^.+\('(.+?)',\s*'(.+?)'\).*$/,
						'/knavi/DpaperDetail/CreateDPaperBaseInfo?pcode=$1&lwjcode=$2&pIdx=0'
					);
				}
				pubDoc = await requestDocument(url);
				break;
			}
			case 'bookSection': {
				// Navigation
				url = doc.querySelector('.brief a[href*="/issues/"], .book-info a[href*="/issues/"]').href;
				pubDoc = await requestDocument(url);
				const classid = attr(pubDoc, '#classid', 'value');
				const pykm = attr(pubDoc, '#pykm', 'value');
				const hidYearbookBH = attr(pubDoc, '#hidYearbookBH', 'value');
				// Year List
				url = 'https://kns.cnki.net/knavi/yearbookDetail/GetYearbooklYearAndPageList'
					+ `?classid=${classid}`
					+ `&pykm=${pykm}`
					+ `&pageIndex=1&pageSize=10`;
				pubDoc = await requestDocument(url);
				const yearbookNumber = attr(pubDoc, `#${hidYearbookBH}`, 'value');
				// Info
				pubDoc = await requestDocument('https://navi.cnki.net/knavi/yearbookDetail/GetBaseInfo', {
					method: 'POST',
					body: `pcode=${ids.dbcode}&bh=${yearbookNumber}`,
					headers: { Referer: url }
				});
			}
		}
		if (!pubDoc) {
			throw new Error('Failed to obtain publication document.');
		}
		const container = {
			originalContainerTitle: ZU.capitalizeTitle(text(pubDoc, '.infobox > h3 > p')),
			data: Array.from(pubDoc.querySelectorAll('.listbox li p'))
				.map(element => [tryMatch(ZU.trimInternal(element.textContent), /^[[【]?[\s\S]+?[】\]:：]/).replace(/\s/g, ''), attr(element, 'span', 'title') || text(element, 'span')])
				.filter(arr => arr[0]),
			get: function (label) {
				if (Array.isArray(label)) {
					let result = label
						.map(aLabel => this.get(aLabel))
						.find(element => element);
					return result
						? result
						: '';
				}
				let pattern = new RegExp(label, 'i');
				let keyValPair = this.data.find(arr => pattern.test(arr[0]));
				return keyValPair
					? ZU.trimInternal(keyValPair[1])
					: '';
			}
		};
		extra.set('original-container-title', container.originalContainerTitle, true);
		switch (item.itemType) {
			case 'journalArticle': {
				item.ISSN = container.get('ISSN');
				extra.set('publicationTag', Array.from(pubDoc.querySelectorAll('.journalType2 > span')).map(element => ZU.trimInternal(element.textContent)).join(', '));
				extra.set('CIF', text(pubDoc, '#evaluateInfo span:not([title])', 0));
				extra.set('AIF', text(pubDoc, '#evaluateInfo span:not([title])', 1));
				break;
			}
			case 'conferencePaper':
				item.publisher = container.get('出版单位');
				item.date = ZU.strToISO(container.get(['出版时间', '出版日期', 'PublishingDate']));
				container.get(['编者', '編者', 'Editor']).split('、').forEach(creator => item.creators.push({
					firstName: '',
					lastName: creator.replace(/\(.*?\)$/, ''),
					creatorType: 'editor',
					fieldMode: 1
				}));
				// extra.set('organizer', container.get('主办单位'), true);
				break;
			case 'bookSection': {
				item.ISBN = container.get('ISBN');
				item.date = ZU.strToISO(container.get('出版时间'));
				item.publisher = container.get('出版者');
			}
		}
	}
	catch (error) {
		Z.debug('Failed to add document details.');
		Z.debug(error);
	}
}

/** add pdf or caj to attachments, default is pdf */
function addAttachments(item, doc, url, itemKey) {
	// If you want CAJ instead of PDF, set keepPDF = false
	// 如果你想将PDF文件替换为CAJ文件，将下面一行 keepPDF 设为 false
	let keepPDF = Z.getHiddenPref('CNKIPDF');
	if (keepPDF === undefined) keepPDF = true;
	// The legal status of patent is shown in the picture on webpage.
	if (item.itemType == 'patent') {
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
	}
	const pdfLink = strChild(doc, 'a[id^="pdfDown"], .btn-dlpdf > a', 'href');
	Z.debug(`get PDF Link:\n${pdfLink}`);
	const cajLink = strChild(doc, 'a#cajDown', 'href') || itemKey.downloadlink || strChild(doc, 'a[href*="bar/download"]', 'href');
	Z.debug(`get CAJ link:\n${cajLink}`);
	if (keepPDF && pdfLink) {
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: pdfLink
		});
	}
	else if (cajLink) {
		item.attachments.push({
			title: 'Full Text CAJ',
			mimeType: 'application/caj',
			url: cajLink
		});
	}
}

function strChild(docOrElem, selector, key, index) {
	const element = index
		? docOrElem.querySelector(selector)
		: docOrElem.querySelectorAll(selector).item(index);
	return (element && element[key])
		? element[key]
		: '';
}

function tryMatch(string, pattern, index = 0) {
	if (!string) return '';
	const match = string.match(pattern);
	return (match && match[index])
		? match[index]
		: '';
}

var exports = {
	scrape: scrape,
	scrapeMulti: scrapeMulti,
	platform: platform,
	typeMap: typeMap,
	scholarLike: scholarLike,
	csSelectors: csSelectors,
	enDatabase: enDatabase
};

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://chn.oversea.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFD&dbname=CJFD2008&filename=CHKD200805001&uniplatform=OVERSEA&v=aJCIt9giejMh3HqbgxgFnxL1OUCfSb1R08awzV9WZSrChW0sc1_6b0HUQIBsZdLk",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“北斗一号”监控管理网设计与实现",
				"creators": [
					{
						"firstName": "",
						"lastName": "武丽丽",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "华一新",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "张亚军",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "刘英敏",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2008",
				"ISSN": "1009-2307",
				"abstractNote": "本文分析了北斗用户终端在实际应用中存在的问题,指出指挥型用户终端的监控能力有限、成本相对较高是影响其推广应用的关键。针对该问题,利用现有资源,设计并搭建了监控管理网,在该网络中创造性地设计了虚拟指挥机系统,起到了指挥型用户终端的作用,弥补了北斗用户终端的不足。文章具体阐述了虚拟指挥机系统的工作原理,介绍了其数据模型,并描述了整个监控管理网的网络功能和体系结构设计,该网络已在很多部门得到应用。",
				"extra": "original-container-title: Science of Surveying and Mapping\ndownload: 226\nalbum: 理工A(数学物理力学天地生)\nCLC: P228.1\nCNKICite: 3\ndbcode: CJFD\ndbname: CJFD2008\nfilename: chkd200805001\nCIF: 2.319\nAIF: 1.443",
				"issue": "5",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "8-9, 7",
				"publicationTitle": "测绘科学",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFD&dbname=CJFD2008&filename=chkd200805001",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "北斗用户终端"
					},
					{
						"tag": "指挥机"
					},
					{
						"tag": "用户机"
					},
					{
						"tag": "监控"
					},
					{
						"tag": "虚拟指挥机"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tra.oversea.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFD&dbname=CJFD2008&filename=CHKD200805001&uniplatform=OVERSEA&v=aJCIt9giejMh3HqbgxgFnxL1OUCfSb1R08awzV9WZSrChW0sc1_6b9nWToY6oRhF",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“北斗一號”監控管理網設計與實現",
				"creators": [
					{
						"firstName": "",
						"lastName": "武麗麗",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "華一新",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "張亞軍",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "劉英敏",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2008",
				"ISSN": "1009-2307",
				"abstractNote": "本文分析了北斗用戶終端在實際應用中存在的問題,指出指揮型用戶終端的監控能力有限、成本相對較高是影響其推廣應用的關鍵。針對該問題,利用現有資源,設計并搭建了監控管理網,在該網絡中創造性地設計了虛擬指揮機系統,起到了指揮型用戶終端的作用,彌補了北斗用戶終端的不足。文章具體闡述了虛擬指揮機系統的工作原理,介紹了其數據模型,并描述了整個監控管理網的網絡功能和體系結構設計,該網絡已在很多部門得到應用。",
				"extra": "original-container-title: Science of Surveying and Mapping\ndownload: 226\nalbum: 理工A(數學物理力學天地生)\nCLC: P228.1\nCNKICite: 3\ndbcode: CJFD\ndbname: CJFD2008\nfilename: chkd200805001\nCIF: 2.319\nAIF: 1.443",
				"issue": "5",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "8-9, 7",
				"publicationTitle": "測繪科學",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFD&dbname=CJFD2008&filename=chkd200805001",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "北斗用戶終端"
					},
					{
						"tag": "指揮機"
					},
					{
						"tag": "用戶機"
					},
					{
						"tag": "監控"
					},
					{
						"tag": "虛擬指揮機"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://oversea.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFD&dbname=CJFD2008&filename=CHKD200805001&uniplatform=OVERSEA&v=aJCIt9giejMh3HqbgxgFnxL1OUCfSb1R08awzV9WZSrChW0sc1_6b5IDOH77eina",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The design and implementation of monitoring and management network based on Beidou-1",
				"creators": [
					{
						"firstName": "",
						"lastName": "武丽丽",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "华一新",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "张亚军",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "刘英敏",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2008",
				"ISSN": "1009-2307",
				"abstractNote": "本文分析了北斗用户终端在实际应用中存在的问题,指出指挥型用户终端的监控能力有限、成本相对较高是影响其推广应用的关键。针对该问题,利用现有资源,设计并搭建了监控管理网,在该网络中创造性地设计了虚拟指挥机系统,起到了指挥型用户终端的作用,弥补了北斗用户终端的不足。文章具体阐述了虚拟指挥机系统的工作原理,介绍了其数据模型,并描述了整个监控管理网的网络功能和体系结构设计,该网络已在很多部门得到应用。",
				"extra": "original-container-title: 测绘科学\ndownload: 226\nalbum: (A) Mathematics/ Physics/ Mechanics/ Astronomy\nCLC: P228.1\nCNKICite: 3\ndbcode: CJFD\ndbname: CJFD2008\nfilename: chkd200805001\nCIF: 2.319\nAIF: 1.443",
				"issue": "5",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "8-9, 7",
				"publicationTitle": "测绘科学",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFD&dbname=CJFD2008&filename=chkd200805001",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "北斗用户终端"
					},
					{
						"tag": "指挥机"
					},
					{
						"tag": "用户机"
					},
					{
						"tag": "监控"
					},
					{
						"tag": "虚拟指挥机"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1Fw-ZqMGbjcx-jCKza5rDPa1QT6Ov_SjZezxxoKGSfu8Ngxm7_oqI5uUZKp8oYAvCWjjiF_F9pvr3umJVMAgJ_iGAFjFeE2xk0VODMbjGNHfIy2IbOTF1sKOYMieqZ4bwzbsCPwwSLfIHUtVxxbCm4fpOqpfvcDHy-lGoyoNTnNLjKKN_A8KHqs&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A sustainable strategy for generating highly stable human skin equivalents based on fish collagen",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Shi Hua",
						"lastName": "Tan"
					},
					{
						"creatorType": "author",
						"firstName": "Shaoqiong",
						"lastName": "Liu"
					},
					{
						"creatorType": "author",
						"firstName": "Swee Hin",
						"lastName": "Teoh"
					},
					{
						"creatorType": "author",
						"firstName": "Carine",
						"lastName": "Bonnard"
					},
					{
						"creatorType": "author",
						"firstName": "David",
						"lastName": "Leavesley"
					},
					{
						"creatorType": "author",
						"firstName": "Kun",
						"lastName": "Liang"
					}
				],
				"date": "2024-04",
				"DOI": "10.1016/j.bioadv.2024.213780",
				"ISSN": "27729508",
				"abstractNote": "Tissue engineered skin equivalents are increasingly recognized as potential alternatives to traditional skin models such as human ex vivo skin or animal skin models. However, most of the currently investigated human skin equivalents (HSEs) are constructed using mammalian collagen which can be expensive and difficult to extract. Fish skin is a waste product produced by fish processing industries and identified as a cost-efficient and sustainable source ...",
				"journalAbbreviation": "Biomaterials Advances",
				"language": "en-US",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "213780",
				"publicationTitle": "Biomaterials Advances",
				"url": "https://linkinghub.elsevier.com/retrieve/pii/S2772950824000232",
				"volume": "158",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "3D skin model"
					},
					{
						"tag": "ATR-FTIR"
					},
					{
						"tag": "BC"
					},
					{
						"tag": "CD"
					},
					{
						"tag": "DSC"
					},
					{
						"tag": "FBC"
					},
					{
						"tag": "FC"
					},
					{
						"tag": "FFC"
					},
					{
						"tag": "H&E"
					},
					{
						"tag": "HDF(s)"
					},
					{
						"tag": "HEK(s)"
					},
					{
						"tag": "HSE(s)"
					},
					{
						"tag": "Human skin equivalent"
					},
					{
						"tag": "Hydrogel scaffold"
					},
					{
						"tag": "IHC"
					},
					{
						"tag": "MTT"
					},
					{
						"tag": "SDS-PAGE"
					},
					{
						"tag": "SEM"
					},
					{
						"tag": "TEER"
					},
					{
						"tag": "Td"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1EceldMpiioI82rTipjPAh3AdJmIxtWsdQbHiyyNn9yO1DIAYOU0d2Nf-x6hw_fxXIq-e1CPWSVeJbwxCjCh2eEa7u6n_AY_mUbOV9ryb84H_tQqenxpCWNubuPloMNAIkZtUvy71vWtWZtp_ERgIwKawubt0tQJuS-fb-M9Q63zg==&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "book",
				"title": "IMF Terminology Bulletin:Climate &amp; the Environment, Fintech, Gender, and Related Acronyms: English to Arabic",
				"creators": [
					{
						"lastName": "International Monetary Fund",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023",
				"ISBN": "9798400251245",
				"abstractNote": "The world has witnessed transformational changes in recent years, not the least in technical parlance. With the massive amount of new and interdisciplinary concepts, the need has emerged to standardize and communicate emerging technical terms in languages other than English. The language Services Division of the IMF's Corporate Services and Facilities Department prepared this thematic bulletin as a contribution to the international effort of linguists and translation experts, for the benefit of topical experts, member countries, professional translators and interpreters, and the general public. It is produced on the occasion of the 2023 Annual Meetings of the World Bank Group and the International Monetary Fund in Marrakesh, Morocco",
				"language": "ara",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "1",
				"place": "Washington, D.C",
				"publisher": "International Monetary Fund",
				"shortTitle": "IMF Terminology Bulletin",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1EH4c2BPLcNI9coShrS7t2hao7vW8UF-2K1hcp4XxYiUqzOqeIbIGFtqX5-q9Pggmqfs9PGxV-MfibiX2sbMR9DJOffzLXkuO0aLnGWewIBQa9mtIfZATgfUMjKi_DU-H4uzy2sHLk-MKyMTiy8W4Ql&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "外施Ca<sup>2+</sup>、ABA及H<sub>3</sub>PO<sub>4</sub>对盐碱胁迫的缓解效应",
				"creators": [
					{
						"firstName": "",
						"lastName": "颜宏",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "石德成",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "尹尚军",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "赵伟",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2000",
				"DOI": "10.13287/j.1001-9332.2000.0212",
				"ISSN": "1001-9332",
				"abstractNote": "分别对 30 0mmol·L-1NaCl和 10 0mmol·L-1Na2 CO3 盐碱胁迫下的羊草苗进行以不同方式施加Ca2 +、ABA和H3PO4 等缓解胁迫处理 .结果表明 ,外施Ca2 +、ABA和H3PO4 明显缓解了盐碱对羊草生长的抑制作用 .叶面喷施效果好于根部处理 ;施用Ca(NO3) 2 效果好于施用CaCl2 效果 ;混合施用CaCl2 和ABA的效果比单独施用ABA或CaCl2 的效果好 .",
				"extra": "foundation: 国家自然科学基金资助项目!(39670 0 83) .；\ndownload: 476\nalbum: 基础科学;农业科技\nCLC: Q945\ndbcode: CJFQ\ndbname: CJFD2000\nfilename: YYSB200006019",
				"issue": "6",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "889-892",
				"publicationTitle": "应用生态学报",
				"url": "https://link.cnki.net/doi/10.13287/j.1001-9332.2000.0212",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Ca2+"
					},
					{
						"tag": "盐胁迫"
					},
					{
						"tag": "碱胁迫"
					},
					{
						"tag": "羊草"
					},
					{
						"tag": "胁迫缓解"
					},
					{
						"tag": "脯氨酸（Pro）"
					},
					{
						"tag": "脱落酸（ABA）"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1HOrOQU88CQSkNqKA4gqk08nmme1PQD5mxXlUGq3rFSEEFcYOtFDkpzpQ0JjV7LpnS2RWv3vxsrsS-SA1PpflWIWFXXhn-8OuCHMjLw6nEfoJqoy0EJ95wxMPapVfFNnU6fsC9Rifjs-KXE23Y2i_UpBV6ocI1c9_A=&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "thesis",
				"title": "黄瓜共表达基因模块的识别及其特点分析",
				"creators": [
					{
						"firstName": "",
						"lastName": "林行众",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "黄三文",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "杨清",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2015",
				"abstractNote": "黄瓜(Cucumis sativus L.)是我国最大的保护地栽培蔬菜作物,也是植物性别发育和维管束运输研究的重要模式植物。黄瓜基因组序列图谱已经构建完成,并且在此基础上又完成了全基因组SSR标记开发和涵盖330万个变异位点变异组图谱,成为黄瓜功能基因研究的重要平台和工具,相关转录组研究也有很多报道,不过共表达网络研究还是空白。本实验以温室型黄瓜9930为研究对象,选取10个不同组织,进行转录组测序,获得10份转录组原始数据。在对原始数据去除接头与低质量读段后,将高质量读段用Tophat2回贴到已经发表的栽培黄瓜基因组序列上。用Cufflinks对回贴后的数据计算FPKM值,获得10份组织的24274基因的表达量数据。计算结果中的回贴率比较理想,不过有些基因的表达量过低。为了防止表达量低的基因对结果的影响,将10份组织中表达量最大小于5的基因去除,得到16924个基因,进行下一步分析。共表达网络的构建过程是将上步获得的表达量数据,利用R语言中WGCNA(weighted gene co-expression network analysis)包构建共表达网络。结果得到的共表达网络包括1134个模块。这些模块中的基因表达模式类似,可以认为是共表达关系。不过结果中一些模块内基因间相关性同其他模块相比比较低,在分析过程中,将模块中基因相关性平均值低于0.9的模块都去除,最终得到839个模块,一共11,844个基因。共表达的基因因其表达模式类似而聚在一起,这些基因可能与10份组织存在特异性关联。为了计算模块与组织间的相关性,首先要对每个模块进行主成分分析(principle component analysis,PCA),获得特征基因(module eigengene,ME),特征基因可以表示这个模块所有基因共有的表达趋势。通过计算特征基因与组织间的相关性,从而挑选出组织特异性模块,这些模块一共有323个。利用topGO功能富集分析的结果表明这些特异性模块所富集的功能与组织相关。共表达基因在染色体上的物理位置经常是成簇分布的。按照基因间隔小于25kb为标准。分别对839个模块进行分析,结果发现在71个模块中共有220个cluster,这些cluster 一般有2～5个基因,cluster中的基因在功能上也表现出一定的联系。共表达基因可能受到相同的转录调控,这些基因在启动子前2kb可能会存在有相同的motif以供反式作用元...",
				"extra": "major: 生物化学与分子生物学\ndownload: 308\nalbum: 基础科学;农业科技\nCLC: S642.2;Q943.2\ndbcode: CMFD\ndbname: CMFD201701\nfilename: 1017045605.nh",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"numPages": "69",
				"thesisType": "硕士学位论文",
				"university": "南京农业大学",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CMFD&dbname=CMFD201701&filename=1017045605.nh",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "共表达"
					},
					{
						"tag": "网络"
					},
					{
						"tag": "转录组"
					},
					{
						"tag": "黄瓜"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1Egk821IN_tibbE-H8cE9cmtj2bvzpaiJSpu9nv1FX7XV44cN1mjqtovKj7C8R0A6ZvTpfL-LC1mrm11l6DSWqk2L1hY2EbrwKH4cNqNDZlMwI11o9f54XdjgMA9M0_XEv16Z069RIf2B72bZbLknjo&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "thesis",
				"title": "高导热聚合物基复合材料的制备与性能研究",
				"creators": [
					{
						"firstName": "",
						"lastName": "虞锦洪",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "江平开",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2012",
				"abstractNote": "随着微电子集成技术和组装技术的快速发展，电子元器件和逻辑电路的体积越来越小，而工作频率急剧增加，半导体的环境温度向高温方向变化，为保证电子元器件长时间可靠地正常工作，及时散热能力就成为其使用寿命长短的制约因素。高导热聚合物基复合材料在微电子、航空、航天、军事装备、电机电器等诸多制造业及高科技领域发挥着重要的作用。所以研制综合性能优异的高导热聚合物基复合材料成为了目前研究热点。本论文分别以氧化铝（Al2O3）、石墨烯和氮化硼（BN）纳米片为导热填料，以环氧树脂和聚偏氟乙烯（PVDF）为基体，制备了新型的高导热聚合物基复合材料。首先，采用两步法将超支化聚芳酰胺接枝到纳米Al2O3粒子表面：纳米颗粒先进行硅烷偶联剂处理引入氨基基团，在改性后的纳米粒子上接枝超支化聚合物；再利用X射线衍射、傅立叶红外光谱、核磁共振氢谱和热失重等方法对纳米Al2O3粒子的表面改性进行表征；然后分别将未改性的纳米Al2O3粒子、硅烷接枝的纳米Al2O3粒子（Al2O3-APS）和超支化聚芳酰胺接枝的纳米Al2O3粒子（Al2O3-HBP）与环氧树脂复合，并对三种复合材料的热性能和介电性能进行比较研究。结果表明：（1）从SEM、TEM和动态光散射的实验结果表明，三种纳米颗粒相比之下，Al2O3-HBP纳米粒子在有机溶剂乙醇和环氧树脂中显示出最好的分散性。（2）三种复合材料的导热系数都是随着纳米颗粒含量的增加而增大；在添加相同含量的纳米颗粒时，其导热系数遵循着如下的规律：环氧树脂/Al2O3-HBP复合材料>环氧树脂/Al2O3-APS复合材料>环氧树脂/Al2O3复合材料。而且从DSC、TGA和DMA的实验结果可以得出，与未改性Al2O3和Al2O<s...",
				"extra": "major: 材料学\nfoundation: 国家自然基金;；\ndownload: 16023\nalbum: 工程科技Ⅰ辑\nCLC: TB332\ndbcode: CDFD\ndbname: CDFD1214\nfilename: 1012034749.nh",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"numPages": "148",
				"thesisType": "博士学位论文",
				"university": "上海交通大学",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CDFD&dbname=CDFD1214&filename=1012034749.nh",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "介电"
					},
					{
						"tag": "复合材料"
					},
					{
						"tag": "导热"
					},
					{
						"tag": "氧化铝"
					},
					{
						"tag": "氮化硼"
					},
					{
						"tag": "环氧树脂"
					},
					{
						"tag": "石墨烯"
					},
					{
						"tag": "聚偏氟乙烯"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1ErlC0Nhw4jy1y2_4gBIr2abJt0NpyI9dyhJ-CRvUhb-4bPU-SCmoAG84kJIbjlBcklyfWwHuqWkYhmiT3us-XhN2KHIvoy_kLzbtITnps1oyXiWh-1Dc740qcONrCLYv11sgiktFE-Bzt8YW3D48gYP9nlUvOBdn0=&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "辽西区新石器时代考古学文化纵横",
				"creators": [
					{
						"firstName": "",
						"lastName": "朱延平",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1990",
				"abstractNote": "辽西区的范围从大兴安岭南缘到渤海北岸,西起燕山西段,东止辽河平原,基本上包括内蒙古的赤峰市(原昭乌达盟)、哲里木盟西半部,辽宁省西部和河北省的承德、唐山、廊坊及其邻近的北京、天津等地区。这一地区的古人类遗存自旧石器时代晚期起,就与同属东北的辽东区有着明显的不同,在后来的发展中,构成自具特色的一个考古学文化区,对我国东北部起过不可忽视的作用。以下就辽西地区新石器时代的考古学文化序列、编年、谱系及有关问题简要地谈一下自己的认识。",
				"conferenceName": "内蒙古东部地区考古学术研讨会",
				"extra": "organizer: 中国社会科学院考古研究所、内蒙古文物考古研究所、赤峰市文化局\ndownload: 668\nalbum: 哲学与人文科学\nCLC: K872\ndbcode: CPFD\ndbname: CPFD9908\nfilename: OYDD199010001004",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "6, 13-18",
				"place": "中国内蒙古赤峰",
				"proceedingsTitle": "内蒙古东部区考古学文化研究文集",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CPFD&dbname=CPFD9908&filename=OYDD199010001004",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "兴隆洼文化"
					},
					{
						"tag": "努鲁儿虎山"
					},
					{
						"tag": "半坡文化"
					},
					{
						"tag": "夹砂陶"
					},
					{
						"tag": "富河文化"
					},
					{
						"tag": "小河沿文化"
					},
					{
						"tag": "庙底沟文化"
					},
					{
						"tag": "彩陶花纹"
					},
					{
						"tag": "文化纵横"
					},
					{
						"tag": "新石器时代考古"
					},
					{
						"tag": "红山文化"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1F0U-QEAqfvVIcp8B8EdEMxMYEWwhGFs78jmrWlWmhJOkwyYk-HiZcd4ARwvWZfOsKhX3ofXH2UvUL9gmjXGuYy1uMpSkze7_p5PHCHAd8RmQoLqOJRgqminVQwbSYBiaOgzndN23iaE4h0aFrVsrVdQ2S2_Y6QfoI=&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "灭绝物种RNA首次分离测序：为复活物种或研究RNA病毒开创新方向",
				"creators": [
					{
						"firstName": "",
						"lastName": "刘霞",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023-09-21",
				"abstractNote": "科技日报北京9月20日电 （记者刘霞）瑞典国家分子生物科学中心科学家首次分离和测序了一个已灭绝物种的RNA分子，从而重建了该灭绝物种（塔斯马尼亚虎）的皮肤和骨骼肌转录组。该项成果对复活塔斯马尼亚虎和毛猛犸象等灭绝物种，以及研究如新冠病毒等RNA病毒具有重要意义。相......",
				"extra": "DOI: 10.28502/n.cnki.nkjrb.2023.005521\ndownload: 27\nalbum: 基础科学\nCLC: Q343.1\ndbcode: CCND\ndbname: CCNDLAST2023\nfilename: KJRB202309210044",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "4",
				"publicationTitle": "科技日报",
				"shortTitle": "灭绝物种RNA首次分离测序",
				"url": "https://link.cnki.net/doi/10.28502/n.cnki.nkjrb.2023.005521",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "RNA"
					},
					{
						"tag": "转录组"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/fulltext?invoice=GQiJ9iByVW1N8YEyfjizbSwqHKCoCDtB5hpceRKkO9AKDgy3NX0HLG88IQOuX3Yfy312yri1hqwWqsNFgtbyONkA9FquebADmDIJq8NJwob8T%2BGMoiQsSG1nF0jyOMtbQyuiIzEU9Bb66ACX%2F%2BLjIusg3e8GNdhqzKvzFhhtq5g%3D&platform=NZKPT&product=CYFD&filename=N2022040061000062&tablename=cyfd2022&type=ALMANAC&scope=download&cflag=overlay&dflag=&pages=&language=chs&trial=&nonce=92BDC88F8F014456B64B9B845BA8E525",
		"items": [
			{
				"itemType": "bookSection",
				"title": "大事记",
				"creators": [
					{
						"firstName": "",
						"lastName": "高生记",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2020-12-30",
				"ISBN": "9787514445008",
				"bookTitle": "山西年鉴",
				"extra": "DOI: 10.41842/y.cnki.ysxnj.2022.000050\ndownload: 29\nCLC: Z9\ndbcode: CYFD\ndbname: cyfd2022\nfilename: N2022040061000062",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "6-23",
				"url": "https://link.cnki.net/doi/10.41842/y.cnki.ysxnj.2022.000050",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "大事记"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kns8s/defaultresult/index?classid=EMRPGLPA&korder=SU&kw=%E7%BA%B3%E7%B1%B3",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1EHl1V4bI1DosoRwvfWRaLERtu97Nsa6hdMwoH5juVWrobRlKUlgRgap8BXtoVtRIszfYqVaiDeqBb0gdqTCuPJFQft49PBCrmN7sYan8DqQRdIc26yvA6C8k_L9joObGYhQaQGEQADXA==&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "patent",
				"title": "不锈钢管的制造方法",
				"creators": [
					{
						"firstName": "",
						"lastName": "李玉和",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "李守军",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "李扬洲",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "罗通伟",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "彭声通",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "贺同正",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"abstractNote": "本发明公开了一种不锈钢管的制造方法,具有可提高不锈钢管质量的优点。该不锈钢管的制造方法,其特征是包括下述步骤：①将不锈钢液在熔炼炉中进行熔炼；②不锈钢液熔清后进行去渣及脱氧处理；③将不锈钢液浇入旋转的离心浇铸机型筒中进行离心浇铸后在离心力作用下冷却凝固成型为不锈钢管坯料。采用离心浇铸方法制作不锈钢空心管,使得在离心力作用下,离心管坯补缩效果好,组织较致密,气体和非金属夹杂容易排出,缺陷少,有效地提高了不锈钢管的质量,且通过离心浇铸后可直接获得不锈钢空心管,金属的收得率高,且通过采用离心浇铸后,管坯在后续加工中具有工序少、成材率高的特点,尤其适合在高端钢材产品的制造上面推广使用。",
				"applicationNumber": "CN200710201273.2",
				"extra": "Genre: 发明公开\nalbum: 工程科技Ⅰ辑\nCLC: B22D13/02\ndbcode: SCPD\ndbname: SCPD0407\nfilename: CN101091984",
				"filingDate": "2007-08-03",
				"language": "zh-CN",
				"pages": "6",
				"patentNumber": "CN101091984",
				"rights": "1.不锈钢管的制造方法,其特征是包括下述步骤：①、将不锈钢液\n\n\n\n在熔炼炉中进行熔炼；②、不锈钢液熔清后进行去渣及脱氧处理；③、将不锈钢液浇入旋转\n\n\n\n的离心浇铸机型筒中进行离心浇铸后在离心力作用下冷却凝固成型为不锈钢管坯料。",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=SCPD&dbname=SCPD0407&filename=CN101091984",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text CAJ",
						"mimeType": "application/caj"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1Hbv7yS_LkcTBO-E2V9Z8THpIZcDRH0MW2-5PCdUeE1C8Za8GBxKWXw1irMix8MAWGxhRleeqCA5kn2Wbc7CZ_iTxx0_qhuBOTJ1Dv2_Q_qtiRXtTXZrhNsAp4lYnLxw2HA6JXqjT2HJg==&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "standard",
				"title": "粮油检验　小麦粉膨胀势的测定",
				"creators": [
					{
						"firstName": "",
						"lastName": "全国粮油标准化技术委员会",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2019-05-10",
				"extra": "applyDate: 2019-12-01\noriginal-title: Inspection of grain and oils—Swelling properties test of wheat flour\nalbum: 工程科技Ⅰ辑\nCLC: X04 食品-食品综合-基础标准与通用方法\ndbcode: SCSF\ndbname: SCSF\nfilename: SCSF00058274",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"numPages": "16",
				"number": "GB/T 37510—2019",
				"status": "现行",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=SCSF&dbname=SCSF&filename=SCSF00058274",
				"attachments": [
					{
						"title": "Full Text CAJ",
						"mimeType": "application/caj"
					}
				],
				"tags": [
					{
						"tag": "粮油检验"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1GAHYP4MJg7aOGTXQPnoF8CY8Szbwzov9GTLqRPuB6MNgKejzANbo3CC0DXC3oyvolp7klOvo-rFTH8ALN2KDoYvP0h_cxmLl36qNg-iisALsMDG8o__-VQL5QBPgQ8iW37087uKQyZxqTZPYf0fB1m&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "report",
				"title": "25MW/100MWh液流电池长时储能系统关键技术研发与示范",
				"creators": [
					{
						"firstName": "",
						"lastName": "孟青",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "刘素琴",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "李建林",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "曾义凯",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "张家乐",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "吴志宽",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "刘文",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "周明月",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "何震",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "王珏",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "解祯",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "娄明坤",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "许超",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "李继伟",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "王璐嘉",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023",
				"abstractNote": "本项目拟通过分析材料、电堆、电解液和模块性能提升、成本控制制约因素,将关键材料性能提升与电堆结构优化设计以及系统电气、智能控制设施等的优化研究相结合,以最大限度地提升性能、降低系统成本。针对液流电池电解液活性物种溶解度不高,高、低温稳定性差,长期循环过程中容量衰减和效率降低问题,开发高浓度、高稳定性、活性电解液配方与制备工艺。在功率单元和能量单元性能优化基础上,以可靠性和系统性能优化为目标,分析指标,开发储能单元模块,以此为基础设计储能电站工程,针对工程应用开发调控和运维平台,形成示范应用及经济性分析。",
				"extra": "achievementType: 应用技术\nevaluation: 验收\nalbum: 工程科技Ⅱ辑\nCLC: TM912.9\ndbcode: SNAD\ndbname: SNAD\nfilename: SNAD000002043401",
				"institution": "山西国润储能科技有限公司",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"reportType": "科技报告",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=SNAD&dbname=SNAD&filename=SNAD000002043401",
				"attachments": [
					{
						"title": "Full Text CAJ",
						"mimeType": "application/caj"
					}
				],
				"tags": [
					{
						"tag": "储能电站"
					},
					{
						"tag": "储能系统"
					},
					{
						"tag": "关键技术研发"
					},
					{
						"tag": "液流电池"
					},
					{
						"tag": "电解液活性"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=uArnVX0ke1F8WYbVFvSp8OPJ_NRVoyeBYANFb708Mq6FCNwnfHgmIVwErYOcXmCJmsg0-5BIbeOmLjJZcHmc6udoyRDbowWMXjbBulT8wCfa_-aIPIeCSwRaNcLDAoLnjHmnSiXQcheBx2lFpazKKA==&uniplatform=NZKPT",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "2020年第二季度宏观经济形势分析会",
				"creators": [
					{
						"firstName": "",
						"lastName": "贾",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "康",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "贾康",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2020-07-23",
				"abstractNote": "【中国资本市场50人论坛携手中国知网联合出品】 议 程 更多 还原",
				"extra": "organizer: 中国资本市场50人论坛;中国知网\ndbcode: CCVD\ndbname: CCVD\nfilename: 542618070256",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"runningTime": "03:46:14",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CCVD&dbname=CCVD&filename=542618070256",
				"attachments": [],
				"tags": [
					{
						"tag": "民营经济"
					},
					{
						"tag": "要素市场化"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kns8s/search?classid=WD0FTY92&kw=%E7%85%A4%E7%82%AD&korder=SU",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kns8s/AdvSearch?classid=WD0FTY92",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kns/search?dbcode=SCDB",
		"items": "multiple"
	}
]
/** END TEST CASES **/
