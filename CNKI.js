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
	"lastUpdated": "2023-11-27 05:30:22"
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
	var translator = Z.loadTranslator('import');
	translator.setTranslator('1a3506da-a303-4b0a-a1cd-f216e6138d86'); // RefWorks Tagged
	translator.setString(toStdRef(reftext));
	
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
		if (extraData) {
			newItem.url = extraData.url;
		}
		else {
			newItem.url = id.url;
		}

		// CN 中国刊物编号，非refworks中的callNumber
		// CN in CNKI refworks format explains Chinese version of ISSN
		if (newItem.callNumber) {
		//	newItem.extra = 'CN ' + newItem.callNumber;
			newItem.callNumber = "";
		}
		// don't download PDF/CAJ on searchResult(multiple)
		var webType = detectWeb(doc, id.url);
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
	}
]
/** END TEST CASES **/
