{
	"translatorID": "c7b97808-e812-476d-8893-a0331e3010a0",
	"label": "Clade",
	"creator": "Guillaume Faucheur",
	"target": "^https?://[^/]*(clade\\.loc|clade\\.net|bibliotheques\\-numeriques\\.defense\\.gouv\\.fr)/?",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-22 13:36:47"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Clade Translator, Copyright © 2020 Guillaume Faucheur
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


/* Clade class.
	Map MARC responsibility roles to Zotero creator types.
	See http://archive.ifla.org/VI/3/p1996-1/appx-c.htm.
*/
var CladeClass = function () {
	function getCreatorType(aut) {
		if (aut['4'] == undefined) {
			return "contributor";
		}


		var typeAut = aut['4'].trim();
		switch (typeAut) {
			case "005":
			case "250":
			case "275":
			case "590": // performer
			case "755": // vocalist
				return "performer";
			case "040":
			case "130": // book designer
			case "740": // type designer
			case "750": // typographer
			case "350": // engraver
			case "360": // etcher
			case "430": // illuminator
			case "440": // illustrator
			case "510": // lithographer
			case "530": // metal engraver
			case "600": // photographer
			case "705": // sculptor
			case "760": // wood engraver
				return "artist";
			case "070":
			case "305":
			case "330":
			case undefined:
				return "author";
			case "020":
			case "210":
			case "212":
				return "commenter";
			case "180":
				return "cartographer";
			case "220":
			case "340":
				return "editor";
			case "230":
				return "composer";
			case "245":
				return "inventor";
			case "255":
			case "695": // scientific advisor
			case "727": // thesis advisor
				return "counsel";
			case "300":
				return "director";
			case "400": // funder
			case "723": // sponsor
				return "sponsor";
			case "460":
				return "interviewee";
			case "470":
				return "interviewer";
			case "480": // librettist
			case "520": // lyricist
				return "wordsBy";
			case "605":
				return "presenter";
			case "630":
				return "producer";
			case "635":
				return "programmer";
			case "660":
				return "recipient";
			case "090": // author of dialog
			case "690": // scenarist
				return "scriptwriter";
			case "730":
				return "translator";
				// Ignore (no matching Zotero creatorType):
			case "320": // donor
			case "610": // printer
			case "650": // publisher
				return undefined;
				// Default
			case "205":
			default:
				return "contributor";
		}
	}

	/* Fix creators (MARC translator is not perfect). */
	function getCreators(record, item) {
		var type, authorTag, i;

		// Clear creators
		item.creators = [];
		// Extract creators (700, 701 & 702)
		for (i = 700; i < 703; i++) {
			authorTag = record.getFieldSubfields(i);
			for (var j in authorTag) {
				var aut = authorTag[j];
				var authorText = "";
				if (aut.b) {
					authorText = aut.a + ", " + aut.b;
				}
				else {
					authorText = aut.a;
				}
				type = getCreatorType(aut);
				if (type) {
					item.creators.push(Zotero.Utilities.cleanAuthor(authorText, type, true));
				}
			}
		}

		// Extract corporate creators (710, 711 & 712)
		for (i = 710; i < 713; i++) {
			authorTag = record.getFieldSubfields(i);
			for (var k in authorTag) {
				if (authorTag[k].a) {
					type = getCreatorType(authorTag[k]);
					if (type) {
						item.creators.push({
							lastName: authorTag[k].a,
							creatorType: type,
							fieldMode: true
						});
					}
				}
			}
		}
	}

	// Add tag, if not present yet
	function addTag(item, tag) {
		for (var t in item.tags) {
			if (item.tags[t] == tag) {
				return;
			}
		}
		item.tags.push(tag);
	}

	// Tagging
	function getTags(record, item) {
		var pTag = record.getFieldSubfields("600");
		var tagText, person, j;

		if (pTag) {
			for (j in pTag) {
				tagText = false;
				person = pTag[j];
				tagText = person.a;
				if (person.b) {
					tagText += ", " + person.b;
				}
				if (person.c) {
					tagText += ", " + person.c;
				}
				if (person.f) {
					tagText += " (" + person.f + ")";
				}
				addTag(item, tagText);
			}
		}

		pTag = record.getFieldSubfields("601");
		if (pTag) {
			for (j in pTag) {
				tagText = false;
				person = pTag[j];
				tagText = person.a;
				addTag(item, tagText);
			}
		}

		pTag = record.getFieldSubfields("605");
		if (pTag) {
			for (j in pTag) {
				tagText = false;
				person = pTag[j];
				tagText = person.a;
				addTag(item, tagText);
			}
		}

		pTag = record.getFieldSubfields("606");
		if (pTag) {
			for (j in pTag) {
				tagText = false;
				person = pTag[j];
				tagText = person.a;
				addTag(item, tagText);
			}
		}

		pTag = record.getFieldSubfields("607");
		if (pTag) {
			for (j in pTag) {
				tagText = false;
				person = pTag[j];
				tagText = person.a;
				addTag(item, tagText);
			}
		}

		pTag = record.getFieldSubfields("602");
		if (pTag) {
			for (j in pTag) {
				tagText = false;
				person = pTag[j];
				tagText = person.a;
				if (person.f) {
					tagText += " (" + person.f + ")";
				}
				addTag(item, tagText);
			}
		}

		pTag = record.getFieldSubfields("604");
		if (pTag) {
			for (j in pTag) {
				tagText = false;
				person = pTag[j];
				tagText = person.a;
				if (person.b) {
					tagText += ", " + person.b;
				}
				if (person.f) {
					tagText += " (" + person.f + ")";
				}
				if (person.t) {
					tagText += ", " + person.t;
				}
				addTag(item, tagText);
			}
		}
	}

	// Get series (repeatable)
	function getSeries(record, item) {
		var seriesText = false;
		var seriesTag = record.getFieldSubfields("225");
		if (seriesTag && seriesTag.length > 1) {
			for (var j in seriesTag) {
				var series = seriesTag[j];
				if (seriesText) {
					seriesText += "; ";
				}
				else {
					seriesText = "";
				}
				seriesText += series.a;
				if (series.v) {
					seriesText += ", " + series.v;
				}
			}
			if (seriesText) {
				delete item.seriesNumber;
				item.series = seriesText;
			}
		}

		// Try 461
		if (!item.series) {
			seriesTag = record.getFieldSubfields("461");
			if (seriesTag) {
				for (var k in seriesTag) {
					series = seriesTag[k];
					if (seriesText) {
						seriesText += "; ";
					}
					else {
						seriesText = "";
					}
					seriesText += series.t;
				}
			}
			if (seriesText) {
				delete item.seriesNumber;
				item.series = seriesText;
			}
		}
	}

	// Add extra text
	function addExtra(noteText, extra) {
		if (extra) {
			if (noteText) {
				if (!/\.$/.exec(noteText)) {
					noteText += ". ";
				}
				else {
					noteText += " ";
				}
			}
			else {
				noteText = "";
			}
			noteText += Zotero.Utilities.trim(extra);
		}
		return noteText;
	}

	// Assemble extra information
	function getExtra(record, item) {
		var extraText = false;
		// Material description
		var extraTag = record.getFieldSubfields("215");
		if (extraTag) {
			for (var j in extraTag) {
				var desc = extraTag[j];
				extraText = addExtra(extraText, desc.c);
				extraText = addExtra(extraText, desc.d);
				extraText = addExtra(extraText, desc.e);
			}

			if (extraText) {
				if (!/\.$/.exec(extraText)) {
					extraText += ".";
				}
				item.extra = extraText;
			}
		}

		// Notes
		var noteText = false;
		for (var i = 300; i <= 328; i++) {
			var noteTag = record.getFieldSubfields(i);
			if (noteTag) {
				for (var k in noteTag) {
					var note = noteTag[k];
					noteText = addExtra(noteText, note.a);
				}
			}
		}

		if (noteText) {
			if (!/\.$/.exec(noteText)) {
				noteText += ".";
			}
			item.notes.push(noteText);
		}
	}

	// Get title from 200
	function getTitle(record, item) {
		var titleTag = record.getFieldSubfields("200");
		if (titleTag) {
			titleTag = titleTag[0];
			var titleText = titleTag.a;
			if (titleTag.e) {
				if (!/^[,.:;-]/.exec(titleTag.e)) {
					titleText += ": ";
				}
				titleText += titleTag.e;
			}
			if (titleTag.h) {
				titleText += ", " + titleTag.h;
				if (titleTag.i) {
					titleText += ": " + titleTag.i;
				}
			}
			else if (titleTag.i) {
				titleText += ", " + titleTag.i;
			}
			item.title = titleText;
		}
	}

	function getCote(record, item) {
		item.callNumber = "";
		var coteTag = record.getFieldSubfields("930");

		if (coteTag.length) {
			item.callNumber += coteTag[0].c + "-" + coteTag[0].a;
		}
	}

	// Specific Unimarc postprocessing
	function postProcessMarc(doc, record, newItem) {
		// Title
		getTitle(record, newItem);

		// Fix creators
		getCreators(record, newItem);

		// Fix callNumber
		getCote(record, newItem);

		// Store perennial url from 003 as attachment and accession number

		var url = record.getField("003");
		if (url && url.length > 0 && url[0][1]) {
			newItem.attachments.push({
				title: 'Lien vers la notice du catalogue',
				url: url[0][1],
				mimeType: 'text/html',
				snapshot: false
			});
		}

		// Country (102a)
		record._associateDBField(newItem, "102", "a", "country");

		// Try to retrieve volumes/pages from 215d
		if (!newItem.pages) {
			var dimTag = record.getFieldSubfields("215");
			for (var j in dimTag) {
				var dim = dimTag[j];
				if (dim.a) {
					var pages = /[^\d]*(\d+)\s+p\..*/.exec(dim.a);
					if (pages) {
						newItem.numPages = pages[1];
					}
					var vols = /[^\d]*(\d+)\s+vol\..*/.exec(dim.a);
					if (vols) {
						newItem.numberOfVolumes = vols[1];
					}
				}
			}
		}

		// Series
		getSeries(record, newItem);

		// Extra
		getExtra(record, newItem);

		// Tagging
		getTags(record, newItem);

		// Doc type
		var itemType = getDocumentType(doc);
		if (itemType) {
			newItem.itemType = itemType;
		}

		// Repository
		newItem.libraryCatalog = "Clade (https://bibliotheques-numeriques.defense.gouv.fr)";
	}

	// Check for Gallica URL (digital version available), if found, set item.url
	function checkGallica(record, item) {
		var url = record.getFieldSubfields("856");

		if (url && url.length > 0 && url[0].u) {
			item.url = url[0].u;
		}
	}

	this.marcURL = function (url) {
		return url + '/marcxml';
	};

	this.processMarcUrl = function (doc, marcurl) {
		Zotero.Utilities.HTTP.doGet(marcurl, function (xmlText) {
			var translator = Zotero.loadTranslator("import");

			// Use MARC translator
			translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
			translator.getTranslatorObject(function (marc) {
				Clade.transformMarcXml(doc, marc, xmlText);
			});
			translator.translate();
		}); // doGet end
	};

	// Transform MarcXML to Marc base on translator MARCXML (translatorID: edd87d07-9194-42f8-b2ad-997c4c7deefd)
	this.transformMarcXml = function (doc, marc, xmlText) {
		var parser = new DOMParser();
		var xml = parser.parseFromString(xmlText, 'text/xml');
		// define the marc namespace
		var ns = {
			marc: "http://www.loc.gov/MARC21/slim"
		};

		var records = ZU.xpath(xml, '//marc:record', ns);
		for (let rec of records) {
			// create one new item per record
			var record = new marc.record();
			var newItem = new Zotero.Item();
			record.leader = ZU.xpathText(rec, "./marc:leader", ns);
			var fields = ZU.xpath(rec, "./marc:datafield", ns);
			for (let field of fields) {
				// go through every datafield (corresponds to a MARC field)
				var subfields = ZU.xpath(field, "./marc:subfield", ns);
				var tag = "";
				for (let subfield of subfields) {
					// get the subfields and their codes...
					var code = ZU.xpathText(subfield, "./@code", ns);
					var sf = ZU.xpathText(subfield, "./text()", ns);
					// delete non-sorting symbols
					// e.g. &#152;Das&#156; Adam-Smith-Projekt
					if (sf) {
						sf = sf.replace(/[\x80-\x9F]/g, "");
						// concat all subfields in one datafield, with subfield delimiter and code between them
						tag = tag + marc.subfieldDelimiter + code + sf;
					}
				}
				record.addField(ZU.xpathText(field, "./@tag", ns), ZU.xpathText(field, "./@ind1", ns) + ZU.xpathText(field, "./@ind2"), tag);
			}

			record.translate(newItem);

			// Do specific Unimarc postprocessing
			postProcessMarc(doc, record, newItem);

			// Check for Gallica URL
			checkGallica(record, newItem);

			newItem.complete();
		}
	};
};

/* Global CladeClass object. */
var Clade = new CladeClass();

function detectWeb(doc, url) {
	if (url.search(/\/document\//) != -1) {
		return getDocumentType(doc);
	}

	return undefined;
}

function getDocumentType(doc) {
	var items = ZU.xpath(doc, '/html/body/main//span[@class="Z3988"][1][@title]');

	if (items.length > 0) {
		var span = items[0];

		// Get type from dataset
		if (span.dataset && span.dataset.type !== undefined) {
			return span.dataset.type;
		}

		// Get type from item
		var item = new Zotero.Item;
		Zotero.Utilities.parseContextObject(span.title, item);

		if (item.itemType) {
			return item.itemType;
		}
	}

	return undefined;
}

function doWeb(doc, url) {
	Clade.processMarcUrl(doc, Clade.marcURL(url));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.clade.loc/document/551e404a-6dae-4b1c-9e7c-71cd09b0ac5e",
		"items": [
			{
				"itemType": "book",
				"title": "Le royalisme durant la première guerre de Vendée à travers les interrogatoires de la \"Commission militaire près l'armée de l'Ouest\": mars 1793 - mai 1794",
				"creators": [
					{
						"firstName": "Benjamin",
						"lastName": "Normand",
						"creatorType": "contributor"
					},
					{
						"firstName": "Anne Natacha",
						"lastName": "Rolland Bonnet",
						"creatorType": "contributor"
					}
				],
				"extra": "ill. en noir, ill. en coul. 22 cm.",
				"libraryCatalog": "Clade (https://bibliotheques-numeriques.defense.gouv.fr)",
				"numPages": "129",
				"shortTitle": "Le royalisme durant la première guerre de Vendée à travers les interrogatoires de la \"Commission militaire près l'armée de l'Ouest\"",
				"attachments": [],
				"tags": [
					{
						"tag": "France histoire Royalisme Guerres de Vendée (1793-1796) Royalisme Guerres de Vendée (1793-1796)"
					}
				],
				"notes": [
					"Mémoire d'histoire moderne : Université catholique de l'Ouest : Angers : 09 2008."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.clade.loc/document/85318d81-66b9-4b34-ac1f-0fa6ee3c196a",
		"items": [
			{
				"itemType": "map",
				"title": "Combat de Znaim 11 juillet 1809",
				"creators": [
					{
						"firstName": "Jean-Jacques Germain",
						"lastName": "Pelet-Clozeau",
						"creatorType": "contributor"
					}
				],
				"date": "18",
				"abstractNote": "Znaïm marquait la fin de la campagne d'Autriche. Le maréchal Berthier, pour la France, et de Wimpffen, pour l'Autriche, entreprirent des discussions sur les modalités du cessez-le feu. Les Autrichiens furent contraints d'accéder aux demandes de Napoléon, et le contrôle de plus d'un tiers du territoire autrichien des Français fut entériné. L'armistice fut signé le 12 juillet, prélude au futur Traité de paix de Schonbrünn, qui sera signé le 14 octobre 1809",
				"extra": "87 cm x 60 cm cm.",
				"libraryCatalog": "Clade (https://bibliotheques-numeriques.defense.gouv.fr)",
				"place": "Paris",
				"publisher": "Dépôt Général de la Guerre",
				"attachments": [],
				"tags": [
					{
						"tag": "Napoléon 1er campagnes et batailles cartescampagne d'Autriche (1809)"
					}
				],
				"notes": [
					"Echelle: 1:250 000e en mètres et en toises.-Avec texte historique gravé à gauche du général Pelet.Titre différent de la table: bataille de Znaïm."
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
