{
	"translatorID": "1e1e35be-6264-45a0-ad2e-7212040eb984",
	"label": "APA PsycNET",
	"creator": "Michael Berkowitz",
	"target": "^http://psycnet\\.apa\\.org/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-08-31 15:14:58"
}

function detectWeb(doc, url) {
	if (url.match(/search\.searchResults/)) {
	//permission error
	return false;
		//return "multiple";
	} else if (url.match(/search\.displayRecord|journals\/\S+\/\d+\/\d+\/\d+\//)) {
		return "journalArticle";
		
//for the book database - item IDs ending in 000 are books, everything else chapters)
	} else if (url.match(/psycinfo\/[0-9]{4}-[0-9]+-000/)){
		return "book";
	} else if (url.match(/psycinfo\/[0-9]{4}-[0-9]+-[0-9]{3}/)){
		return "bookSection";
	}
}

function associateXPath(xpath, doc, ns) {
	return Zotero.Utilities.trimInternal(doc.evaluate(xpath, doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent);
}

function doWeb(doc, url) {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
			if (prefix == 'x') return namespace; else return null;
		} : null;
		var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//div[@class="srhcTitle"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			arts.push(i);
		}
		Zotero.Utilities.processDocuments(arts, scrape, function() {Zotero.done();});
	} else {
		scrape(doc);
	}
	Zotero.wait();
}

