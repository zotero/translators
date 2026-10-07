{
	"translatorID": "5c95b67b-41c5-4f55-b71a-48d5d7183063",
	"label": "CNKI",
	"creator": "Aurimas Vinckevicius, Xingzhong Lin, Zoë C. Ma",
	"target": "^https?://([^/]+\\.)?cnki\\.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-07 10:35:19"
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

// Fetches RefWorks records for provided IDs and calls onDataAvailable with resulting text
// ids should be in the form [{dbname: "CDFDLAST2013", filename: "1013102302.nh"}]
function toStdRef(reftext) {
	return reftext
		.body
		.replace("<ul class='literature-list'><li>", "")
		.replace("<br></li></ul>", "")
		.replace("</li><li>", "") // divide results
		.replace(/<br>|\r/g, "\n")
		.replace(/vo (\d+)\n/, "VO $1\n") // Divide VO and IS to different line
		.replace(/IS (\d+)\nvo/, "IS $1\nVO")// Uppercase VO
		.replace(/IS 0(\d+)\n/g, "IS $1\n")// Remove leading 0
		.replace(/VO 0(\d+)\n/g, "VO $1\n")
		.replace(/\n+/g, "\n")
		.replace(/\n([A-Z][A-Z1-9]\s)/g, "<br>$1")
		.replace(/\n/g, "")
		.replace(/<br>/g, "\n")
		.replace(/(K1 .*[\u4e00-\u9fa5]) ([a-zA-Z])/g, "$1;$2")// cn keywwords and en keywords
		.replace(/\t/g, "") // \t in abstract
		.replace(
			/^RT\s+Conference Proceeding/gim,
			"RT Conference Proceedings"
		)
		.replace(/^RT\s+Dissertation\/Thesis/gim, "RT Dissertation")
		.replace(/^(A[1-4]|U2)\s*([^\r\n]+)/gm, function (m, tag, authors) {
			authors = authors.split(/\s*[;，,]\s*/); // that's a special comma
			if (!authors[authors.length - 1].trim()) authors.pop();
			return tag + " " + authors.join("\n" + tag + " ");
		})
		.replace(/LA 中文;?/g, "LA zh-CN")
		.trim();
}

function getIDFromURL(url) {
	if (!url) return false;
	
	var dbname = url.match(/[?&]dbname=([^&#]*)/i);
	var filename = url.match(/[?&]filename=([^&#]*)/i);
	if (!dbname || !dbname[1] || !filename || !filename[1]) return false;
	
	return { dbname: dbname[1], filename: filename[1], url: url };
}

// 网络首发期刊信息并不能从URL获取dbname和filename信息
// Get dbname and filename from pre-released article web page.
function getIDFromRef(doc, url) {
	let database = attr(doc, '#paramdbname', 'value');
	let filename = attr(doc, '#paramfilename', 'value');
	if (database && filename) {
		return { dbname: database, filename: filename, url: url };
	}
	else {
		return false;
	}
}

// Get dbname and filename from the link target on the "take note" button in
// the doc as a fallback.
// NOTE: As of now (8 Mar 2023) the document sent by CNKI may contain duplicate
// element ids in the buttons row. In addition, for different article sources,
// the buttons may follow different patterns, sometimes lacking all the
// required info. The note-taking button appears more stable across the CNKI
// domains.
function getIDFromNoteTakerLink(doc, url) {
	const noteURLString = attr(doc, "li.btn-note a", "href");
	if (!noteURLString) return false;

	const urlParams = new URLSearchParams(new URL(noteURLString).search);
	const dbnameValue = urlParams.get("tablename");
	const filenameValue = urlParams.get("filename");

	if (!dbnameValue || !filenameValue) return false;

	return { dbname: dbnameValue, filename: filenameValue, url: url };
}

function getIDFromSearchRow(row) {
	var dbcode = attr(row, "a.icon-collect", "data-dbname");
	var filename = attr(row, "a.icon-collect", "data-filename");
	if (dbcode && filename) {
		return { dbcode: dbcode, dbname: dbcode, filename: filename };
	}
	else {
		return false;
	}
}

function getIDFromPage(doc, url) {
	return getIDFromURL(url)
		|| getIDFromRef(doc, url)
		|| getIDFromNoteTakerLink(doc, url);
}

function getTypeFromDBName(dbname) {
	var dbType = {
		CJFQ: "journalArticle",
		CJFD: "journalArticle",
		CAPJ: "journalArticle",
		SJES: "journalArticle",
		SJPD: "journalArticle",
		SSJD: "journalArticle",
		CCJD: "journalArticle",
		CDMD: "journalArticle",
		CYFD: "journalArticle",
		CDFD: "thesis",
		CMFD: "thesis",
		CLKM: "thesis",
		CCND: "newspaperArticle",
		CPFD: "conferencePaper",
		IPFD: "conferencePaper",
		SCPD: "patent"
	};
	var db = dbname.substring(0, 4).toUpperCase();
	if (dbType[db]) {
		return dbType[db];
	}
	else {
		return false;
	}
}

// New (kcms2) detail pages carry the citation export endpoint and the record id
// as hidden inputs instead of dbname/filename in the URL.
function getExportInfo(doc, url) {
	var exportId = attr(doc, '#export-id', 'value');
	var exportUrl = attr(doc, '#export-url', 'value');
	if (!exportId || !exportUrl) return false;
	return { exportId: exportId, exportUrl: exportUrl, url: url };
}

// EndNote (%X) to RefWorks (RT) reference type names, so the bundled RefWorks
// Tagged importer can map them back to Zotero item types.
var endnoteTypeMap = {
	'Journal Article': 'Journal Article',
	'Magazine Article': 'Magazine Article',
	'Newspaper Article': 'Newspaper Article',
	'Conference Paper': 'Conference Proceedings',
	'Conference Proceedings': 'Conference Proceedings',
	Thesis: 'Dissertation',
	Dissertation: 'Dissertation',
	Patent: 'Patent',
	Book: 'Book, Whole',
	'Book Section': 'Book, Section',
	Report: 'Report',
	'Web Page': 'Web Page'
};

// Convert a CNKI EndNote (%X) export record to RefWorks tagged text. The
// E-Study record (`elearning`) is consulted for fields the EndNote record
// lacks, such as the full date of a conference paper.
function endnoteToRefworks(endnote, elearning) {
	var tagMap = {
		A: 'A1',
		T: 'T1',
		B: 'T2',
		J: 'JF',
		C: 'U1',
		I: 'PB',
		D: 'YR',
		V: 'VO',
		N: 'IS',
		X: 'AB',
		8: 'FD',
		9: 'CL',
		'@': 'SN',
		U: 'UL',
		R: 'DO'
	};
	var records = [];
	for (let line of endnote.replace(/<br\s*\/?>/gi, '\n').split(/\r?\n/)) {
		let match = line.match(/^%(\S)\s?(.*)$/);
		if (!match) {
			// continuation of the previous field
			if (records.length) records[records.length - 1].value += '\n' + line;
			continue;
		}
		records.push({ tag: match[1], value: match[2] });
	}
	
	var out = [];
	var keywords = [];
	var type = '';
	var page = '';
	for (let record of records) {
		if (record.tag === '0') {
			type = record.value.trim();
			out.push('RT ' + (endnoteTypeMap[type] || type));
		}
		else if (record.tag === 'K') {
			for (let keyword of record.value.split(';')) {
				keyword = keyword.trim();
				if (keyword) keywords.push(keyword);
			}
		}
		else if (record.tag === 'P') {
			// CNKI writes the page count first and the actual page(s) last
			page = record.value.trim();
		}
		else if (tagMap[record.tag]) {
			out.push(tagMap[record.tag] + ' ' + record.value.trim());
		}
	}
	if (page) out.push('SP ' + page);
	// Conference papers' EndNote record carries only the year; the full date is
	// in the E-Study record.
	if (/^Conference/.test(type) && elearning) {
		let date = getElearningValue(elearning, 'PubTime');
		if (date) out.push('FD ' + date);
	}
	for (let keyword of keywords) {
		out.push('K1 ' + keyword);
	}
	return out.join('\n');
}

// Read a labelled field from a CNKI E-Study record, e.g. the value of
// "PubTime-出版时间: 2026-10-19" for label "PubTime".
function getElearningValue(elearning, label) {
	var re = new RegExp('^' + label + '-[^:]*:\\s*(.*)$');
	for (let line of elearning.replace(/<br\s*\/?>/gi, '\n').split(/\r?\n/)) {
		let match = line.match(re);
		if (match) return match[1].trim();
	}
	return '';
}

function getItemsFromSearchResults(doc, url, itemInfo) {
	var iframe = doc.getElementById('iframeResult');
	if (iframe) {
		var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
		if (innerDoc) {
			doc = innerDoc;
		}
	}
	
	var links = ZU.xpath(doc, '//tr[not(.//tr) and .//a[@class="fz14"]]');
	var aXpath = './/a[@class="fz14"]';
	if (!links.length) {
		links = ZU.xpath(doc, '//table[@class="GridTableContent"]/tbody/tr[./td[2]/a]');
		aXpath = './td[2]/a';
	}
	if (!links.length) {
		return false;
	}
	var items = {};
	for (var i = 0, n = links.length; i < n; i++) {
		// Z.debug(links[i].innerHTML)
		var a = ZU.xpath(links[i], aXpath)[0];
		var title = ZU.xpathText(a, './node()[not(name()="SCRIPT")]', null, '');
		if (title) title = ZU.trimInternal(title);
		var id = getIDFromURL(a.href) || getIDFromSearchRow(links[i]);
		// pre-released item can not get ID from URL, try to get ID from element.value
		if (!id) {
			var td1 = ZU.xpath(links[i], './td')[0];
			var tmp = td1.value.split('!');
			id = { dbname: tmp[0], filename: tmp[1], url: a.href };
		}
		if (!title || !id) continue;
		if (itemInfo) {
			itemInfo[a.href] = { id: id };
		}
		items[a.href] = title;
	}
	return items;
}

function detectWeb(doc, url) {
	if (getExportInfo(doc, url)) {
		var dbcode = attr(doc, '#paramdbcode', 'value');
		return (dbcode && getTypeFromDBName(dbcode)) || 'journalArticle';
	}
	// Z.debug(doc);
	var id = getIDFromPage(doc, url);
	var items = getItemsFromSearchResults(doc, url);
	var searchResult = doc.querySelector("#ModuleSearchResult");
	if (searchResult) {
		Z.monitorDOMChanges(searchResult, { childList: true, subtree: true });
	}
	if (id) {
		return getTypeFromDBName(id.dbname);
	}
	else if (items) {
		return "multiple";
	}
	else {
		return false;
	}
}

async function doWeb(doc, url) {
	var exportInfo = getExportInfo(doc, url);
	if (exportInfo) {
		await scrapeExport(exportInfo, doc, url);
		return;
	}
	if (detectWeb(doc, url) == "multiple") {
		var itemInfo = {};
		var items = getItemsFromSearchResults(doc, url, itemInfo);
		let selectItems = await Z.selectItems(items);
		if (selectItems) {
			for (let url in selectItems) {
				await scrape(itemInfo[url].id, doc, { url: url });
			}
		}
	}
	else {
		await scrape(getIDFromPage(doc, url), doc);
	}
}

// Legacy scheme: POST the dbname/filename pair to the RefWorks export endpoint.
async function scrape(id, doc, extraData) {
	var { dbname, filename } = id;
	var postData = `FileName=${dbname}!${filename}!1!0&DisplayMode=Refworks&OrderParam=0&OrderType=desc&SelectField=&PageIndex=1&PageSize=20&language=&uniplatform=NZKPT&random=0.30585230060685187`;
	var refer = `https://kns.cnki.net/dm/manage/export.html?filename=${dbname}!${filename}!1!0&displaymode=NEW&uniplatform=NZKPT`;
	var reftext = await request(
		'https://kns.cnki.net/dm/api/ShowExport',
		{
			method: "POST",
			body: postData,
			headers: {
				Referer: refer
			}
		}
	);
	importRefworks(toStdRef(reftext), doc, extraData ? extraData.url : id.url);
}

// New (kcms2) scheme: request the citation data from the export endpoint carried
// by the page and use the EndNote record it returns.
async function scrapeExport(exportInfo, doc, url) {
	var uniplatform = (url.match(/[?&]uniplatform=([^&#]*)/) || [])[1] || 'NZKPT';
	var body = `filename=${exportInfo.exportId}&displaymode=GBTREFER,elearning,EndNote&uniplatform=${uniplatform}`;
	var response = await request(
		exportInfo.exportUrl,
		{
			method: "POST",
			body: body,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Referer: url
			}
		}
	);
	var data;
	try {
		data = JSON.parse(response.body);
	}
	catch (e) {
		Z.debug('CNKI: could not parse export response');
		return;
	}
	var endnote = data && data.data && data.data.find(entry => entry.mode === 'ENDNOTE');
	if (!endnote || !endnote.value || !endnote.value.length) {
		Z.debug('CNKI: no EndNote export data returned');
		return;
	}
	var elearning = data.data.find(entry => entry.mode === 'ELEARNING');
	importRefworks(
		endnoteToRefworks(
			endnote.value.join('\n'),
			elearning ? elearning.value.join('\n') : ''
		),
		doc, url
	);
}

// Feed RefWorks tagged text to the bundled RefWorks Tagged importer and clean
// up the resulting items.
function importRefworks(refText, doc, itemUrl) {
	var translator = Z.loadTranslator('import');
	translator.setTranslator('1a3506da-a303-4b0a-a1cd-f216e6138d86'); // RefWorks Tagged
	translator.setString(refText);
	
	translator.setHandler('itemDone', function (obj, newItem) {
		// split names
		for (var i = 0, n = newItem.creators.length; i < n; i++) {
			var creator = newItem.creators[i];
			if (creator.firstName) continue;
			
			var lastSpace = creator.lastName.lastIndexOf(' ');
			var lastMiddleDot = creator.lastName.lastIndexOf('·');
			if (/[A-Za-z]/.test(creator.lastName) && lastSpace !== -1) {
				// western name. split on last space
				creator.firstName = creator.lastName.substring(0, lastSpace);
				creator.lastName = creator.lastName.substring(lastSpace + 1);
			}
			else if (lastMiddleDot !== -1) {
				// translated western name with · as separator
				creator.firstName = creator.lastName.substring(0, lastMiddleDot);
				creator.lastName = creator.lastName.substring(lastMiddleDot + 1);
			}
			else {
				// Chinese name. first character is last name, the rest are first name
				creator.firstName = creator.lastName.substring(1);
				creator.lastName = creator.lastName.charAt(0);
			}
		}
		
		if (newItem.abstractNote) {
			newItem.abstractNote = newItem.abstractNote.replace(/\s*[\r\n]\s*/g, '\n');
		}
		
		// clean up tags. Remove numbers from end
		for (var j = 0, l = newItem.tags.length; j < l; j++) {
			newItem.tags[j] = newItem.tags[j].replace(/:\d+$/, '');
		}
		
		newItem.title = ZU.trimInternal(newItem.title);
		newItem.url = itemUrl;

		// CN 中国刊物编号，非refworks中的callNumber
		// CN in CNKI refworks format explains Chinese version of ISSN
		if (newItem.callNumber) {
		//	newItem.extra = 'CN ' + newItem.callNumber;
			newItem.callNumber = "";
		}
		// don't download PDF/CAJ on searchResult(multiple)
		var webType = detectWeb(doc, itemUrl);
		if (webType && webType != 'multiple') {
			newItem.attachments = getAttachments(doc, newItem);
		}
		newItem.complete();
	});
	translator.translate();
}

// get pdf download link
function getPDF(doc, itemType) {
	// retrieve PDF links from CNKI oversea
	var pdf = itemType == 'thesis'
		? ZU.xpath(doc, "//div[@id='DownLoadParts']/a[contains(text(), 'PDF')]")
		: ZU.xpath(doc, "//a[@name='pdfDown']");
	return pdf.length ? pdf[0].href : false;
}

// caj download link, default is the whole article for thesis.
function getCAJ(doc, itemType) {
	// //div[@id='DownLoadParts']
	var caj = itemType == 'thesis'
		? ZU.xpath(doc, "//div[@id='DownLoadParts']/a")
		: ZU.xpath(doc, "//a[@name='cajDown']");
	return caj.length ? caj[0].href : false;
}

// add pdf or caj to attachments, default is pdf
function getAttachments(doc, item) {
	var attachments = [];
	var pdfurl = getPDF(doc, item.itemType);
	var cajurl = getCAJ(doc, item.itemType);
	// Z.debug('pdf' + pdfurl);
	// Z.debug('caj' + cajurl);
	var loginUser = ZU.xpath(doc, "//input[@id='loginuserid']");
	// Z.debug(doc.body.innerHTML);
	// Z.debug(loginUser[0].value);
	// Z.debug(loginUser.length);
	if (loginUser.length && loginUser[0].value) {
		if (pdfurl) {
			attachments.push({
				title: "Full Text PDF",
				mimeType: "application/pdf",
				url: pdfurl
			});
		}
		else if (cajurl) {
			attachments.push({
				title: "Full Text CAJ",
				mimeType: "application/caj",
				url: cajurl
			});
		}
	}
	
	return attachments;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFQ&dbname=CJFDLAST2015&filename=SPZZ201412003&v=MTU2MzMzcVRyV00xRnJDVVJMS2ZidVptRmkva1ZiL09OajNSZExHNEg5WE5yWTlGWjRSOGVYMUx1eFlTN0RoMVQ=",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "基于部分酸水解-亲水作用色谱-质谱的黄芪多糖结构表征",
				"creators": [
					{
						"lastName": "梁",
						"firstName": "图",
						"creatorType": "author"
					},
					{
						"lastName": "傅",
						"firstName": "青",
						"creatorType": "author"
					},
					{
						"lastName": "辛",
						"firstName": "华夏",
						"creatorType": "author"
					},
					{
						"lastName": "李",
						"firstName": "芳冰",
						"creatorType": "author"
					},
					{
						"lastName": "金",
						"firstName": "郁",
						"creatorType": "author"
					},
					{
						"lastName": "梁",
						"firstName": "鑫淼",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"ISSN": "1000-8713",
				"abstractNote": "来自中药的水溶性多糖具有广谱治疗和低毒性特点,是天然药物及保健品研发中的重要组成部分。针对中药多糖结构复杂、难以表征的问题,本文以中药黄芪中的多糖为研究对象,采用\"自下而上\"法完成对黄芪多糖的表征。首先使用部分酸水解方法水解黄芪多糖,分别考察了水解时间、酸浓度和温度的影响。在适宜条件(4 h、1.5mol/L三氟乙酸、80℃)下,黄芪多糖被水解为特征性的寡糖片段。接下来,采用亲水作用色谱与质谱联用对黄芪多糖部分酸水解产物进行分离和结构表征。结果表明,提取得到的黄芪多糖主要为1→4连接线性葡聚糖,水解得到聚合度4~11的葡寡糖。本研究对其他中药多糖的表征具有一定的示范作用。",
				"issue": "12",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "1306-1312",
				"publicationTitle": "色谱",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFQ&dbname=CJFDLAST2015&filename=SPZZ201412003&v=MTU2MzMzcVRyV00xRnJDVVJMS2ZidVptRmkva1ZiL09OajNSZExHNEg5WE5yWTlGWjRSOGVYMUx1eFlTN0RoMVQ=",
				"volume": "32",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "亲水作用色谱"
					},
					{
						"tag": "多糖"
					},
					{
						"tag": "表征"
					},
					{
						"tag": "质谱"
					},
					{
						"tag": "部分酸水解"
					},
					{
						"tag": "黄芪"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CMFD&dbname=CMFD201701&filename=1017045605.nh&v=MDc3ODZPZVorVnZGQ3ZrV3JyT1ZGMjZHYk84RzlmTXFwRWJQSVI4ZVgxTHV4WVM3RGgxVDNxVHJXTTFGckNVUkw=",
		"defer": true,
		"items": [
			{
				"itemType": "thesis",
				"title": "黄瓜共表达基因模块的识别及其特点分析",
				"creators": [
					{
						"lastName": "林",
						"firstName": "行众",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"abstractNote": "黄瓜(Cucumis sativus L.)是我国最大的保护地栽培蔬菜作物,也是植物性别发育和维管束运输研究的重要模式植物。黄瓜基因组序列图谱已经构建完成,并且在此基础上又完成了全基因组SSR标记开发和涵盖330万个变异位点变异组图谱,成为黄瓜功能基因研究的重要平台和工具,相关转录组研究也有很多报道,不过共表达网络研究还是空白。本实验以温室型黄瓜9930为研究对象,选取10个不同组织,进行转录组测序,获得10份转录组原始数据。在对原始数据去除接头与低质量读段后,将高质量读段用Tophat2回贴到已经发表的栽培黄瓜基因组序列上。用Cufflinks对回贴后的数据计算FPKM值,获得10份组织的24274基因的表达量数据。计算结果中的回贴率比较理想,不过有些基因的表达量过低。为了防止表达量低的基因对结果的影响,将10份组织中表达量最大小于5的基因去除,得到16924个基因,进行下一步分析。共表达网络的构建过程是将上步获得的表达量数据,利用R语言中WGCNA(weighted gene co-expression network analysis)包构建共表达网络。结果得到的共表达网络包括1134个模块。这些模块中的基因表达模式类似,可以认为是共表达关系。不过结果中一些模块内基因间相关性同其他模块相比比较低,在分析过程中,将模块中基因相关性平均值低于0.9的模块都去除,最终得到839个模块,一共11,844个基因。共表达的基因因其表达模式类似而聚在一起,这些基因可能与10份组织存在特异性关联。为了计算模块与组织间的相关性,首先要对每个模块进行主成分分析(principle component analysis,PCA),获得特征基因(module eigengene,ME),特征基因可以表示这个模块所有基因共有的表达趋势。通过计算特征基因与组织间的相关性,从而挑选出组织特异性模块,这些模块一共有323个。利用topGO功能富集分析的结果表明这些特异性模块所富集的功能与组织相关。共表达基因在染色体上的物理位置经常是成簇分布的。按照基因间隔小于25kb为标准。分别对839个模块进行分析,结果发现在71个模块中共有220个cluster,这些cluster 一般有2～5个基因,cluster中的基因在功能上也表现出一定的联系。共表达基因可能受到相同的转录调控,这些基因在启动子前2kb可能会存在有相同的motif以供反式作用元...",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"thesisType": "硕士",
				"university": "南京农业大学",
				"url": "https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CMFD&dbname=CMFD201701&filename=1017045605.nh&v=MDc3ODZPZVorVnZGQ3ZrV3JyT1ZGMjZHYk84RzlmTXFwRWJQSVI4ZVgxTHV4WVM3RGgxVDNxVHJXTTFGckNVUkw=",
				"attachments": [],
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
		"url": "https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CCJD&dbname=CCJDLAST2&filename=ZKSF202002010&uniplatform=NZKPT&v=RM9dl7WiC7a9v7FVB6ov3OwJSXCWzsWIng_BWXok2rj4YFWz9tZ20FRZxDaeDPCm",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "欧洲陪审团制度新发展:西班牙与俄罗斯的陪审团",
				"creators": [
					{
						"lastName": "萨曼",
						"firstName": "史蒂芬",
						"creatorType": "author"
					},
					{
						"lastName": "高",
						"firstName": "一飞",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"abstractNote": "<正>一、简介近来再次对俄罗斯(1993)和西班牙(1995)陪审团审判模式进行介绍的原因有两个方面。第一,在废除传统陪审团审判的情况下,要么采取仅由职业法官组成的法院审理案件,要么由职业法官和审讯顾问合议来判断所有的事实问题、法律问题并作出相应判决,这是一种令人惊闻的倒退。",
				"issue": "2",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "193-212",
				"publicationTitle": "司法智库",
				"shortTitle": "欧洲陪审团制度新发展",
				"url": "https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CCJD&dbname=CCJDLAST2&filename=ZKSF202002010&uniplatform=NZKPT&v=RM9dl7WiC7a9v7FVB6ov3OwJSXCWzsWIng_BWXok2rj4YFWz9tZ20FRZxDaeDPCm",
				"volume": "3",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "俄罗斯"
					},
					{
						"tag": "刑事诉讼程序"
					},
					{
						"tag": "判决书"
					},
					{
						"tag": "巴斯克"
					},
					{
						"tag": "陪审团"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=aGn3Ey0ZxcAi0XeGEjt5HeH9QvBBKaMwsES4SuFJjIdiexE2qhU8bX2aGBIHriUe6WrMOFyCz6TIuYJGlA_YQUO9h2FJwGt_gZfkHkLHnqVgNK8uMWo5lKYMqxvBPfO6_0Zy21140lIwEFrUw-cJtw==&uniplatform=NZKPT",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "我国绿色产品认证标识法律制度的路径探析",
				"creators": [
					{
						"lastName": "曹",
						"firstName": "明德",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "1001-2397",
				"abstractNote": "我国绿色产品认证标识制度框架已初步形成。作为一项法律制度,绿色产品标识及认证中形成了两组法律关系:一是就产品认可认证,在行政主体、认证机构与申请人之间构成公私混合的规制关系;二是就绿色产品标识授权使用,在上述法律关系主体间构成的商业许可关系。两组法律关系的搭建,形成了我国绿色产品认证标识制度的基本格局。制度的具体完善路径是将现行同类环保产品认证标识纳入绿色产品标识与绿色属性产品标识的二元框架内,或吸收,或拆解,或由市场逐步淘汰,最终形成统一的绿色产品认证标识体系。在制度构建过程中,对第三方认证机构的规制成为制度有效运行的关键。参考域外经验,我国应当通过强化认证机构的独立性,平衡认证机构与申请人之间的制约关系,以及通过加强行政监管与社会监督,防止认证权力寻租,充分发挥绿色产品认证标识制度的实践效果。",
				"issue": "6",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "133-145",
				"publicationTitle": "现代法学",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=aGn3Ey0ZxcAi0XeGEjt5HeH9QvBBKaMwsES4SuFJjIdiexE2qhU8bX2aGBIHriUe6WrMOFyCz6TIuYJGlA_YQUO9h2FJwGt_gZfkHkLHnqVgNK8uMWo5lKYMqxvBPfO6_0Zy21140lIwEFrUw-cJtw==&uniplatform=NZKPT",
				"volume": "44",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "第三方认证"
					},
					{
						"tag": "绿色产品"
					},
					{
						"tag": "绿色产品标识"
					},
					{
						"tag": "绿色产品认证"
					},
					{
						"tag": "证明商标"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=aGn3Ey0ZxcCQMiRSLWzbqHFLmF0YiAvOI33I1RqvSIDdZeLKl7q3QL7ioYjCbxuMHo1CSBSG2LYUjI9r30yPonoox-iGbCfgn-YF7W2h79KqPswOTOxrzPV94p2evWa1-zchF2wLCag2WcjSEGNUdSNYdPlVmcGt&uniplatform=NZKPT",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "环境法典中新污染物环境风险管控的立法思路",
				"creators": [
					{
						"lastName": "严",
						"firstName": "厚福",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "1671-7287",
				"abstractNote": "我国对常规污染物的治理取得了显著成效，但以有毒有害化学物质的生产和使用为主要来源的新污染物的环境风险仍然较为严峻。当前我国相关环境法律法规和标准中缺乏对新污染物环境风险管控的要求，对于现有化学物质的环境风险管控还存在较为严重的不足。未来环境法典中新污染物环境风险管控立法应当坚持风险预防原则，但风险预防原则并不以追求“零风险”为目标。新污染物环境风险管控立法总体上应当遵循“风险筛查→风险评估→风险管控”的思路。环境风险评估应当聚焦于从科学角度评估新污染物对公众健康和生态环境带来的“风险”本身，不考虑与环境风险无关的经济、社会等因素。确定什么是“不合理的风险”,除了科学判断之外，也需要“正当程序”的加持。风险无法确定时，比照“存在不合理风险”进行管控。在选择风险管控措施时，应当考虑新污染物对公众健康和生态环境的影响程度以及经济、社会等因素。对于新化学物质，应当秉承“除非能证明无害，否则都应当进行适当风险管控”的理念。",
				"issue": "5",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "18-30+115",
				"publicationTitle": "南京工业大学学报(社会科学版)",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=aGn3Ey0ZxcCQMiRSLWzbqHFLmF0YiAvOI33I1RqvSIDdZeLKl7q3QL7ioYjCbxuMHo1CSBSG2LYUjI9r30yPonoox-iGbCfgn-YF7W2h79KqPswOTOxrzPV94p2evWa1-zchF2wLCag2WcjSEGNUdSNYdPlVmcGt&uniplatform=NZKPT",
				"volume": "21",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "新污染物风险管控"
					},
					{
						"tag": "环境治理"
					},
					{
						"tag": "环境法典"
					},
					{
						"tag": "环境风险评估"
					},
					{
						"tag": "风险预防原则"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=aGn3Ey0ZxcBuyOSvEQLm_QauzuszuNvOETrZkPfTUVjXy6wyG6-n2nHmyA70y6TC3IN6i68HMAN2clvthsV7F1ypcjao4RepuYmOZSEVhLK8lN1UAkOxmQkqtJdHoHI1N1gKQDPjuaEbdR6APIJ1sA==&uniplatform=NZKPT&language=CHS",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Box-Behnken Design-响应面法优化碱水解人参茎叶三醇皂苷制备人参皂苷Rg2工艺研究",
				"creators": [
					{
						"lastName": "史",
						"firstName": "大臻",
						"creatorType": "author"
					},
					{
						"lastName": "吴",
						"firstName": "福林",
						"creatorType": "author"
					},
					{
						"lastName": "谭",
						"firstName": "璐",
						"creatorType": "author"
					},
					{
						"lastName": "周",
						"firstName": "柏松",
						"creatorType": "author"
					},
					{
						"lastName": "刘",
						"firstName": "金平",
						"creatorType": "author"
					},
					{
						"lastName": "李",
						"firstName": "平亚",
						"creatorType": "author"
					},
					{
						"lastName": "赖",
						"firstName": "思含",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.13863/j.issn1001-4454.2022.01.030",
				"ISSN": "1001-4454",
				"abstractNote": "目的：利用Box-Behnken Design-响应面法优选制备人参皂苷Rg<sub>2</sub>的最佳工艺参数。方法：以碱解反应的碱度、温度、时间作为考察因素，人参茎叶三醇皂苷中人参皂苷Rg<sub>2</sub>含量作为评价指标，运用Design-Expert 8.0.5b软件对工艺参数进行优化并获得最佳工艺参数。结果：经优化得到碱水解人参茎叶三醇皂苷制备人参皂苷Rg<sub>2</sub>的最佳工艺参数：反应碱度7.4%、反应温度187℃、反应时间5 h。验证试验表明，在此工艺参数下可将人参皂苷Rg<sub>2</sub>含量提高至9.84%,且工艺稳定。结论：经过优化的工艺可有效提高人参茎叶三醇皂苷中人参皂苷Rg<sub>2</sub>含量。",
				"issue": "1",
				"language": "zh-CN",
				"libraryCatalog": "CNKI",
				"pages": "173-176",
				"publicationTitle": "中药材",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=aGn3Ey0ZxcBuyOSvEQLm_QauzuszuNvOETrZkPfTUVjXy6wyG6-n2nHmyA70y6TC3IN6i68HMAN2clvthsV7F1ypcjao4RepuYmOZSEVhLK8lN1UAkOxmQkqtJdHoHI1N1gKQDPjuaEbdR6APIJ1sA==&uniplatform=NZKPT&language=CHS",
				"volume": "45",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Box-Behnken Design-响应面法"
					},
					{
						"tag": "人参皂苷Rg2"
					},
					{
						"tag": "人参茎叶三醇皂苷"
					},
					{
						"tag": "工艺优化"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfkI2FftlrPbr8PF6YBXgogfhyVYNQZqzIXrd7WZ89rQVSiucQppPXfPB3c7JD8VQXACtdD8_OvMigKKzqybIlLnnmEt10FfdRS6Ads33eD5NuCpyYLWPN4tjrcyCiYA8YxpUJpHUy6ZV7YWw2VxsleA1F_8UmU9FTLw8sg9QFaJw==",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "柏孜克里克石窟法华经变内容补遗",
				"creators": [
					{
						"lastName": "董",
						"firstName": "俊彦",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"DOI": "10.14087/j.cnki.65-1268/k.2026.01.011",
				"ISSN": "1674-2893",
				"abstractNote": "柏孜克里克石窟23窟、49窟以及51窟皆绘制有法华经变的内容。自上世纪初，随着西方探险队的新疆探险活动，此三窟逐渐为世人所知。本文对以往学术界的遗漏之处进行了补充，将部分未被关注到的壁画进行了考释，内容涉及《序品》《方便品》《观音普门品》《提婆达多品》《见宝塔品》《药王菩萨本事品》《观音普门品》等内容。柏孜克里克石窟的法华经变体现了法华信仰在高昌回鹘时期的延续，另一方面也反映了高昌回鹘佛教图像对中原图像系统的继承和发展，体现了中原与高昌的频繁交往。",
				"issue": "1",
				"libraryCatalog": "CNKI",
				"pages": "106-116+154-155+173",
				"publicationTitle": "吐鲁番学研究",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfkI2FftlrPbr8PF6YBXgogfhyVYNQZqzIXrd7WZ89rQVSiucQppPXfPB3c7JD8VQXACtdD8_OvMigKKzqybIlLnnmEt10FfdRS6Ads33eD5NuCpyYLWPN4tjrcyCiYA8YxpUJpHUy6ZV7YWw2VxsleA1F_8UmU9FTLw8sg9QFaJw==",
				"attachments": [],
				"tags": [
					{
						"tag": "高昌回鹘"
					},
					{
						"tag": "柏孜克里克石窟"
					},
					{
						"tag": "法华经变"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzflAcBJ38DcDk5RCJ9f-Jc688QyTasG4_a6JbLjKtG0ap0X22iQwmAoNYRo-v0lUsf880fXmK7u2pl5EPub8CwbCn5MRj4y-jTXvlflMTC_eYDprTkbwMioYNbQ5cPFoBpZP87YKQUYn7Jy0v1EDQBz448VIQKFndfsu1Ex4vJeIQ4MWigrw9wS",
		"items": [
			{
				"itemType": "thesis",
				"title": "吐鲁番高昌回鹘时期药师经变图像艺术研究",
				"creators": [
					{
						"lastName": "万",
						"firstName": "慧通",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"abstractNote": "六朝之初,《药师经》传入中原,到唐代药师信仰才开始进入兴盛期。高昌地区关于药师佛的经典在柏孜克里克石窟、高昌故城、交河故城、吐峪沟都曾出土过,时间跨度为六朝至西州回鹘时期。关于药师的美术作品最早有公元8—9世纪的药师如来幡画,最晚有元刻本藏式版画《三世佛与伎乐天》,虽然高昌地区的药师信仰传入很早,但直到高昌回鹘时期《药师经变》才开始绘制。本文在对高昌地区药师佛绘画作品整理的基础上,考察高昌地区药师信仰、作品遗存以及隋至西夏时期敦煌《药师经变》的绘制情况,对伯西哈石窟和柏孜克里克石窟中的《药师经变》进行探讨,以图像的内容结合经典进行解读,高昌回鹘时期的《药师经变》已不像唐宋时期莫高窟那般详尽表现净土世界的天宫伎乐、宝池莲花等,绘制目的从往生净土的愿望转向供养。柏孜克里克石窟中的《药师经变》受到多种因素的影响,相比伯西哈石窟高昌回鹘时期的《药师经变》更具特点,体现在构图形式的变化、图像志的借用等,揭示了高昌地区的《药师经变》从摹仿到吸收创新的过程。",
				"libraryCatalog": "CNKI",
				"thesisType": "硕士",
				"university": "新疆艺术学院",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzflAcBJ38DcDk5RCJ9f-Jc688QyTasG4_a6JbLjKtG0ap0X22iQwmAoNYRo-v0lUsf880fXmK7u2pl5EPub8CwbCn5MRj4y-jTXvlflMTC_eYDprTkbwMioYNbQ5cPFoBpZP87YKQUYn7Jy0v1EDQBz448VIQKFndfsu1Ex4vJeIQ4MWigrw9wS",
				"attachments": [],
				"tags": [
					{
						"tag": "高昌回鹘"
					},
					{
						"tag": "伯西哈石窟"
					},
					{
						"tag": "柏孜克里克石窟"
					},
					{
						"tag": "药师经变"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzcWpEEYDysxZfcw2BE3GC0b9vfE7s8uYpn44uyAIIACphxvR9a2rE9veuUwcAw5Nh1cFougZmAgawdAyJB5KZY3TI2G0m6FZffCxV85DhTm4mJ13SHY_X3dxpVyky2J-EqF7CrY7NqrBBWOA1vs650IY83J_e3bKMs5IpoytdoSqA==",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "“关铭闻”里藏着什么力量？",
				"creators": [
					{
						"lastName": "朱",
						"firstName": "子钰",
						"creatorType": "author"
					},
					{
						"lastName": "杜",
						"firstName": "一娜",
						"creatorType": "author"
					}
				],
				"date": "2026-09-29",
				"libraryCatalog": "CNKI",
				"pages": "005",
				"publicationTitle": "中国新闻出版广电报",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzcWpEEYDysxZfcw2BE3GC0b9vfE7s8uYpn44uyAIIACphxvR9a2rE9veuUwcAw5Nh1cFougZmAgawdAyJB5KZY3TI2G0m6FZffCxV85DhTm4mJ13SHY_X3dxpVyky2J-EqF7CrY7NqrBBWOA1vs650IY83J_e3bKMs5IpoytdoSqA==",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzdNB1er3w6U7vRJVszOiaXScfrfjsvfvv6s3BsDMaDmsV-oNhnDxDcZYg9UhNXjJe2E-kSJQ-QFl26Ovt2mRzpF2GqfsN6RjzDrRE1t0lyMXyV2rF_AsQHqq2u3Qjk3lNe1I2-OHWHomUTGrOQffaciRlz7ijcMqZYtnJnnT97JB-Y6ysXyr5TO",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "基于图像识别的气象站探测设备环境风险等级判识方法",
				"creators": [
					{
						"lastName": "王",
						"firstName": "超然",
						"creatorType": "author"
					},
					{
						"lastName": "白",
						"firstName": "子诚",
						"creatorType": "author"
					},
					{
						"lastName": "吴",
						"firstName": "松",
						"creatorType": "author"
					}
				],
				"date": "2026-10-19",
				"DOI": "10.26914/c.cnkihy.2026.057598",
				"abstractNote": "<正>气象站探测环境是保障观测资料代表性、准确性和可比性的基础。雨量筒、百叶箱周边的植被生长、杂物堆积等变化,可能对降水、气温等要素观测产生影响。现有探测环境保护主要依赖人工巡查,难以兼顾巡查频次、覆盖范围和异常响应时效。当前部分野外无人值守地面自动气象观测站(以下简称气象站)配备了安防摄像头,可持续获取观测场实景图像,为探测环境自动监测提供了数据基础。基于此,本研究利用深度学习图像识别技术,自动判识气象站雨量筒和百叶箱的观测环境状态,并依据设备状态组合实现探测环境风险等级划分与提示。",
				"conferenceName": "第37届中国气象学会年会",
				"libraryCatalog": "CNKI",
				"pages": "44",
				"place": "中国甘肃兰州",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzdNB1er3w6U7vRJVszOiaXScfrfjsvfvv6s3BsDMaDmsV-oNhnDxDcZYg9UhNXjJe2E-kSJQ-QFl26Ovt2mRzpF2GqfsN6RjzDrRE1t0lyMXyV2rF_AsQHqq2u3Qjk3lNe1I2-OHWHomUTGrOQffaciRlz7ijcMqZYtnJnnT97JB-Y6ysXyr5TO",
				"attachments": [],
				"tags": [
					{
						"tag": "气象站"
					},
					{
						"tag": "探测环境"
					},
					{
						"tag": "百叶箱"
					},
					{
						"tag": "雨量筒"
					},
					{
						"tag": "判识方法"
					},
					{
						"tag": "探测设备"
					},
					{
						"tag": "风险等级"
					},
					{
						"tag": "图像识别"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzcMTohn1RuvNCIKyiPjsHO1RKsu8ljcGXOOrWeRF_TA8W2K_xSs9mQWnRT33BKiiaqt-xrJr-dd2uHi3bgkC-TveLvFWpbIWKrjbd6RjBbyQvSaPnrTZOQ3MtBcydpoPEGpze4EB7YchOunnJgN2eaqSJYhioNsU-qMftQVEe8sHQ==",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "基于小波频域感知的图像去雨Transformer模型",
				"creators": [
					{
						"lastName": "张",
						"firstName": "凡龙",
						"creatorType": "author"
					},
					{
						"lastName": "杜",
						"firstName": "启鲁",
						"creatorType": "author"
					},
					{
						"lastName": "任",
						"firstName": "翔宇",
						"creatorType": "author"
					}
				],
				"ISSN": "1001-9081",
				"abstractNote": "针对复杂雨滴退化条件下结构恢复与细节保持难以兼顾的问题，本文提出基于Transformer框架的双分支频率感知网络——WASH-Former(Wavelet-Aware Structured Hierarchical Transformer)。该模型通过“频率解耦—差异化增强—动态重建”的三阶段框架，引入离散小波变换将特征分离为低频结构与高频纹理，并分别设计低频去噪块与高频双重残差块进行针对性建模，最后通过自适应融合与逆小波变换实现高保真重建。结合类U-Net的层次化结构，模型在多尺度上协同优化频域与空间域信息，在结构一致性与细节恢复之间取得良好平衡。实验结果表明，WASH-Former在SPA-Data、Rain200L和AGAN-Data等多个去雨数据集上均表现出优越的恢复性能。在SPA-Data数据集上，WASH-Former的PSNR达到48.03dB，相较于Transformer模型Uformer提升0.19dB；在Rain200L数据集上达到40.86dB，分别较SPDNet和IDT提升0.36dB和0.12dB；在AGAN-Data数据集上达到32.19dB，较AWRCP提升0.26dB。综上表明，WASH-Former能够有效提升复杂雨滴退化场景下的图像恢复质量。",
				"pages": "1-10",
				"publicationTitle": "计算机应用",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzcMTohn1RuvNCIKyiPjsHO1RKsu8ljcGXOOrWeRF_TA8W2K_xSs9mQWnRT33BKiiaqt-xrJr-dd2uHi3bgkC-TveLvFWpbIWKrjbd6RjBbyQvSaPnrTZOQ3MtBcydpoPEGpze4EB7YchOunnJgN2eaqSJYhioNsU-qMftQVEe8sHQ==",
				"attachments": [],
				"tags": [
					{
						"tag": "图像恢复"
					},
					{
						"tag": "小波变换"
					},
					{
						"tag": "图像去雨"
					},
					{
						"tag": "Transformer"
					},
					{
						"tag": "计算机视觉"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzcR0JjewlKE5Kh-7nlJ6sKxmvbrmmZq6Inuq9kEwMocnVyFVyl4Qvvue4j7qQzkXoFDskzctvi5Esg2_x4WV6xtGiG2V_xF0BxEqFg70usqlQ1UUVFh8mmlJ30EjfA1NylGTUjM2zr1SnFZHV7B1oR1VlELBz_zDnXlvf7pbgQM7w==",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "习近平关于人工智能发展重要论述的生成语境、精髓要义及时代价值",
				"creators": [
					{
						"lastName": "黄",
						"firstName": "豪楠",
						"creatorType": "author"
					}
				],
				"ISSN": "1672-4860",
				"abstractNote": "人工智能是引领新一轮科技革命和产业变革的重要驱动力量。党的十八大以来，习近平结合世情、国情、党情发生的深刻复杂变化，围绕人工智能领域相关问题发表了一系列新思想新观点新论断，形成了习近平关于人工智能发展重要论述。其精髓要义主要体现在战略地位论、目标任务论、主体协同论、发展路径论和方针原则论上。这一重要论述为丰富和发展马克思主义科技观作出了原创性贡献，为推动我国新一代人工智能健康发展提供了理论指导和行动指南，为共创人类社会智能时代贡献了中国智慧和中国方案，具有重要的理论贡献、实践价值和世界意义。",
				"pages": "1-7",
				"publicationTitle": "西南科技大学学报(哲学社会科学版)",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzcR0JjewlKE5Kh-7nlJ6sKxmvbrmmZq6Inuq9kEwMocnVyFVyl4Qvvue4j7qQzkXoFDskzctvi5Esg2_x4WV6xtGiG2V_xF0BxEqFg70usqlQ1UUVFh8mmlJ30EjfA1NylGTUjM2zr1SnFZHV7B1oR1VlELBz_zDnXlvf7pbgQM7w==",
				"attachments": [],
				"tags": [
					{
						"tag": "习近平"
					},
					{
						"tag": "人工智能"
					},
					{
						"tag": "理论创新"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZze6CEsuF44woRIZFdxJxHPXrMa-vFC3NiwFgcC9i9pBPd468m62Vv8fzG6EpYFN82lkPlunuP4FCMngKcztXet2e7BGaQse2_6UQ3gxjK-FZkoJUpB-z5w428uEs_NyzQVKjFQu9raR6IQSpBFjuJKrCoXMTJzkUQF3yT6ZdPxeEPr6bMGhTrSk",
		"items": [
			{
				"itemType": "thesis",
				"title": "人工智能时代高校思想政治教育效果提升研究",
				"creators": [
					{
						"lastName": "刘",
						"firstName": "歌",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"abstractNote": "人工智能是引领新一轮科技革命和产业变革的主要驱动力,正深刻影响着人们的生产、生活方式,也深刻改变着高校思想政治教育的教育内容、模式及方法。推动思想政治教育智能化转型、提升思想政治教育效果,既是党和国家高度重视的理论与实践议题,也是高校思想政治教育的目标。党的十八大以来,以习近平同志为核心的党中央从宏观的发展战略视角出发,对思想政治教育进行了全面部署。在习近平总书记关于人工智能教育相关论述的指导下,高校思想政治教育应该牢牢把握时代脉搏,在崭新的技术背景下完成教育主客体角色调整和重建,进入教育精准化、高效化的新阶段,实现人工智能与高校思想政治教育在创新中优化、在协同中共赢。高校思想政治教育是一项内涵丰富,层次多样的教育实践活动。其深度与广度要求教育工作者必须具备复杂性思维的洞察力、复杂性方法的运用能力以及复杂性工具的应用技巧。为此,思想政治教育工作者需要不断地更新自身的思维模式,精进教育技能,熟练掌握先进技术。通过这样的转变与提升,方能更好地引导学生深入理解思想政治教育的精髓,培养他们的综合素养,以适应不断变化的社会需求。在人工智能时代背景下,探索如何提升高校思想政治教育效果显得尤为重要。人工智能的应用不仅为思想政治教育带来了客观、全面且复杂的视角,而且深化了思想政治教育的实效性。因此,在新时代的高校思想政治教育中,积极推动人工智能与教育的深度融合成为提升教育质量与效果的关键路径。这种融合不仅能促进技术与高校思想政治教育的有机统一,还能显著提升高校思想政治教育的针对性。本论文系统分析人工智能时代高校思想政治教育效果提升的现状,为日后人工智能时代高校思想政治教育效果的实践向度和具体策略提出针对性意见。全文的结构为:首先,本文介绍了马克思主义人学理论、马克思主义技术观及思想政治教育接受理论,为研究人工智能时代高校思想政治教育效果提升提供了理论基础。并阐释了人工智能时代、高校思想政治教育的概念。其次,阐述和说明了人工智能时代高校思想政治教育效果提升的背景与挑战。再次,对在校学生进行问卷调查,通过事实数据检验、访谈等手段,直观地展现了人工智能时代高校思想政治教育效果提升的发展现状和存在问题。最后,本文从人工智能时代高校思想政治教育效果提升的实践导向出发,分析研究了人工智能时代高校思想政治教育实施的方向与具体策略。",
				"thesisType": "博士",
				"university": "北京科技大学",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZze6CEsuF44woRIZFdxJxHPXrMa-vFC3NiwFgcC9i9pBPd468m62Vv8fzG6EpYFN82lkPlunuP4FCMngKcztXet2e7BGaQse2_6UQ3gxjK-FZkoJUpB-z5w428uEs_NyzQVKjFQu9raR6IQSpBFjuJKrCoXMTJzkUQF3yT6ZdPxeEPr6bMGhTrSk",
				"attachments": [],
				"tags": [
					{
						"tag": "人工智能时代"
					},
					{
						"tag": "高校思想政治教育"
					},
					{
						"tag": "效果"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfGfIcby7uHCuREuQljLpz3QW_XLY0WQvToQNczxfjRCQeRfn5ksjqgVwvnCwdFI1gY_MUy52bNmf2Wz72RcuQvxDAzI6EC5oQMxKsz5s2M1lQwFs5VIYRHII-hGpiwYma_iK76F7g19KPIF3r8XvzrclEGDeboOkhMH_o0sWqaX9eu6yTGthqA",
		"items": [
			{
				"itemType": "thesis",
				"title": "面向大规模MIMO的智能信道估计与预编码技术研究",
				"creators": [
					{
						"lastName": "高",
						"firstName": "佳宝",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"abstractNote": "作为第五代乃至将来第六代移动通信(The Sixth Generation,6G)系统的核心使能技术之一,大规模多输入多输出(Multiple-Input Multiple-Output,MIMO)由于其高谱效、大连接、低时延和广覆盖等特性而被广泛应用于各种场景中。为充分发挥大规模MIMO的性能优势,需有效解决信道估计和预编码两大关键信号处理问题。然而,传统信号处理算法在性能、复杂度、鲁棒性等方面存在诸多不足。近年来,基于人工智能(Artificial Intelligence,AI)的无线通信发展迅猛,已被作为6G的新能力之一。利用AI强大的大数据学习能力,有望获得新的智能算法以解决传统算法的痛点。本学位论文以大规模MIMO系统为基础场景,根据不同传输频段和硬件架构的特点,以AI为主要技术手段,对大规模MIMO的智能信道估计和预编码技术展开研究。论文的主要内容及创新性如下:首先,针对低频段混合模数(Hybrid Analog-Digital,HAD)架构下大规模MIMO的窄带信道估计问题,提出一种基于注意力自编码器的智能算法,将移相矩阵对接收导频信号的压缩过程与信道估计算法对信道的重构过程分别建模为自编码器的编码器与解码器,通过端到端学习进行联合优化。一方面,优化所得编码网络权重对应的移相矩阵可适配信道分布特性,相比传统基于数学性质设计的移相矩阵,显著减少了压缩过程中的信息损失;另一方面,通过在解码网络中引入注意力模块,可自动实现类似分治法的操作以有效利用大规模MIMO信道在角度域的分布可分性,显著提高了信道估计的精度。仿真结果表明,所提算法只具有正交匹配追踪量级的复杂度,但可以取得接近甚至优于稀疏贝叶斯学习(Sparse Bayesian Learning,SBL)的性能。得益于特殊的损失函数设计与注意力机制,训练所得网络还具有良好的鲁棒性与可解释性。其次,针对低频段大规模MIMO的窄带全数字预编码问题,提出一种基于最优解结构参数学习的智能算法。首先,将用户多数据流模型转换为等效的单流模型;然后,用一个深度神经网络(Deep Neural Network,DNN)预测单流模型下最优预编码解结构的少量未知参数。相比直接预测高维预编码矩阵,大大降低了复杂度与学习难度;最后,根据结构参数与最优解结构计算得到各用户的预编码。进一步,HAD架构下的混合预编码则可通过对全数字预编码进行矩阵分解获得。此外,还通过输入降...",
				"thesisType": "博士",
				"university": "浙江大学",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfGfIcby7uHCuREuQljLpz3QW_XLY0WQvToQNczxfjRCQeRfn5ksjqgVwvnCwdFI1gY_MUy52bNmf2Wz72RcuQvxDAzI6EC5oQMxKsz5s2M1lQwFs5VIYRHII-hGpiwYma_iK76F7g19KPIF3r8XvzrclEGDeboOkhMH_o0sWqaX9eu6yTGthqA",
				"attachments": [],
				"tags": [
					{
						"tag": "大规模MIMO"
					},
					{
						"tag": "信道估计"
					},
					{
						"tag": "预编码"
					},
					{
						"tag": "人工智能"
					},
					{
						"tag": "数据驱动"
					},
					{
						"tag": "模型驱动"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfvw8_S2ypbxfduya0HIr2eS2Hc7Y79wcD5DzKW9uGCAqSswCoukU1q2Tb00JUbReynuqpjJv83x7r1JSLxf3FLosMwcYMDJI9JuCvzZYSwAiFDjfkIHORb-v8xIYKahWwk2v6b3L7XzSIAjzYsHJNrfzsGq_8D1726C-urGqBTFT_ay1_GVUzU",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "“中国持续为金砖合作注入动能”",
				"creators": [
					{
						"lastName": "苑",
						"firstName": "基荣",
						"creatorType": "author"
					}
				],
				"date": "2026-10-06",
				"pages": "003",
				"publicationTitle": "人民日报",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfvw8_S2ypbxfduya0HIr2eS2Hc7Y79wcD5DzKW9uGCAqSswCoukU1q2Tb00JUbReynuqpjJv83x7r1JSLxf3FLosMwcYMDJI9JuCvzZYSwAiFDjfkIHORb-v8xIYKahWwk2v6b3L7XzSIAjzYsHJNrfzsGq_8D1726C-urGqBTFT_ay1_GVUzU",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfvw8_S2ypbxfduya0HIr2eS2Hc7Y79wcDNJn-UEBWdu_YapPrUMpdsvUVztWaYZjZTgl2zY5dvzlNCpfpCtZ3oqsKCErt6Ol0nKMpoBqmfaOSnhDQ2xxT9Wn2KRF4J9w-Kgb41ja898NwVVKs1nI3TW7vm6YsVMYTO_mxpQSfTSQZ03to5nMOy",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "AI重塑电子信息制造业",
				"creators": [
					{
						"lastName": "黄",
						"firstName": "鑫",
						"creatorType": "author"
					},
					{
						"lastName": "禹",
						"firstName": "琳",
						"creatorType": "author"
					}
				],
				"date": "2026-10-06",
				"pages": "006",
				"publicationTitle": "经济日报",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzfvw8_S2ypbxfduya0HIr2eS2Hc7Y79wcDNJn-UEBWdu_YapPrUMpdsvUVztWaYZjZTgl2zY5dvzlNCpfpCtZ3oqsKCErt6Ol0nKMpoBqmfaOSnhDQ2xxT9Wn2KRF4J9w-Kgb41ja898NwVVKs1nI3TW7vm6YsVMYTO_mxpQSfTSQZ03to5nMOy",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzdjpfpwwBPmqzhdqyyEGCIuWked8NoQ9CWVpWBJY5s5DzpmHHxJxrMMSz6mMDilRgEcnMg4pE2gVZnSkof9J3Xr54qGpCMAytcFc7IeK3-X9cdVcgroS03JQH_9AHUBQNoeHqWygwlSzEwIAA1CSyp6ILy_cNXdwgu04hv9zPnFvFUM3UqGDf-X",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "基于AOV边缘摄像头与轻量化深度学习的智能全天空云观测系统",
				"creators": [
					{
						"lastName": "王",
						"firstName": "清龙",
						"creatorType": "author"
					},
					{
						"lastName": "向",
						"firstName": "立莉",
						"creatorType": "author"
					},
					{
						"lastName": "成",
						"firstName": "勤",
						"creatorType": "author"
					},
					{
						"lastName": "姚",
						"firstName": "曼",
						"creatorType": "author"
					},
					{
						"lastName": "王",
						"firstName": "海",
						"creatorType": "author"
					},
					{
						"lastName": "乔",
						"firstName": "木",
						"creatorType": "author"
					}
				],
				"date": "2026-10-19",
				"DOI": "10.26914/c.cnkihy.2026.057602",
				"abstractNote": "<正>地面气象观测中云的自动化识别长期面临\"精度-成本-功耗\"三角困境:高精度方案依赖专业全天空成像仪(ASI)与高性能服务器,成本动辄数万元且需稳定供电;低成本方案则受限于模型精度与部署能力,难以满足业务需求。本文提出一种基于AOV(Always-On Vision)低功耗边缘摄像头与瑞芯微RV1126BP高性能嵌入式NPU的智能全天空云观测系统,旨在突破传统方案的瓶颈,为无人值守气象站提供低成本、低功耗的云观测解决方案。",
				"conferenceName": "第37届中国气象学会年会",
				"place": "中国甘肃兰州",
				"pages": "48",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzdjpfpwwBPmqzhdqyyEGCIuWked8NoQ9CWVpWBJY5s5DzpmHHxJxrMMSz6mMDilRgEcnMg4pE2gVZnSkof9J3Xr54qGpCMAytcFc7IeK3-X9cdVcgroS03JQH_9AHUBQNoeHqWygwlSzEwIAA1CSyp6ILy_cNXdwgu04hv9zPnFvFUM3UqGDf-X",
				"attachments": [],
				"tags": [
					{
						"tag": "全天空"
					},
					{
						"tag": "摄像头"
					},
					{
						"tag": "AOV"
					},
					{
						"tag": "深度学习"
					},
					{
						"tag": "云观测"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzc8W13NtV4ZjiejsBzsUMZf-yB5d_AufqxbaoXgN3TObmnmB7SDxslzSY0jLllrKfi15dFSDS1wJ6VA6mZLVdN6DaOqjdsjnifJb7yewySbsBbh0v0-5CQ2dMCMx5H874KWdfKxJamWWkKgRPHwcv7a5KpPs5pAraBIO4HTgAye_lv8zgmg-_ii",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "基于多源卫星资料和深度学习的降水三维雷达反射率重建",
				"creators": [
					{
						"lastName": "叶",
						"firstName": "霖",
						"creatorType": "author"
					},
					{
						"lastName": "于",
						"firstName": "田甜",
						"creatorType": "author"
					},
					{
						"lastName": "王",
						"firstName": "皓",
						"creatorType": "author"
					},
					{
						"lastName": "曾",
						"firstName": "强宇",
						"creatorType": "author"
					},
					{
						"lastName": "康",
						"firstName": "文",
						"creatorType": "author"
					}
				],
				"date": "2026-10-19",
				"DOI": "10.26914/c.cnkihy.2026.057615",
				"abstractNote": "<正>三维观测对于理解和分析降水风暴至关重要,极轨卫星的星载降水测量雷达可获取高精度降水垂直结构,但扫描带宽度有限,时空覆盖不连续;地球静止卫星观测频次高,却无法直接表征降水廓线。本研究提出了一种利用地球静止卫星亮温数据重建极轨卫星多高度雷达反射率的深度学习方法。该模型以FY-3G降水测量雷达(PMR)Ku波段二级产品作为监督数据,利用FY-4B先进的静止轨道辐射成像仪(AGRI)红外通道亮温融合ERA5温湿度环境场及数字高程数据(DEM)作为特征。在70°—140°E、15°—55°N区域内构建近地面至9 km共七个高度层(间隔1.5km)的训练数据集,以FY-3G实际观测时间为匹配基准,获取FY-4B的t、t-15和t-30三个时次观测,并通过空间最近邻方法将FY-3G观测配准到FY-4B 4 km网格;匹配距离限制为4 km,当多个FY-3G观测点落入同一网格时采用平均反射率作为监督标签。",
				"conferenceName": "第37届中国气象学会年会",
				"place": "中国甘肃兰州",
				"pages": "61",
				"libraryCatalog": "CNKI",
				"url": "https://kns.cnki.net/kcms2/article/abstract?v=qfSY-45OZzc8W13NtV4ZjiejsBzsUMZf-yB5d_AufqxbaoXgN3TObmnmB7SDxslzSY0jLllrKfi15dFSDS1wJ6VA6mZLVdN6DaOqjdsjnifJb7yewySbsBbh0v0-5CQ2dMCMx5H874KWdfKxJamWWkKgRPHwcv7a5KpPs5pAraBIO4HTgAye_lv8zgmg-_ii",
				"attachments": [],
				"tags": [
					{
						"tag": "雷达反射率"
					},
					{
						"tag": "强回波"
					},
					{
						"tag": "多源卫星"
					},
					{
						"tag": "深度学习"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
