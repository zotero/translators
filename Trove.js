{
	"translatorID": "8efcb7cb-4180-4555-969a-08e8b34066c4",
	"label": "Trove",
	"creator": "Tim Sherratt and Abe Jellinek",
	"target": "^https?://trove\\.nla\\.gov\\.au/(?:newspaper|gazette|work|book|article|picture|music|map|collection|search)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-06 04:17:30"
}

/*
   Trove Translator
   Copyright (C) 2016-2021 Tim Sherratt (tim@discontents.com.au, @wragge)
						   and Abe Jellinek

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (url.includes('/search/') || url.includes('/newspaper/page')) {
		return getSearchResults(doc, url, true) ? 'multiple' : false;
	}
	else if (url.includes('/newspaper/article')) {
		return "newspaperArticle";
	}
	else if (url.includes('/work/')) {
		let formatContainer = doc.querySelector('#workContainer .format');
		if (!formatContainer) {
			if (doc.querySelector('.versions')) {
				return "multiple";
			}
			else {
				// monitoring the entire body feels like overkill, but no other
				// selector works. we just monitor until the page is built and
				// we can detect a type.
				Zotero.monitorDOMChanges(doc.body);
				return false;
			}
		}
		
		return checkType(formatContainer.innerText);
	}
	return false;
}


function getSearchResults(doc, url, checkOnly) {
	var items = {};
	var urls = [];
	var titles = [];
	var found = false;
	if (url.includes('/search/')) {
		for (let container of doc.querySelectorAll('.result')) {
			let link = container.querySelector('.title a');
			urls.push(link.href);
			titles.push(link.textContent);
		}
	}
	else if (url.includes('/work/')) {
		for (let container of doc.querySelectorAll('.version-container')) {
			urls.push(attr(container, 'a', 'href'));
			// titles are usually the same, so we'll disambiguate using the publication year
			titles.push(text(container, '.year') + ': ' + text(container, '.title'));
		}
	}
	else {
		for (let container of doc.querySelectorAll('ol.articles li a.link')) {
			urls.push(container.href);
			titles.push(container.textContent);
		}
	}
	for (var i = 0; i < urls.length; i++) {
		var link = urls[i];
		var title = ZU.trimInternal(titles[i]);
		if (!title || !link) continue;
		if (checkOnly) return true;
		found = true;
		items[link] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, url), function (items) {
			if (!items) return;

			for (var i in items) {
				// Pass the current document as context for cookie
				// retrieval and API-key computation.
				scrape(null, i, doc/* docContext */);
			}
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url, docContext = doc) {
	if (url.includes('/newspaper/article/')) {
		scrapeNewspaper(doc, url);
	}
	else {
		scrapeWork(doc, url, docContext);
	}
}


function scrapeNewspaper(doc, url) {
	var articleID = url.match(/newspaper\/article\/(\d+)/)[1];
	var bibtexURL = "http://trove.nla.gov.au/newspaper/citations/bibtex-article-" + articleID + ".bibtex";

	ZU.HTTP.doGet(bibtexURL, function (bibtex) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibtex);

		// Clean up the BibTex results and add some extra stuff.
		translator.setHandler("itemDone", function (obj, item) {
			item.itemType = 'newspaperArticle';
			item.pages = item.numPages;
			item.publicationTitle = cleanPublicationTitle(item.publicationTitle);
			item.place = cleanPlace(item.place);
			delete item.numPages;
			delete item.type;
			delete item.itemID;

			// doc is null during multiple call
			if (doc) {
				item.abstractNote = ZU.xpathText(doc, "//meta[@property='og:description']/@content");
				// Add tags
				var tags = ZU.xpath(doc, "//ul[contains(@class,'nlaTagContainer')]/li");
				for (let tag of tags) {
					tag = ZU.xpathText(tag, "div/a[not(contains(@class,'anno-remove'))]");
					item.tags.push(tag);
				}
			}

			// I've created a proxy server to generate the PDF and return the URL without locking up the browser.
			var proxyURL = "https://trove-proxy.herokuapp.com/pdf/" + articleID;
			ZU.doGet(proxyURL, function (pdfURL) {
				// With the last argument 'false' passed to doGet
				// we allow all status codes to continue and reach
				// the item.complete() command.
				if (pdfURL.startsWith('http')) {
					item.attachments.push({
						url: pdfURL,
						title: 'Trove newspaper PDF',
						mimeType: 'application/pdf'
					});
				}
				else {
					Zotero.debug("No PDF because unexpected return from trove-proxy " + proxyURL);
					Zotero.debug(pdfURL);
				}

				// Get the OCRd text and save in a note.
				var textURL = "http://trove.nla.gov.au/newspaper/rendition/nla.news-article" + articleID + ".txt";
				ZU.HTTP.doGet(textURL, function (text) {
					item.notes.push({
						note: text.trim()
					});
					item.complete();
				});
			}, null, null, null, false);
		});
		translator.translate();
	});
}