function scrape (doc) {
		var namespace = null;
		var newurl = doc.location.href;
		if (doc.evaluate('//input[@name="id"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var id = doc.evaluate('//input[@name="id"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
			var lstSelectedUIDs = doc.evaluate('//input[@name="lstUIDs"][@id="srhLstUIDs"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
			var get = 'http://psycnet.apa.org/index.cfm?fa=search.export'
			var post = 'id=' + id + '&lstUIDs=' + lstSelectedUIDs + '&lstSelectedUIDs=&records=records&displayFormat=&exportFormat=referenceSoftware&printDoc=0';
			// http://psycnet.apa.org/index.cfm?fa=search.exportFormat&singlerecord=1
			// id=&lstSelectedUIDs=&lstUIDs=2004-16644-010&records=records&displayFormat=&exportFormat=referenceSoftware&printDoc=0
			//Zotero.debug(get);
			Zotero.Utilities.HTTP.doPost(get, post, function(text) {
				// http://psycnet.apa.org/index.cfm?fa=search.export
				var translator = Zotero.loadTranslator("import");
				translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				//A2s should be editors here for all practical purposes
				text = text.replace(/A2  -/g, "ED  -");
				translator.setString(text);
				translator.setHandler("itemDone", function(obj, item) {
					//item.url = newurl;
					item.title = item.title.replace(/\.$/,'');
					//item.attachments = [{url:newurl, title:"APA PsycNET Snapshot", mimeType:"text/html"}];
					item.complete();
				});
				translator.translate();
			});
		} else {
			var item = new Zotero.Item("journalArticle");
			item.title = associateXPath('//div[@id="rdcTitle"]', doc, nsResolver);
			var authors = associateXPath('//div[@id="rdcAuthors"]', doc, nsResolver).split(/;\s+/);
			for each (var aut in authors) {
				item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author", true));
			}
			var voliss = associateXPath('//div[@id="rdcSource"]', doc, nsResolver).match(/^([^\.]+)\.\s+(\d+\s+\w+)\s+Vol\s+(\d+)\((\d+)\)\s+(.*)$/);
			item.publicationTitle = voliss[1];
			item.date = voliss[2];
			item.volume = voliss[3];
			item.issue = voliss[4];
			item.pages = voliss[5];
			item.abstractNote = associateXPath('//div[@id="rdRecord"]/div[@class="rdRecordSection"][2]', doc, nsResolver);
			item.complete();			
		}
	}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://psycnet.apa.org/index.cfm?fa=search.displayRecord&uid=2004-16644-010",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Hervey",
						"firstName": "Aaron S.",
						"creatorType": "author"
					},
					{
						"lastName": "Epstein",
						"firstName": "Jeffery N.",
						"creatorType": "author"
					},
					{
						"lastName": "Curry",
						"firstName": "John F.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"attention-deficit/hyperactivity disorder",
					"adults",
					"behavioral inhibition",
					"neuropsychological performance",
					"developmental considerations",
					"neuropsychological deficits",
					"empirical methods"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Neuropsychology of Adults With Attention-Deficit/Hyperactivity Disorder: A Meta-Analytic Review",
				"publicationTitle": "Neuropsychology",
				"volume": "18",
				"issue": "3",
				"pages": "485-503",
				"date": "2004",
				"ISSN": "1931-1559(Electronic);0894-4105(Print)",
				"abstractNote": "A comprehensive, empirically based review of the published studies addressing neuropsychological performance in adults diagnosed with attention-deficit/hyperactivity disorder (ADHD) was conducted to identify patterns of performance deficits. Findings from 33 published studies were submitted to a meta-analytic procedure producing sample-size-weighted mean effect sizes across test measures. Results suggest that neuropsychological deficits are expressed in adults with ADHD across multiple domains of functioning, with notable impairments in attention, behavioral inhibition, and memory, whereas normal performance is noted in simple reaction time. Theoretical and developmental considerations are discussed, including the role of behavioral inhibition and working memory impairment. Future directions for research based on these findings are highlighted, including further exploration of specific impairments and an emphasis on particular tests and testing conditions. (PsycINFO Database Record (c) 2012 APA, all rights reserved)",
				"DOI": "10.1037/0894-4105.18.3.485",
				"libraryCatalog": "APA PsycNET",
				"shortTitle": "Neuropsychology of Adults With Attention-Deficit/Hyperactivity Disorder"
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/journals/xge/50/5/325/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Osgood",
						"firstName": "Charles E.",
						"creatorType": "author"
					},
					{
						"lastName": "Suci",
						"firstName": "George J.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"factor analysis",
					"evaluation",
					"potency",
					"activity",
					"semantic"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Factor analysis of meaning",
				"publicationTitle": "Journal of Experimental Psychology",
				"volume": "50",
				"issue": "5",
				"pages": "325-338",
				"date": "1955",
				"ISSN": "0022-1015(Print)",
				"abstractNote": "Two factor analytic studies of meaningful judgments based upon the same sample of 50 bipolar descriptive scales are reported. Both analyses reveal three major connotative factors: evaluation, potency, and activity. These factors appear to be independent dimensions of the semantic space within which the meanings of concepts may be specified. (PsycINFO Database Record (c) 2012 APA, all rights reserved)",
				"DOI": "10.1037/h0043965",
				"libraryCatalog": "APA PsycNET"
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/psycinfo/1992-98221-010",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"lastName": "Gallup Jr.",
						"firstName": "Gordon G.",
						"creatorType": "author"
					},
					{
						"lastName": "Maser",
						"firstName": "Jack D.",
						"creatorType": "author"
					},
					{
						"lastName": "J. D. Maser  M. E. P. Seligman",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"discusses tonic immobility as an animal model for catatonia & catalepsy"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Catatonia: Tonic immobility: Evolutionary underpinnings of human catalepsy and catatonia",
				"bookTitle": "Psychopathology: Experimental models",
				"series": "A series of books in psychology.",
				"pages": "334-357",
				"date": "1977",
				"place": "New York,  NY,  US",
				"publisher": "W H Freeman/Times Books/ Henry Holt & Co",
				"ISBN": "0-7167-0368-8 (Hardcover); 0-7167-0367-X (Paperback)",
				"abstractNote": "tonic immobility [animal hypnosis] might be a useful laboratory analog or research model for catatonia / we have been collaborating on an interdisciplinary program of research in an effort to pinpoint the behavioral antecedents and biological bases for tonic immobility / attempt to briefly summarize our findings, and . . . discuss the implications of these data in terms of the model characteristics of tonic immobility / hypnosis / catatonia, catalepsy, and cataplexy / tonic immobility as a model for catatonia / fear potentiation / fear alleviation / fear or arousal / learned helplessness / neurological correlates / pharmacology and neurochemistry / genetic underpinnings / evolutionary considerations / implications for human psychopathology (PsycINFO Database Record (c) 2012 APA, all rights reserved)",
				"libraryCatalog": "APA PsycNET",
				"shortTitle": "Catatonia"
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/psycinfo/2004-16329-000/",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "White",
						"firstName": "Robert W.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"abnormal personality",
					"abnormal psychology",
					"personality disorders"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "The abnormal personality: A textbook",
				"numPages": "x, 617",
				"date": "1948",
				"place": "New York,  NY,  US",
				"publisher": "Ronald Press Company",
				"abstractNote": "The author's intent is to write about abnormal people in a way that will be valuable and interesting to students new to the subject. A first course in abnormal psychology is not intended to train specialists. Its goal is more general: it should provide the student with the opportunity to whet his interest, expand his horizons, register a certain body of new facts, and relate this to the rest of his knowledge about mankind. I have tried to present the subject in such a way as to emphasize its usefulness to all students of human nature. I have tried the experiment of writing two introductory chapters, one historical and the other clinical. This reflects my desire to set the subject-matter in a broad perspective and at the same time to anchor it in concrete fact. Next comes a block of six chapters designed to set forth the topics of maladjustment and neurosis. The two chapters on psychotherapy complete the more purely psychological or developmental part of the work. In the final chapter the problem of disordered personalities is allowed to expand to its full social dimensions. Treatment, care, and prevention call for social effort and social organization. I have sought to show some of the lines, both professional and nonprofessional, along which this effort can be expended. (PsycINFO Database Record (c) 2012 APA, all rights reserved)",
				"libraryCatalog": "APA PsycNET",
				"shortTitle": "The abnormal personality"
			}
		]
	}
]
/** END TEST CASES **/