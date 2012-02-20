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
	"lastUpdated": "2012-02-20 09:40:41"
}

//add using RIS
function addByRIS(doi) {
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
				addByRIS(item);
			}
		});
	} else {
		var match = url.match(/\/(?:abs|full|pdf)\/([^?]+)/);
		if(match) {
			addByRIS(match[1]);
		}
	}
}

