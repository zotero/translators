{
	"translatorID": "882f70a8-b8ad-403e-bd76-cb160224999d",
	"label": "Vanderbilt eJournals",
	"creator": "Michael Berkowitz and Aurimas Vinckevicius",
	"target": "http://ejournals.library.vanderbilt.edu/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-03-17 02:30:36"
}

function scrape(doc) {
	var translator = Zotero.loadTranslator("web");
	//use embedded metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function(obj, item) {
		//extra contains the abstract
		item.abstractNote = item.extra;
		delete item.extra;

		//pdf link points to embedded pdf
		for(var i=0, n=item.attachments.length; i<n; i++) {
			var attachment = item.attachments[i]
			if(attachment.mimeType == 'application/pdf') {
				attachment.url = attachment.url.replace(/\/view\//,'/download/');
			}
		}

		item.complete();
	});
	translator.translate();
}

function detectWeb(doc, url) {
	if (url.indexOf('/article/view/') != -1) {
		return "journalArticle";
	} else if ( url.indexOf('/issue/view') != -1 ||
				( ( url.indexOf('/search/advancedResults') != -1 ||
					url.indexOf('/search/results') != -1 ) &&
					!ZU.xpath(doc, '//td[text()="No Results"]').length ) ) {
		return "multiple";
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var results = ZU.xpath(doc, '//div[@id="results"]//tr[@valign="top"]');
		var titlex = './td[2]';
		var linkx = './td[3]/a[contains(text(), "Abstract") or contains(text(), "HTML")]';
		for (var i=0, n=results.length; i<n; i++) {
			var title = ZU.xpathText(results[i], titlex);
			var link = ZU.xpath(results[i], linkx)[0].href;
			items[link] = Zotero.Utilities.trimInternal(title);
		}
		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;

			var arts = new Array();
			for (var i in selectedItems) {
				arts.push(i);
			}
			ZU.processDocuments(arts, scrape);
		});
	} else {
		scrape(doc);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/vurj/article/view/2931",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Emily Cannon",
						"lastName": "Green",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://ejournals.library.vanderbilt.edu/ojs/index.php/vurj/article/view/2931",
				"title": "Authenticating Identity: The Quest for Personal Validation through Authenticity in Music",
				"publicationTitle": "Vanderbilt Undergraduate Research Journal",
				"rights": "Copyright for articles published in this journal is retained by the authors, with first publication rights granted to Vanderbilt Undergraduate Research Journal. By virtue of their appearance in this open access journal, articles are available for wide dissemination at no cost to readers, with proper attribution, in educational and other non-commercial settings. For undergraduates jointly authoring a manuscript with a faculty member, we strongly encourage the student to discuss with the faculty mentor and the Editor if the copyright policy will constrain future publication efforts in professional journals.",
				"date": "05/08/2011",
				"reportType": "Text.Serial.Journal",
				"letterType": "Text.Serial.Journal",
				"manuscriptType": "Text.Serial.Journal",
				"mapType": "Text.Serial.Journal",
				"thesisType": "Text.Serial.Journal",
				"websiteType": "Text.Serial.Journal",
				"presentationType": "Text.Serial.Journal",
				"postType": "Text.Serial.Journal",
				"audioFileType": "Text.Serial.Journal",
				"language": "en",
				"volume": "7",
				"issue": "0",
				"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/vurj/article/view/2931",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "ejournals.library.vanderbilt.edu",
				"shortTitle": "Authenticating Identity",
				"abstractNote": "“Music City, U.S.A.” celebrates many cultures and music, but often Nashville is identified with singing cowboys with southern drawls. Some are quick to call this country-western image “inauthentic,” pointing out that middle Tennessee’s forested hills were never home to cattle ranches or Gene Autry. Indeed, the labels of “authentic” or “inauthentic” have become widely used in contemporary society to denote whether a thing is essentially true or untrue. In his evaluation of the 1960s music “myth” in which folk music was deemed authentic and pop music inauthentic, sociologist Simon Frith argues that the central issue was less about the music itself and more about the communication of a person’s identity through that music. An examination of the concept of authenticity as it has evolved through history and presented itself in recent scholarship and a survey of Nashville residents and college students reveal that the quest for authenticity in tourism and consumerism is closely linked to the construction of identity. While the concept of authenticity is demonstrably problematic, it retains its power because it provides a framework against which individuals can define themselves in an increasingly global world. The quest for authenticity in music, then, becomes a quest for truth about oneself for which there is no objective answer. Authenticity is fundamentally a question of perspective. Who can say whether Nashville is authentic or not? All that can be said is simply that Nashville is."
			}
		]
	},
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/lusohispanic/article/view/3283/1518",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Raúl",
						"lastName": "Dorra",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://ejournals.library.vanderbilt.edu/ojs/index.php/lusohispanic/article/view/3283/1518",
				"language": "en",
				"issue": "0",
				"ISSN": "1547-5743",
				"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/lusohispanic/article/view/3283",
				"libraryCatalog": "ejournals.library.vanderbilt.edu",
				"title": "¿Qué hay antes y después de la escritura?",
				"publicationTitle": "Vanderbilt e-Journal of Luso-Hispanic Studies",
				"date": "20/10/2011",
				"volume": "7"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/homiletic/article/view/3460",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Clint",
						"lastName": "Heacock",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://ejournals.library.vanderbilt.edu/ojs/index.php/homiletic/article/view/3460",
				"title": "Rhetorical Influences upon the Preaching of Jonathan Edwards",
				"publicationTitle": "Homiletic",
				"date": "01/12/2011",
				"reportType": "Text.Serial.Journal",
				"letterType": "Text.Serial.Journal",
				"manuscriptType": "Text.Serial.Journal",
				"mapType": "Text.Serial.Journal",
				"thesisType": "Text.Serial.Journal",
				"websiteType": "Text.Serial.Journal",
				"presentationType": "Text.Serial.Journal",
				"postType": "Text.Serial.Journal",
				"audioFileType": "Text.Serial.Journal",
				"language": "en",
				"volume": "36",
				"issue": "2",
				"ISSN": "2152-6923",
				"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/homiletic/article/view/3460",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "ejournals.library.vanderbilt.edu",
				"abstractNote": "Much has been written concerning the New England Puritan Jonathan Edwards, addressing his multifaceted activities as a theologian, preacher, revivalist, pastor, polemicist and missionary. In particular this study focuses upon the rhetorical influences that shaped his preaching ministry: his personal faith experiences, the preaching of his father and grandfather, the Puritan preaching tradition, and the rhetoric of Peter Ramus. While he preached within the sometimes narrow constraints of his New England Puritan tradition, Edwards nonetheless found some freedom to experiment with the classic inherited Puritan tripartite sermon form. Although he never truly departed from this sermon format, his attempts at innovation within his tradition serves as a model for preachers today. Such a legacy may well inspire preachers operating within the confines of hermeneutical or denominational tradition, but who seek to reconfigure elements of their inherited preaching influences."
			}
		]
	},
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/ameriquests/article/view/220",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Earl E.",
						"lastName": "Fitz",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://ejournals.library.vanderbilt.edu/ojs/index.php/ameriquests/article/view/220",
				"title": "Canadian Literature in the Early Twenty-First Century: The Emergence of an Inter-American Perspective",
				"publicationTitle": "AmeriQuests",
				"rights": "We ask that all submissions be original to AmeriQuests, although exceptions can be made by the editor. All authors retain copyright, and are permitted to publish their work after it appears in AmeriQuests, although we ask that AmeriQuests be referenced in subsequent editions.",
				"date": "28/07/2011",
				"reportType": "Text.Serial.Journal",
				"letterType": "Text.Serial.Journal",
				"manuscriptType": "Text.Serial.Journal",
				"mapType": "Text.Serial.Journal",
				"thesisType": "Text.Serial.Journal",
				"websiteType": "Text.Serial.Journal",
				"presentationType": "Text.Serial.Journal",
				"postType": "Text.Serial.Journal",
				"audioFileType": "Text.Serial.Journal",
				"language": "en",
				"volume": "8",
				"issue": "1",
				"abstractNote": "Historically, Canadian literature has been chary of entering too far into the new discipline of inter-American literary study.  Rightly concerned about the danger of blurring its identity as a distinctive national literature (one made up, as is well known, of two great strands, the French and the English), Canadian writing has, however, come of age, both nationally and internationally.  One dramatic aspect of this transformation is that we now have mounting evidence that both English and French Canadian writers are actively engaging with the literatures and cultures of their hemispheric neighbors.  By extending the methodologies of Comparative Literature to the inter-American paradigm, Canadian writers, critics, and literary historians are finding ways to maintain their status as members of a unique and under-appreciated national literature while also entering into the kinds of comparative studies that demonstrate their New World ties as well.",
				"ISSN": "1553-4316",
				"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/ameriquests/article/view/220",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "ejournals.library.vanderbilt.edu",
				"shortTitle": "Canadian Literature in the Early Twenty-First Century"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/vurj/search/results?query=house",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/lusohispanic/search/results?query=hay",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/homiletic/search/results?query=dialogue",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ejournals.library.vanderbilt.edu/ojs/index.php/ameriquests/search/advancedResults?query=americas",
		"items": "multiple"
	}
]
/** END TEST CASES **/