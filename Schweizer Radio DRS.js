{
	"translatorID": "a8e51f4e-0372-42ad-81a8-bc3dcea6dc03",
	"label": "Schweizer Radio DRS",
	"creator": "ibex",
	"target": "^http://((www\\.)?drs[123]?\\.ch/.)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:43:41"
}

/*
	DRS Translator - Parses Schweizer Radio DRS articles and creates Zotero-based
	metadata.
	Copyright (C) 2011 ibex

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

/*
Reference URLs:
  Radio full: http://www.drs.ch/www/de/drs/sendungen/echo-der-zeit/2646.sh10192671.html
  Radio part: http://www.drs.ch/www/de/drs/sendungen/echo-der-zeit/2646.bt10192689.html
  Archive: http://www.drs.ch/www/de/drs/sendungen/top/echo-der-zeit/2646.portal.html
  Search: http://www.drs1.ch/www/suche?query=Google

  Archive: http://www.drs2.ch/www/de/drs2/sendungen/top/atlas.html
  Radio: http://www.drs2.ch/www/de/drs2/sendungen/atlas/2613.sh10184026.html

  Radio: http://www.drs3.ch/www/de/drs3/sendungen/input/2672.sh10193191.html
*/

/* Zotero API */
function detectWeb(doc, url) {
	// Z.debug("ibex detectWeb URL = " + url);
	// Main broadcast with sub broadcasts
	if (doc.location.href.match(/.*\/sendungen\/.*\.(bt|sh)/i) && (ZU.xpath(doc, '//div[@id = "article"]').length > 0)) {
		return "radioBroadcast";
	// Archive pages
	} else if ((doc.location.href.match(/.+\/suche/i) && ZU.xpath(doc, '//div[@id = "search_results" ]').length > 0)
			|| (ZU.xpath(doc, '//div[' + containingClass('content_teaser') + ']').length > 0)
			|| (ZU.xpath(doc, '//div[' + containingClass('detail') + ']').length > 0)) {
		return "multiple";
	// Broadcasts with no sub broadcasts
	} else 	if (doc.location.href.match(/.*\/(sendungen|themen)\/.+/i) && (ZU.xpath(doc, '//div[@id = "article"]').length > 0)) {
		return "radioBroadcast";
	}
}

/* Zotero API */
function doWeb(doc, url) {
	// Z.debug("ibex doWeb URL = " + url);
	var urls = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items;
		if (ZU.xpath(doc, '//div[@id = "search_results" ]').length > 0) {
			items = ZU.getItemArray(doc, doc.getElementById("search_results"), '\/(sendungen|themen)\/.+');
		} else if (ZU.xpath(doc, '//div[' + containingClass('content_teaser') + ']').length > 0) {
			items = ZU.getItemArray(doc, doc.getElementsByClassName("content_teaser"), '\/(sendungen|themen)\/.+');
		} else if (ZU.xpath(doc, '//div[' + containingClass('detail') + ']').length > 0) {
			items = ZU.getItemArray(doc, doc.getElementsByClassName("detail"), '(sendungen|themen)\/.+');
		}
		if (!items || countObjectProperties(items) == 0) {
			return true;
		}
		items = Z.selectItems(items);
		if (!items) {
			return true;
		}

		for (var i in items) {
			urls.push(i);
		}
	} else {
		urls.push(doc.location.href);
	}
	ZU.processDocuments(urls, scrape, function() { Z.done(); } );
	Z.wait();
}

