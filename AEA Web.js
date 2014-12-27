{
    "translatorID": "6044b16f-2452-4ce8-ad02-fab69ef04f13",
    "label": "AEA Web",
    "creator": "Sebatian Karcher",
    "target": "^https?://www\\.aeaweb\\.org/articles\\.php",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsb",
    "lastUpdated": "2014-12-08 06:33:27"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	AEA Web translator Copyright © 2014 Sebastian Karcher 
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


function detectWeb(doc, url) {
    if (ZU.xpathText(doc, '//a[@title="Export Citation"]')) return "journalArticle";
    else if (ZU.xpath(doc, '//a[contains(@href, "articles.php?doi") and @style="font-weight:bold;"]').length) return "multiple";
}

function doWeb(doc, url) {
    var arts = new Array();
    if (detectWeb(doc, url) == "multiple") {
        var items = new Object();
        var title;

        var titles = doc.evaluate('//a[contains(@href, "articles.php?doi") and @style="font-weight:bold;"]', doc, null, XPathResult.ANY_TYPE, null);
        while (title = titles.iterateNext()) {
            items[title.href] = title.textContent;
        }

        Zotero.selectItems(items, function(items) {
            if (!items) {
                return true;
            }
            for (var i in items) {
                arts.push(i);
            }
            Zotero.Utilities.processDocuments(arts, scrape);
        });
    } else {
        scrape(doc, url);
    }
}

function scrape(doc, url) {
        var risURL = url.replace(/articles\.php\?/, "content/articles/include/file_export.php?") + "&format=ris&type=txt";
        Z.debug(risURL)
        var abstract = ZU.xpathText(doc, '//div[@class="sub_head_dialog" and contains(text(), "Abstract")]/following-sibling::div[1]');
        //Z.debug(abstract)
        ZU.HTTP.doGet(risURL, function(text) {
            //Z.debug(text)
            text = text.trim()
            var translator = Zotero.loadTranslator("import");
            translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
            translator.setString(text);
            translator.setHandler("itemDone", function(obj, item) {
                item.abstractNote = abstract;
                var pdfURL = "https://www.aeaweb.org/atypon.php?return_to=/doi/pdfplus/" + item.DOI;
                //Z.debug(pdfURL)
                //Remove period at end of title
                item.attachments.push({
                    url: pdfURL,
                    title: "AEAweb Full Text PDF",
                    mimeType: "application/pdf"
                });
                item.complete();
            });
            translator.translate();
        });
    }
    /** BEGIN TEST CASES **/
var testCases = [{
        "type": "web",
        "url": "https://www.aeaweb.org/articles.php?search_mode=t&search_box=labor+market&realsearchbx=labor+market&phrase=&search_title=title&search_abstract=abstract&search_author=author&cs_primary_JEL=0&order=1&limit_per_page=10&search%5B%5D=app&search%5B%5D=mac&search%5B%5D=mic&search%5B%5D=pol&search%5B%5D=jep&search%5B%5D=jel&search%5B%5D=aer&hidden_session=",
        "items": "multiple"
    }, {
        "type": "web",
        "url": "https://www.aeaweb.org/articles.php?doi=10.1257/jep.28.4",
        "items": "multiple"
    }, {
        "type": "web",
        "url": "https://www.aeaweb.org/articles.php?doi=10.1257/jep.28.4.3",
        "items": [{
            "itemType": "journalArticle",
            "title": "Networks in the Understanding of Economic Behaviors",
            "creators": [{
                "lastName": "Jackson",
                "firstName": "Matthew O.",
                "creatorType": "author"
            }],
            "date": "2014",
            "DOI": "10.1257/jep.28.4.3",
            "abstractNote": "As economists endeavor to build better models of human behavior, they cannot ignore that humans are fundamentally a social species with interaction patterns that shape their behaviors. People's opinions, which products they buy, whether they invest in education, become criminals, and so forth, are all influenced by friends and acquaintances. Ultimately, the full network of relationships—how dense it is, whether some groups are segregated, who sits in central positions—affects how information spreads and how people behave. Increased availability of data coupled with increased computing power allows us to analyze networks in economic settings in ways not previously possible. In this paper, I describe some of the ways in which networks are helping economists to model and understand behavior. I begin with an example that demonstrates the sorts of things that researchers can miss if they do not account for network patterns of interaction. Next I discuss a taxonomy of network properties and how they impact behaviors. Finally, I discuss the problem of developing tractable models of network formation.",
            "issue": "4",
            "journalAbbreviation": "Journal of Economic Perspectives",
            "libraryCatalog": "AEA Web",
            "pages": "3-22",
            "publicationTitle": "Journal of Economic Perspectives",
            "url": "http://www.aeaweb.org/articles.php?doi=10.1257/jep.28.4.3",
            "volume": "28",
            "attachments": [{
                "title": "AEAweb Full Text PDF",
                "mimeType": "application/pdf"
            }],
            "tags": [],
            "notes": [],
            "seeAlso": []
        }]
    }]
    /** END TEST CASES **/
