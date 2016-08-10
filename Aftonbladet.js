{
	"translatorID": "235c5c47-0c04-4d77-9afe-e22265a017a9",
	"label": "Aftonbladet",
	"creator": "Jonatan Svensson Glad",
	"target": "^https?://ww*\.aftonbladet\.se",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-08-10 12:53:00"
}

/*
	Aftonbladet Translator - Parses Atonbladet articles and creates Zotero-based metadata.
	Copyright (C) 2016 Jonatan Svensson Glad
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


/* Zotero API */

function detectWeb(doc, url) {
    //TODO: adjust the logic here
    if (url.indexOf('/article')>-1) {
        return "newspaperArticle";
    } else if (getSearchResults(doc, true)) {
        return "multiple";
    }
}


function getSearchResults(doc, checkOnly) {
    var items = {};
    var found = false;
    //TODO: adjust the xpath
    var rows = ZU.xpath(doc, '//a[contains(@href, "/article")]');
    for (var i=0; i<rows.length; i++) {
        //TODO: check and maybe adjust
        var href = rows[i].href;
        //TODO: check and maybe adjust
        var title = ZU.trimInternal(rows[i].textContent);
        if (!href || !title) continue;
        if (checkOnly) return true;
        found = true;
        items[href] = title;
    }
    return found ? items : false;
}


function doWeb(doc, url) {
    if (detectWeb(doc, url) == "multiple") {
        Zotero.selectItems(getSearchResults(doc, false), function (items) {
            if (!items) {
                return true;
            }
            var articles = new Array();
            for (var i in items) {
                articles.push(i);
            }
            ZU.processDocuments(articles, scrape);
        });
    } else {
        scrape(doc, url);
    }
}

function scrape(doc) {
	var newArticle = new Zotero.Item('newspaperArticle');
		newArticle.title = ZU.xpathText(doc, "//h1");	
		newArticle.date = ZU.xpathText(doc, '//time[@pubdate]');
		var author = ZU.xpathText(doc, '//address[@class="abByline"]');
			newArticle.creators.push(ZU.cleanAuthor(author, "author"));
				Z.debug(author);
		newArticle.language =  "Swedish";
		newArticle.publicationTitle = "Aftonbladet";
		newArticle.ISSN = "1103-9000";
		newArticle.abstractNote = ZU.xpathText(doc, '//div[@class="abLeadText"]');
		newArticle.section = ZU.xpathText(doc, '//div[@class="abBreadcrumbs clearfix"]/span[@class="abLeft"]').replace("Startsidan\n/", "").replace("\n/", " /").replace(" / ", "/").replace("Nyheter/", "").replace("Nyheter", "");
	newArticle.complete();
};		

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.aftonbladet.se/nyheter/article23305202.ab",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coop ersätter inte Ingrid, 81, efter kortstölden",
				"creators": [
					{
						"firstName": "Julia",
						"lastName": "Wågenberg",
						"creatorType": "author"
					}
				],
				"date": "2016-08-09",
				"ISSN": "1103-9000",
				"abstractNote": "Tjuven stal 81-åriga Ingrid Höglunds kreditkort och tog ut 14 000 kronor.\nCoop, som är kortgivare, vägrar att ge tillbaka pengarna.\n– Jag är pensionär. För mig är det mycket pengar. Dessutom ska de ha ränta. Jag är så ledsen, säger hon",
				"language": "Swedish",
				"libraryCatalog": "Aftonbladet",
				"publicationTitle": "Aftonbladet",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.aftonbladet.se/nyheter/article23310631.ab",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Putin och Erdogan i möte: ”Ännu starkare relationer”",
				"creators": [
					{
						"firstName": "Niklas",
						"lastName": "Eriksson",
						"creatorType": "author"
					}
				],
				"date": "2016-08-09",
				"ISSN": "1103-9000",
				"abstractNote": "För första gången sedan Turkiet sköt ner ett ryskt stridsplan har ländernas presidenter möts.\nBåde Erdogan och Putin uppger att mötet har stärkt banden mellan länderna.\n– Jag tror att våra relationer har blivit ännu starkare än vad de var tidigare, säger Turkiets president.",
				"language": "Swedish",
				"libraryCatalog": "Aftonbladet",
				"publicationTitle": "Aftonbladet",
				"shortTitle": "Putin och Erdogan i möte",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.aftonbladet.se/sportbladet/trav365/article23314110.ab",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "”Kan förstöra\nhela karriären”",
				"creators": [
					{
						"firstName": "Erik",
						"lastName": "Pettersson",
						"creatorType": "author"
					}
				],
				"date": "2016-08-10",
				"ISSN": "1103-9000",
				"abstractNote": "Minnestads Dubai galopperade som favorit i Sommartravets final med 300 000 kronor i förstapris.\nNu är färske proffstränaren Mattias Djuses stjärna allvarligt skadad – och blir borta året ut.\n– Vi blev påkörda i loppet och det kan mycket väl ha hänt i den situationen, säger Djuse till Trav365.",
				"language": "Swedish",
				"libraryCatalog": "Aftonbladet",
				"publicationTitle": "Aftonbladet",
				"section": "Sportbladet/Trav 365",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.aftonbladet.se/nojesbladet/article23309011.ab",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kaspersen talar ut om nya diagnosen",
				"creators": [
					{
						"firstName": "Felicia",
						"lastName": "Nordlund",
						"creatorType": "author"
					}
				],
				"date": "2016-08-10",
				"ISSN": "1103-9000",
				"abstractNote": "I många år gick Kristin Kaspersen runt och undrade vad det var som inte stämde.\nNu öppnar programledaren upp om den nya adhd-diagnosen.\n– Jag önskar verkligen att jag hade förstått det tidigare, säger hon i en intervju i ”Framgångspodden”",
				"language": "Swedish",
				"libraryCatalog": "Aftonbladet",
				"publicationTitle": "Aftonbladet",
				"section": "Nöjesbladet",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
