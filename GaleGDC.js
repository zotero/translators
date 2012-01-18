{
        "translatorID":"04e63564-b92b-41cd-a9d5-366a02056d10",
        "translatorType":4,
        "label":"GaleGDC",
        "creator":"GaleGDC",
        "target":"/gdc/ncco/",
        "minVersion":"1.0",
        "maxVersion":null,
        "priority":100,
        "inRepository":true,
        "browserSupport":"g",
        "lastUpdated":"2011-12-20 20:10:00"
}

/*
 * Gale GDC Copyright (C) 2011 Gale GDC
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
    if (url.indexOf('MonographsDetails') !== -1) return "bookSection";
    else if (url.indexOf('ManuscriptsDetails') !== -1) return "manuscript";
    else if (url.indexOf('MapsDetails') !== -1) return "map";
    else if (url.indexOf('NewspapersDetails') !== -1) return "newspaperArticle";
    else if (url.indexOf('searchResults') !== -1) return "multiple";
    else if (url.indexOf('FullList') !== -1) return "multiple";
    else if (url.indexOf('savedDocuments') !== -1) return "multiple";
    else if (url.indexOf('Details') !== -1) return "document";
    else
        return false;
}

function doWeb(doc, url) {

    var risImporter = Zotero.loadTranslator("import");
    risImporter.setHandler("itemDone", function(obj, item) {
		item.attachments = [];
		item.complete();
    });

    risImporter.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");

    var searchResults = doc.evaluate('//div[@regionid="searchResults"]  | //table[@id="searchResult"] | //table[@id="markedDocuments"]', doc, null, XPathResult.ANY_TYPE, null)
            .iterateNext();

    if (searchResults) {
        var items = Zotero.Utilities.getItemArray(doc, searchResults, /\&zid=/);
        Zotero.selectItems(items, function(selectedItems) {
            if (!selectedItems) return true;
            for ( var item in selectedItems) {
                var start = item.indexOf('documentId=');
                var end = item.indexOf('&', start);
                var docid = item.substring(start + 11, end > -1 ? end : item.length);
                var urlForPosting = doc.getElementById("zotero_form").action + '&doCitation=' + docid + '&citation_document_url=' + encodeURIComponent(item.replace('|', '%7C'));
                importSingleDocument(risImporter, urlForPosting);
            }
        });
    } else {
        processSingleDocument(risImporter, doc);
    }
}

function processSingleDocument(risImporter, doc) {
    var citationForm = doc.getElementById("citation_form");
    var otherUrl;
    for ( var i = 0; i < citationForm.length; i++) {
        if (citationForm.elements[i].name === 'citation_document_url') otherUrl = citationForm.elements[i].value;
    }
    var urlForPosting = citationForm.action + "&citation_format=ris" + "&citation_document_url=" + encodeURIComponent(otherUrl);
    importSingleDocument(risImporter, urlForPosting);
}

function importSingleDocument(risImporter, urlForPosting) {
    Zotero.Utilities.doPost(urlForPosting, '', function(text, obj) {
        risImporter.setString(text);
        risImporter.translate();
    });
}