function cleanPublicationTitle(pubTitle) {
	if (!pubTitle) return pubTitle;
	// Australian Worker (Sydney, NSW : 1913 - 1950) -> Australian Worker
	// the place info is duplicated in the place field
	return pubTitle.replace(/\([^)]+\)/, '');
}


function cleanPlace(place) {
	if (!place) return place;
	
	let replacements = {
		'Vic.': 'Victoria',
		'Qld.': 'Queensland',
		SA: 'South Australia',
		'S.A.': 'South Australia',
		'S.Aust.': 'South Australia',
		'Tas.': 'Tasmania',
		WA: 'Western Australia',
		'W.A.': 'Western Australia',
		NSW: 'New South Wales',
		'N.S.W.': 'New South Wales',
		ACT: 'Australian Capital Territory',
		'A.C.T.': 'Australian Capital Territory',
		NT: 'Northern Territory',
		'N.T.': 'Northern Territory'
	};
	
	for (let [from, to] of Object.entries(replacements)) {
		place = place.replace(from, to);
	}
	
	return place;
}


var troveTypes = {
	Book: "book",
	"Article/Book chapter": "bookSection",
	Thesis: "thesis",
	"Archived website": "webpage",
	"Conference Proceedings": "book",
	"Audio book": "book",
	Article: "journalArticle",
	"Article/Journal or magazine article": "journalArticle",
	"Article/Conference paper": "conferencePaper",
	"Article/Report": "report",
	Map: "map",
	"Map/Aerial photograph; Photograph": "map",
	Photograph: "artwork",
	"Poster, chart, other": "artwork",
	"Art work": "artwork",
	Object: "artwork",
	Sound: "audioRecording",
	Video: "videoRecording",
	"Printed music": "book",
	Unpublished: "manuscript",
	Published: "document"
};


// Map a semicolon-separated Trove item type string to one Zotero item type
function checkType(string) {
	for (let [trove, zotero] of Object.entries(troveTypes)) {
		if (string.endsWith(trove)) {
			return zotero;
		}
	}
	
	let lastSemicolon = string.lastIndexOf('; ');
	if (lastSemicolon != -1) {
		return checkType(string.substring(0, lastSemicolon));
	}
	else {
		return 'book';
	}
}


// Sometimes authors are a little messy and we need to clean them
// e.g. author = { Bayley, William A. (William Alan), 1910-1981 },
// results in
//   "firstName": "1910-1981, William A. (William Alan)",
//   "lastName": "Bayley"
// Trove occasionally gives us author strings like "Australian Institute of
// Health and Welfare" that the BibTeX translator will split, but there's not
// much we can do, because that's the correct behavior. we could try to compare
// BibTeX authors to the HTML, but that won't work for multiples.
function cleanCreators(creators) {
	for (let creator of creators) {
		if (creator.fieldMode || !creator.firstName) continue;
		var name = creator.firstName;
		name = name.replace(/\(?\d{4}-\d{0,4}\)?,?/, "").trim();
		var posParenthesis = name.indexOf("(");
		if (posParenthesis > -1) {
			var first = name.substr(0, posParenthesis);
			var second = name.substr(posParenthesis + 1, name.length - posParenthesis - 2);
			if (second.includes(first.replace('.', '').trim())) {
				name = second;
			}
			else {
				name = first;
			}
		}
		creator.firstName = name.trim();
	}
	return creators;
}


