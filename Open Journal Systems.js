{
	"translatorID": "99b62ba4-065c-4e83-a5c0-d8cc0c75d388",
	"label": "Open Journal Systems",
	"creator": "Aurimas Vinckevicius",
	"target": "/article/view/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-15 18:04:37"
}

function detectWeb(doc, url) {
	if(ZU.xpathText(doc, '//a[@id="developedBy"]/@href') == 'http://pkp.sfu.ca/ojs/') {	//some sites remove this
		return 'journalArticle';
	}
}

function doWeb(doc, url) {
	//use Embeded Metadata
	var trans = Zotero.loadTranslator('web');
	trans.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	trans.setDocument(doc);

	trans.setHandler('itemDone', function(obj, item) {
		//abstract is supplied in DC:description, so it ends up in extra
		//abstractNote is pulled from description, which is same as title
		item.abstractNote = item.extra;
		item.extra = undefined;

		//if we still don't have abstract, we can try scraping from page
		if(!item.abstractNote) {
			item.abstractNote = ZU.xpathText(doc, '//div[@id="articleAbstract"]/div[1]');
		}

		item.complete();
	});

	trans.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://cab.unime.it/journals/index.php/AAPP/article/view/AAPP.901A1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Carfì",
						"creatorType": "author"
					},
					{
						"firstName": "Daniele",
						"lastName": "Schilirò",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Games and economics",
					"competition",
					"cooperation",
					"coopetition"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://cab.unime.it/journals/index.php/AAPP/article/view/AAPP.901A1",
				"title": "A framework of coopetitive games: Applications to the Greek crisis",
				"publicationTitle": "AAPP | Physical, Mathematical, and Natural Sciences",
				"rights": "Articles and conference papers published in  Atti della Accademia Peloritana dei Pericolanti &ndash; Classe di Scienze Fisiche, Matematiche e Naturali  are distributed under the terms and conditions of a  Creative Commons Attribution 3.0 Unported License  (effective since 2009, Vol. 87). Correspondingly, authors who publish with this journal agree to the following terms:   Authors retain copyright and grant the journal right of first publication with the work simultaneously licensed under a  Creative Commons Attribution License  that allows others to share the work with an acknowledgement of the work's authorship and initial publication in this journal.   Authors are able to enter into separate, additional contractual arrangements for the non-exclusive distribution of the journal's published version of the work (e.g., post it to an institutional repository or publish it in a book), with an acknowledgement of its initial publication in this journal.   Authors are permitted and encouraged to post their work online (e.g., in institutional repositories or on their website) prior to and during the submission process, as it can lead to productive exchanges, as well as earlier and greater citation of published work (See  The Effect of Open Access ).   &nbsp;",
				"date": "08/06/2012",
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
				"volume": "90",
				"issue": "1",
				"DOI": "10.1478/AAPP.901A1",
				"abstractNote": "In the present work we propose an original analytical model of coopetitive game. We shall apply this analytical model of coopetition (based on normal form game theory) to the Greek crisis, while conceiving this game theory model at a macro level. We construct two realizations of such model, trying to represent possible realistic macro-economic scenarios of the Germany-Greek strategic interaction. We shall suggest - after a deep and complete study of the two samples - feasible transferable utility solutions in a properly coopetitive perspective for the divergent interests which drive the economic policies in the euro area.",
				"ISSN": "1825-1242",
				"url": "http://cab.unime.it/journals/index.php/AAPP/article/view/AAPP.901A1",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "cab.unime.it",
				"shortTitle": "A framework of coopetitive games"
			}
		]
	},
	{
		"type": "web",
		"url": "http://epress.lib.uts.edu.au/journals/index.php/ijcre/article/view/2382",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Cheryl A.",
						"lastName": "Hyde",
						"creatorType": "author"
					},
					{
						"firstName": "Karen",
						"lastName": "Hopkins",
						"creatorType": "author"
					},
					{
						"firstName": "Megan",
						"lastName": "Meyer",
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
				"itemID": "http://epress.lib.uts.edu.au/journals/index.php/ijcre/article/view/2382",
				"title": "Pre-capacity building in loosely-coupled collaborations: Setting the stage for future initiatives",
				"publicationTitle": "Gateways: International Journal of Community Research and Engagement",
				"rights": "Authors submitting articles to UTSePress publications agree to assign a limited license to UTSePress if and when the manuscript is accepted for publication. This license allows UTSePress to publish a manuscript in a given issue.\n\nArticles published by UTSePress are protected by copyright which is retained by the authors who assert their moral rights. Authors control translation and reproduction rights to their works published by UTSePress.\n\nUTSePress publications are copyright and all rights are reserved worldwide. Downloads of specific portions of them are permitted for personal use only, not for commercial use or resale. Permissions to reprint or use any materials should be directed to UTSePress.",
				"date": "2012/08/24",
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
				"volume": "5",
				"issue": "1",
				"abstractNote": "This article examines the benefits and limitations of ‘loosely-coupled’ research collaborations between university faculty and 12 grassroots community-based organisations (CBOs). The authors assert that community-based research projects that develop the knowledge base within CBOs, and can be described as ‘pre-capacity building’ work, can be an important stepping stone to the subsequent development of more formal and strategic capacity-building partnership ventures. However, such projects must be approached carefully with a clear understanding of the ‘threshold dimensions’ that must be met before proceeding with any collaboration. Written as a cautionary tale, the authors identify some of the problems that arise when the threshold stage is poorly executed, and more generally speak to the dangers of initiating even loosely-coupled collaborations in the absence of an explicit and well-established campus commitment to and support for community engagement and partnerships. \n\nKeywords: Community capacity-building, community-university partnerships, community research, collaboration",
				"pages": "76–97",
				"ISSN": "1836-3393",
				"url": "http://epress.lib.uts.edu.au/journals/index.php/ijcre/article/view/2382",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "epress.lib.uts.edu.au",
				"shortTitle": "Pre-capacity building in loosely-coupled collaborations"
			}
		]
	},
	{
		"type": "web",
		"url": "http://elanguage.net/journals/index.php/dad/article/view/362",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christine",
						"lastName": "Howes",
						"creatorType": "author"
					},
					{
						"firstName": "Matthew",
						"lastName": "Purver",
						"creatorType": "author"
					},
					{
						"firstName": "Patrick G. T.",
						"lastName": "Healey",
						"creatorType": "author"
					},
					{
						"firstName": "Gregory",
						"lastName": "Mills",
						"creatorType": "author"
					},
					{
						"firstName": "Eleni",
						"lastName": "Gregoromichelaki",
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
				"itemID": "http://elanguage.net/journals/index.php/dad/article/view/362",
				"title": "On Incrementality in Dialogue: Evidence from Compound Contributions",
				"publicationTitle": "Dialogue & Discourse",
				"date": "2011/05/11",
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
				"volume": "2",
				"issue": "1",
				"DOI": "10.5087/d&d.v2i1.362",
				"abstractNote": "Spoken contributions in dialogue often continue or complete earlier contributions by either the same or a different speaker. These compound contributions (CCs) thus provide a natural context for investigations of incremental processing in dialogue.\n\nWe present a corpus study which confirms that CCs are a key dialogue phenomenon: almost 20% of contributions fit our general definition of CCs, with nearly 3% being the cross-person case most often studied. The results suggest that processing is word-by-word incremental, as splits can occur within syntactic constituents; however, some systematic differences between same- and cross-person cases indicate important dialogue-specific pragmatic effects. An experimental study then investigates these effects by artificially introducing CCs into multi-party text dialogue. Results suggest that CCs affect peoples expectations about who will speak next and whether other participants have formed a coalition or party.\n\nTogether, these studies suggest that CCs require an incremental processing mechanism that can provide a resource for constructing linguistic constituents that span multiple contributions and multiple participants. They also suggest the need to model higher-level dialogue units that have consequences for the organisation of turn-taking and for the development of a shared context.",
				"pages": "279-311",
				"ISSN": "2152-9620",
				"url": "http://elanguage.net/journals/dad/article/view/362",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "elanguage.net",
				"shortTitle": "On Incrementality in Dialogue"
			}
		]
	}
]
/** END TEST CASES **/