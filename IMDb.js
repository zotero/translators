{
	"translatorID": "a30274ac-d3d1-4977-80f4-5320613226ec",
	"label": "IMDb",
	"creator": "Avram Lyon",
	"target": "^https?://www\\.imdb\\.com/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-04-28 00:33:00"
}

/*
   IMDB Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	if (url.match(/\/title\/tt\d+/)) {
		return "film";
	} else if (url.match(/\/find\?/)) {
		return "multiple";
	}
}

function doWeb(doc, url) {
	var n = doc.documentElement.namespaceURI;
	var ns = n ?
	function (prefix) {
		if (prefix == 'x') return n;
		else return null;
	} : null;

	var ids = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var results = doc.evaluate('//td[a[contains(@href,"/title/tt")]]', doc, ns, XPathResult.ANY_TYPE, null);
		var items = new Array();
		var result;
		while (result = results.iterateNext()) {
			var link = doc.evaluate('./a[contains(@href,"/title/tt")]', result, ns, XPathResult.ANY_TYPE, null).iterateNext();
			var title = result.textContent;
			//Zotero.debug(link.href);
			var url = link.href.match(/\/title\/(tt\d+)/)[1];
			items[url] = title;
		}

		Zotero.selectItems(items, function (items) {
			if (!items) {
				Zotero.done();
				return true;
			}
			for (var i in items) {
				ids.push(i);
			}
			apiFetch(ids);
		});
	} else {
		var id = url.match(/\/title\/(tt\d+)/)[1];
		apiFetch([id]);
	}
	Zotero.wait();
}

// Takes IMDB IDs and makes items
function apiFetch(ids) {
	var apiRoot = "http://imdbapi.com/?tomatoes=true&i=";
	for (i in ids) ids[i] = apiRoot + ids[i];
	Zotero.Utilities.doGet(ids, parseIMDBapi, function () {
		Zotero.done()
	});
}

// parse result from imdbapi.com
// should be json
function parseIMDBapi(text, response, url) {
	//Zotero.debug(url);
	//Zotero.debug(text);
	try {
		var obj = JSON.parse(text);
	} catch (e) {
		Zotero.debug("JSON parse error");
		throw e;
	}
	var item = new Zotero.Item("film");
	item.title = obj.Title;
	item.date = obj.Released ? obj.Released : obj.Year;
	item.genre = obj.Genre;
	if (obj.Director) item = addCreator(item, obj.Director, "director");
	if (obj.Writer) item = addCreator(item, obj.Writer, "scriptwriter");
	if (obj.Actors) item = addCreator(item, obj.Actors, "contributor");
	item.abstractNote = obj.Plot;
	item.attachments.push({
		url: obj.Poster,
		title: "Poster"
	});
	item.runningTime = obj.Runtime;
	item.extra = "IMDB ID: " + obj.ID;
	item.extra += "; IMDB Rating: " + obj.Rating + " (" + obj.Votes + " votes)";
	item.extra += "; Rotten Tomatoes: " + obj.tomatoRating + " (" + obj.tomatoReviews + " reviews " + " " + obj.tomatoFresh + " fresh, " + obj.tomatoRotten + " rotten)" + ", Tomato Meter: " + obj.tomatoMeter;
	item.complete();
}

function addCreator(item, creator, type) {
	if (creator == "N/A") {
		Zotero.debug("Discarding " + type + "=" + creator);
		return item;
	}
	var broken = creator.split(",");
	for (i in broken) {
		item.creators.push(Zotero.Utilities.cleanAuthor(broken[i], type));
	}
	return item;
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.imdb.com/title/tt0089276/",
		"items": [
			{
				"itemType": "film",
				"creators": [
					{
						"firstName": "Luis",
						"lastName": "Puenzo",
						"creatorType": "director"
					},
					{
						"firstName": "Aída",
						"lastName": "Bortnik",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Luis",
						"lastName": "Puenzo",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Norma",
						"lastName": "Aleandro",
						"creatorType": "contributor"
					},
					{
						"firstName": "Héctor",
						"lastName": "Alterio",
						"creatorType": "contributor"
					},
					{
						"firstName": "Chunchuna",
						"lastName": "Villafañe",
						"creatorType": "contributor"
					},
					{
						"firstName": "Hugo",
						"lastName": "Arana",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Poster"
					}
				],
				"title": "The Official Story",
				"date": "8 Nov 1985",
				"genre": "Drama, History, Thriller, War",
				"abstractNote": "After the end of the Dirty War, a high school teacher sets out to find out who the mother of her adopted daughter is.",
				"runningTime": "1 hr 52 mins",
				"extra": "IMDB ID: tt0089276; IMDB Rating: 7.7 (3036 votes); Rotten Tomatoes: N/A (N/A reviews  N/A fresh, N/A rotten), Tomato Meter: N/A",
				"libraryCatalog": "IMDb"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.imdb.com/find?q=shakespeare&s=tt",
		"items": "multiple"
	}
]
/** END TEST CASES **/