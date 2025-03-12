{
	"translatorID": "2ffde8fb-56d7-478d-9d83-8ad22ba37796",
	"label": "ICLR",
	"creator": "WEI Qisheng",
	"target": "iclr.cc",
	"minVersion": "",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-09 14:09:20"
}

/*
	
*/

function detectWeb(doc, url) {
	Zotero.debug("【当前url】" + url);

	let yearMatch = url.match(/https:\/\/iclr\.cc\/virtual\/(\d{4})\/papers\.html/);
	if (yearMatch) {
		Zotero.debug("【Year detected】" + yearMatch[1]);  // 打印年份
		return "multiple";
	}
	Zotero.debug("【No year detected in the URL】" + url);
	return false;
}

function scrape(uid, info) {
	if (info === undefined) {
		// error!
		return;
	}

	// year
	let year = 0;
	let yearMatch = info.virtualsite_url.match(/virtual\/(\d{4})\//);
	if (yearMatch) {
		year = yearMatch[1];
	} else {
		return; // 或者处理没有找到年份的情况
	}

	// url
	let url;
	if (info.paper_url) {
		url = info.paper_url;
	} else if (info.url) {
		url = info.url;
	} else {
		// TODO
	}

	// 创建一个新的条目
	let item = new Zotero.Item('conferencePaper');
	item.title = info.name;
	item.abstractNote = info.abstract;
	item.url = url;
	item.creators = info.authors.map(author => ({
		lastName: author.fullname,
		creatorType: "author"
	}));
	item.date = year;  // 使用动态年份
	item.conferenceName = `${year} International Conference on Learning Representations (ICLR)`;
	item.attachments.push({
		title: "Full Text PDF",
		// url: info.paper_pdf_url,
		mimeType: "application/pdf"
	});
	item.complete();
}

function doWeb(doc, url) {
	let yearMatch = url.match(/https:\/\/iclr\.cc\/virtual\/(\d{4})\/papers\.html/);
	if (!yearMatch) {
		Zotero.debug("Year not found in URL: " + url);
		return;
	}

	let year = yearMatch[1];
	Zotero.debug("Processing papers for the year: " + year);

	let jsonURL = `https://iclr.cc/static/virtual/data/iclr-${year}-orals-posters.json`;



	ZU.doGet(jsonURL, function (text) {
		Zotero.debug("Fetched JSON data: " + text.substring(0, 100)); // 打印前100字符以查看结构
		let data = JSON.parse(text);
		let items = {};
		let items_info = {};

		let uid;

		for (let paper_info of data.results) {
			/*
			大致分为4类：
			1、pdf链接在paper_url
			2、pdf链接在url
			3、pdf链接在 eventmedia - uri
			4、就一篇论文特殊，既不在openreview，又不在jmlr，但是他可以自动走第一类，解析成功
			*/
			uid = paper_info.uid;
			items[uid] = paper_info.name;
			items_info[uid] = paper_info;
		}

		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) {
				return;
			}

			let uids = Object.keys(selectedItems);

			Zotero.debug("total_number: " + uids.length);

			for (let uid of uids) {
				scrape(uid, items_info[uid]);
			}
		})

	});


}




/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