function cleanPublisher(publisher) {
	if (!publisher) return publisher;
	
	let parts = publisher.split(':').map(s => s.trim());
	if (parts.length == 2) {
		return { place: cleanPlace(parts[0]), publisher: parts[1] };
	}
	else {
		return { place: parts[0] };
	}
}


function cleanEdition(text) {
	if (!text) return text;
	
	// from Taylor & Francis eBooks translator, slightly adapted
	
	const ordinals = {
		first: "1",
		second: "2",
		third: "3",
		fourth: "4",
		fifth: "5",
		sixth: "6",
		seventh: "7",
		eighth: "8",
		ninth: "9",
		tenth: "10"
	};
	
	text = ZU.trimInternal(text).replace(/[[\]]/g, '');
	// this somewhat complicated regex tries to isolate the number (spelled out
	// or not) and make sure that it isn't followed by any extra info
	let matches = text
		.match(/^(?:(?:([0-9]+)(?:st|nd|rd|th)?)|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth))(?:\s?ed?\.?|\sedition)?$/i);
	if (matches) {
		let edition = matches[1] || matches[2];
		edition = ordinals[edition.toLowerCase()] || edition;
		return edition == "1" ? null : edition;
	}
	else {
		return text;
	}
}

function scrapeWork(doc, url, docContext) {
	var thumbnailURL;

	var workID = url.match(/\/work\/([0-9]+)/)[1];
	// version ID seems to always be undefined now
	var bibtexURL = `https://trove.nla.gov.au/api/citation/work/${workID}?version=undefined`;
	
	if (doc) {
		thumbnailURL = attr(doc, '.thumbnail img', 'src');
	}

	// Get the BibTex and feed it to the translator.
	ZU.HTTP.doGet(bibtexURL, function (respText) {
		// bibtex puts tags in the wrong field, but it's alright, they're mostly... bad
		// we should restore if we can come up with a good cleaning method
		// (exclude dates, tags that are the same as the item title or author,
		//  approximate duplicates, ...)
		var bibtex = JSON.parse(respText).bibtex;
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibtex);
		translator.setHandler("itemDone", function (obj, item) {
			item.itemType = checkType(item.type);
			item.creators = cleanCreators(item.creators);
			item.edition = cleanEdition(item.edition);
			
			Object.assign(item, cleanPublisher(item.publisher));
			
			if (item.itemType == 'artwork' && item.type) {
				item.artworkMedium = item.type;
				delete item.type;
			}
			
			if (item.notes && item.notes.length == 1) {
				// abstract goes into a note, but we want it in abstractNote
				// (with HTML tags removed)
				item.abstractNote = ZU.cleanTags(item.notes.pop().note);
			}

			// Attach a link to the contributing repository if available
			if (item.url) {
				item.attachments.push({
					title: "Record from contributing repository",
					url: item.url,
					mimeType: 'text/html',
					snapshot: false
				});
			}

			if (thumbnailURL) {
				item.attachments.push({
					url: thumbnailURL,
					title: 'Trove thumbnail image',
					mimeType: 'image/jpeg'
				});
			}
			item.complete();
		});
		translator.translate();
	}, null, null, {
		Referer: 'https://trove.nla.gov.au/',
		apikey: apiKeyGen(doc || docContext)
	});
}


// Get a cookie's value by key from the document.
function getCookie(doc, key) {
	let field = doc.cookie.split("; ").find(row => row.startsWith(`${key}=`));
	return field ? field.split("=")[1] : undefined;
}


// Compute the API key using cookie info.
// See the source under Webpack path trove-vue/src/service/services.js
function apiKeyGen(doc) {
	let xctx = getCookie(doc, "x-ctx");
	if (typeof xctx === "undefined") {
		return "";
	}
	return md5("Wonder" + xctx).replace(/^0+/, "");
}


