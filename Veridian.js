{
	"translatorID": "fb6773ac-74b1-406f-b6b0-9343fed56bb5",
	"label": "Veridian",
	"creator": "Peter Binkley",
	"target": "^.*\\?a=d&d=.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-02-12 03:52:30"
}

function detectWeb(doc, url) {
  // TODO handle other item types besides newspaperArticle, since Veridian is 
  // also used for general digitization projects
  if (ZU.xpath(doc, '/html/head/meta[@name="veridian-license"]').length > 0) {
  return 'newspaperArticle';
  }
}

function doWeb(doc, url) {
  // note that the article identified in the page url might not be the currently
  // selected article (if the user has clicked on a different article in the 
  // page view or issue TOC). Selecting an article triggers AJAX fetches of its data, which 
  // is used to populate the left column with article title and text. This is
  // the only reliable source for title and text. Unfortunately, the page numbers
  // are not used to populate an element, so a reliable source for them is
  // harder to find.
  
  var newItem = new Zotero.Item("newspaperArticle");

  // get date and publicationTitle from page title
  // expect a string like 'The Reserve Weekly 19 March 1935 &mdash; Case Western Reserve University'
  var pageTitleParts = ZU.xpathText(doc, '/html/head/title').split("—");
  newItem.libraryCatalog = pageTitleParts[1];
  // get publication title and date from titleParts[0]
  var tokens = pageTitleParts[0].trim().split(' ');
  // date is made up of thelast three tokens 
  var date = tokens.slice(-3);
  newItem.date = ZU.strToISO(date);
  newItem.publicationTitle = tokens.slice(0, -3).join(' ');

  // container for dynamic article info: title and content
  var textTab = ZU.xpath(doc, '//div[@id="documentdisplayleftpanesectionleveltabcontent" or @id="sectionleveltabtextareacontentpaddingdiv"]');
  // get the id of the currently selected article from the "Correct this text" link
  // which has param a=tc
  // TODO figure out how to prevent this from breaking Scaffold tests, since it is populated
  // by an AJAX call which is not complete when the test runs
  var textCorrectionLink = ZU.xpath(textTab, '//a[contains(@href, "?a=tc&")]');
  if (textCorrectionLink.length === 0) {
	Zotero.debug('The "Correct this text" link does not exist; the AJAX call which populates the featured article div has not completed.')
	textCorrectionLink = ['', url]
  }
  var articleID = /.*[&?]d=([^&]+).*/.exec(textCorrectionLink)[1];
  var articleKey = /.*\.(\d+\.\d+)$/.exec(articleID)[1];
  var articleTitle = '';

  // delete Veridian query from url
  newItem.url = url.replace(/&srpos=[^&]*/, '').replace(/&e=[^&]*/, '').replace(/&d=[^&]*/, '&d=' + encodeURI(articleID));

  // get list of page labels
  // We derive these from the zone divs for the image display, which is the only place
  // we're sure to find content for the current article. Note that pages might 
  // not be in order here, so we'll have to sort the IDs. This can happen if you
  // land on an article on page 2, and then scroll to one on page 1,
  // triggering an AJAX call for page 1's data, which is appended to page 2's data.
  // Multi-page articles contain zones on different pages, so we'll end up with 
  // multiple page IDs in the articlePageIDs array.
  // We will build pageLabels as a hash to translate page IDs to string labels (since we 
  // find values like 'Unnumbered page" or "TWO"'). We'll then gather articlePageIDs 
  // for zones that are part of the current article, as an array of integers which 
  // are the keys in the pageLabels hash. This guarantees that the page numbers are
  // correctly ordered in newItem.pages, even if they are non-numeric strings.
  var pageLabels = {};
  var articlePageIDs = [];

  var veridianStyle = 'casewestern';
  var pageContainers = ZU.xpath(doc, '//div[div[@class="panojspagelabel overlay"]]/div');

  if (pageContainers.length === 0) {
	// we have a non-Case Western style site
  pageContainers = ZU.xpath(doc, '//div[@id="veridianpanojscontentlayer"]/*');
  if (pageContainers.length > 0) {
	veridianStyle = 'stanford';
  }
  else {
	veridianStyle = 'unknown';
	Zotero.debug('This page uses a style of Veridian which is not yet supported by this translator.');
  }
  }
  
  Zotero.debug('Veridian Style: ' + veridianStyle);

  var articleKeyOnMouseOver = 'sectionOnMouseOverPanoJS(\'' + articleKey + '\');';
  arrayLength = pageContainers.length;
  // Different Veridian versions need different regexes to get the page id
  var idFromZone = {
	'casewestern': /.*\.\d+\.(\d+)\-ZONE.*/,   // like "TRW19350319-01.1.3-ZONE22-1"
	'stanford': /P(\d+)_.*/                    // like "P2_TB00004"
  };
  for (i = 0; i < arrayLength; i++) {
	// pageLabel if present
	pageLabel = pageContainers[i].textContent;
	if (pageLabel !== '') {
	  // get page id from first zone div's id
	  zoneDivID = parseInt(idFromZone[veridianStyle].exec(ZU.xpathText(pageContainers[i+1], '@id'))[1]);
	  // remove leading "Page " from label (if present)
	  pageLabels[zoneDivID] = pageLabel.replace(/^Page /, '');
	  pageLabel = '';
	}
	else {
	  // this is a zone <div> or <a> - capture its page id if it belongs to current article
	// the articleKey is in the onmouseover attribute
	if ((ZU.xpath(pageContainers[i], '@onmouseover').length > 0) 
	  && (ZU.xpathText(pageContainers[i], '@onmouseover').includes(articleKeyOnMouseOver))) {
	  page = parseInt(idFromZone[veridianStyle].exec(ZU.xpathText(pageContainers[i], '@id'))[1]);
	  if (!(articlePageIDs.includes(page))) {
		articlePageIDs.push(page);
	  }
	  if (articleTitle === '') {
		// now's our chance to get the article title
		articleTitle = ZU.xpathText(pageContainers[i], '@title');
	  }
	}
	}
  }

  if (articlePageIDs.length == 1) {
	newItem.pages = pageLabels[articlePageIDs[0]];
  } else if (articlePageIDs.length > 1) {
	pageIDs = articlePageIDs.sort();
	var pages = '';
	arrayLength = pageIDs.length;
	for (i = 0; i < arrayLength; i++) {
	  if (pages !== '') {
		pages += ', ';
	  }
	  pages += pageLabels[pageIDs[i]];
	}
	newItem.pages = pages;
  }

  // we should now have the title
  newItem.title = articleTitle;
  
  // get array of paragraphs of content, render to a note
  var textContainer = ZU.xpath(textTab, '//div[@id="documentdisplayleftpanesectiontextcontainer" or @id="veridiandocumentdisplayleftpanesectiontextcontainer"]');
  var content = ZU.xpath(textContainer, 'p');
  var note = '';
  arrayLength = content.length;
  for (i = 0; i < arrayLength; i++) {
	note += '<p>' + content[i].textContent + '</p>\n';
  }
  newItem.notes.push({note: note});
  
  newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://stanforddailyarchive.com/cgi-bin/stanford?a=d&d=stanford19640423-01.2.15&srpos=2&e=-------en-20--1--txt-txIN-microfilm------",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [
					{
						"note": "<p>Library Microfilm Readers Moved</p>\n<p>During the Spring Vacation, the microfilm and ficrocard readers, the newspapers on microfilm, and the Xerox and Filmac copiers were moved from their basement location to allow the contractor to continue the alterations to the basement. A temporary home for the Xerox and the Filmac has been found in room 304, which may be reached by the stairs to the right of the loan desk. Government Documents Division has taken on the microfilmed \"Papers of the Presidents\" and a microfilm an a microcard reader. The remaining readers and the newspapers on microfilm have been moved into the Hopkins area of the Humanities reading room. The newspaper room has been closed due to th e construction work, and bound volumes must be requested from the Current Periodicals Desk in the Humanities Room. By September, everything will be returned to new and more spacious basement quarters.</p>\n"
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "The Stanford Daily",
				"date": "1964-04-23",
				"publicationTitle": "The Stanford Daily",
				"url": "https://stanforddailyarchive.com/cgi-bin/stanford?a=d&d=stanford19640423-01.2.15",
				"pages": "2",
				"title": "Library Microfilm Readers Moved"
			}
		]
	},
	{
		"type": "web",
		"url": "https://newspapers.case.edu/?a=d&d=TRW19350319-01.2.24&srpos=6&e=-------en-20--1--txt-txIN-binkley------",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [
					{
						"note": "<p>Future Hatch Books Will Come Canned, Binkley Says</p>\n<p>By Frank Coll A library full of little cans of film in the future when bookmarks will be as useful as hat Perhaps our own Hatch Library even darker than it is now will be full of students pursuing their studies with the aid of little black machines</p>\n<p>which project pictures of printed pages before their eyes. Such may be the library of fifty years hence if the new process of book production pointed out by Robert Binkley, Professor History at Mather to the American Association of Learned Societies</p>\n<p>and the Social Science Federation, comes to be adopted. Micro-photography is the process which Binkley, in his report as chairman of the joint committee on materials for research of associations, called \"the most flexible j system of book production since the I fifteenth century. It consists of copying a photographically re- 1 duced page on to a 16 m. m. film, from which it is projected on a flat : surface for reading. It is especial value in reproducing books artrl monticfirinf-Q wViieVl horn 11 SP flf</p>\n<p>their technical or nature, will not bear the cost printing. According to Binkley a manu- ^</p>\n<p>script can be reproduced in this way for approximately one-fif-teenth the lowest figure mimeographing. The process, which the report says should have \"as great an impact to culture as printing\" is hut recent lv flpvolnnnrl lrnf fViv«o4</p>\n<p>ens a revolution in the publishing industry. Because of its great economy it is now being adopted by the government reproduce the tremendous volume of printing connected with hearings under NRA and by University for publishing internal papers and old manuscripts. Although said to be \"in the same state of development as automobile in 1912,\" micro-photography was characterized as \"exceedingly important by the Saturday Review of Literature which devoted much editorial space to Binkley's report.</p>\n"
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Case Western Reserve University",
				"date": "1935-03-19",
				"publicationTitle": "The Reserve Weekly",
				"url": "https://newspapers.case.edu/?a=d&d=TRW19350319-01.2.24",
				"pages": "3",
				"title": "Future Hatch Books Will Come Canned, Binkley Says"
			}
		]
	}
]
/** END TEST CASES **/
