{
	"translatorID": "e317b4d4-03cf-4356-aa3c-defadc6fd10e",
	"label": "Air University Journals",
	"creator": "Sebastian Karcher",
	"target": "https?://www\\.airuniversity\\.af\\.mil/(ASPJ|SSQ)",
	"minVersion": "3",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-12-09 03:07:33"
}

function detectWeb(doc, url) {

	if (text(doc, 'a[title="View Article"]', 1)) {
		return "multiple";
	}
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var rows = ZU.xpath(doc, '//div[@class="da_black"]/table[tbody//a[@title="View Article"]]');
		if (rows.length < 3) {
			rows = ZU.xpath(doc, '//div[@class="da_black"]//p[span//a[@title="View Article"]]');
		}
		// Z.debug(rows.length);
		var items = {};
		if (url.includes("/ASPJ/")) {
			var journal = "Air & Space Power Journal";
			var abbr = "ASPJ";
			var ISSN = "1554-2505";
		}
		else if (url.includes("/SSQ/")) {
			var journal = "Strategic Studies Quarterly";
			var abbr = "SSQ";
			var ISSN = "1936-1815";
		}
		var voliss = text(doc, 'h1.title');
		var date = text(doc, 'p.da_story_info')
		for (let i = 0; i < rows.length; i++) {
			var infoArray = [];

			var title = text(rows[i], 'span > a[title="View Article"]');
			var id = attr(rows[i], 'span > a[title="View Article"]', "id")
			if (!title) {
				title = text(rows[i], 'strong > a[title="View Article"]');
				id = attr(rows[i], 'strong > a[title="View Article"]', "id");
			}

			if (title != null) {
				items[id] = title;
			}
		}

		Zotero.selectItems(items, function(items) {
			// Z.debug(items);
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				//	Z.debug(i);
				articles.push(i);
			}
			for (let i = 0; i < articles.length; i++) {
				scrapeMultiples(doc, articles[i], date, voliss, journal, abbr, ISSN);
			}
		});
	}
}


function scrapeMultiples(doc, id, date, voliss, journal, abbr, ISSN) {
	// Z.debug(id)
	var item = new Z.Item('journalArticle');
	var title = text(doc, 'span > a#' + id);
	var link = attr(doc, 'span > a#' + id, "href");
	if (!title) {
		title = text(doc, 'strong > a#' + id);
		link = attr(doc, 'strong > a#' + id, "href");
	}
	item.title = ZU.trimInternal(title.trim());
	var section = ZU.xpath(doc, '//div[@class="da_black"]/table[tbody//a[@id="' + id + '"]]');
	if (!section.length) {
		section = ZU.xpath(doc, '//div[@class="da_black"]/p[span//a[@id="' + id + '"]]');
	}
	if (section.length) {
		var authors = text(section[0], 'p>span>strong');
		if (!authors) authors = text(section[0], 'p>strong>span');
		if (authors) {
			authors = ZU.trimInternal(authors.trim());
			authors = authors.split(/\/|\sand\s/);
			var rank = /^(By:|Adm|Rear Adm|Col|Lt Col|Brig Gen|Gen|Maj Gen|Maj|Capt|Maj Gen|2nd Lt|W(in)?g Cdr|Mr?s\.|Mr\.|Dr\.)\s/
			for (i = 0; i < authors.length; i++) {
				// Z.debug(authors[i]);
				var author = authors[i].trim().replace(rank, "").replace(/,.+/, "");
				item.creators.push(ZU.cleanAuthor(author, "author"));
			}
		}
		var abstract = text(section[0], 'p > span', 2);
		if (!abstract) abstract = text(section[0], 'p > span', 1);
		if (abstract) {
			item.abstractNote = ZU.trimInternal(abstract.trim());
		}
	}

	if (date && date.includes("Published ")) {
		item.date = date.match(/Published (.+)/)[1];
	}


	if (voliss && voliss.includes("Volume")) {
		item.volume = voliss.match(/Volume (\d+)/)[1];
	}
	if (voliss && voliss.includes("Issue")) {
		item.issue = voliss.match(/Issue (\d+)/)[1];
	}

	item.publicationTitle = journal;
	item.journalAbbreviation = abbr;
	item.ISSN = ISSN;

	item.attachments.push({
		url: link,
		title: "Full Text PDF",
		mimeType: "application/pdf"
	})
	item.complete()
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.airuniversity.af.mil/SSQ/Display/Article/1261066/volume-11-issue-3-fall-2017/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.airuniversity.af.mil/ASPJ/Display/Article/1151902/volume-30-issue-2-summer-2016/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