/* Zotero API */
function scrape(doc) {
	// Z.debug("ibex scrape URL = " + doc.location.href);

	// Fetch meta tags and fill meta tag array for associateMeta() function
	var metaTags = fetchMeta(doc);

	var newItem = new Z.Item('radioBroadcast');
	newItem.url = doc.location.href;

	associateMeta(newItem, metaTags, "DC.title", "title");
	associateMeta(newItem, metaTags, "DC.date.issued", "date");
	associateMeta(newItem, metaTags, "DC.publisher", "network");
	associateMeta(newItem, metaTags, "SRG.rubric2", "programTitle");
	// Other potentially usful meta data: SRG.heading, DC.keywords

	newItem.language = 'de';

	var abstract = ZU.xpath(doc, '//div[@id = "article"]//div[' + containingClass('longtext') + ']');
	if (abstract.length > 0) {
		newItem.abstractNote = ZU.trimInternal(abstract[0].textContent);
	}

	var runningTime = ZU.xpath(doc, '//div[@id = "article"]//a[@class = "beitrag_hoeren"]');
	if (runningTime.length > 0) {
		newItem.runningTime = ZU.trimInternal(runningTime[0].textContent.match(/(\d|:)+/)[0]);
	}

	var authors = ZU.xpath(doc, '//div[@id = "article"]//div[@id = "verantwortlich"]//li');
	for (var i = 0; i < authors.length; i++) {
		var author = authors[i].textContent;
		// Remove prefix
		author = author.replace(/(Redaktion: )|(Moderation: )|(Autor: )|(Autorin: )|(Autor\/Autorin: )|(Redaktion und Moderation: )/, "");
		newItem.creators.push(ZU.cleanAuthor(author, "author"));
	}

	newItem.complete();
}

/*
 * There is no built-in function to count object properties which often are used as associative arrays.
 *
 * @param {Object} obj Associative array
 * @return {int} Number of object properties = ength of associative array
 */
function countObjectProperties(obj) {
	var size = 0;
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
}

/**
	* Fetch meta tags and fill meta tag array for associateMeta() function
	*
	* @param {element} doc Document DOM
	* @return {Object} Associative array (Object) of meta tags, array[name] = value
	*/
function fetchMeta(doc) {
	var metaTagHTML = doc.getElementsByTagName("meta");
	var metaTags = new Object();
	for (var i = 0 ; i < metaTagHTML.length ; i++) {
		metaTags[metaTagHTML[i].getAttribute("name")] = metaTagHTML[i].getAttribute("content");
	}
	return metaTags;
}

/**
 * Adds an HTML meta tag to a Zotero item field.
 * The meta tags array can be filled with fetchMeta() function.
 *
 * @param {Object} newItem The Zotero item
 * @param {Object} metaTags Associative array (Object) of meta tags, array[name] = value
 * @param {String} name The meta tag name
 * @param {String} zoteroField The Zotero field name in the Zotero item.
 * @return {null} Nothing is returned
 */
function associateMeta(newItem, metaTags, name, zoteroField) {
  if (metaTags[name]) {
	newItem[zoteroField] = ZU.trimInternal(metaTags[name]);
  }
}

/**
 * Generates a partial xpath expression that matches an element whose 'class' attribute
 * contains the given CSS className. So to match &lt;div class='foo bar'&gt; you would
 * say "//div[" + containingClass("foo") + "]".
 *
 * Reference: http://pivotallabs.com/users/alex/blog/articles/427-xpath-css-class-matching
 *
 * @param {String} className CSS class name
 * @return {String} XPath fragment
 */
function containingClass(className) {
  return "contains(concat(' ',normalize-space(@class),' '),' " + className + " ')";
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.drs.ch/www/de/drs/sendungen/echo-der-zeit/2646.sh10192671.html",
		"items": [
			{
				"itemType": "radioBroadcast",
				"creators": [
					{
						"firstName": "Ursula",
						"lastName": "Hürzeler",
						"creatorType": "author"
					},
					{
						"firstName": "Markus",
						"lastName": "Mugglin",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.drs.ch/www/de/drs/sendungen/echo-der-zeit/2646.sh10192671.html",
				"title": "Micheline Calmy-Rey zu ihrem Rücktritt",
				"date": "2011-09-07T18:00:00+02:00",
				"network": "Schweizer Radio DRS",
				"programTitle": "Echo der Zeit",
				"language": "de",
				"abstractNote": "Bundespräsidentin Micheline Calmy Rey tritt im Dezember nicht mehr an zur Wiederwahl. Nach neun Jahren im Amt möchte sich die 66jährige mehr Zeit für ihre Familie nehmen. Das Interview. Mehr",
				"runningTime": "45:07",
				"libraryCatalog": "Schweizer Radio DRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.drs1.ch/www/suche?query=Google",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.drs2.ch/www/de/drs2/sendungen/top/atlas.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/