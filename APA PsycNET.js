{
	"translatorID": "1e1e35be-6264-45a0-ad2e-7212040eb984",
	"label": "APA PsycNET",
	"creator": "Michael Berkowitz and Aurimas Vinckevicius",
	"target": "^https?://psycnet\\.apa\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-06-28 20:44:17"
}

function detectWeb(doc, url) {
	var type;
	if (url.indexOf('search.searchResults') != -1) {
	//permission error (still relevant?)
	//return false;
		return "multiple";
	}

	if(url.indexOf('search.displayRecord') != -1) {
		type = doc.getElementById('rdcPubType');
		if(!type) return false;
		type = type.textContent.replace(/[\s\[\]]/g,'').split(';');
		switch(type[0]) {
			case 'Book':
				return 'book';
			case 'Chapter':
				return 'bookSection';
			case 'JournalArticle':
				return 'journalArticle';
			default:
				return false;
		}
	}

	if(url.match(/journals\/\S+\/\d+\/\d+\/\d+\//)) {
		return "journalArticle";
	}

	if(url.match(/\/books\/\d+/)) {
		fields.title = '(//h3[@id="bwcBookTitle"])[1]';
		fields.authors = '(//div[@id="bwcBookAuthors"])[1]';
		fields.voliss = '(//div[@id="bwcBookSource"])[1]';
		fields.abstract = '(//div[@id="bwcAbstract"])[1]';

		return "book";
	}

	if(url.indexOf('buy.optionToBuy') != -1
		&& url.indexOf('id=') != -1
		&& (type = doc.getElementById('obArticleHeaderText')) ) {

		fields.title = '(//div[@id="obArticleTitleHighlighted"])[1]';
		fields.authors = '(//div[@id="obAuthor"])[1]';
		fields.voliss = '(//div[@id="obSource"])[1]';
		fields.abstract = '(//div[@id="obAbstract"])[1]';

		if(type.textContent.indexOf('Article') != -1) {
			return 'journalArticle';
		}

		if(type.textContent.indexOf('Chapter') != -1) {
			return 'bookSection';
		}
	}

	/**for the book database - item IDs ending in 000 are books
	 * everything else chapters
	 */
	if (url.match(/psycinfo\/[0-9]{4}-[0-9]+-000/)){
		return "book";
	}

	if (url.match(/psycinfo\/[0-9]{4}-[0-9]+-[0-9]{3}/)){
		return "bookSection";
	}
}

//default field xpath
var fields = {
	title: '(//div[@id="rdcTitle"])[1]',
	authors: '(//div[@id="rdcAuthors"])[1]',
	voliss: '(//div[@id="rdcSource"])[1]',
	abstract: '//div[@id="rdRecord"]/div[@class="rdRecordSection"][2]'
}

function getField(field, doc) {
	var val = ZU.xpathText(doc, field);
	if(val) val = ZU.trimInternal(val);
	return val;
}

//for scraping publication information directly from pages
var volissRe = {
	journalArticle: 
		/^(.+?)(?:,\sVol\s(\d+)\((\d+)\))?,\s(\w+\s(?:\d+\s*,\s)?\d{4}),\s(?:(\d+-\d+)|No Pagination Specified).(?:\sdoi:\s(.+))?$/i,
	bookSection:
		/^(.+?),\s\((\d{4})\)\.\s(.+?),\s\(pp\.\s(\d+-\d+)\)\.\s(.+?):\s(.+?),\s(?:(\w+))?,\s(\d+)\spp\.(?:\sdoi:\s(.+))?/i,
	book:
		/^(.+?):\s(.+?)(?:\.\s\((\d{4})\)\.\s(\w+)\s(\d+)\spp\.\sdoi:\s(.+))?$/i
};

var creatorMap = {
	Ed: 'editor'
};

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "multiple") {
		var items = new Object();
		var titles = ZU.xpath(doc, '//div[@class="srhcTitle"]/a');
		for(var i=0, n=titles.length; i<n; i++) {
			items[titles[i].href] = titles[i].textContent;
		}
		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
	
			var arts = new Array();
			for(var i in selectedItems) {
				arts.push(i);
			}
			ZU.processDocuments(arts, scrape);
		});
	} else {
		scrape(doc, type);
	}
}

