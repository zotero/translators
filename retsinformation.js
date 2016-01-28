{
	"translatorID": "feef66bf-4b52-498f-a586-8e9a99dc07a0",
	"label": "Retsinformation",
	"creator": "Roald Frøsig",
	"target": "^https?://(?:www\\.)?retsinformation\\.dk/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2016-01-27 14:38:37"
}

function detectWeb(doc, url){
	if (ZU.xpathText(doc, '//div[@class="wrapper2"]/table[@id="ctl00_MainContent_ResultGrid1"]')) {
		return "multiple";
	} else if (url.indexOf("R0710") != -1) {
		threeLetters = getKortNavn(doc, url)[0].substr(0,3);
		if (/(DOM|AFG|KEN|UDT)/.test(threeLetters)) {
			return "case";
		};
		if (/(EDP|ISP|FOU)/.test(threeLetters)) {
			return "report";
		};
		if (/\d{3}/.test(threeLetters)) {
			return "bill";
		} else return "statute";
	} else return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		Z.debug("L26"+url);
		Z.debug("L27"+url.match("R0700.aspx\\?r"));
		if (url.match(/(R0900|R0920|R0930)/)) {
			var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[1]/a[1]');
		} else if (url.match(/(R0210|R0310)/)) {
			var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[2]/a[1]');
		} else if (url.match("R0700.aspx\\?res")) {
			Z.debug("L132"+url);
			var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[3]/a[1]');
		} else if (url.match(/(R0220|R0415|R0700)/)) {
			var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[4]/a[1]');
		}
		for (i = 0; i < titles.length; i++) {
			items[titles[i].href] = clean(titles[i].text);
		}
		Z.selectItems(items, function(selectedItems) {
			if (!selectedItems) return true;
			var urls = new Array();
			for (var i in selectedItems) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url);
	};
}

function clean(text) {
	text = text.replace(/\n/g," ");
	text = text.replace(/ +/g," ");
	text = text.trim();
	return text;
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);
	Z.debug("L91"+type);
	var newItem = new Zotero.Item(type);
	newItem.title = getTitle(doc, url);
	newItem.url = url;
	if (type=="statute") {
		newItem.nameOfAct = newItem.title
		newItem.codeNumber = getKortNavn(doc, url)[0];
		newItem.publicLawNumber = newItem.codeNumber;
		newItem.dateEnacted = getKortNavn(doc, url)[1];
		newItem.shortTitle = getRessort(doc, url)[0];
		if (/L(BK|OV)/.test(newItem.publicLawNumber.substr(0,3))) {
			Zotero.debug("LOV eller LBK");
		} else {
			newItem = addAuthor (newItem, getRessort(doc, url)[1]);
		};
	} else if (type=="case") {
		newItem.caseName = newItem.title
		newItem = addAuthor (newItem, getRessort(doc, url)[1]);		
		newItem.docketNumber = getKortNavn(doc, url)[0];
		newItem.dateDecided = getKortNavn(doc, url)[1];
		newItem.shortTitle = getRessort(doc, url)[0];
	} else if (type=="report") {
		newItem = addAuthor (newItem, getRessort(doc, url)[1]);
		newItem.date = getRessort(doc, url)[2];
		newItem.institution = "Folketinget";
		threeLetters = getKortNavn(doc, url)[0].substr(0,3);
		if (threeLetters=="EDP") {
			newItem.seriesTitle = "Folketingets Ombudsmands driftundersøgelser";
		} else if (threeLetters=="ISP") {
			newItem.seriesTitle = "Folketingets Ombudsmands Inspektioner";
		} else if (threeLetters=="FOU") {
			newItem.seriesTitle = "Folketingets Ombudsmands udtalelser";
		};
		newItem.reportNumber = getKortNavn(doc, url)[0];
	} else if (type=="bill") {
		newItem = addAuthor (newItem, getRessort(doc, url)[1]);
		newItem.billNumber = getKortNavn(doc, url)[0];
		newItem.date = getRessort(doc, url)[2];
	} else {
		return;
	};
	newItem.complete();
	return;
}

function getTitle (doc, url) {
	var myXPath = '//div[@class="wrapper2"]/div/p[@class="Titel2"]';
	title = ZU.xpathText(doc, myXPath);
	if (!title) {
		myXPath = '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]/p[@class="Titel"]';
		title = ZU.xpathText(doc, myXPath);
	};
	if (!title) {
		myXPath = '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]/font/p[@align="CENTER"]';
		title = ZU.xpathText(doc, myXPath);
	};
	if (!title) {
		myXPath = '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]/h1[@class="TITLE"]';
		title = ZU.xpathText(doc, myXPath);
	};
	if (!title) {
		myXPath = '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]/center/h1[@class="TITLE"]';
		title = ZU.xpathText(doc, myXPath);
	};
	if (!title) {
		var myXPath = '/html/head/title';
		title = ZU.xpathText(doc, myXPath);
		title = title.substring(0,title.lastIndexOf("-"));
		if (getRessort(doc, url)[0]) {
			title = title.substring(getRessort(doc, url)[0].length+4,title.length);
		};
	};
	title = clean(title);
	Z.debug("L111"+title);
	return title;
}

function getKortNavn (doc, url) {
	var myXPath = '//span[@class="kortNavn"]';
	if (!ZU.xpathText(doc, myXPath)) {
		myXPath = '//span[@class="kortNavn historisk"]';
	};
	infoArray = ZU.xpathText(doc, myXPath);
	infoArray = infoArray.replace(/ (Gældende|Historisk)/,"");
	infoArray = infoArray.split(" af ");
	return infoArray;
}

function getRessort (doc, url) {
	var myXPath = '//div[@class="ressort"]';
	fodder = ZU.xpathText(doc, myXPath);
	fodder = fodder.trim();
	if (fodder.slice(0,1) == "(") {
		infoArray[0] = fodder.substr(1,fodder.indexOf(")")-1);
	} else {
		infoArray[0] = "";
	};
	pubDate = fodder.search(/\d{2}\-\d{2}\-\d{4}/);
	infoArray[1] = fodder.substring(pubDate+10,fodder.length);
	infoArray[2] = fodder.substr(pubDate,10);
	Zotero.debug("L140"+infoArray);
	return infoArray;
}

function addAuthor (item, author) {
	item.creators[0] = {};
	item.creators[0].creatorType = "author";
	item.creators[0].lastName = author;
	item.creators[0].fieldMode = 1;
	return item;
}
