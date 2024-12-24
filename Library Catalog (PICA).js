{
	"translatorID": "1b9ed730-69c7-40b0-8a06-517a89a3a278",
	"label": "Library Catalog (PICA)",
	"creator": "Sean Takats, Michael Berkowitz, Sylvain Machefert, Sebastian Karcher, Stéphane Gully, Mathis Eon",
	"target": "^https?://[^/]+(/[^/]+)*//?DB=\\d",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 248,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-26 15:26:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2013 Sean Takats, Michael Berkowitz, Sylvain Machefert, Sebastian Karcher, Stéphane Gully
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function getSearchResults(doc) {
	return doc.evaluate(
		"//table[@summary='short title presentation']/tbody/tr//td[contains(@class, 'rec_title')]|//table[@summary='hitlist']/tbody/tr//td[contains(@class, 'hit') and a/@href]",
		doc, null, XPathResult.ANY_TYPE, null);
}

function detectWeb(doc, _url) {
	var multxpath = "//span[@class='tab1']|//td[@class='tab1']";
	var elt;
	if ((elt = doc.evaluate(multxpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext())) {
		var content = elt.textContent;
		// Z.debug(content)
		if ((content == "Liste des résultats") || (content == "shortlist") || (content == 'Kurzliste') || content == 'titellijst') {
			if (!getSearchResults(doc).iterateNext()) {
			// no results. Does not seem to be necessary, but just in case.
				return false;
			}

			return "multiple";
		}
		else if (content == "Notice détaillée"
				|| content == "title data"
				|| content == 'Titeldaten'
				|| content == 'Vollanzeige'
				|| content == 'Besitznachweis(e)'
				|| content == 'full title'
				|| content == 'Titelanzeige'
				|| content == 'titelgegevens'
				|| content == 'Detailanzeige') {
			var xpathimage = "//span[@class='rec_mat_long']/img|//table[contains(@summary, 'presentation')]/tbody/tr/td/img";
			if ((elt = doc.evaluate(xpathimage, doc, null, XPathResult.ANY_TYPE, null).iterateNext())) {
				var type = elt.getAttribute('src');
				// Z.debug(type);
				if (type.includes('article.')) {
					// book section and journal article have the same icon
					// we can check if there is an ISBN
					if (ZU.xpath(doc, '//tr/td[@class="rec_lable" and .//span[starts-with(text(), "ISBN")]]').length) {
						return 'bookSection';
					}
					return "journalArticle";
				}
				else if (type.includes('audiovisual.')) {
					return "film";
				}
				else if (type.includes('book.')) {
					return "book";
				}
				else if (type.includes('handwriting.')) {
					return "manuscript";
				}
				else if (type.includes('sons.') || type.includes('sound.') || type.includes('score')) {
					return "audioRecording";
				}
				else if (type.includes('thesis.')) {
					return "thesis";
				}
				else if (type.includes('map.')) {
					return "map";
				}
			}
			return "book";
		}
	}
	return false;
}

function scrape(doc, url) {
	var zXpath = '//span[@class="Z3988"]';
	var eltCoins = doc.evaluate(zXpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	var newItem = new Zotero.Item();
	if (eltCoins) {
		var coins = eltCoins.getAttribute('title');
	
		// newItem.repository = "SUDOC"; // do not save repository
		// make sure we don't get stuck because of a COinS error
		try {
			Zotero.Utilities.parseContextObject(coins, newItem);
		}
		catch (e) {
			Z.debug("error parsing COinS");
		}

		/** we need to clean up the results a bit **/
		// pages should not contain any extra characters like p. or brackets (what about supplementary pages?)
		if (newItem.pages) newItem.pages = newItem.pages.replace(/[^\d-]+/g, '');
	}

	newItem.itemType = detectWeb(doc, url);
	newItem.libraryCatalog = "Library Catalog - " + doc.location.host;
	// We need to correct some informations where COinS is wrong
	var rowXpath = '//tr[td[@class="rec_lable"]]';
	if (!ZU.xpathText(doc, rowXpath)) {
		rowXpath = '//tr[td[@class="preslabel"]]';
	}
	var tableRows = doc.evaluate(rowXpath, doc, null, XPathResult.ANY_TYPE, null);
	
	var tableRow, role;
	var authorpresent = false;
	while ((tableRow = tableRows.iterateNext())) {
		var field = doc.evaluate('./td[@class="rec_lable"]|./td[@class="preslabel"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		var value = doc.evaluate('./td[@class="rec_title"]|./td[@class="presvalue"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		
		field = ZU.trimInternal(ZU.superCleanString(field.trim()))
			.toLowerCase().replace(/\(s\)/g, '');
				
		// With COins, we only get one author - so we start afresh. We do so in two places: Here if there is an author fied
		// further down for other types of author fields. This is so we don't overwrite the author array when we have both an author and
		// another persons field (cf. the Scheffer/Schachtschabel/Blume/Thiele test)
		if (field == "author" || field == "auteur" || field == "verfasser") {
			authorpresent = true;
			newItem.creators = [];
		}

		// Z.debug(field + ": " + value)
		// french, english, german, and dutch interface
		var m;
		var i;
		switch (field) {
			case 'auteur':
			case 'author':
			case 'medewerker':
			case 'beteiligt':
			case 'verfasser':
			case 'other persons':
			case 'sonst. personen':
			case 'collaborator':
			case 'beiträger': // turn into contributor
			case 'contributor':
				if (field == 'medewerker' || field == 'beteiligt' || field == 'collaborator') role = "editor";
				if (field == 'beiträger' || field == 'contributor') role = "contributor";
				
				// we may have set this in the title field below
				else if (!role) role = "author";
				
				if (!authorpresent) newItem.creators = [];
				if (authorpresent && (field == "sonst. personen" || field == "other persons")) role = "editor";
				
				// sudoc has authors on separate lines and with different format - use this
				var authors;
				var author;
				if (/sudoc\.(abes\.)?fr/.test(url)) {
					authors = ZU.xpath(tableRow, './td[2]/div');
					for (i in authors) {
						var authorText = authors[i].textContent;
						var authorFields = authorText.match(/^\s*(.+?)\s*(?:\((.+?)\)\s*)?\.\s*([^.]+)\s*$/);
						var authorFunction = '';
						if (authorFields) {
							authorFunction = authorFields[3];
							authorText = authorFields[1];
							var extra = authorFields[2];
						}
						if (authorFunction) {
							authorFunction = Zotero.Utilities.superCleanString(authorFunction);
						}
						var zoteroFunction = '';
						// TODO : Add other author types
						if (authorFunction == 'Traduction') {
							zoteroFunction = 'translator';
						}
						else if ((authorFunction.substr(0, 7) == 'Éditeur') || authorFunction == "Directeur de la publication") {
							// once Zotero suppports it, distinguish between editorial director and editor here;
							zoteroFunction = 'editor';
						}
						else if ((newItem.itemType == "thesis") && (authorFunction != 'Auteur')) {
							zoteroFunction = "contributor";
						}
						else {
							zoteroFunction = 'author';
						}

						if (authorFunction == "Université de soutenance" || authorFunction == "Organisme de soutenance") {
							// If the author function is "université de soutenance"	it means that this author has to be in "university" field
							newItem.university = authorText;
							newItem.city = extra; // store for later
						}
						else {
							author = authorText.replace(/[*(].+[)*]/, "");
							newItem.creators.push(Zotero.Utilities.cleanAuthor(author, zoteroFunction, true));
						}
					}
				}
				else {
					authors = value.split(/\s*;\s*/);
					for (i in authors) {
						if (role == "author") if (/[[()]Hrsg\.?[\])]/.test(authors[i])) role = "editor";
						author = authors[i].replace(/[*([].+[)*\]]/, "");
						var comma = author.includes(",");
						newItem.creators.push(Zotero.Utilities.cleanAuthor(author, role, comma));
					}
				}
				break;
			
			case 'edition':
			case 'ausgabe':
				var edition;
				if ((edition = value.match(/(\d+)[.\s]+(Aufl|ed|éd)/))) {
					newItem.edition = edition[1];
				}
				else newItem.edition = value;
				break;

			case 'dans':
			case 'in':
				// Looks like we can do better with titles than COinS
				// journal/book titles are always first
				// Several different formats for ending a title
				// end with "/" http://gso.gbv.de/DB=2.1/PPNSET?PPN=732386977
				//              http://gso.gbv.de/DB=2.1/PPNSET?PPN=732443563
				// end with ". -" followed by publisher information http://gso.gbv.de/DB=2.1/PPNSET?PPN=729937798
				// end with ", ISSN" (maybe also ISBN?) http://www.sudoc.abes.fr/DB=2.1/SET=6/TTL=1/SHW?FRST=10
				newItem.publicationTitle = ZU.superCleanString(
					value.substring(0, value.search(/(?:\/|,\s*IS[SB]N\b|\.\s*-)/i)));

				// ISSN/ISBN are easyto find
				// http://gso.gbv.de/DB=2.1/PPNSET?PPN=732386977
				// http://gso.gbv.de/DB=2.1/PPNSET?PPN=732443563
				var issnRE = /\b(is[sb]n)\s+([-\d\sx]+)/i;	// this also matches ISBN
				m = value.match(issnRE);
				if (m) {
					if (m[1].toUpperCase() == 'ISSN' && !newItem.ISSN) {
						newItem.ISSN = m[2].replace(/\s+/g, '');
					}
					else if (m[1].toUpperCase() == 'ISBN' && !newItem.ISBN) {
						newItem.ISBN = m[2].replace(/\s+/g, '');
					}
				}

				// publisher information can be preceeded by ISSN/ISBN
				// typically / ed. by ****. - city, country : publisher
				// http://gso.gbv.de/DB=2.1/PPNSET?PPN=732386977
				var n = value;
				if (m) {
					n = value.split(m[0])[0];
					
					// first editors
					var ed = n.split('/');	// editors only appear after /
					if (ed.length > 1) {
						n = n.substr(ed[0].length + 1);	// trim off title
						ed = ed[1].split('-', 1)[0];
						n = n.substr(ed.length + 1);	// trim off editors
						if (ed.includes('ed. by')) {	// not http://gso.gbv.de/DB=2.1/PPNSET?PPN=732443563
							ed = ed.replace(/^\s*ed\.\s*by\s*|[.\s]+$/g, '')
									.split(/\s*(?:,|and)\s*/);	// http://gso.gbv.de/DB=2.1/PPNSET?PPN=731519299
							for (i = 0, m = ed.length; i < m; i++) {
								newItem.creators.push(ZU.cleanAuthor(ed[i], 'editor', false));
							}
						}
					}
					var loc = n.split(':');
					if (loc.length == 2) {
						if (!newItem.publisher) newItem.publisher = loc[1].replace(/^\s+|[\s,]+$/, '');
						if (!newItem.place) newItem.place = loc[0].replace(/\s*\[.+?\]\s*/, '').trim();
					}

					// we can now drop everything up through the last ISSN/ISBN
					n = value.split(issnRE).pop();
				}
				// For the rest, we have trouble with some articles, like
				// http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=013979922
				// we'll only take the last set of year, volume, issue

				// There are also some other problems, like
				// "How to cook a russian goose / by Robert Cantwell" at http://opc4.kb.nl

				// page ranges are last
				// but they can be indicated by p. or page (or s?)
				// http://www.sudoc.abes.fr/DB=2.1/SET=6/TTL=1/SHW?FRST=10
				// http://opc4.kb.nl/DB=1/SET=2/TTL=1/SHW?FRST=7
				// we'll just assume there are always pages at the end and ignore the indicator
				n = n.split(',');
				var pages = n.pop().match(/\d+(?:\s*-\s*\d+)/);
				if (pages && !newItem.pages) {
					newItem.pages = pages[0];
				}
				n = n.join(','); // there might be empty values that we're joining here
				// could filter them out, but IE <9 does not support Array.filter, so we won't bother
				// we're left possibly with some sort of formatted volume year issue string
				// it's very unlikely that we will have 4 digit volumes starting with 19 or 20, so we'll just grab the year first
				var dateRE = /\b(?:19|20)\d{2}\b/g;
				var date, lastDate;
				while ((date = dateRE.exec(n))) {
					lastDate = date[0];
					n = n.replace(lastDate, '');	// get rid of year
				}
				if (lastDate) {
					if (!newItem.date) newItem.date = lastDate;
				}
				else {	// if there's no year, panic and stop trying
					break;
				}
				
				// volume comes before issue
				// but there can sometimes be other numeric stuff that we have
				// not filtered out yet, so we just take the last two numbers
				// e.g. http://gso.gbv.de/DB=2.1/PPNSET?PPN=732443563
				var issvolRE = /[\d/]+/g;	// in French, issues can be 1/4 (e.g. http://www.sudoc.abes.fr/DB=2.1/SRCH?IKT=12&TRM=013979922)
				var num, vol, issue;
				while ((num = issvolRE.exec(n))) {
					if (issue != undefined) {
						vol = issue;
						issue = num[0];
					}
					else if (vol != undefined) {
						issue = num[0];
					}
					else {
						vol = num[0];
					}
				}
				if (vol != undefined && !newItem.volume) {
					newItem.volume = vol;
				}
				if (issue != undefined && !newItem.issue) {
					newItem.issue = issue;
				}
				break;

			case 'serie':
			case 'collection':
			case 'series':
			case 'schriftenreihe':
			case 'reeks':
				// The series isn't in COinS
				var series = value;
				var volRE = /;[^;]*?(\d+)\s*$/;
				if ((m = series.match(volRE))) {
					if (ZU.fieldIsValidForType('seriesNumber', newItem.itemType)) { // e.g. http://gso.gbv.de/DB=2.1/PPNSET?PPN=729937798
						if (!newItem.seriesNumber) newItem.seriesNumber = m[1];
					}
					else if (!newItem.volume) {
						// e.g. http://www.sudoc.fr/05625248X
						newItem.volume = m[1];
					}
					series = series.replace(volRE, '').trim();
				}
				newItem.seriesTitle = newItem.series = series;	// see http://forums.zotero.org/discussion/18322/series-vs-series-title/
				break;

			case 'titre':
			case 'title':
			case 'titel':
			case 'title of article':
			case 'aufsatztitel':
				var title = value.split(" / ");
				if (title[1]) {
					// Z.debug("Title1: "+title[1])
					// store this to convert authors to editors.
					// Run separate if in case we'll do this for more languages
					// this assumes title precedes author - need to make sure that's the case
					if (title[1].match(/^\s*(ed. by|edited by|hrsg\. von|édité par)/)) role = "editor";
				}
				if (!newItem.title) {
					newItem.title = title[0];
				}
				newItem.title = newItem.title.replace(/\s+:/, ":").replace(/\s*\[[^\]]+\]/g, "");
				break;

			case 'periodical':
			case 'zeitschrift':
				// for whole journals
				var journaltitle = value.split(" / ")[0];
				break;

			case 'year':
			case 'jahr':
			case 'jaar':
			case 'date':
				newItem.date = value; // we clean this up below
				break;

			case 'language':
			case 'langue':
			case 'sprache':
				// Language not defined in COinS
				newItem.language = value;
				break;

			case 'editeur':
			case 'published':
			case 'publisher':
			case 'ort/jahr':
			case 'uitgever':
			case 'publication':
				// ignore publisher for thesis, so that it does not overwrite university
				if (newItem.itemType == 'thesis' && newItem.university) break;

				m = value.split(';')[0]; // hopefully publisher is always first (e.g. http://www.sudoc.fr/128661828)
				var place = m.split(':', 1)[0];
				var pub = m.substring(place.length + 1); // publisher and maybe year
				if (!newItem.city) {
					place = place.replace(/[[\]]/g, '').trim();
					if (place.toUpperCase() != 'S.L.') {	// place is not unknown
						newItem.city = place;
					}
				}

				if (!newItem.publisher) {
					if (!pub) break; // not sure what this would be or look like without publisher
					pub = pub.replace(/\[.*?\]/g, '')	// drop bracketted info, which looks to be publisher role
									.split(',');
					if (/\D\d{4}\b/.test(pub[pub.length - 1])) {	// this is most likely year, we can drop it
						pub.pop();
					}
					if (pub.length) newItem.publisher = pub.join(',');	// in case publisher contains commas
				}
				if (!newItem.date) {	// date is always (?) last on the line
					m = value.match(/\D(\d{4})\b[^,;]*$/);	// could be something like c1986
					if (m) newItem.date = m[1];
				}
				break;

			case 'pays':
			case 'country':
			case 'land':
				if (!newItem.country) {
					newItem.country = value;
				}
				break;

			case 'description':
			case 'extent':
			case 'umfang':
			case 'omvang':
			case 'kollation':
			case 'collation':
				value = ZU.trimInternal(value); // Since we assume spaces
				
				// We're going to extract the number of pages from this field
				m = value.match(/(\d+) vol\./);
				// sudoc in particular includes "1 vol" for every book; We don't want that info
				if (m && m[1] != 1) {
					newItem.numberOfVolumes = m[1];
				}
				
				// make sure things like 2 partition don't match, but 2 p at the end of the field do
				// f., p., and S. are "pages" in various languages
				// For multi-volume works, we expect formats like:
				// x-109 p., 510 p. and X, 106 S.; 123 S.
				var numPagesRE = /\[?((?:[ivxlcdm\d]+[ ,-]*)+)\]?\s+([fps]|pages?)\b/ig,
					numPages = [];
				while ((m = numPagesRE.exec(value))) {
					numPages.push(m[1].replace(/ /g, '')
						.replace(/[-,]/g, '+')
						.toLowerCase() // for Roman numerals
					);
				}
				if (numPages.length) newItem.numPages = numPages.join('; ');
				
				// running time for movies:
				m = value.match(/\d+\s*min/);
				if (m) {
					newItem.runningTime = m[0];
				}
				break;

			case 'résumé':
			case 'abstract':
			case 'inhalt':
			case 'samenvatting':
				newItem.abstractNote = value;
				break;

			case 'notes':
			case 'note':
			case 'anmerkung':
			case 'snnotatie':
			case 'annotatie':
				newItem.notes.push({
					note: doc.evaluate('./td[@class="rec_title"]|./td[@class="presvalue"]', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext().innerHTML
				});
				break;

			case 'sujets':
			case 'subjects':
			case 'subject heading':
			case 'trefwoord':
			case 'schlagwörter':
			case 'gattung/fach':
			case 'category/subject':

				var subjects = doc.evaluate('./td[2]/div', tableRow, null, XPathResult.ANY_TYPE, null);
				// subjects on separate div lines
				if (ZU.xpath(tableRow, './td[2]/div').length > 1) {
					var subject;
					while ((subject = subjects.iterateNext())) {
						var subjectContent = subject.textContent;
						subjectContent = subjectContent.replace(/^\s*/, "");
						subjectContent = subjectContent.replace(/\s*$/, "");
						subjectContent = subjectContent.split(/\s*;\s*/);
						for (i in subjectContent) {
							if (subjectContent != "") {
								newItem.tags.push(Zotero.Utilities.trimInternal(subjectContent[i]));
							}
						}
					}
				}
				else {
					// subjects separated by newline or ; in same div.
					subjects = value.trim().split(/\s*[;\n]\s*/);
					for (i in subjects) {
						subjects[i] = subjects[i].trim().replace(/\*/g, "").replace(/^\s*\/|\/\s*$/, "");
						if (subjects[i].length != 0) newItem.tags.push(Zotero.Utilities.trimInternal(subjects[i]));
					}
				}
				break;

			case 'thèse':
			case 'dissertation':
				newItem.type = value.split(/ ?:/)[0];
				break;

			case "identifiant pérenne de la notice":
			case 'persistent identifier of the record':
			case 'persistent identifier des datensatzes':
				var permalink = value;	// we handle this at the end
				break;
			
			case 'doi':
				newItem.DOI = value.trim();
				break;

			case 'isbn':
				var isbns = value.trim().split(/[\n,]/);
				var isbn = [];
				for (i in isbns) {
					m = isbns[i].match(/[-x\d]{10,}/i);	// this is necessary until 3.0.12
					if (!m) continue;
					if (/^(?:\d{9}|\d{12})[\dx]$/i.test(m[0].replace(/-/g, ''))) {
						isbn.push(m[0]);
					}
				}
				// we should eventually check for duplicates, but right now this seems fine;
				newItem.ISBN = isbn.join(", ");
				break;
			
			case 'signatur':
				newItem.callNumber = value;
				break;
			case 'worldcat':
				// SUDOC only
				var worldcatLink = doc.evaluate('./td[2]//a', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext();
				if (worldcatLink) {
					newItem.attachments.push({
						url: worldcatLink.href,
						title: 'Worldcat Link',
						mimeType: 'text/html',
						snapshot: false
					});
				}
				break;

			case 'links zum titel':
			case 'volltext':
			case 'link zum volltext':
			case 'link':
			case 'zugang':
			case 'accès en ligne':
				// Some time links are inside the third cell : https://kxp.k10plus.de/DB=2.1/DB=2.1/PPNSET?PPN=600530787
				url = doc.evaluate('./td[3]//a | ./td[2]//a', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext();
				if (url) {
					newItem.url = url.href;
				}
				break;
		}
	}

	// merge city & country where they're separate
	var location = [];
	if (newItem.city) location.push(newItem.city.trim());
	newItem.city = undefined;
	if (newItem.country) location.push(newItem.country.trim());
	newItem.country = undefined;
	
	// join and remove the "u.a." common in German libraries
	if (location.length) newItem.place = location.join(', ').replace(/\[?u\.a\.\]?\s*$/, "");
	
	// remove u.a. and [u.a.] from publisher
	if (newItem.publisher) {
		newItem.publisher = newItem.publisher.replace(/\[?u\.a\.\]?\s*$/, "");
	}
	
	// clean up date, which may come from various places; We're conservative here and are just cleaning up c1996 and [1995] and combinations thereof
	if (newItem.date) {
		newItem.date = newItem.date.replace(/[[c]+\s*(\d{4})\]?/, "$1");
	}

	// if we didn't get a permalink, look for it in the entire page
	if (!permalink) {
		permalink = ZU.xpathText(doc, '//a[./img[contains(@src,"/permalink") or contains(@src,"/zitierlink")]][1]/@href');
	}
	
	// switch institutional authors to single field;
	for (i = 0; i < newItem.creators.length; i++) {
		if (!newItem.creators[i].firstName) {
			newItem.creators[i].fieldMode = 1;
		}
	}
	if (permalink) {
		newItem.attachments.push({
			title: 'Link to Library Catalog Entry',
			url: permalink,
			mimeType: 'text/html',
			snapshot: false
		});
		// also add snapshot using permalink so that right-click -> View Online works
		newItem.attachments.push({
			title: 'Library Catalog Entry Snapshot',
			url: permalink,
			mimeType: 'text/html',
			snapshot: true
		});
	}
	else {
		// add snapshot
		newItem.attachments.push({
			title: 'Library Catalog Entry Snapshot',
			document: doc
		});
	}

	if (!newItem.title) newItem.title = journaltitle;
	newItem.complete();
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "multiple") {
		var newUrl = doc.evaluate('//base/@href', doc, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
		// fix for sudoc, see #1529 and #2022
		if (/sudoc\.(abes\.)?fr/.test(url)) {
			newUrl = newUrl.replace(/cbs\/\/?DB=/, 'cbs/xslt/DB=');
		}
		var elmts = getSearchResults(doc);
		var elmt = elmts.iterateNext();

		var availableItems = {};
		do {
			var link = doc.evaluate(".//a/@href", elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
			var searchTitle = doc.evaluate(".//a", elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			availableItems[newUrl + link] = searchTitle;
		} while ((elmt = elmts.iterateNext()));
		Zotero.selectItems(availableItems, function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/cbs/xslt/DB=2.1//CMD?ACT=SRCHA&IKT=1016&SRT=RLV&TRM=labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/cbs/xslt/DB=2.1//SRCH?IKT=12&TRM=147745608",
		"items": [
			{
				"itemType": "book",
				"title": "Souffrance au travail dans les grandes entreprises",
				"creators": [
					{
						"firstName": "Jacques",
						"lastName": "Delga",
						"creatorType": "editor"
					},
					{
						"firstName": "Fabrice",
						"lastName": "Bien",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"ISBN": "9782747217293",
				"language": "français",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"numPages": "290",
				"place": "Paris, France",
				"publisher": "Eska",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Conditions de travail -- France"
					},
					{
						"tag": "Harcèlement -- France"
					},
					{
						"tag": "Psychologie du travail"
					},
					{
						"tag": "Stress lié au travail -- France"
					},
					{
						"tag": "Violence en milieu de travail"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/cbs/xslt/DB=2.1//SRCH?IKT=12&TRM=156726319",
		"items": [
			{
				"itemType": "book",
				"title": "Zotero: a guide for librarians, researchers and educators",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Puckett",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISBN": "9780838985892",
				"language": "anglais",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"numPages": "159",
				"place": "Chicago, Etats-Unis d'Amérique",
				"publisher": "Association of College and Research Libraries",
				"shortTitle": "Zotero",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Bibliographie -- Méthodologie -- Informatique"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/cbs/xslt/DB=2.1//SRCH?IKT=12&TRM=093838956",
		"items": [
			{
				"itemType": "thesis",
				"title": "Facteurs pronostiques des lymphomes diffus lymphocytiques",
				"creators": [
					{
						"firstName": "Brigitte",
						"lastName": "Lambert",
						"creatorType": "author"
					},
					{
						"firstName": "Pierre",
						"lastName": "Morel",
						"creatorType": "contributor"
					}
				],
				"date": "2004",
				"language": "français",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"numPages": "87",
				"place": "Lille ; 1969-2017, France",
				"thesisType": "Thèse d'exercice",
				"university": "Université du droit et de la santé",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Leucémie chronique lymphocytaire à cellules B -- Dissertation universitaire"
					},
					{
						"tag": "Leucémie lymphoïde chronique"
					},
					{
						"tag": "Lymphocytes B"
					},
					{
						"tag": "Lymphocytes B -- Dissertation universitaire"
					},
					{
						"tag": "Lymphome malin non hodgkinien -- Dissertation universitaire"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudoc.abes.fr/cbs/xslt/DB=2.1/SRCH?IKT=12&TRM=127261664",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mobile technology in the village: ICTs, culture, and social logistics in India",
				"creators": [
					{
						"firstName": "Sirpa",
						"lastName": "Tenhunen",
						"creatorType": "author"
					}
				],
				"date": "impr. 2008",
				"ISSN": "1359-0987",
				"issue": "3",
				"language": "anglais",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"pages": "515-534",
				"publicationTitle": "Journal of the Royal Anthropological Institute",
				"shortTitle": "Mobile technology in the village",
				"volume": "14",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Communes rurales -- Technique -- Société -- Inde"
					},
					{
						"tag": "Conditions sociales -- Inde -- 20e siècle"
					},
					{
						"tag": "Téléphonie mobile -- Société -- Inde"
					}
				],
				"notes": [
					{
						"note": "\n<div><span>Contient un résumé en anglais et en français. - in Journal of the Royal Anthropological Institute, vol. 14, no. 3 (Septembre 2008)</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudoc.abes.fr/cbs/xslt/DB=2.1/SRCH?IKT=12&TRM=128661828",
		"items": [
			{
				"itemType": "film",
				"title": "Exploring the living cell",
				"creators": [
					{
						"firstName": "Véronique",
						"lastName": "Kleiner",
						"creatorType": "author"
					},
					{
						"firstName": "Christian",
						"lastName": "Sardet",
						"creatorType": "author"
					}
				],
				"date": "cop. 2006",
				"abstractNote": "Ensemble de 20 films permettant de découvrir les protagonistes de la découverte de la théorie cellulaire, l'évolution, la diversité, la structure et le fonctionnement des cellules. Ce DVD aborde aussi en images les recherches en cours dans des laboratoires internationaux et les débats que ces découvertes sur la cellule provoquent. Les films sont regroupés en 5 chapitres complétés de fiches informatives et de liens Internet.",
				"distributor": "CNRS Images",
				"language": "anglais",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"runningTime": "180 min",
				"url": "http://bioclips.com/dvd/index.html",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Biogenèse des organelles"
					},
					{
						"tag": "Biologie cellulaire"
					},
					{
						"tag": "Cell membranes"
					},
					{
						"tag": "Cells"
					},
					{
						"tag": "Cells -- Evolution"
					},
					{
						"tag": "Cells -- Moral and ethical aspects"
					},
					{
						"tag": "Cellules"
					},
					{
						"tag": "Cellules -- Aspect moral"
					},
					{
						"tag": "Cellules -- Évolution"
					},
					{
						"tag": "Cytologie -- Recherche"
					},
					{
						"tag": "Cytology -- Research"
					},
					{
						"tag": "Membrane cellulaire"
					},
					{
						"tag": "QH582.4"
					},
					{
						"tag": "Ultrastructure"
					}
				],
				"notes": [
					{
						"note": "\n<div><span>Les différents films qui composent ce DVD sont réalisés avec des prises de vue réelles, ou des images microcinématographiques ou des images de synthèse, ou des images fixes tirées de livres. La bande son est essentiellement constituée de commentaires en voix off et d'interviews (les commentaires sont en anglais et les interviews sont en langue originales : anglais, français ou allemand, sous-titrée en anglais). - Discovering the cell : participation de Paul Nurse (Rockefeller university, New York), Claude Debru (ENS : Ecole normale supérieure, Paris) et Werner Franke (DKFZ : Deutsches Krebsforschungszentrum, Heidelberg) ; Membrane : participation de Kai Simons, Soizig Le Lay et Lucas Pelkmans (MPI-CBG : Max Planck institute of molecular cell biology and genetics, Dresden) ; Signals and calcium : participation de Christian Sardet et Alex Mc Dougall (CNRS / UPMC : Centre national de la recherche scientifique / Université Pierre et Marie Curie, Villefrance-sur-Mer) ; Membrane traffic : participation de Thierry Galli et Phillips Alberts (Inserm = Institut national de la santé et de la recherche médicale, Paris) ; Mitochondria : participation de Michael Duchen, Rémi Dumollard et Sean Davidson (UCL : University college of London) ; Microfilaments : participation de Cécile Gauthier Rouvière et Alexandre Philips (CNRS-CRBM : CNRS-Centre de recherche de biochimie macromoléculaire, Montpellier) ; Microtubules : participation de Johanna Höög, Philip Bastiaens et Jonne Helenius (EMBL : European molecular biology laboratory, Heidelberg) ; Centrosome : participation de Michel Bornens et Manuel Théry (CNRS-Institut Curie, Paris) ; Proteins : participation de Dino Moras et Natacha Rochel-Guiberteau (IGBMC : Institut de génétique et biologie moléculaire et cellulaire, Strasbourg) ; Nocleolus and nucleus : participation de Daniele Hernandez-Verdun, Pascal Rousset, Tanguy Lechertier (CNRS-UPMC / IJM : Institut Jacques Monod, Paris) ; The cell cycle : participation de Paul Nurse (Rockefeller university, New York) ; Mitosis and chromosomes : participation de Jan Ellenberg, Felipe Mora-Bermudez et Daniel Gerlich (EMBL, Heidelberg) ; Mitosis and spindle : participation de Eric Karsenti, Maiwen Caudron et François Nedelec (EMBL, Heidelberg) ; Cleavage : participation de Pierre Gönczy, Marie Delattre et Tu Nguyen Ngoc (Isrec : Institut suisse de recherche expérimentale sur le cancer, Lausanne) ; Cellules souches : participation de Göran Hermerén (EGE : European group on ethics in science and new technologies, Brussels) ; Cellules libres : participation de Jean-Jacques Kupiec (ENS, Paris) ; Cellules et évolution : participation de Paule Nurse (Rockefeller university, New York)</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sudoc.abes.fr/cbs/xslt/DB=2.1//SRCH?IKT=12&TRM=098846663",
		"items": [
			{
				"itemType": "map",
				"title": "Wind and wave atlas of the Mediterranean sea",
				"creators": [],
				"date": "2004",
				"ISBN": "9782110956743",
				"language": "anglais",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"publisher": "Western European Union, Western European armaments organisation research cell",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Méditerranée (mer)"
					},
					{
						"tag": "Météorologie maritime -- Méditerranée (mer)"
					},
					{
						"tag": "Vagues -- Méditerranée (mer)"
					},
					{
						"tag": "Vent de mer -- Méditerranée (mer)"
					},
					{
						"tag": "Vents -- Méditerranée (mer)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudoc.abes.fr/cbs/xslt/DB=2.1/SRCH?IKT=12&TRM=05625248X",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "English music for mass and offices (II) and music for other ceremonies",
				"creators": [
					{
						"firstName": "Ernest H.",
						"lastName": "Sanders",
						"creatorType": "editor"
					},
					{
						"firstName": "Frank Llewellyn",
						"lastName": "Harrison",
						"creatorType": "editor"
					},
					{
						"firstName": "Peter M.",
						"lastName": "Lefferts",
						"creatorType": "editor"
					}
				],
				"date": "1986",
				"label": "Éditions de l'oiseau-lyre",
				"language": "latin",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"place": "Monoco, Monaco",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Messes (musique) -- Partitions"
					},
					{
						"tag": "Motets -- Partitions"
					}
				],
				"notes": [
					{
						"note": "\n<div><span>Modern notation. - \"Critical apparatus\": p. 174-243</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudoc.abes.fr/cbs/xslt/DB=2.1/SRCH?IKT=12&TRM=013979922",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Health promotion by the family, the role of the family in enhancing healthy behavior, symposium 23-25 March 1992, Brussels",
				"creators": [
					{
						"lastName": "Organisation mondiale de la santé",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1992",
				"ISSN": "0003-9578",
				"issue": "1/4",
				"language": "français",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"pages": "3-232",
				"publicationTitle": "Archives belges de médecine sociale, hygiène, médecine du travail et médecine légale",
				"volume": "51",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Famille"
					},
					{
						"tag": "Santé publique"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://opac.tib.eu/DB=1/XMLPRS=N/PPN?PPN=620088028",
		"items": [
			{
				"itemType": "book",
				"title": "Phönix auf Asche: von Wäldern und Wandel in der Dübener Heide und Bitterfeld",
				"creators": [
					{
						"firstName": "Caroline Bleymüller",
						"lastName": "Möhring",
						"creatorType": "editor"
					}
				],
				"date": "2009",
				"ISBN": "9783941300149",
				"callNumber": "F 10 B 2134",
				"libraryCatalog": "Library Catalog - opac.tib.eu",
				"numPages": "140",
				"place": "Remagen",
				"publisher": "Kessel",
				"shortTitle": "Phönix auf Asche",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "*Dübener Heide / Regionalentwicklung / Landschaftsentwicklung / Forstwirtschaft"
					},
					{
						"tag": "*Waldsterben / Schadstoffimmission / Dübener Heide / Bitterfeld Region"
					}
				],
				"notes": [
					{
						"note": "<div>Förderkennzeichen BMBF 0330634 K. - Verbund-Nr. 01033571</div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://opac.sub.uni-goettingen.de/DB=1/XMLPRS=N/PPN?PPN=57161647X",
		"items": [
			{
				"itemType": "book",
				"title": "Das war das Waldsterben!",
				"creators": [
					{
						"lastName": "Klein",
						"creatorType": "author",
						"firstName": "Elmar"
					}
				],
				"date": "2008",
				"ISBN": "9783793095262",
				"abstractNote": "Verlagstext: Viele vermuten inzwischen richtig: Das Waldsterben, die schwere Schädigung der südwestdeutschen Wälder um 1983, war nicht von Luftschadstoffen verursacht.Vielmehr hatte ein Zusammentreffen natürlicher Waldkrankheiten zu jenem miserablen Aussehen der Bäume geführt. Das vorliegende Buch beschreibt erstmals diese Zusammenhänge in einfacher, übersichtlicher und für jeden Naturfreund leicht verständlicher Weise. Dabei lernt der Leser, die natürlichen Bedrohungen der Waldbäume mit ihren potentiellen Gefährdungen in den verschiedenen Jahreszeiten zu verstehen. In spannender, teilweise auch sehr persönlicher Darstellung wird er angeleitet, im Wald genauer hinzusehen, unter anderem die damaligen, zum Teil äußerst selten auftretenden, oft auch schwer erkennbaren Phänomene wahrzunehmen.Darüber hinaus wird deutlich, wie sehr der Mensch dazu neigt, natürliche, jedoch noch unverstandene Phänomene zu Angstszenarien zu stilisieren, und wie die öffentliche Meinung daraus politisch hoch wirksame Umweltthemen aufbauen kann. Für Waldbesitzer und Förster ist die Lektüre des Buches nahezu eine Pflicht, für Waldfreunde eine angenehme Kür.Betr. auch Schwarzwald",
				"callNumber": "48 Kle",
				"edition": "1",
				"libraryCatalog": "Library Catalog - opac.sub.uni-goettingen.de",
				"numPages": "164",
				"place": "Freiburg i. Br[eisgau]",
				"publisher": "Rombach",
				"series": "Rombach-Wissenschaften. Reihe Ökologie. - Freiburg, Br. : Rombach, 1992- ; ZDB-ID: 1139339-7",
				"seriesNumber": "8",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "*Baumkrankheit"
					},
					{
						"tag": "*Waldschaden"
					},
					{
						"tag": "*Waldsterben"
					},
					{
						"tag": "*Waldsterben / Geschichte"
					},
					{
						"tag": "Schwarzwald"
					},
					{
						"tag": "Waldsterben"
					}
				],
				"notes": [
					{
						"note": "<div>Archivierung/Langzeitarchivierung gewährleistet 2021 ; Forst (Rechtsgrundlage SLG). Hochschule für Forstwirtschaft</div><div>Archivierung prüfen 20240324 ; 1 (Rechtsgrundlage DE-4165</div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://swb.bsz-bw.de/DB=2.1/PPNSET?PPN=012099554&INDEXSET=1",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Borges por el mismo",
				"creators": [
					{
						"lastName": "Rodríguez Monegal",
						"creatorType": "author",
						"firstName": "Emir"
					},
					{
						"firstName": "Emir",
						"lastName": "Rodri%CC%81guez Monegal",
						"creatorType": "author"
					},
					{
						"firstName": "Jorge Luis",
						"lastName": "Borges",
						"creatorType": "author"
					}
				],
				"date": "1984",
				"ISBN": "9788472229679",
				"edition": "1. ed",
				"libraryCatalog": "Library Catalog - swb.bsz-bw.de",
				"numPages": "255",
				"place": "Barcelona",
				"publisher": "Ed. laia",
				"series": "Laia literatura",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "http://cbsopac.rz.uni-frankfurt.de/DB=2.1/PPNSET?PPN=318490412",
		"items": [
			{
				"itemType": "book",
				"title": "Daten- und Identitätsschutz in Cloud Computing, E-Government und E-Commerce",
				"creators": [],
				"ISBN": "9783642301025",
				"edition": "1st ed. 2012",
				"libraryCatalog": "Library Catalog - cbsopac.rz.uni-frankfurt.de",
				"url": "https://doi.org/10.1007/978-3-642-30102-5",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://lbssbb.gbv.de/DB=1/XMLPRS=N/PPN?PPN=717966224",
		"items": [
			{
				"itemType": "book",
				"title": "Politiques publiques, systèmes complexes",
				"creators": [
					{
						"firstName": "Danièle",
						"lastName": "Bourcier",
						"creatorType": "editor"
					},
					{
						"firstName": "Romain",
						"lastName": "Boulet",
						"creatorType": "editor"
					}
				],
				"date": "2012",
				"ISBN": "9782705682743",
				"callNumber": "1 A 845058",
				"libraryCatalog": "Library Catalog - lbssbb.gbv.de",
				"numPages": "290",
				"place": "Paris",
				"publisher": "Hermann Éd.",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "*Gesetzgebung / Rechtsprechung / Komplexes System"
					},
					{
						"tag": "*Law -- Philosophy -- Congresses"
					},
					{
						"tag": "Law -- Political aspects -- Congresses"
					},
					{
						"tag": "Rule of law -- Congresses"
					}
				],
				"notes": [
					{
						"note": "<div>Notes bibliogr. Résumés. Index</div><div>Issus du 1er Atelier Complexité &amp; politique publiques, organisé par l'Institut des systèmes complexes, à Paris les 23 et 24 septembre 2010. - Contient des contributions en anglais. - Notes bibliogr. Résumés. Index</div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lhiai.gbv.de/DB=1/XMLPRS=N/PPN?PPN=1914428323",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La temprana devoción de Borges por el norte",
				"creators": [
					{
						"firstName": "Gustavo",
						"lastName": "Rubén Giorgi",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISSN": "1515-4017",
				"libraryCatalog": "Library Catalog - lhiai.gbv.de",
				"pages": "61-71",
				"publicationTitle": "Proa",
				"volume": "83",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.sudoc.abes.fr/cbs/xslt/DB=2.1/SRCH?IKT=12&TRM=024630527",
		"items": [
			{
				"itemType": "book",
				"title": "Conférences sur l'administration et le droit administratif faites à l'Ecole impériale des ponts et chaussées",
				"creators": [
					{
						"firstName": "Léon",
						"lastName": "Aucoc",
						"creatorType": "author"
					}
				],
				"date": "1869-1876",
				"language": "français",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"numPages": "xii+xxiii+681+540+739",
				"place": "Paris, France",
				"publisher": "Dunod",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Droit administratif -- France"
					},
					{
						"tag": "Ponts et chaussées (administration) -- France"
					},
					{
						"tag": "Travaux publics -- Droit -- France"
					},
					{
						"tag": "Voirie et réseaux divers -- France"
					}
				],
				"notes": [
					{
						"note": "\n<div><span>Titre des tomes 2 et 3 : Conférences sur l'administration et le droit administratif faites à l'Ecole des ponts et chaussées</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudoc.abes.fr/cbs/xslt/DB=2.1/SRCH?IKT=12&TRM=001493817",
		"items": [
			{
				"itemType": "book",
				"title": "Traité de la juridiction administrative et des recours contentieux",
				"creators": [
					{
						"firstName": "Édouard",
						"lastName": "Laferrière",
						"creatorType": "author"
					},
					{
						"firstName": "Roland Préfacier",
						"lastName": "Drago",
						"creatorType": "author"
					}
				],
				"date": "1989",
				"ISBN": "9782275007908",
				"language": "français",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"numPages": "ix+670; 675",
				"numberOfVolumes": "2",
				"place": "Paris, France",
				"publisher": "Librairie générale de droit et de jurisprudence",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Contentieux administratif -- France -- 19e siècle"
					},
					{
						"tag": "Recours administratifs -- France"
					},
					{
						"tag": "Tribunaux administratifs -- France -- 19e siècle"
					},
					{
						"tag": "Tribunaux administratifs -- Études comparatives"
					}
				],
				"notes": [
					{
						"note": "\n<div><span>1, Notions générales et législation comparée, histoire, organisation compétence de la juridiction administrative. 2, Compétence (suite), marchés et autres contrats, dommages, responsabilité de l'état, traitements et pensions, contributions directes, élections, recours pour excés de pouvoir, interprétation, contraventions de grandes voirie</span></div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sudoc.abes.fr/cbs/xslt/DB=2.1/SRCH?IKT=12&TRM=200278649",
		"items": [
			{
				"itemType": "book",
				"title": "Il brutto all'opera: l'emancipazione del negativo nel teatro di Giuseppe Verdi",
				"creators": [
					{
						"firstName": "Gabriele",
						"lastName": "Scaramuzza",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"ISBN": "9788857515953",
				"language": "italien",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"numPages": "232",
				"place": "Milano, Italie",
				"publisher": "Mimesis",
				"shortTitle": "Il brutto all'opera",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Laideur -- Dans l'opéra"
					},
					{
						"tag": "ML410.V4. S36 2013"
					},
					{
						"tag": "Opera -- 19th century"
					},
					{
						"tag": "Ugliness in opera"
					},
					{
						"tag": "Verdi, Giuseppe (1813-1901) -- Thèmes, motifs"
					}
				],
				"notes": [
					{
						"note": "\n<div>\n<span>Table des matières disponible en ligne (</span><span><a class=\"\n\t\t\tlink_gen\n\t\t    \" target=\"\" href=\"http://catdir.loc.gov/catdir/toc/casalini11/13192019.pdf\">http://catdir.loc.gov/catdir/toc/casalini11/13192019.pdf</a></span><span>)</span>\n</div>\n<div><span>&nbsp;</span></div>\n<div><span>&nbsp;</span></div>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lbssbb.gbv.de/DB=1/XMLPRS=N/PPN?PPN=1748358820",
		"items": [
			{
				"itemType": "book",
				"title": "Modern and contemporary Taiwanese philosophy: traditional foundations and new developments",
				"creators": [],
				"date": "2021",
				"ISBN": "9781527562448",
				"abstractNote": "This collection contains 13 essays on modern and contemporary Taiwanese philosophy, written by outstanding scholars working in this field. It highlights the importance of Taiwanese philosophy in the second half of the 20th century. While the Chinese conceptual tradition (especially Confucianism) fell out of favor from the 1950s onwards and was often banned or at least severely criticized on the mainland, Taiwanese philosophers constantly strove to preserve and develop it. Many of them tried to modernize their own traditions through dialogs with Western thought, especially with the ideas of the European Enlightenment. However, it was not only about preserving tradition; in the second half of the 20th century, several complex and coherent philosophical systems emerged in Taiwan. The creation of these discourses is evidence of the great creativity and innovative power of many Taiwanese theorists, whose work is still largely unknown in the Western world.Intro -- Table of Contents -- Acknowledgements -- Editor's Foreword -- Introduction -- Modern and Contemporary Confucianism -- The Problem of \"Inner Sageliness and Outer Kingliness\" Revisited -- A Debate on Confucian Orthodoxy in Contemporary Taiwanese Confucian Thought -- A Phenomenological Interpretation of Mou Zongsan's Use of \"Transcendence\" and \"Immanence\" -- Modern Confucianism and the Methodology of Chinese Aesthetics -- Research on Daoist Philosophy -- Laozi's View of Presence and Absence, Movement and Stillness, and Essence and Function -- Characteristics of Laozi's \"Complementary Opposition\" Thought Pattern -- A General Survey of Taiwanese Studies on the Philosophy of the Wei-Jin Period in the Last Fifty Years of the 20th Century -- Logic and Methodology -- Qinghua School of Logic and the Origins of Taiwanese Studies in Modern Logic -- Discussing the Functions and Limitations of Conveying \"Concepts\" in Philosophical Thinking -- Taiwanese Philosophy from the East Asian and Global Perspective -- How is it Possible to \"Think from the Point of View of East Asia?\" -- Between Philosophy and Religion -- The Global Significance of Chinese/Taiwanese Philosophy in a Project -- Index of Special Terms and Proper Names.",
				"libraryCatalog": "Library Catalog - lbssbb.gbv.de",
				"place": "Newcastle-upon-Tyne",
				"publisher": "Cambridge Scholars Publishing",
				"shortTitle": "Modern and contemporary Taiwanese philosophy",
				"url": "http://erf.sbb.spk-berlin.de/han/872773256/ebookcentral.proquest.com/lib/staatsbibliothek-berlin/detail.action?docID=6416045",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "*Electronic books"
					},
					{
						"tag": "*Taiwan / Philosophie"
					}
				],
				"notes": [
					{
						"note": "<div>Description based on publisher supplied metadata and other sources.</div>"
					},
					{
						"note": "<div>Einzelnutzungslizenz</div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://swb.bsz-bw.de/DB=2.1/PPNSET?PPN=1703871782",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Calculation of the electronic, nuclear, rotational, and vibrational stopping cross sections for H atoms irradiation on H2, N2 and O2 gas targets at low collision energies",
				"creators": [
					{
						"firstName": "Abdel Ghafour",
						"lastName": "El Hachimi",
						"creatorType": "editor"
					}
				],
				"date": "2020",
				"ISSN": "1361-6455",
				"issue": "13",
				"libraryCatalog": "Library Catalog - swb.bsz-bw.de",
				"publicationTitle": "Journal of physics  : one of the major international journals in atomic, molecular and optical physics, covering the study of atoms, ion, molecules or clusters, their structure and interactions with particles, photons or fields",
				"url": "http://dx.doi.org/10.1088/1361-6455/ab8834",
				"volume": "53",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<div>Gesehen am 06.07.2020. - Im Titel ist die Zahl \"2\" jeweils tiefgestellt</div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://opac.tib.eu/DB=1/XMLPRS=N/PPN?PPN=1749375400",
		"items": [
			{
				"itemType": "book",
				"title": "An investigation into WEEE arising and not arising in Ireland (EEE2WEEE): (2017-RE-MS-9)",
				"creators": [
					{
						"firstName": "Yvonne",
						"creatorType": "author",
						"lastName": "Ryan-Fogarty"
					}
				],
				"date": "February 2021",
				"ISBN": "9781840959819",
				"edition": "Online version",
				"libraryCatalog": "Library Catalog - opac.tib.eu",
				"place": "Johnstown Castle, Co. Wexford, Ireland",
				"publisher": "Environmental Protection Agency",
				"series": "EPA Research report. - Johnstown Castle, Co. Wexford, Ireland : Environmental Protection Agency, 2014- ; ZDB-ID: 3045798-1",
				"seriesNumber": "366",
				"shortTitle": "An investigation into WEEE arising and not arising in Ireland (EEE2WEEE)",
				"url": "https://edocs.tib.eu/files/e01mr21/1749375400.pdf",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<div>WEEE = Waste Electrical and Electronic Equipment</div><div>Literaturverzeichnis: Seite 39-43</div><div>Archivierung/Langzeitarchivierung gewährleistet. TIB Hannover</div>"
					},
					{
						"note": "<div>Es gilt deutsches Urheberrecht. Das Werk bzw. der Inhalt darf zum eigenen Gebrauch kostenfrei heruntergeladen, konsumiert, gespeichert oder ausgedruckt, aber nicht im Internet bereitgestellt oder an Außenstehende weitergegeben werden. - German copyright law applies. The work or content may be downloaded, consumed, stored or printed for your own use but it may not be distributed via the internet or passed on to external parties.</div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://opac.sub.uni-goettingen.de/DB=1/XMLPRS=N/PPN?PPN=174526969X",
		"items": [
			{
				"itemType": "book",
				"title": "12 Strokes: A Case-Based Guide to Acute Ischemic Stroke Management",
				"creators": [
					{
						"firstName": "Ferdinand K.",
						"creatorType": "author",
						"lastName": "Hui"
					}
				],
				"date": "2021",
				"ISBN": "9783030568573",
				"libraryCatalog": "Library Catalog - opac.sub.uni-goettingen.de",
				"numPages": "337",
				"place": "Cham",
				"publisher": "Springer International Publishing AG",
				"shortTitle": "12 Strokes",
				"url": "https://ebookcentral.proquest.com/lib/subgoettingen/detail.action?docID=6454869",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Electronic books"
					}
				],
				"notes": [
					{
						"note": "<div>Description based on publisher supplied metadata and other sources.</div>"
					},
					{
						"note": "<div>Im Campus-Netz sowie für Angehörige der Universität Göttingen auch extern über Authentifizierungsmodul zugänglich. Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.</div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://cbsopac.rz.uni-frankfurt.de/DB=2.1/PPNSET?PPN=318490412",
		"items": [
			{
				"itemType": "book",
				"title": "Daten- und Identitätsschutz in Cloud Computing, E-Government und E-Commerce",
				"creators": [],
				"ISBN": "9783642301025",
				"edition": "1st ed. 2012",
				"libraryCatalog": "Library Catalog - cbsopac.rz.uni-frankfurt.de",
				"url": "https://doi.org/10.1007/978-3-642-30102-5",
				"attachments": [
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.sudoc.abes.fr/cbs/DB=2.1/SRCH?IKT=12&TRM=281455481",
		"items": [
			{
				"itemType": "book",
				"title": "Migrations: une odyssée humaine",
				"creators": [
					{
						"firstName": "Sylvie",
						"lastName": "Mazzella",
						"creatorType": "author"
					},
					{
						"firstName": "Christine",
						"lastName": "Verna",
						"creatorType": "author"
					},
					{
						"firstName": "Aline",
						"lastName": "Averbouh",
						"creatorType": "author"
					},
					{
						"firstName": "Hassan",
						"lastName": "Boubakri",
						"creatorType": "author"
					},
					{
						"firstName": "Souleymane Bachir",
						"lastName": "Diagne",
						"creatorType": "author"
					},
					{
						"firstName": "Adélie",
						"lastName": "Chevée",
						"creatorType": "author"
					},
					{
						"firstName": "Dana",
						"lastName": "Diminescu",
						"creatorType": "author"
					},
					{
						"firstName": "Florent",
						"lastName": "Détroit",
						"creatorType": "author"
					},
					{
						"firstName": "Théo",
						"lastName": "Ducharme",
						"creatorType": "author"
					},
					{
						"firstName": "Mustapha",
						"lastName": "El Miri",
						"creatorType": "author"
					},
					{
						"firstName": "Stéphanie",
						"lastName": "Garneau",
						"creatorType": "author"
					},
					{
						"firstName": "Sébastien",
						"lastName": "Gökalp",
						"creatorType": "author"
					},
					{
						"firstName": "Christian",
						"lastName": "Grataloup",
						"creatorType": "author"
					},
					{
						"firstName": "François",
						"lastName": "Héran",
						"creatorType": "author"
					},
					{
						"firstName": "Julien d'",
						"lastName": "Huy",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Ingicco",
						"creatorType": "author"
					},
					{
						"firstName": "Christophe",
						"lastName": "Lavelle",
						"creatorType": "author"
					},
					{
						"firstName": "Hélène",
						"lastName": "Le Bail",
						"creatorType": "author"
					},
					{
						"firstName": "Antoine",
						"lastName": "Lourdeau",
						"creatorType": "author"
					},
					{
						"firstName": "Nick",
						"lastName": "Mai",
						"creatorType": "author"
					},
					{
						"firstName": "Claire",
						"lastName": "Manen",
						"creatorType": "author"
					},
					{
						"firstName": "Cléo",
						"lastName": "Marmié",
						"creatorType": "author"
					},
					{
						"firstName": "Nathalie",
						"lastName": "Mémoire",
						"creatorType": "author"
					},
					{
						"firstName": "Marie-France",
						"lastName": "Mifune",
						"creatorType": "author"
					},
					{
						"firstName": "Swanie",
						"lastName": "Potot",
						"creatorType": "author"
					},
					{
						"firstName": "Nicolas",
						"lastName": "Puig",
						"creatorType": "author"
					},
					{
						"firstName": "Michelle",
						"lastName": "Salord",
						"creatorType": "author"
					},
					{
						"firstName": "Yann",
						"lastName": "Tephany",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Verdu",
						"creatorType": "author"
					},
					{
						"firstName": "Catherine",
						"lastName": "Wihtol de Wenden",
						"creatorType": "author"
					},
					{
						"firstName": "Wanda",
						"lastName": "Zinger",
						"creatorType": "author"
					},
					{
						"firstName": "Frédérique",
						"lastName": "Chlous-Ducharme",
						"creatorType": "editor"
					},
					{
						"firstName": "Gilles Préfacier",
						"lastName": "Bloch",
						"creatorType": "author"
					},
					{
						"lastName": "Musée de l'Homme",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2024",
				"ISBN": "9782382790328",
				"abstractNote": "Les conditions dans lesquelles des humains quittent leur pays soulèvent de nombreuses controverses. Le mot « migrant » ne désigne que rarement le fait brut de la mobilité ; il est chargé de jugements de valeur. Dans les discours politiques et médiatiques, l’omniprésence de certains termes participe à une rhétorique du danger ou de la nuisance : crise, invasion, remplacement, flot migratoire, pression démographique… Prenons un peu de recul. S’il n’y a pas de vie sans installation, il n’y a pas non plus de vie sans déplacement. Cette complémentarité entre stabilité et échanges est l’un des moteurs de la pérennité des espèces. Les migrations, en tant que déplacements des êtres humains dans l’espace, permettent également une diffusion des savoirs, des techniques, des cultures. Elles sont ainsi une part constitutive et fondamentale de nos sociétés, de nous-mêmes. En une vingtaine de chapitres clairs et accessibles, auxquels se mêlent des témoignages recueillis aux quatre coins du monde, ce catalogue invite, en complémentarité avec l’exposition, à adopter un regard critique et citoyen sur cette question d’actualité qui fait écho, aussi, aux premiers temps de l’humanité (site web de l’éditeur)",
				"language": "français",
				"libraryCatalog": "Library Catalog - www.sudoc.abes.fr",
				"numPages": "228",
				"place": "Paris, France",
				"publisher": "Muséum national d'histoire naturelle",
				"shortTitle": "Migrations",
				"attachments": [
					{
						"title": "Worldcat Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to Library Catalog Entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Library Catalog Entry Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					{
						"tag": "Migrations de peuples"
					},
					{
						"tag": "Préhistoire"
					}
				],
				"notes": [
					{
						"note": "<div><span>Autres contributeurs : Adélie Chevée, Dana Diminescu, Florent Détroit, Théo Ducharme, Mustapha El Miri, Stéphanie Garneau, Sébastien Gökalp, Christian Grataloup, François Héran, Julien d'Huy, Thomas Ignicco, Christophe Lavelle, Hélène Le Bail, Antoine Lourdeau, Nick Mai, Claire Manen, Cléo Marmié, Nathalie Mémoire, Marie-France Mifune, Swanie Potot, Nicolas Puig, Michelle Salord Lopez, Yann Téphany, Paul Verdu, Catherine Wihtol de Wenden, Wanda Zinger</span></div><div><span>&nbsp;</span></div><div><span>&nbsp;</span></div>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
