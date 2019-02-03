{
	"translatorID": "5c95b67b-41c5-4f55-b71a-48d5d7183063",
	"label": "CNKI",
	"creator": "Aurimas Vinckevicius",
	"target": "^https?://([^/]+\\.)?cnki\\.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2018-09-08 22:09:39"
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

// fetches Refworks record for provided IDs and calls next with resulting text
// ids should be in the form [{dbname: "CDFDLAST2013", filename: "1013102302.nh"}]
function getRefworksByID(ids, next) {
	var postData = "";
	for (var i=0, n=ids.length; i<n; i++) {
		postData += ids[i].dbname + "!" + ids[i].filename + "!0!0,";
	}
	postData = "formfilenames=" + encodeURIComponent(postData);
	
	ZU.doPost('http://epub.cnki.net/kns/ViewPage/viewsave.aspx?TablePre=SCDB', postData, function() {
		ZU.doPost(
			'http://epub.cnki.net/KNS/ViewPage/SaveSelectedNoteFormat.aspx?type=txt',
			'CurSaveModeType=REFWORKS',
			function(text) {
				//fix item types
				text = text.replace(/^RT\s+Dissertation\/Thesis/gmi, 'RT Dissertation')
					//Zotero doesn't do well with mixed line endings. Make everything \n
					.replace(/\r\n?/g, '\n')
					//split authors
					.replace(/^(A[1-4]|U2)\s*([^\r\n]+)/gm, function(m, tag, authors) {
						var authors = authors.split(/\s*[;，,]\s*/); //that's a special comma
						if (!authors[authors.length-1].trim()) authors.pop();
						
						return tag + ' ' + authors.join('\n' + tag + ' ');
					});

				next(text);
			}
		);
	});
}

function getIDFromURL(url) {
	if (!url) return;
	
	var dbname = url.match(/[?&]dbname=([^&#]*)/i);
	var filename = url.match(/[?&]filename=([^&#]*)/i);
	if (!dbname || !dbname[1] || !filename || !filename[1]) return;
	
	return {dbname: dbname[1], filename: filename[1], url: url};
}

function getIDFromPage(doc, url) {
	return getIDFromURL(url)
		|| getIDFromURL(ZU.xpathText(doc, '//div[@class="zwjdown"]/a/@href'));
}

function getTypeFromDBName(dbname) {
	switch (dbname.substr(0,4).toUpperCase()) {
		case "CJFQ":
		case "CJFD":
		case "CAPJ":
			return "journalArticle";
		case "CDFD":
		case "CMFD":
		case "CLKM":
			return "thesis";
		case "CPFD":
			return "conferencePaper";
		case "CCND":
			return "newspaperArticle";
		default:
			return;
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
	if (!links.length) return;
	
	var items = {};
	var count = 0;
	for (var i=0, n=links.length; i<n; i++) {
		var a = ZU.xpath(links[i], aXpath)[0];
		var title = ZU.xpathText(a, './node()[not(name()="SCRIPT")]', null, '');
		if (title) title = ZU.trimInternal(title);
		var id = getIDFromURL(a.href);
		if (!title || !id) continue;
		
		count++;
		if (itemInfo) {
			itemInfo[a.href] = {id: id};
			
			/*var pdfLink = ZU.xpath(links[i], './/a[@class="brief_downloadIcon"]')[0];
			if (pdfLink) itemInfo[a.href].pdfURL = pdfLink.href;*/
		}
		items[a.href] = title;
	}
	
	if (count) return items;
}

function detectWeb(doc, url) {
	var id = getIDFromPage(doc, url);
	Z.debug(id);
	if (id) {
		return getTypeFromDBName(id.dbname);
	}
	
	var items = getItemsFromSearchResults(doc, url);
	if (items) return "multiple";
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var itemInfo = {};
		var items = getItemsFromSearchResults(doc, url, itemInfo);
		Z.selectItems(items, function(selectedItems) {
			if (!selectedItems) return true;
			
			var itemInfoByTitle = {};
			var ids = [];
			for (var url in selectedItems) {
				ids.push(itemInfo[url].id);
				itemInfoByTitle[selectedItems[url]] = itemInfo[url];
				itemInfoByTitle[selectedItems[url]].url = url;
			}
			scrape(ids, doc, url, itemInfoByTitle);
		});
	} else {
		scrape([getIDFromPage(doc, url)], doc, url);
	}
}

function scrape(ids, doc, url, itemInfo) {
	getRefworksByID(ids, function(text) {
		Z.debug(text);
		var translator = Z.loadTranslator('import');
		translator.setTranslator('1a3506da-a303-4b0a-a1cd-f216e6138d86'); //Refworks
		text = text.replace(/IS (\d+)\nvo/, "IS $1\nVO");
		translator.setString(text);
		
		var i = 0;		
		translator.setHandler('itemDone', function(obj, newItem) {
			//split names
			for (var i=0, n=newItem.creators.length; i<n; i++) {
				var creator = newItem.creators[i];
				if (creator.firstName) continue;
				
				var lastSpace = creator.lastName.lastIndexOf(' ');
				if (creator.lastName.search(/[A-Za-z]/) !== -1 && lastSpace !== -1) {
					//western name. split on last space
					creator.firstName = creator.lastName.substr(0,lastSpace);
					creator.lastName = creator.lastName.substr(lastSpace+1);
				} else {
					//Chinese name. first character is last name, the rest are first name
					creator.firstName = creator.lastName.substr(1);
					creator.lastName = creator.lastName.charAt(0);
				}
			}
			
			if (newItem.abstractNote) {
				newItem.abstractNote = newItem.abstractNote.replace(/\s*[\r\n]\s*/g, '\n');
			}
			
			//clean up tags. Remove numbers from end
			for (var i=0, n=newItem.tags.length; i<n; i++) {
				newItem.tags[i] = newItem.tags[i].replace(/:\d+$/, '');
			}
			
			newItem.title = ZU.trimInternal(newItem.title);
			if (itemInfo) {
				var info = itemInfo[newItem.title];
				if (!info) {
					Z.debug('No item info for "' + newItem.title + '"');
				} else {
					/*if (!info.pdfURL) {
						Z.debug('No PDF URL passed from multiples page');
					} else {
						newItem.attachments.push({
							title: 'Full Text PDF',
							mimeType: 'application/pdf',
							url: info.pdfURL
						})
					}*/
					
					newItem.url = info.url;
				}
			} else {
				newItem.url = url;
			}
			
			i++;
			newItem.complete();
		});
		
		translator.translate();
	})
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFQ&dbname=CJFDLAST2015&filename=SPZZ201412003&v=MTU2MzMzcVRyV00xRnJDVVJMS2ZidVptRmkva1ZiL09OajNSZExHNEg5WE5yWTlGWjRSOGVYMUx1eFlTN0RoMVQ=",
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
				"callNumber": "21-1185/O6",
				"issue": "12",
				"language": "中文;",
				"libraryCatalog": "CNKI",
				"pages": "1306-1312",
				"publicationTitle": "色谱",
				"url": "http://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=CJFQ&dbname=CJFDLAST2015&filename=SPZZ201412003&v=MTU2MzMzcVRyV00xRnJDVVJMS2ZidVptRmkva1ZiL09OajNSZExHNEg5WE5yWTlGWjRSOGVYMUx1eFlTN0RoMVQ=",
				"volume": "32",
				"attachments": [],
				"tags": [
					{
						"tag": "Astragalus"
					},
					{
						"tag": "characterization"
					},
					{
						"tag": "hydrophilic interaction liquid chromatography(HILIC)mass spectrometry(MS)"
					},
					{
						"tag": "partial acid hydrolysis"
					},
					{
						"tag": "polysaccharides"
					},
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
	}
]
/** END TEST CASES **/
