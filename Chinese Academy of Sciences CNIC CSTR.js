{
	"translatorID": "c070e5a2-4bfd-44bb-9b3c-4be20c50d0d9",
	"label": "Chinese Academy of Sciences CNIC CSTR",
	"creator": "cheney",
	"target": "^https?://www\\.cstr\\.cn/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 97,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-11 08:00:39"
}
function detectSearch(item) {
	return !!item.CSTR;
}
function doSearch(item) {
	let url;
	if (item.CSTR) {
		url = "https://www.cstr.cn/openapi/v2/pid-cstr-service/detail?identifier=" + item.CSTR;
	}
	else if (item.query) {
		url = "https://www.cstr.cn/openapi/v2/pid-common-service/statistics/metadata.search.aggregation?page=1&size=10&query=" + encodeURIComponent(item.query);
	}
	Z.debug(url);
	ZU.doGet(url, parseJSON);
}
function detectWeb(doc, url) {
	var searchRe = /^https?:\/\/(?:([^.]+\.))?(?:cstr\.cn)\/(?:search\/cstrDetail\/).*/;
	if (searchRe.test(url)) {
		return "journalArticle";	
	}
	else {
		return "multiple";
	}
}
// 解析页面元素获取元数据项目
function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		var rows = doc.querySelectorAll('a.identifier');
		if(rows){
			var urls = [];
			for (var i = 0; i < rows.length; i++) {
				var id = rows[i].href.replace(/^https?:\/\/(?:([^.]+\.))?(?:cstr\.cn)\//,"");
				urls.push('https://www.cstr.cn/openapi/v2/pid-cstr-service/detail?identifier=' + encodeURIComponent(id)
				);
			}
			if(urls && urls.length > 0){
				ZU.doGet(urls, parseJSON);
			}
		}		
	}
	else {
		var id = doc.querySelector('a.identifier');		
		if (id) {
			id = id.innerText.replace(/^CSTR:\s*|v\d+|\s+.*$/ig, '');
			var apiurl = 'https://www.cstr.cn/openapi/v2/pid-cstr-service/detail?identifier=' + encodeURIComponent(id);
			ZU.doGet(apiurl, parseJSON);
		}else{
			if (!id) throw new Error('Could not find CSTR ID on page.');
		}
	}
}
function parseJSON(text) {
	var obj = JSON.parse(text);
	var code = obj.code;
	if(code == 200){
		var newItem = new Zotero.Item("journalArticle");
		var content = obj.data.content;
		newItem.title = content.resourceChineseName;
		var identifier = content.identifier;
		var creators = content.creators;
		if (creators && creators.length) {
			// arXiv.org format
			for(var i =0 ; i<creators.length; i++){
				// var creator_name = ZU.xpathText(creator, './/creator_name_cn').trim();
				newItem.creators.push(
					ZU.cleanAuthor(creators[i].creatorNameCN, "author", true)
				);
			}
		}
		newItem.date = content.publicationDate;
		var description = content.descriptionCN;
		newItem.abstractNote = ZU.trimInternal(description);
		newItem.notes.push({ note: identifier });
		newItem.extra = identifier;
		newItem.url = "https://cstr.cn/"+identifier;
		newItem.publicationTitle = identifier+ " " + content.submitOrgName;
		var subjects = content.subjectClassifications;
		for (let j = 0; j < subjects.length; j++) {
			var subject = subjects.keyWordsCN;
			newItem.tags.push({ tag: subject });
		}
	}	
	// retrieve and supplement publication data for published articles via DOI
// 	if (newItem.DOI) {
// 		var translate = Zotero.loadTranslator("search");
// 		// CrossRef
// 		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
		
// 		var item = { itemType: "journalArticle", DOI: newItem.DOI };
// 		translate.setSearch(item);
// 		translate.setHandler("itemDone", function (obj, item) {
// 			// Z.debug(item)
// 			newItem.volume = item.volume;
// 			newItem.issue = item.issue;
// 			newItem.pages = item.pages;
// 			newItem.date = item.date;
// 			newItem.ISSN = item.ISSN;
// 			if (item.publicationTitle) {
// 				newItem.publicationTitle = item.publicationTitle;
// 				newItem.journalAbbreviation = item.journalAbbreviation;
// 			}
// 			newItem.date = item.date;
// 		});
// 		translate.setHandler("done", function () {
// 			newItem.complete();
// 		});
// 		translate.setHandler("error", function () {});
// 		translate.translate();
// 	}
// 	else {
		newItem.complete();
// 	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cstr.cn/search/cstrDetail/?cstr=CSTR%3A31253.11.SCIENCEDB.170.25",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "松嫩平原黑土区土壤养分动态变化数据集",
				"creators": [],
				"date": "2020-08-07",
				"abstractNote": "土壤养分的平衡及可持续利用是保持和提高土壤肥力的关键。本数据集基于近5年（1990-1994）长期定位观测研究成果，进行数据资源归并整合，涉及松嫩平原黑土区养分收支平衡状况、养分供给能力等相关数据内容，包括土壤有机质、全量养分和速效养分等信息，集中展示了施肥处理、种植模式和轮作方式下黑土区土壤养分动态变化特征。本数据集预期能够为东北黑土保护与永续利用提供数据支撑。",
				"extra": "CSTR:31253.11.SCIENCEDB.170.25",
				"libraryCatalog": "Chinese Academy of Sciences CNIC CSTR",
				"publicationTitle": "CSTR:31253.11.SCIENCEDB.170.25 科学数据银行",
				"url": "https://cstr.cn/CSTR:31253.11.SCIENCEDB.170.25",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "CSTR:31253.11.SCIENCEDB.170.25"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"CSTR": "31253.11.sciencedb.01092"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A bimodal burst energy distribution of a repeating fast radio burst source",
				"creators": [],
				"date": "2021-08-20",
				"abstractNote": "<p>A bimodal burst energy distribution of a repeating fast radio burst source</p><p><br></p><p>We have been carrying out a continuous monitoring campaign of FRB~121102 with the Five-hundred-meter Aperture Spherical radio Telescope (FAST\\cite{li18}) since August 2019. Between August 29 and October 29, 2019, we detected 1652 independent burst events (see Supplementary Table 1) in a total of 59.5 hours, covering 1.05 GHz to 1.45 GHz with 98.304 $\\mu$s sampling and 0.122 MHz frequency resolution. The total number of previously published bursts from this source was 347 (http://www.frbcat.org). The flux limit of this burst sample is at least three times lower than those of previous observations. The cadence and depth of the observations allow for a statistical study of the repeating bursts, revealing several previously unseen characteristics. The burst rate peaked at 122/hr on September 7th and then 117/hr on October 1st, both measured over the respective one-hour session. In both instances, the burst rate dropped precipitously afterwards. Burst energies vs. epoch are shown in the lower left and the energy histogram on the right, showing bimodality that is itself a function of epoch.</p><p><br></p><p>Table format:</p><p>Burst ID | Burst timea(MJD) | DM(pc cm-3) | Width(ms) | Bandwidthb(GHz) | Peak Flux(mJy) | Fluence(Jy ms) | Energy(erg)</p><p><br></p><p># Uncertainties in parentheses refer to the last quoted digit.</p><p>a) Arrival time of burst peak at the solar system barycenter, after correcting to the frequency of 1.5GHz.</p><p>b) A conservative 30$\\%$ fractional error is assumed.</p>",
				"extra": "CSTR:31253.11.SCIENCEDB.01092",
				"libraryCatalog": "Chinese Academy of Sciences CNIC CSTR",
				"publicationTitle": "CSTR:31253.11.SCIENCEDB.01092 科学数据银行",
				"url": "https://cstr.cn/CSTR:31253.11.SCIENCEDB.01092",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "CSTR:31253.11.SCIENCEDB.01092"
					}
				],
				"seeAlso": []
			}
		]
	}
]

/** END TEST CASES **/
