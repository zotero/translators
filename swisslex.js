{
	"translatorID": "0fc8deb5-fba2-4471-8d99-97698e2e4060",
	"label": "swisslex",
	"creator": "Hans-Peter Oeri",
	"target": "^https://www\\.swisslex\\.ch/de/doc/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-23 10:32:29"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Hans-Peter Oeri

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

base_url = "^https://www.swisslex.ch/(de|fr|it|en)/doc/([a-z]+)/([-0-9a-f]+)/";
base_index = {
	"type": 2,
	"id": 3
};

detecttypes = {
	"bookdoc": "bookSection",
	"essay": "journalArticle",
	"clawrev": "journalArticle",
	"commentarydoc": "encyclopediaArticle",
	"claw": "case"
};

doparams = {
	"artikelkommentar": "_magic",
	// "dokumenttitel": "_magic",
	"dokument": "_magic",
	"auflage": "edition",
	"autor": "author",
	"autoren": "author",
	"titel": "title",
	"buchtitel": "publicationTitle",
	"serie/reihe": "series",
	"reihe": "series",
	"urteilsdatum": "date",
	"jahr": "date",
	"seiten": "pages",
	"herausgeber": "editor",
	"isbn": "ISBN",
	"verlag": "publisher",
	"publikation": "publicationTitle",
	"issn": "ISSN",
	"gericht": "court",
	"betreff": "abstractNote",
	"rechtsgebiete": "tags"
};

docantons = {
	"Schweiz": "",
	"Zürich": "ZH",
	"Bern": "BE",
	"Basel-Stadt": "BS",
	"Basel-Land": "BL",
	"Freiburg": "FR",
	"Graubünden": "GR",
	"Genf": "GE",
	"St. Gallen": "SG",
	"Tessin": "TI",
	"Luzern": "LU"
	
};

docourts = {
	"Bundesstrafgericht": "BStrG",
	"Bundesverwaltungsgericht": "BVerwG",
	"Bundesgericht": "BGer",
	"Eidgenössisches Versicherungsgericht": "EVGer",
	"Eidgenössische Bankenkommission": "EBK",
	"Bundesamt": "BJ",
	"Bundesstaatsanwaltschaft": "BA",
	"Steuerekurskommission": "StRK",
	"Obergericht": "OGer",
	"Handelsgericht": "HGer",
	"Kantonsgericht": "KGer",
	"Appellationsgericht": "AppG",
	"Kassationsgericht": "KassG",
	"Kreisgericht": "KrG",
	"Bezirksgericht": "BezG",
	"Zivilgericht": "ZG",
	"Versicherungsgericht": "VG",
	"Sozialversicherungsgericht": "SozVG",
};

function interpretURI(url) {
	url = decodeURI(url);

	var base_url = "^https://www.swisslex.ch/(de|fr|it|en)/doc/([a-z]+)/([-0-9a-f]+)";
	var parts = url.match(base_url);
	var res = {};

	if (parts !== null) {
		res.url = parts[0];
		res.lang = parts[1];
		res.id = parts[3];
		res.type = detecttypes[parts[2]];
	}
	return res;
}

function detectWeb(doc, url) {
	return interpretURI(url).type;
}

function doWeb(doc, url) {
	var urlparts = interpretURI(url);
	var docmetas = ZU.xpath(doc, '//div[@id="' + urlparts.id + '"]//li[contains(@class,"meta-entry")]');
	var metas = {};
	var i, one, value, temp;
	
	metas.url = urlparts.url;
	for (i=0, l=docmetas.length; i<l; i++) {
		one = docmetas[i].children[0].innerText.toLowerCase();
		if (doparams[one] != undefined) {
			metas[doparams[one]] = docmetas[i].children[1].innerText;
		}
	}

	var item = new Zotero.Item(urlparts.type);
	for (one in metas) {
		value = metas[one];
		switch (one) {
			case "_magic":
				if (urlparts.type == "journalArticle") {
					value = value.split(' ');
					item.journalAbbreviation = value[0];
					if (value[1].includes("/")) {
						item.issue = value[1].split("/")[0];
					}
				}
				else if (urlparts.type == "bookSection") {
					value = value.match( '([0-9]+)\.A.,' );
					if (value) {
						item.edition = value[1];
					}
				}
				else if (urlparts.type == "encyclopediaArticle") {
					item.title = value;
				}
				else if (urlparts.type == "case") {
					item.number = value;
					item.title = value;
				}
				break;
			case "court":
				item.court = value;
				if (item.title.substring(0,3) != "BGE") {
					value = value.split(",");
					
					temp = value[0].trim();
					if (docantons[temp] != undefined) {
						if (docantons[temp]) {
							temp = docantons[temp] + " ";
						}
						else {
							temp = "";
						}
					} 
					else {
						Z.debug( "unknown canton: " + temp );
						temp = temp + " ";
					}
					item.title = temp + item.title;
					
					temp = value[1].trim();
					if (docourts[temp] != undefined ) {
						temp = docourts[temp];
					}
					else {
						Z.debug( "unknown court: " + temp );
					}
					item.title = temp + " " + item.title;
				}
				break;
			case "edition":
				item.edition = value.split('.')[0];
				break;
			case "title":
				if (urlparts.type == "encyclopediaArticle") {
					item.publicationTitle = value;
				}
				else {
					item.title = value;
				}
				break;
			case "date":
				item.date = ZU.strToISO(value);
				break;
			case "tags":
				value = value.split(',');
				for (i=0; i<value.length; i++) {
					item.tags.push( ZU.trimInternal( value[i] ) );
				}
				break;
			case "editor":
				value = value.split(',');
				for (i=0; i<value.length; i++) {
					item.creators.push( ZU.cleanAuthor( value[i], one, false) );
				}
				break;
			case "author":
				value = value.split(',');
				for (i=0; i<value.length; i++) {
					value[i] = ZU.cleanAuthor( value[i], one, false);
					temp = value[i].firstName;
					value[i].firstName = value[i].lastName;
					value[i].lastName = temp;
					item.creators.push( value[i] );
				}
				break;
			default:
				if (one[0] != '_') {
					item[one] = value;
				}
		}
	}

	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