//try to figure out ids that we can use for fetching RIS
function getIds(doc, url) {
	var ret = {}
	ret.id = ZU.xpathText(doc, '(//input[@name="id"])[1]/@value') || '';
	ret.lstUID = ZU.xpathText(doc,
			'(//input[@name="lstUIDs"][@id="srhLstUIDs"])[1]/@value');
	if(ret.id || ret.lstUID) return ret;

	/**on the /book/\d+ pages, we can find the UID in
	 * the Front matter and Back matter links
	 */
	if(url.match(/\/books\/\d+/)) {
		var links = ZU.xpath(doc,
			'//a[@target="_blank" and contains(@href,"&id=")]');
		var m;
		for(var i=0, n=links.length; i<n; i++) {
			m = links[i].href.match(/\bid=([^&]+?)-(?:FRM|BKM)/i);
			if(m && m[1]) {
				ret.lstUID = m[1];
				return ret;
			}
		}
	}

	/**for pages with buy.optionToBuy
	 * we can fetch the id from the url
	 * alternatively, the id is in a javascript section (this is messy)
	 */
	if(url.indexOf('buy.optionToBuy') != -1) {
		var m = url.match(/\bid=([^&]+)/);
		if(m) {
			ret.lstUID = m[1];
			return ret;
		}

		m = doc.documentElement.textContent.match(/\bitemUID\s*=\s*(['"])(.*?)\1/);
		if(m && m[2]) {
			ret.lstUID = m[2];
			return ret;
		}
	}
}

//retrieve RIS data
//retry n times
function fetchRIS(url, post, itemType, doc, retry) {
	ZU.doPost(url, post, function(text) {
		//There's some cookie/session magic going on
		//our first request for RIS might not succeed
		var foundRIS = (text.indexOf('TY  - ') != -1);
		if(!foundRIS && retry) {
			//retry
			Z.debug('No RIS data. Retrying (' + retry + ').');
			fetchRIS(url, post, itemType, doc, --retry);
			return;
		} else if(!foundRIS) {
			Z.debug('No RIS data. Falling back to scraping the page directly.');
			scrapePage(doc, itemType);
		}

		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		//A2s should be editors here for all practical purposes
		text = text.replace(/A2  -/g, "ED  -");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			//item.url = newurl;
			item.title = item.title.replace(/\.$/,'');

			finalizeItem(item, doc);
		});
		translator.translate();
	});
}

//scrape directly from page
function scrapePage(doc, type) {
	Z.debug('Attempting to scrape directly from page');
	var item = new Zotero.Item(type);
	item.title = getField(fields.title, doc);
	if(!item.title) item.title = getField('obArticleTitleHighlighted', doc);
	if(!item.title) item.title = getField('bwcBookTitle', doc);

	var authors = getField(fields.authors, doc);
	if(authors) {
		authors = authors.replace(/^by\s+/i, '').split(/\s*;\s+/);
		var m, creatorType, name;
		for(var i=0, n=authors.length; i<n; i++) {
			m = authors[i].match(/^(.+?)\s?\((\w+)\)$/);
			if(m) {
				creatorType = creatorMap[m[2]];
				name = m[1];
			} else {
				creatorType = 'author';
				name = authors[i];
			}
			item.creators.push(ZU.cleanAuthor(name, creatorType, true));
		}
	}

	var voliss = getField(fields.voliss, doc);
	if(voliss
		&& (voliss = voliss.match(volissRe[type]))) {
		switch(type) {
			case 'journalArticle':
				item.publicationTitle = voliss[1];
				item.volume = voliss[2];
				item.issue = voliss[3];
				item.date = voliss[4];
				item.pages = voliss[5];
				item.DOI = voliss[6];
			break;
			case 'bookSection':
				var eds = voliss[1].split(/\s*;\s*/);
				var m, name, creatorType;
				for(var i=0, n=eds.length; i<n; i++) {
					m = eds[i].match(/^(.+?)(?:\s\((\w+)\))?$/);
					if(m) {
						creatorType = creatorMap[m[2]] || 'editor';
						item.creators.push(
							ZU.cleanAuthor(m[1], creatorType, true)
						);
					}
				}
				item.date = voliss[2];
				item.bookTitle = voliss[3];
				item.pages = voliss[4];
				item.place = voliss[5];
				item.publisher = voliss[6];
				item.volume = voliss[7];
				item.numPages = voliss[8];
				item.DOI = voliss[9];
			break;
			case 'book':
				item.place = voliss[1];
				item.publisher = voliss[2];
				item.date = voliss[3];
				item.volume = voliss[4];
				item.numPages = voliss[5];
				item.DOI = voliss[6];
			break;
		}
	}

	item.abstractNote = getField(fields.abstract, doc);

	finalizeItem(item, doc);
}

function finalizeItem(item, doc) {
	//clean up abstract and get copyright info
	if(item.abstractNote) {
		var m = item.abstractNote.match(/^(.+)\([^)]+(\(c\)[^)]+)\)$/i);
		if(m) {
			item.abstractNote = m[1];
			item.rights = m[2];
		}
	}

	//for books, volume is in the same field as numPages
	if(item.itemType == 'book' && item.numPages) {
		var m = item.numPages.match(/^(\w+)\s*,\s*(\d+)$/);
		if(m) {
			item.volume = m[1];
			item.numPages = m[2];
		}
	}

	item.attachments = [{
		title:"APA PsycNET Snapshot",
		document:doc
	}];

	item.complete();
}

