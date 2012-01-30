{
	"translatorID": "dede653d-d1f8-411e-911c-44a0219bbdad",
	"label": "GPO Access e-CFR",
	"creator": "Bill McKinney",
	"target": "^http://ecfr\\.gpoaccess\\.gov/cgi/t/text/text-idx.+",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:49:29"
}

function detectWeb(doc, url) {
	var re = new RegExp("^http://ecfr\.gpoaccess\.gov/cgi/t/text/text-idx");
	if(re.test(doc.location.href)) {
		return "statute";
	} else {
		return "multiple";
	}
}

function get_nextsibling(n)
  {
  var x=n.nextSibling;
  while (x.nodeType!=1)
   {
   x=x.nextSibling;
   }
  return x;
}
function scrape(doc) {

	var newItem = new Zotero.Item("statute");
	newItem.url = doc.location.href;
	var extraText = new String();
	var tmpSection = "";
	newItem.code = "Electronic Code of Federal Regulations";
	newItem.language = "en-us";

	var spanTags = doc.getElementsByTagName("span");
	for(var i=0; i<spanTags.length; i++) {
		if (spanTags[i].className == "mainheader") {
			var tmpStr = spanTags[i].innerHTML;
			tmpStr = tmpStr.replace(/\&nbsp;/g, " ");
			tmpStr = tmpStr.replace(/\&\#167;/g, "Sec.");
			newItem.codeNumber = tmpStr;
			newItem.title = "e-CFR: " + tmpStr;
		}
		if (spanTags[i].className == "div5head") {
			var tmpStr = spanTags[i].childNodes[0].innerHTML;
			tmpStr = tmpStr.replace(/\&nbsp;/g, " ");
			tmpStr = tmpStr.replace(/\&\#167;/g, "Sec.");
			tmpSection = tmpStr;
		}
	}

	var heading5Tags = doc.getElementsByTagName("h5");
	for(var i=0; i<heading5Tags.length; i++) {
		var tmpStr = heading5Tags[0].innerHTML;
		tmpStr = tmpStr.replace(/\&nbsp;/g, " ");
		tmpStr = tmpStr.replace(/\&\#167;/g, "Sec.");
		if (tmpSection != "") {
			tmpSection = tmpSection + " - ";
		}
		newItem.section = tmpSection + tmpStr;
		break;
	}

	// statutory source
	var boldTags = doc.getElementsByTagName("b");
	for(var i=0; i<boldTags.length; i++) {
		var s = new String(boldTags[i].innerHTML);
		if (s.indexOf("Source:") > -1) {
			newItem.history = "Source: " + boldTags[i].nextSibling.nodeValue;
		}
		if (s.indexOf("Authority:") > -1) {
			newItem.extra = "Authority: " + boldTags[i].nextSibling.nodeValue;
		}
	}

	newItem.complete();
}

function doWeb(doc, url) {
	var re = new RegExp("http://ecfr\.gpoaccess\.gov/cgi/t/text/text-idx.+");
	if(re.test(doc.location.href)) {
		scrape(doc);
	} else {
		var items = Zotero.Utilities.getItemArray(doc, doc,"http://ecfr\.gpoaccess\.gov/cgi/t/text/text-idx.+");
		items = Zotero.selectItems(items);

		if(!items) {
			return true;
		}

		var uris = new Array();
		for(var i in items) {
			uris.push(i);
		}

		Zotero.Utilities.processDocuments(uris, function(doc) { scrape(doc) },
			function() { Zotero.done(); }, null);

		Zotero.wait();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ecfr.gpoaccess.gov/cgi/t/text/text-idx?c=ecfr&sid=6744a4d5abb497d7b81f2f27a5248db6&rgn=div5&view=text&node=13:1.0.1.1.2&idno=13",
		"items": [
			{
				"itemType": "statute",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://ecfr.gpoaccess.gov/cgi/t/text/text-idx?c=ecfr&sid=6744a4d5abb497d7b81f2f27a5248db6&rgn=div5&view=text&node=13:1.0.1.1.2&idno=13",
				"code": "Electronic Code of Federal Regulations",
				"language": "en-us",
				"codeNumber": "Title 13: Business Credit and Assistance",
				"title": "e-CFR: Title 13: Business Credit and Assistance",
				"section": "PART 101—ADMINISTRATION",
				"extra": "Authority: \n  5 U.S.C. 552 and App. 3, secs. 2, 4(a), 6(a), and 9(a)(1)(T); 15 U.S.C. 633, 634, 687; 31 U.S.C. 6506; 44 U.S.C. 3512; 42 U.S.C. 6307(d); 15 U.S.C. 657h; E.O. 12372 (July 14, 1982), 47 FR 30959, 3 CFR, 1982 Comp., p. 197, as amended by E.O. 12416 (April 8, 1983), 48 FR 15887, 3 CFR, 1983 Comp., p. 186.",
				"history": "Source: \n  61 FR 2394, Jan. 26, 1996, unless otherwise noted.",
				"libraryCatalog": "GPO Access e-CFR",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "e-CFR"
			}
		]
	}
]
/** END TEST CASES **/