{
    "translatorID": "83501b8c-1033-4722-ae50-a77d67271ef7",
    "label": "Library Catalog (OPALS)",
    "creator": "Opals",
    "target": "/bin/(search|pf|rs)",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 200,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsib",
    "lastUpdated": "2014-04-15 15:25:32"
}


/*
Opals Translator
Copyright (C) 2014  Thai Pham

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

function detectWeb(doc, url) {
    if (!url.match(/\/bin\/(search|pf|rs)\//))
        return "";
    var titles = getTitleList(doc);
    var count = titles.length;
    if (count == 1) return "book";
    else if (count > 1) return "multiple";
}

//==============================================================================

function doWeb(doc, url) {
    var titles = getTitleList(doc);
    var items = {};

    if (titles.length == 1) {
        scrape(titles[0].rid, url);
    } else if (titles.length > 1) {
        for (var i = 0; i < titles.length; i++) {
            items[titles[i].rid] = titles[i].title;
        }
        Zotero.selectItems(items, function (items) {
            if (!items) {
                return true;
            }
            for (var rid in items) {
                scrape(rid, url);
            }
        });
    }
}

//==============================================================================
function scrape(rid, url) {

    var marcurl = "/bin/ajax/getMarc?format=usmarc&rid=" + rid;
    var baseUrl = getUrlBase(url);
    Zotero.Utilities.HTTP.doGet(marcurl, function (text) {
        var translator = Zotero.loadTranslator("import");
        translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
        translator.setString(text);
        translator.setHandler("itemDone", function (obj, item) {
            // adding record URL
            item.attachments = [{
                url: baseUrl + "/bin/search/recDetailPage?rid=" + rid,
                title: "Record link",
                mineType: "text/html",
                snapshot: false
            }];

            item.complete();
        });
        translator.translate();
    });

}
//==============================================================================
function getUrlBase(url) {
    var rs;
    if (rs = url.match(/(http[s]*:\/\/(.*?))\//)) {
        return rs[1];
    }
    return null;

}
//==============================================================================
function getTitleList(doc) {
    var items = [];
    var inputs = doc.evaluate('//input[@name="bib_rid"]', doc, null, XPathResult.ANY_TYPE, null);
    var chkBoox;
    while (chkBox = inputs.iterateNext()) {
        var title = chkBox.getAttribute("bib_title").trim();
        var rid = chkBox.value.trim();
        if (rid && rid.match(/^[1-9][0-9]*$/) && title) {
            items.push({
                rid: rid,
                title: title
            });
        }
    }
    return items;
}

/** BEGIN TEST CASES **/
var testCases = [{
    "type": "web",
    "url": "http://cogent.opalsinfo.net/bin/search/recDetailPage?rid=68738",
    "items": [{
        "itemType": "book",
        "creators": [{
            "firstName": "Jay",
            "lastName": "Wertz",
            "creatorType": "author"
        }],
        "notes": [{
            "note": "Item cannot be cataloged"
        }, {
            "note": "Chronicles the history of Native Americans from the Ice Age to the early twenty-first century, and includes more than thirty slip-cased facsimile documents"
        }],
        "tags": [],
        "seeAlso": [],
        "attachments": [{
            "url": "http://cogent.opalsinfo.net/bin/search/recDetailPage?rid=68738",
            "title": "Record link",
            "mineType": "text/html",
            "snapshot": false
        }],
        "ISBN": "159921475X",
        "title": "The Native American experience",
        "place": "Guilford, Conn.",
        "publisher": "Lyons Press",
        "date": "2008",
        "callNumber": "000 WER",
        "libraryCatalog": "Library Catalog (OPALS)"
    }]
}, {
    "type": "web",
    "url": "http://cogent.opalsinfo.net/bin/search/recDetailPage?rid=58224",
    "items": [{
        "itemType": "book",
        "creators": [{
            "firstName": "Chris",
            "lastName": "Oxlade",
            "creatorType": "author"
        }],
        "notes": [{
            "note": "Discusses the phenomenon of unidentified flying objects (UFOs), including notable sightings throughout history and possible explanations for them"
        }],
        "tags": [
            "Unidentified flying objects (UFOs)",
            "Sightings and encounters",
            "Science",
            "Miscellanea",
            "Curiosities and wonders"
        ],
        "seeAlso": [],
        "attachments": [{
            "url": "http://cogent.opalsinfo.net/bin/search/recDetailPage?rid=58224",
            "title": "Record link",
            "mineType": "text/html",
            "snapshot": false
        }],
        "ISBN": "1575728060",
        "title": "The Mystery of UFOs",
        "edition": "ed",
        "place": "Chicago, IL",
        "publisher": "Heinemann Library",
        "date": "1999",
        "numPages": "32",
        "series": "Can science solve?",
        "callNumber": "001.942 OXL",
        "libraryCatalog": "Library Catalog (OPALS)"
    }]
}]
/** END TEST CASES **/