// Minfied MD5 digest function.
// See https://pajhome.org.uk/crypt/md5/md5.html
/* eslint-disable */
function md5(d){function rstr2hex(d){for(var _,m="0123456789abcdef",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function rstr2binl(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function binl2rstr(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function binl_md5(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}return rstr2hex(binl2rstr(binl_md5(rstr2binl(d),8*d.length)))}
/* eslint-enable */

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/work/9958833",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Experiences of a meteorologist in South Australia",
				"creators": [
					{
						"firstName": "Clement Lindley",
						"lastName": "Wragge",
						"creatorType": "author"
					}
				],
				"date": "1980",
				"ISBN": "9780908065073",
				"abstractNote": "Reprinted from Good words for 1887/ edited by Donald Macleod, published: London: Isbister and Co",
				"itemID": "trove.nla.gov.au/work/9958833",
				"language": "English",
				"libraryCatalog": "Trove",
				"place": "Warradale, South Australia",
				"publisher": "Pioneer Books",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/newspaper/article/70068753",
		"defer": true,
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'WRAGGE.'",
				"creators": [],
				"date": "7 Feb 1903",
				"abstractNote": "We have received a copy of the above which is a journal devoted chiefly to the science of meteorology. It is owned and conducted by Mr. Clement ...",
				"libraryCatalog": "Trove",
				"place": "Victoria",
				"publicationTitle": "Sunbury News",
				"url": "http://nla.gov.au/nla.news-article70068753",
				"attachments": [
					{
						"title": "Trove newspaper PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Meteorology Journal - Clement Wragge"
					}
				],
				"notes": [
					{
						"note": "<html>\n  <head>\n    <title>07 Feb 1903 - 'WRAGGE.'</title>\n  </head>\n  <body>\n      <p>Sunbury News (Vic. : 1900 - 1927), Saturday 7 February 1903, page 4</p>\n      <hr/>\n    <div class='zone'><p>'WRAGGE' - we have received a copy of the above, which is a journal devoted chiefly to the science of meteorology. It is owned and conducted by Mr. Clement Wragge. </p></div>\n  </body>\n</html>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/search/advanced/category/newspapers?l-artType=newspapers&l-australian=y&keyword=wragge",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/search/category/books?keyword=wragge",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/newspaper/page/7013947",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/work/9531118?q&sort=holdings+desc&_=1483112824975&versionId=14744047",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/work/208456891",
		"defer": true,
		"items": [
			{
				"itemType": "artwork",
				"title": "Walter Wragge",
				"creators": [],
				"date": "1912",
				"artworkMedium": "Photograph",
				"itemID": "trove.nla.gov.au/work/208456891",
				"language": "en",
				"libraryCatalog": "Trove",
				"url": "http://collections.slsa.sa.gov.au/resource/B+49301",
				"attachments": [
					{
						"title": "Record from contributing repository",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Trove thumbnail image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/work/11424419/version/264796991%20264796992",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "AUSTRALIA'S WELFARE 1993 Services and Assistance (30 June 1994)",
				"creators": [
					{
						"firstName": "Australian Institute of",
						"lastName": "Health",
						"creatorType": "author"
					},
					{
						"lastName": "Welfare",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1994-06-30",
				"ISSN": "1321-1455",
				"issue": "14 of 1994",
				"itemID": "trove.nla.gov.au/work/11424419",
				"language": "English",
				"libraryCatalog": "Trove",
				"publicationTitle": "Australia's welfare : services and assistance",
				"attachments": [
					{
						"title": "Trove thumbnail image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://trove.nla.gov.au/work/245696250",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Conducting a systematic review : a practical guide",
				"creators": [
					{
						"firstName": "Freya",
						"lastName": "MacMillan",
						"creatorType": "author"
					},
					{
						"firstName": "Kate A.",
						"lastName": "McBride",
						"creatorType": "author"
					},
					{
						"firstName": "Emma S.",
						"lastName": "George",
						"creatorType": "author"
					},
					{
						"firstName": "Genevieve Z.",
						"lastName": "Steiner",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"itemID": "trove.nla.gov.au/work/245696250",
				"language": "eng",
				"libraryCatalog": "Trove",
				"place": "Singapore, Springer",
				"publisher": "Singapore, Springer",
				"shortTitle": "Conducting a systematic review",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
