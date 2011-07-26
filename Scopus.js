{
	"translatorID": "a14ac3eb-64a0-4179-970c-92ecc2fec992",
	"label": "Scopus",
	"creator": "Michael Berkowitz, Rintze Zelle and Avram Lyon",
	"target": "http://[^/]*www.scopus.com[^/]*",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2011-07-26 12:36:28"
}

function detectWeb(doc, url) {
	if (url.indexOf("/results/") != -1) {
		return "multiple";
	} else if (url.indexOf("/record/") != -1) {
		return "journalArticle";
	}
}

function getEID(url) {
	return url.match(/eid=([^&]+)/)[1];
}

function returnURL(eid, base) {
	return base + 'citation/output.url?origin=recordpage&eid=' + eid + '&src=s&view=FullDocument&outputType=export';
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null;

	var base = "http://www.scopus.com/";

	// We're breaking proxy support by constructing URLs the way we do, so let's get
	// the real base URL we need to use. This is a hack.
	base = url.match(/^https?:\/\/[^\/]*\//)[0];
	Zotero.debug(base);

	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		items = new Object();
		var boxes = doc.evaluate('//div[@id="resultsBody"]/table/tbody/tr[@class and (not(@id) or not(contains(@id,"previewabstractrow")))]/td[@class="fldtextPad"][1]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var box;
		while (box = boxes.iterateNext()) {
			var link = doc.evaluate('.//a', box, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
			items[link.href] = Zotero.Utilities.trimInternal(link.textContent);
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(returnURL(getEID(i), base));
		}
	} else {
		articles = [returnURL(getEID(url), base)];
	}
	Zotero.Utilities.doGet(articles, function(text, obj) {
		var stateKey = text.match(/<input[^>]*name="stateKey"[^>]*>/);
		if (!stateKey) Zotero.debug("No stateKey");
		else stateKey = stateKey[0].match(/value="([^"]*)"/)[1];
		var eid = text.match(/<input[^>]*name="eid"[^>]*>/);
		if (!eid) Zotero.debug("No eid");
		else eid = eid[0].match(/value="([^"]*)"/)[1];
		var get = base+'citation/export.url';
		var post = 'origin=recordpage&sid=&src=s&stateKey=' + stateKey + '&eid=' + eid + '&sort=&exportFormat=RIS&view=CiteAbsKeyws&selectedCitationInformationItemsAll=on';
		var rislink = get + "?" + post;	
		Zotero.Utilities.HTTP.doGet(rislink, function(text) {
			// load translator for RIS
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				if (item.notes[0]['note']) {
					item.abstractNote = item.notes[0]['note'];
					item.notes = new Array();
					item.complete();
				}
			});
			translator.translate();
		});
	}, function() {Zotero.done();});
	Zotero.wait();
}
