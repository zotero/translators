{
	"translatorID": "79b0c34b-78cc-46e8-9087-bcbc3a2eb7eb",
	"label": "CANLII (French)",
	"creator": "Marc Lajoie",
	"target": "^https?://(www\\.)?canlii\\.org.*/fr/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-06-08 10:57:58"
}

var canLiiRegexp = /https?:\/\/(www\.)?canlii\.org\/.*fr\/[^\/]+\/[^\/]+\/doc\/.+/;

function detectWeb(doc, url) {

	if (canLiiRegexp.test(url)) {
		return "case";
	} else {
		var aTags = doc.getElementsByTagName("a");
		for (var i = 0; i < aTags.length; i++) {
			if (canLiiRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
}


function scrape(doc, url) {

	var newItem = new Zotero.Item("case");
	//Xpath request to catch all the information describing the decision
	//var voliss = ZU.xpathText(doc, '//table/tbody/tr[2]/td[2]');
	//var voliss=ZU.xpathText(doc, '//table/tbody/tr/td[contains(@class, "canlii-label")]/following-sibling::td');
	var voliss=ZU.xpathText(doc, '//table/tbody/tr/td[contains(@class, "canlii-label documentMeta-citation")]/following-sibling::td');
	
	
	//Z.debug("voliss :("+voliss+")");
	
	// REGEX to catch the information relating to the item casename
	/* Here we find a casename that ends with ")" For example : 
	Suttie c. Canada (Procureur général)*/
	
	var basename = voliss.match(/.+?\)/)[0].trim();
	/* Here we find a casename that ends with "," For example :
	Première Nation Huronne-Wendat c. Canada,*/
	var basename2 = voliss.match(/.+?,/)[0].trim();
	//Z.debug("basename: ("+basename+")");
	//Z.debug("basename2: ("+basename2+")");
	/*Here we test wether the casename found that ends with a comma contains the word "CanLii"
	For example : Première Nation Huronne-Wendat c. Canada, 2014 CF 91 (CanLII) In that case 
	we use the var basename2 for the casename*/
	if (basename.contains("CanLII")){
		var basename2=basename2.replace(/(\r\n|\n|\r)/gm,"").replace(/\)?,/,"").trim();
		var casename = basename2;
		/* Here we split the result of our xpath request using a comma.The reference of the decision 
	will then be found in the second instance of the split "wordref[1]"*/ 
		var wordsref = voliss.split(/,/g);
	} else {
	/* Here we split the result of our xpath request using the closing ")" The reference of the decision 
	will then be found in the second instance of the split "wordref[1]"*/
	var wordsref = voliss.split(/\),/g);
	var basename=basename.replace(/(\r\n|\n|\r)/gm,"").replace(/\),/,"\)").trim();
	var casename = basename;
	}
	//Z.debug("basename: ("+basename+")");
	//Z.debug("basename2: ("+basename2+")");
	
	// Xpath request to find the url of the decision
	var shorturl = ZU.xpathText(doc, '//span[contains(@class, "documentStaticUrl")]');
	
	//Z.debug("basename :("+basename+")");
	//Z.debug("voliss :("+voliss+")");
	//Z.debug("wordsref[0]: ("+wordsref[0]+")");
	//Z.debug("wordsref[1]: ("+wordsref[1]+")");
	//Z.debug("wordsref[2]: ("+wordsref[2]+")");
	//Z.debug("shorturl[0]: ("+shorturl[0]+")");
	//var shorturl=shorturl[0].replace(/\</,"").replace(/\s/g,"");
	//Z.debug("shorturl: ("+shorturl+")")
	newItem.url=shorturl;
	var wordreporter = wordsref[1].split(/,/g);
	//Here we assign the variable court to the result of the split we have selected (wordref[1]) 
	var court = wordsref[1];
	//Z.debug ("wordreporter[0]: ("+wordreporter[0]+")");
	//Z.debug ("wordreporter[1]: ("+wordreporter[1]+")");
	


	//Z.debug("voliss: ("+voliss+")")
	//Z.debug("casename: ("+casename+")");
	

	//Z.debug("court: ("+court+")");

	var reportvl = voliss.match(/\]\s*\d+/);
	//Z.debug("reportvl: ("+reportvl+")");
	var reporter = voliss.match(/\]\s*\d+\s*[A-Z]+/);
	//Z.debug("reporter: ("+reporter+")");
	var reporterpg = voliss.match(/\]\s*\d+\s*[A-Z]+\s*\d+/);
	//Z.debug("reporterpg: ("+reporterpg+")");
	
	/* Here we test if there is a neutral reference in the citation, if so we set 
	all the values relating to a reporter to null*/
	if(wordreporter[1]){
		var court=wordreporter[1];
		var reportvl="";
		var reporter="";
		var reporterpg="";
	}
	//Here we further split with a space the variable court 
	var page = court.split(/\s/g);
	//Z.debug("page: ("+page+")");
	//Z.debug("page[0]: ("+page[0]+")");
	//Z.debug("page[1]: ("+page[1]+")");
	//Z.debug("page[2]: ("+page[2]+")");
	//Z.debug("page[3]: ("+page[3]+")");
	//Z.debug("page[4]: ("+page[4]+")");
	//Z.debug("page[5]: ("+page[5]+")");
	
	var dateDocket = ZU.xpathText(doc, '/html/body/div/div[2]/div/div/div/table/tbody/tr/td[2]');

	newItem.caseName = newItem.title = casename;
	
	/*In french when the neutral reference is not available the court item is at the end 
	and CanLII between the year and the first page.
	Here we test this and switch between court in the middle and court at the end*/

	if(page[5] === undefined){
		page[5]="";
		newItem.extra=page[4]+")";
	} else {
		newItem.extra=page[4]+" "+page[5]+")";
	}
	
	//Z.debug("page[5]: ("+page[5]+")");
	
	newItem.court=page[2];
	
	if (reporter) newItem.reporter = reporter[0].replace(/\]\s*\d+\s*/, "");

	if (dateDocket){
		var date = dateDocket.match(/\d{4}-\d{2}-\d{2}/);
		if (date) newItem.dateDecided = date[0];
		var docket = ZU.trimInternal(dateDocket).match(/\(Dossier\s?:(.+?)\)/);
		if (docket) newItem.docketNumber = docket[1];
	}
	newItem.firstPage = page[3];
	
	
	if (reportvl) newItem.reporterVolume = reportvl[0].replace(/\]\s*/, "");

	// attach link to pdf version
	// Important notice : the PDF will not attach if the search bar is not activated in CanLII
	//Z.debug(url)
	var pdfurl = url.replace(/\.html.+/, ".pdf");
	if (pdfurl) {
		newItem.attachments = [{
			url: pdfurl,
			title: "CanLII Texte intégral PDF",
			mimeType: "application/pdf"
		}];
	}
	newItem.attachments.push({
		document: doc,
		title: "CanLII Snapshot",
		mimeType: "text/html"
	});
	newItem.complete();
}

