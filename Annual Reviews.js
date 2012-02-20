{
	"translatorID": "5f22bd25-5b70-11e1-bb1d-c4f24aa18c1e",
	"label": "Annual Reviews",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://[^/]*annualreviews\\.org(:[\\d]+)?(?=/)[^?]*(/(toc|journal|doi)/|showMost(Read|Cited)Articles|doSearch)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-02-20 03:54:19"
}

//add using BibTex
function addByBibTex(doi) {
	var baseUrl = 'http://www.annualreviews.org';
	var risRequest = baseUrl + '/action/downloadCitation';
	var articleUrl = baseUrl + '/doi/abs/' + doi;
	var pdfUrl = baseUrl + '/doi/pdf/' + doi;

	var postData = 'include=abs&direct=on&submit=Download+chapter+metadata&downloadFileName=citation' +
			'&format=bibtex' +		//bibtex
			'&doi=' + encodeURIComponent(doi);

	Zotero.Utilities.HTTP.doPost(risRequest, postData, function(text) {
		var translator = Zotero.loadTranslator('import');
		translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');	//bibtex
		translator.setString(text);
		translator.setHandler('itemDone', function(obj, item) {
			//set PDF file
			item.attachments = [{
				url: pdfUrl,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'}];

			item.complete();
			Zotero.done();
		});

		translator.translate();
	});
}

function detectWeb(doc, url) {
	var title = doc.title.toLowerCase();

	if( url.match(/\/doi\/(abs|full|pdf)\//) ) {

		return 'journalArticle';

	} else if( title.match('- table of contents -') ||
		title.match('- most downloaded reviews') ||
		title.match('- most cited reviews') ||
		title.match('- forthcoming -') ||
		title.match('search results') ||
		url.match('/journal/') ) {		//individual journal home page

		return 'multiple';
	}
}

function doWeb(doc, url) {
	if( detectWeb(doc, url) == 'multiple' ) {
		var articles = Zotero.Utilities.xpath(doc, '//div[@class="articleBoxWrapper"]');
		var selectList = new Object();
		var doi, title, article;
		for( var i in articles ) {
			article = articles[i];
			doi = Zotero.Utilities.xpath(article, './div[@class="articleCheck"]/input');
			title = Zotero.Utilities.xpathText(article, './div[@class="articleBoxMeta"]/h2/a');
			if( doi && doi[0].value && title) {
				selectList[doi[0].value] = title;
			}
		}

		Zotero.selectItems(selectList, function(selectedItems) {
			if(selectedItems == null) return true;
			for(var item in selectedItems) {
				addByBibTex(item);
			}
		});
	} else {
		var match = url.match(/\/(?:abs|full|pdf)\/([^?]+)/);
		if(match) {
			addByBibTex(match[1]);
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.annualreviews.org/action/doSearch?pageSize=20&searchText=something&type=thisJournal&publication=1449&&",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/journal/biophys",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/toc/biophys/forthcoming",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/toc/biophys/40/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/action/showMostCitedArticles?topArticlesType=sinceInception&journalCode=biophys",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/action/showMostReadArticles?topArticlesType=sinceInception&journalCode=biophys",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.annualreviews.org/doi/abs/10.1146/annurev.biophys.29.1.545?prevSearch=&searchHistoryKey=",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Thomas D.",
						"lastName": "Pollard",
						"creatorType": "author"
					},
					{
						"firstName": "Laurent",
						"lastName": "Blanchoin",
						"creatorType": "author"
					},
					{
						"firstName": "R. Dyche",
						"lastName": "Mullins",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.annualreviews.org/doi/pdf/10.1146/annurev.biophys.29.1.545",
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "MOLECULAR MECHANISMS CONTROLLING ACTIN FILAMENT DYNAMICS IN NONMUSCLE CELLS",
				"publicationTitle": "Annual Review of Biophysics and Biomolecular Structure",
				"volume": "29",
				"issue": "1",
				"pages": "545-576",
				"date": "2000",
				"DOI": "10.1146/annurev.biophys.29.1.545",
				"url": "http://www.annualreviews.org/doi/abs/10.1146/annurev.biophys.29.1.545",
				"abstractNote": "▪ Abstract We review how motile cells regulate actin filament assembly at their leading edge. Activation of cell surface receptors generates signals (including activated Rho family GTPases) that converge on integrating proteins of the WASp family (WASp, N-WASP, and Scar/WAVE). WASP family proteins stimulate Arp2/3 complex to nucleate actin filaments, which grow at a fixed 70° angle from the side of pre-existing actin filaments. These filaments push the membrane forward as they grow at their barbed ends. Arp2/3 complex is incorporated into the network, and new filaments are capped rapidly, so that activated Arp2/3 complex must be supplied continuously to keep the network growing. Hydrolysis of ATP bound to polymerized actin followed by phosphate dissociation marks older filaments for depolymerization by ADF/cofilins. Profilin catalyzes exchange of ADP for ATP, recycling actin back to a pool of unpolymerized monomers bound to profilin and thymosin-β4 that is poised for rapid elongation of new barbed ends.",
				"libraryCatalog": "Annual Reviews",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/