function scrape (doc, type) {
	var newurl = doc.location.href;
	if(!type) type = detectWeb(doc, newurl);
	var ids = getIds(doc, newurl);
	var id = ids.id;
	var lstUID = ids.lstUID;
	if (id || lstUID) {
		var url = 'http://psycnet.apa.org/index.cfm?fa=search.export'
		var post = 'id=' + id + '&lstUIDs=' + lstUID
			+ '&records=records&exportFormat=referenceSoftware';
		Zotero.debug("Url: " + url);
		Zotero.debug("Post: " + post);
		fetchRIS(url, post, type, doc, 1);
	} else {
		scrapePage(doc, type);
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
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"itemID": "2004-16644-010",
				"title": "Neuropsychology of Adults With Attention-Deficit/Hyperactivity Disorder: A Meta-Analytic Review",
				"publicationTitle": "Neuropsychology",
				"volume": "18",
				"issue": "3",
				"pages": "485-503",
				"date": "2004",
				"place": "US",
				"publisher": "American Psychological Association",
				"ISBN": "1931-1559(Electronic);0894-4105(Print)",
				"ISSN": "1931-1559(Electronic);0894-4105(Print)",
				"abstractNote": "A comprehensive, empirically based review of the published studies addressing neuropsychological performance in adults diagnosed with attention-deficit/hyperactivity disorder (ADHD) was conducted to identify patterns of performance deficits. Findings from 33 published studies were submitted to a meta-analytic procedure producing sample-size-weighted mean effect sizes across test measures. Results suggest that neuropsychological deficits are expressed in adults with ADHD across multiple domains of functioning, with notable impairments in attention, behavioral inhibition, and memory, whereas normal performance is noted in simple reaction time. Theoretical and developmental considerations are discussed, including the role of behavioral inhibition and working memory impairment. Future directions for research based on these findings are highlighted, including further exploration of specific impairments and an emphasis on particular tests and testing conditions.",
				"DOI": "10.1037/0894-4105.18.3.485",
				"rights": "(c) 2012 APA, all rights reserved",
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
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"itemID": "1956-05944-001",
				"title": "Factor analysis of meaning",
				"publicationTitle": "Journal of Experimental Psychology",
				"volume": "50",
				"issue": "5",
				"pages": "325-338",
				"date": "1955",
				"place": "US",
				"publisher": "American Psychological Association",
				"ISBN": "0022-1015(Print)",
				"ISSN": "0022-1015(Print)",
				"abstractNote": "Two factor analytic studies of meaningful judgments based upon the same sample of 50 bipolar descriptive scales are reported. Both analyses reveal three major connotative factors: evaluation, potency, and activity. These factors appear to be independent dimensions of the semantic space within which the meanings of concepts may be specified.",
				"DOI": "10.1037/h0043965",
				"rights": "(c) 2012 APA, all rights reserved",
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
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"itemID": "1992-98221-010",
				"title": "Catatonia: Tonic immobility: Evolutionary underpinnings of human catalepsy and catatonia",
				"series": "A series of books in psychology.",
				"pages": "334-357",
				"date": "1977",
				"place": "New York,  NY,  US",
				"publisher": "W H Freeman/Times Books/ Henry Holt & Co",
				"ISBN": "0-7167-0368-8 (Hardcover); 0-7167-0367-X (Paperback)",
				"ISSN": "0-7167-0368-8 (Hardcover); 0-7167-0367-X (Paperback)",
				"abstractNote": "tonic immobility [animal hypnosis] might be a useful laboratory analog or research model for catatonia / we have been collaborating on an interdisciplinary program of research in an effort to pinpoint the behavioral antecedents and biological bases for tonic immobility / attempt to briefly summarize our findings, and . . . discuss the implications of these data in terms of the model \n\n characteristics of tonic immobility / hypnosis / catatonia, catalepsy, and cataplexy / tonic immobility as a model for catatonia / fear potentiation / fear alleviation / fear or arousal / learned helplessness / neurological correlates / pharmacology and neurochemistry / genetic underpinnings / evolutionary considerations / implications for human psychopathology (PsycINFO Database Record (c) 2012 APA, all rights reserved)",
				"publicationTitle": "Psychopathology: Experimental models",
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
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"itemID": "2004-16329-000",
				"title": "The abnormal personality: A textbook",
				"pages": "x, 617",
				"numPages": "617",
				"date": "1948",
				"place": "New York,  NY,  US",
				"publisher": "Ronald Press Company",
				"abstractNote": "The author's intent is to write about abnormal people in a way that will be valuable and interesting to students new to the subject. A first course in abnormal psychology is not intended to train specialists. Its goal is more general: it should provide the student with the opportunity to whet his interest, expand his horizons, register a certain body of new facts, and relate this to the rest of his knowledge about mankind. I have tried to present the subject in such a way as to emphasize its usefulness to all students of human nature. I have tried the experiment of writing two introductory chapters, one historical and the other clinical. This reflects my desire to set the subject-matter in a broad perspective and at the same time to anchor it in concrete fact. Next comes a block of six chapters designed to set forth the topics of maladjustment and neurosis. The two chapters on psychotherapy complete the more purely psychological or developmental part of the work. In the final chapter the problem of disordered personalities is allowed to expand to its full social dimensions. Treatment, care, and prevention call for social effort and social organization. I have sought to show some of the lines, both professional and nonprofessional, along which this effort can be expended.",
				"DOI": "10.1037/10023-000",
				"rights": "(c) 2012 APA, all rights reserved",
				"volume": "x",
				"libraryCatalog": "APA PsycNET",
				"shortTitle": "The abnormal personality"
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/books/10023",
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
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"itemID": "2004-16329-000",
				"title": "The abnormal personality: A textbook",
				"pages": "x, 617",
				"numPages": "617",
				"date": "1948",
				"place": "New York,  NY,  US",
				"publisher": "Ronald Press Company",
				"abstractNote": "The author's intent is to write about abnormal people in a way that will be valuable and interesting to students new to the subject. A first course in abnormal psychology is not intended to train specialists. Its goal is more general: it should provide the student with the opportunity to whet his interest, expand his horizons, register a certain body of new facts, and relate this to the rest of his knowledge about mankind. I have tried to present the subject in such a way as to emphasize its usefulness to all students of human nature. I have tried the experiment of writing two introductory chapters, one historical and the other clinical. This reflects my desire to set the subject-matter in a broad perspective and at the same time to anchor it in concrete fact. Next comes a block of six chapters designed to set forth the topics of maladjustment and neurosis. The two chapters on psychotherapy complete the more purely psychological or developmental part of the work. In the final chapter the problem of disordered personalities is allowed to expand to its full social dimensions. Treatment, care, and prevention call for social effort and social organization. I have sought to show some of the lines, both professional and nonprofessional, along which this effort can be expended.",
				"DOI": "10.1037/10023-000",
				"rights": "(c) 2012 APA, all rights reserved",
				"volume": "x",
				"libraryCatalog": "APA PsycNET",
				"shortTitle": "The abnormal personality"
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/index.cfm?fa=buy.optionToBuy&id=2004-16329-002",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"lastName": "White",
						"firstName": "Robert W.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"disordered personalities",
					"abnormal psychology"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"itemID": "2004-16329-002",
				"title": "Clinical introduction: Examples of disordered personalities",
				"pages": "54-101",
				"date": "1948",
				"place": "New York,  NY,  US",
				"publisher": "Ronald Press Company",
				"abstractNote": "This chapter examines some representative examples of disordered personalities. The reader should be forewarned that the five cases described here will be frequently referred to in later chapters of the book. They display to advantage many of the problems and principles that will occupy us when we undertake to build up a systematic account of abnormal psychology. It will be assumed that the cases given in this chapter are well remembered, and with this in mind the reader should not only go through them but study and compare them rather carefully. The main varieties of disordered personalities and student attitudes toward abnormality are discussed before the case histories are presented.",
				"DOI": "10.1037/10023-002",
				"publicationTitle": "The abnormal personality: A textbook",
				"rights": "(c) 2012 APA, all rights reserved",
				"libraryCatalog": "APA PsycNET",
				"shortTitle": "Clinical introduction"
			}
		]
	},
	{
		"type": "web",
		"url": "http://psycnet.apa.org/index.cfm?fa=buy.optionToBuy&id=2010-19350-001",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Mellers",
						"firstName": "Barbara A.",
						"creatorType": "author"
					},
					{
						"lastName": "Haselhuhn",
						"firstName": "Michael P.",
						"creatorType": "author"
					},
					{
						"lastName": "Tetlock",
						"firstName": "Philip E.",
						"creatorType": "author"
					},
					{
						"lastName": "Silva",
						"firstName": "José C.",
						"creatorType": "author"
					},
					{
						"lastName": "Isen",
						"firstName": "Alice M.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"affect",
					"cooperation",
					"dictator game",
					"emotions",
					"ultimatum game",
					"economics"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "APA PsycNET Snapshot"
					}
				],
				"itemID": "2010-19350-001",
				"title": "Predicting behavior in economic games by looking through the eyes of the players",
				"publicationTitle": "Journal of Experimental Psychology: General",
				"volume": "139",
				"issue": "4",
				"pages": "743-755",
				"date": "2010",
				"place": "US",
				"publisher": "American Psychological Association",
				"ISBN": "1939-2222(Electronic);0096-3445(Print)",
				"ISSN": "1939-2222(Electronic);0096-3445(Print)",
				"abstractNote": "Social scientists often rely on economic experiments such as ultimatum and dictator games to understand human cooperation. Systematic deviations from economic predictions have inspired broader conceptions of self-interest that incorporate concerns for fairness. Yet no framework can describe all of the major results. We take a different approach by asking players directly about their self-interest—defined as what they want to do (pleasure-maximizing options). We also ask players directly about their sense of fairness—defined as what they think they ought to do (fairness-maximizing options). Player-defined measures of self-interest and fairness predict (a) the majority of ultimatum-game and dictator-game offers, (b) ultimatum-game rejections, (c) exiting behavior (i.e., escaping social expectations to cooperate) in the dictator game, and (d) who cooperates more after a positive mood induction. Adopting the players' perspectives of self-interest and fairness permits better predictions about who cooperates, why they cooperate, and when they punish noncooperators.",
				"DOI": "10.1037/a0020280",
				"rights": "(c) 2012 APA, all rights reserved",
				"libraryCatalog": "APA PsycNET"
			}
		]
	}
]
/** END TEST CASES **/