function doWeb(doc, url) {

	if (canLiiRegexp.test(url)) {
		scrape(doc, url);
	} else {

		var items = Zotero.Utilities.getItemArray(doc, doc, canLiiRegexp);
		var articles = [];
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape);
		});
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.canlii.org/fr/ca/csc/nav/date/2010_01.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.canlii.org/fr/ca/csc/doc/2010/2010csc2/2010csc2.html",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "CanLII Texte intégral PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"url": "http://canlii.ca/t/27jms",
				"title": "Mines Alerte Canada c. Canada (Pêches et Océans)",
				"caseName": "Mines Alerte Canada c. Canada (Pêches et Océans)",
				"extra": "(CanLII)",
				"court": "CSC",
				"dateDecided": "2010-01-21",
				"docketNumber": "32797",
				"firstPage": "2",
				"libraryCatalog": "CANLII (French)"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.canlii.org/fr/ca/cfpi/doc/2011/2011cf119/2011cf119.html?searchUrlHash=AAAAAQAGU3V0dGllAAAAAAE",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "CanLII Texte intégral PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Suttie c. Canada (Procureur Général)",
				"caseName": "Suttie c. Canada (Procureur Général)",
				"court": "CF",
				"dateDecided": "2011-02-02",
				"docketNumber": "T-1089-10",
				"firstPage": "119",
				"url": "http://canlii.ca/t/fks9z",
				"extra": "(CanLII)",
				"libraryCatalog": "CANLII (French)"
			}
		]
	}
]
/** END TEST CASES **/