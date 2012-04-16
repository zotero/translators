{
	"translatorID": "0863b8ec-e717-4b6d-9e35-0b2db2ac6b0f",
	"label": "Institute of Pure and Applied Physics",
	"creator": "Michael Berkowitz",
	"target": "^https?://(jjap|apex|jpsj)\\.(ipap|jsap)\\.jp/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-03-07 17:46:37"
}

function detectWeb(doc, url) {
	if (doc.title.indexOf("Table of Contents") != -1 || doc.title.indexOf("Search Result") != -1) {
		return "multiple";
	} else if (url.indexOf("link?") != -1) {
		return "journalArticle";
	}
}

var journalNames = {
	jpsj: ["Journal of the Physical Society of Japan", "0031-9015"],
	jjap: ["Japanese Journal of Applied Physics", "0021-4922"],
	apex: ["Applied Physics Express", "1882-0778"]
}

function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		if (doc.title.toLowerCase().indexOf("table of contents") != -1) {
			if (url.match(/apex/)) {
				var titlesx = '//div[@id="contents"]/dl/dt';
				var linksx = '//div[@id="contents"]/dl/dd/a[1]';
			} else if (url.match(/jjap/)) {
				//var xpath = '/html/body/dt/a';
				var titlesx = '//div[@id="contents"]//dl/dt/b';
				var linksx = '//div[@id="contents"]//dl/dd/a[1]';
			} else if (url.match(/jpsj/)) {
				var xpath = '/html/body/dl/dt/a[contains(@href, "link")]';
			}
		} else if (doc.title.toLowerCase().indexOf("search result") != -1) {
			var linksx = '/html/body//li/a';
			var titlesx = '/html/body//li//dt/b';
		}
		if (xpath) {
			var titles = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
			var title;
			while (title = titles.iterateNext()) {
				items[title.href] = Zotero.Utilities.trimInternal(title.textContent);
			}
		} else {
			var titles = doc.evaluate(titlesx, doc, null, XPathResult.ANY_TYPE, null);
			var links = doc.evaluate(linksx, doc, null, XPathResult.ANY_TYPE, null);
			var title;
			var link;
			while ((title = titles.iterateNext()) && (link = links.iterateNext())) {
				items[link.href] = Zotero.Utilities.trimInternal(title.textContent);
			}
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				arts.push(i);
			}
			Zotero.Utilities.processDocuments(arts, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("journalArticle");
	item.url = doc.location.href;
	var jour = item.url.match(/http:\/\/([^.]+)\./)[1];
	item.publicationTitle = journalNames[jour][0];
	item.ISSN = journalNames[jour][1];
	item.title = Zotero.Utilities.trimInternal(doc.evaluate('//h2[@class="title"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
	var authors = doc.evaluate('//p[@class="author"]/a', doc, null, XPathResult.ANY_TYPE, null);
	while (aut = authors.iterateNext()) {
		item.creators.push(Zotero.Utilities.cleanAuthor(aut.textContent, "author"));
	}
	//get info
	var infos = doc.evaluate('//p[@class="info"]', doc, null, XPathResult.ANY_TYPE, null);
	var voliss = infos.iterateNext().textContent;
	var keys = infos.iterateNext().textContent;
	if (voliss.match(/([^\d]+)(\d+)\s+\((\d+)\)\s+([\d\-]+)/)) {
		voliss = voliss.match(/([^\d]+)(\d+)\s+\((\d+)\)\s+([\d\-]+)/);
		var x = 4
	} else {
		voliss = voliss.match(/([^\d]+)(\d+)\s+\((\d+)\)\s+(pp\.)?\s+(\S+)/);
		var x = 5
	}
	item.journalAbbreviation = Zotero.Utilities.trimInternal(voliss[1]);
	item.volume = voliss[2];
	item.date = voliss[3];
	item.pages = voliss[x];

	keys = Zotero.Utilities.trimInternal(keys);
	if (keys.match(/KEYWORDS/)) {
		keys = keys.match(/KEYWORDS:\s+(.*)URL:\s+(.*)DOI:\s+(.*)$/);
		var a = 1;
		var c = 3;
	} else {
		keys = keys.match(/URL:\s+(.*)DOI:\s+(.*)$/);
		var c = 2;
	}
	if (a) {
		item.tags = keys[a].split(/,\s+/);
	}
	item.DOI = keys[c].replace(/PACS:\s+(.*)/, "");
	var abstracts = doc.evaluate('//p[@class="abstract"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (abstracts) {
		item.abstractNote = Zotero.Utilities.trimInternal(abstracts.textContent);
	}
	var pdfurl = doc.evaluate('//a[contains(text(), "PDF")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().href;
	item.attachments = [{
		url: item.url,
		title: "IPAP Snapshot",
		mimeType: "text/html"
	}, {
		url: pdfurl,
		title: "Full Text PDF",
		mimeType: "application/pdf"
	}];
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/",
	"items": [{
		"itemType": "journalArticle",
		"creators": [{
			"firstName": "Hyunho",
			"lastName": "Park",
			"creatorType": "author"
		}, {
			"firstName": "Kong-soo",
			"lastName": "Lee",
			"creatorType": "author"
		}, {
			"firstName": "Dohuyn",
			"lastName": "Baek",
			"creatorType": "author"
		}, {
			"firstName": "Juseong",
			"lastName": "Kang",
			"creatorType": "author"
		}, {
			"firstName": "Byungse",
			"lastName": "So",
			"creatorType": "author"
		}, {
			"firstName": "Seok Il",
			"lastName": "Kwon",
			"creatorType": "author"
		}, {
			"firstName": "Byoungdeok",
			"lastName": "Choi",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/",
			"title": "IPAP Snapshot",
			"mimeType": "text/html"
		}, {
			"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/pdf",
			"title": "Full Text PDF",
			"mimeType": "application/pdf"
		}],
		"url": "http://jjap.jsap.jp/link?JJAP/50/01AA01/",
		"publicationTitle": "Japanese Journal of Applied Physics",
		"ISSN": "0021-4922",
		"title": "Electrical Extractions of One Dimensional Doping Profile and Effective Mobility for Metal–Oxide–Semiconductor Field-Effect Transistors",
		"journalAbbreviation": "Jpn. J. Appl. Phys.",
		"volume": "50",
		"date": "2011",
		"pages": "01",
		"DOI": "10.1143/JJAP.50.01AA01",
		"abstractNote": "In this study, an attempt is made to provide a framework to assess and improve metal–oxide–semiconductor field-effect transistor (MOSFET) reliability from the early stage of the design to the completion of the product. A small gate area has very small capacitances that are difficult to measure, making capacitance–voltage (C–V) based techniques difficult or impossible. In view of these experimental difficulties, we tried electrical doping profiling measurement for MOSFET with short gate length, ultra thin oxide thickness and asymmetric source/drain structure and checked the agreement with simulation result. We could get the effective mobility by simple drain current versus drain bias voltage measurement. The calculated effective mobility was smaller than expected value and we explained some reasons. An accurate effective mobility for asymmetric source–drain junction transistor was successfully extracted by using the split C–V technique, with the capacitance measured between the gate and source–drain and between the gate and the substrate.",
		"libraryCatalog": "Institute of Pure and Applied Physics",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}, {
	"type": "web",
	"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/",
	"items": [{
		"itemType": "journalArticle",
		"creators": [{
			"firstName": "Ai",
			"lastName": "Yamakage",
			"creatorType": "author"
		}, {
			"firstName": "Kentaro",
			"lastName": "Nomura",
			"creatorType": "author"
		}, {
			"firstName": "Ken-Ichiro",
			"lastName": "Imura",
			"creatorType": "author"
		}, {
			"firstName": "Yoshio",
			"lastName": "Kuramoto",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/",
			"title": "IPAP Snapshot",
			"mimeType": "text/html"
		}, {
			"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/pdf",
			"title": "Full Text PDF",
			"mimeType": "application/pdf"
		}],
		"url": "http://jpsj.ipap.jp/link?JPSJ/80/053703/",
		"publicationTitle": "Journal of the Physical Society of Japan",
		"ISSN": "0031-9015",
		"title": "Disorder-Induced Multiple Transition Involving Z2 Topological Insulator",
		"journalAbbreviation": "J. Phys. Soc. Jpn.",
		"volume": "80",
		"date": "2011",
		"pages": "053703",
		"DOI": "10.1143/JPSJ.80.053703",
		"abstractNote": "Effects of disorder on two-dimensional Z2 topological insulator are studied numerically by the transfer matrix method. Based on the scaling analysis, the phase diagram is derived for a model of HgTe quantum well as a function of disorder strength and magnitude of the energy gap. In the presence of sz non-conserving spin–orbit coupling, a finite metallic region is found that partitions the two topologically distinct insulating phases. As disorder increases, a narrow-gap topologically trivial insulator undergoes a series of transitions; first to metal, second to topological insulator, third to metal, and finally back to trivial insulator. We show that this multiple transition is a consequence of two disorder effects; renormalization of the band gap, and Anderson localization. The metallic region found in the scaling analysis corresponds roughly to the region of finite density of states at the Fermi level evaluated in the self-consistent Born approximation. ©2011 The Physical Society of Japan",
		"libraryCatalog": "Institute of Pure and Applied Physics",
		"accessDate": "CURRENT_TIMESTAMP"
	}]
}]
/** END TEST CASES **/
