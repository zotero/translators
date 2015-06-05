{
    "translatorID": "5278b20c-7c2c-4599-a785-12198ea648bf",
    "label": "ARTstor",
    "creator": "John Justin, Charles Zeng",
    "target": "\.artstor|\.sscommons\.org:?\w*\/(open)*library",
    "minVersion": "3.1",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcs",
    "lastUpdated": "2015-06-02 15:48:45"
}

/*
	This translator works for Artstor library site (http://library.artstor.org) and
	Artstor Shared Shelf Commons (http://www.sscommons.org)


	***** BEGIN LICENSE BLOCK *****
	
	Artstor Translator, Copyright © 2015 John Justin, Charles Zeng
	
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

    if (url.match(/iv2/)) {

        return "artwork";
    }
    if (url.match(/imagegroup/) && doc.getElementById("ssContentWrap").style.display == "inline") {

        return false;
    }
    if (url.match(/imagegroup/) && doc.getElementById("thumbNavSave1").style.display == "block") {
        Zotero.debug("Save on");
        return false;
    }
    if (url.match(/(S|s)earch/) || url.match(/categories/) || url.match(/imagegroup/) || url.match(/collections/) || url.match(/collaboratoryfiltering/) || url.match(/cluster/)) {
        if (doc.getElementsByClassName('MetaDataWidgetRoot').length > 0) {
            return "artwork";

        } else
        if (doc.getElementById("floatingPlaceHolder").style.display == "block") {
            return false;

        }
        return "multiple";
    } else {
        return false;
    }

}

function decodeSearchData(str) {
    var searchParam = str;
    searchParam = searchParam.replace(/(&gt;)/, ":");
    var param = searchParam.split('&');
    var searchData = new Object();
    var item;
    var sparam;
    var id;
    var value;
    for (var i = 0; i < param.length; i = i + 1) {
        item = param[i];
        sparam = item.split('=');
        id = sparam[0];
        value = sparam[1];

        if (id === 'type') {
            searchData[id] = parseInt(value);
        } else
            searchData[id] = value;
    }
    return searchData;
}

function doWeb(doc, url) {
    var docType = detectWeb(doc, url);
    if (docType == "multiple") {
        scrape(doc, url);
    } else if (docType == "artwork") {
        if (url.match(/iv2/)) {
            scrapeIV(doc, url);
        } else {
            scrapeMetaWindow(doc, url);
        }
    }
}


var decodeMap = {
    '20': ' ',
    '21': '!',
    '22': '"',
    '23': '#',
    '24': '$',
    '25': '%',
    '26': '&',
    '27': "'",
    '28': '(',
    '29': ')',
    '2A': '*',
    '2B': '+',
    '2C': ',',
    '2D': '-',
    '2E': '.',
    '2F': '/',
    '30': '0',
    '31': '1',
    '32': '2',
    '33': '3',
    '34': '4',
    '35': '5',
    '36': '6',
    '37': '7',
    '38': '8',
    '39': '9',
    '3A': ':',
    '3B': ';',
    '3C': '<',
    '3D': '=',
    '3E': '>',
    '3F': '?',
    '5B': '[',
    //				'5C' : '\\',
    '5D': ']',
    '5E': '^',
    '5F': '_',
    '60': '`',
    '7B': '{',
    '7C': '|',
    '7D': '}',
    '7E': '~'
};

function decrypt(s) {

    var len = s.length;
    var i = 0;
    var newS = '';
    var key;
    while (i < len) {
        var ch = s.charAt(i);
        if ((ch >= '0') && (ch <= '9')) {
            key = s.slice(i, i + 2);
            newS = newS + decodeMap[key];
            i = i + 2;
        } else {
            if (ch == "!") {
                var nCh = '';
                if ((i + 1) < len) {
                    nCh = s.charAt(i + 1);
                }
                if ((nCh >= '0') && (nCh <= '9')) {
                    var rStr = s.substr(i + 1);
                    var code = parseInt(rStr);
                    nCh = String.fromCharCode(code);
                    var nIdx = rStr.indexOf("!");
                    if (nIdx > 0) {
                        i = i + nIdx + 2;
                        newS = newS + nCh;
                    }
                } else {
                    newS = newS + ch;
                    i++;
                }
            } else {
                newS = newS + ch;
                i++;
            }
        }
    }
    return newS;
}

function encrypt(s) {
    var newS = '';
    if (s !== undefined) {
        //var eMap = _getEncodeMap();
        var len = s.length;
        i = 0;
        var ch;
        while (i < len) {
            ch = s.charAt(i);
            if (((ch >= 'a') && (ch <= 'z')) ||
                ((ch >= 'A') && (ch <= 'Z'))) {
                newS = newS + ch;
            } else {
                var eCh = encodeMap[ch];
                if (eCh === undefined) {
                    newS = newS + "!" + ch.charCodeAt(0) + "!";
                } else {
                    newS = newS + "%" + eCh;
                }
            }
            i++;
        }
    }

    return newS;
}


encodeMap = {
    ' ': '20',
    '!': '21',
    '"': '22',
    '#': '23',
    '$': '24',
    '%': '25',
    '&': '26',
    "'": '27',
    '(': '28',
    ')': '29',
    '*': '2A',
    '+': '2B',
    ',': '2C',
    '-': '2D',
    '.': '2E',
    '/': '2F',
    '0': '30',
    '1': '31',
    '2': '32',
    '3': '33',
    '4': '34',
    '5': '35',
    '6': '36',
    '7': '37',
    '8': '38',
    '9': '39',
    ':': '3A',
    ';': '3B',
    '<': '3C',
    '=': '3D',
    '>': '3E',
    '?': '3F',
    '[': '5B',
    //				'\\' : '5C',
    ']': '5D',
    '^': '5E',
    '_': '5F',
    '`': '60',
    '{': '7B',
    '|': '7C',
    '}': '7D',
    '~': '7E'
};


function processIVURL(text1, artItem, serverURL, url) {
    Zotero.debug("processIVURL  text " + text1);
    var text = text1;
    var service = text.substring(text.indexOf("secure"));

    service = service.substring(0, service.indexOf("</td>"));
    //	Zotero.debug("processIVURL service1 "+service);
    service = service.replace(/<wbr\/>/g, "");
    service = service.substring(service.indexOf("?"));
    service = service.trim();
    var ivURL = serverURL + "secure/ViewImages" + service + "&zoomparams=&fs=true";

    if (url == "") {
        artItem.url = ivURL;
    } else {
        //	artItem.url=url;
        artItem.url = ivURL;
    }

    Zotero.debug("processIVURL service2 ivURL " + ivURL);
}

function getMetadata(itemsArray, serverURL, url, doc) {
    var serviceURL4Metadata = serverURL + "secure/metadata/";


    (function next() {
        if (!itemsArray.length) return;
        var objectIdMod = itemsArray.shift();
        var items = objectIdMod.split(":");
        var item = items[0];
        var objectTypeId = items[1];
        Zotero.debug("getMetadata  service URL  " + serviceURL4Metadata + item);
        Zotero.debug("getMetadata  objectTypeId  " + objectTypeId);
        Zotero.Utilities.HTTP.doGet(serviceURL4Metadata + item, function(text) {


            var artItem = processMetadata(text, item, doc, serverURL);
            artItem.attachments.push({
                title: "Artstor Thumbnails",

                document: doc

            });
            var server = serverURL.substring(0, serverURL.length - 8);
            switch (objectTypeId) {
                case "13":
                case "10":
                    var serviceURL4IVURL = serviceURL4Metadata + item + "?_method=FpHtml";
                    Zotero.Utilities.HTTP.doGet(serviceURL4IVURL, function(text) {
                        processIVURL(text, artItem, serverURL, url);
                    });

                    break;
                case "11":
                    var serviceURL4QTVR = serverURL + "secure/imagefpx/" + item + "/7"; //QTVR
                    Zotero.Utilities.HTTP.doGet(serviceURL4QTVR, function(text) {
                        var jsonQTVR = eval('(' + text + ')');
                        var urlQTVR = server + "thumb/" + jsonQTVR.imageUrl;
                        artItem.attachments.push({
                            title: "Artstor QuickTime Movie Attachment",
                            url: urlQTVR,
                            mimeType: "video/quicktime"

                        });

                    });
                    artItem.url = url;
                    break;
                case "12":
                    var serviceURL4AUD = serverURL + "secure/imagefpx/" + item + "/10"; //audio 
                    Zotero.Utilities.HTTP.doGet(serviceURL4AUD, function(text) {
                        var jsonAUD = eval('(' + text + ')');
                        var urlAUD = server + "thumb/" + jsonAUD.imageUrl;
                        artItem.attachments.push({
                            title: "Artstor Audio File Attachment",
                            url: urlAUD,
                            mimeType: "audio/mpeg3"

                        });
                    });
                    artItem.url = url;
                    break;
                case "20":
                    var serviceURL4PDF = serverURL + "secure/imagefpx/" + item + "/20"; //PDF
                    Zotero.Utilities.HTTP.doGet(serviceURL4PDF, function(text) {
                        var jsonPDF = eval('(' + text + ')');
                        var urlPDF = server + "thumb" + jsonPDF.imageUrl;
                        Zotero.debug("PDF url  " + urlPDF);
                        artItem.attachments.push({
                            title: "Artstor PDF Attachment",
                            url: urlPDF,
                            mimeType: "application/pdf"

                        });
                    });
                    artItem.url = url;
                    break;
                case "21":
                    var serviceURL4PPT = serverURL + "secure/imagefpx/" + item + "/21"; //PPT
                    Zotero.Utilities.HTTP.doGet(serviceURL4PPT, function(text) {
                        var jsonPPT = eval('(' + text + ')');
                        var urlPPT = server + "thumb" + jsonPPT.imageUrl;
                        artItem.attachments.push({
                            title: "Artstor PowerPoint Attachment",
                            url: urlPPT,
                            mimeType: "application/powerpoint"

                        });
                    });
                    artItem.url = url;
                    break;
                case "22":
                    var serviceURL4DOC = serverURL + "secure/imagefpx/" + item + "/22"; //DOC
                    Zotero.Utilities.HTTP.doGet(serviceURL4DOC, function(text) {
                        var jsonDOC = eval('(' + text + ')');
                        var urlDOC = server + "thumb" + jsonDOC.imageUrl;
                        artItem.attachments.push({
                            title: "Artstor Word Attachment",
                            url: urlDOC,
                            mimeType: "application/msword"

                        });
                    });
                    artItem.url = url;
                    break;
                case "23":
                    var serviceURL4XXLS = serverURL + "secure/imagefpx/" + item + "/23"; //XLS
                    Zotero.Utilities.HTTP.doGet(serviceURL4XXLS, function(text) {
                        var jsonXLS = eval('(' + text + ')');
                        var urlXLS = server + "thumb" + jsonXLS.imageUrl;
                        artItem.attachments.push({
                            title: "Artstor Excel Attachment",
                            url: urlXLS,
                            mimeType: "application/excel"

                        });
                    });
                    artItem.url = url;
                    break;
                case "24":
                    var serviceURL4VID = serverURL + "secure/imagefpx/" + item + "/24"; //Video
                    Zotero.Utilities.HTTP.doGet(serviceURL4VID, function(text) {
                        var jsonVID = eval('(' + text + ')');
                        var urlVID = jsonVID.imageUrl;
                        artItem.attachments.push({
                            title: "Artstor Video File Attachment",
                            url: urlVID,
                            mimeType: "text/html"

                        });
                    });
                    artItem.url = url;
                    break;
            }
            var service4Commentary = serverURL + "/secure/icommentary/" + item;
            Zotero.Utilities.HTTP.doGet(service4Commentary, function(text) {

                var jsonCommentary = eval('(' + text + ')');
                Zotero.debug("commentary " + jsonCommentary.numberOfCommentaries);
                for (var j = 0; j < jsonCommentary.numberOfCommentaries; j = j + 1) {
                    if (jsonCommentary.ICommentary[j].status == 2) {
                        //public commentary
                        var comment = "";

                        if (jsonCommentary.ICommentary[j].ownerName == "") {
                            comment = "Note: "

                        } else {

                            comment = "Note by: " + jsonCommentary.ICommentary[j].ownerName + " -  ";

                        }
                        comment += jsonCommentary.ICommentary[j].commentary;
                        artItem.notes.push({
                            note: comment
                        });
                    }

                }


            });
            artItem.complete();
            next();
        })
    })();
    Zotero.done();

}

function processMetadata(text, id, doc, serverURL) {
    Zotero.debug("processMetadata " + text);

    var json = eval('(' + text + ')');
    var newArtItem = new Zotero.Item('artwork');
    var author = new Object();

    newArtItem.archive = "";
    newArtItem.rights = "";
    newArtItem.date = "";
    newArtItem.artworkMedium = "";
    newArtItem.artist = "";
    newArtItem.artworkSize = "";
    newArtItem.title = "Unknown";
    newArtItem.abstractNote = "";
    newArtItem.archiveLocation = "";
    newArtItem.extra = "";

    var portal = serverURL.substring(7, serverURL.indexOf("."));

    Zotero.debug("getMetadata  portal  " + portal);
    switch (portal) {
        case "archaeology":
            var siteName = false;

            for (var i = 0; i < json.metaData.length; i++) {
                switch (json.metaData[i].fieldName) {
                    case "Site Name":
                        newArtItem.title = (newArtItem.title == "Unknown") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.title + "; " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        siteName = true;

                        //	newArtItem.extra=addToExtra(newArtItem.extra,json.metaData[i].fieldValue.replace(/<wbr\/>/g,""),"Site Name");
                        break;
                    case "Artifact Title":
                        if (siteName) {

                            newArtItem.extra = addToExtra(newArtItem.extra, newArtItem.title, "Site Name");
                            newArtItem.title = "Unknown";
                            siteName = false;
                        }
                        newArtItem.title = (newArtItem.title == "Unknown") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.title + "; " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        break;
                    case "Director":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Director");
                        break;
                    case "Artifact Description":
                        newArtItem.abstractNote = (newArtItem.abstractNote == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.abstractNote + ". " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");

                        break;
                    case "Artifact Repository":
                        newArtItem.archive = (newArtItem.archive == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.archive + ": " + (json.metaData[i].fieldValue).replace(/<wbr\/>/g, "").replace(/<\/?[^>]+(>|$)/g, " ");
                        break;

                    case "Rights":
                        newArtItem.rights = (newArtItem.rights == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.rights + ". " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        break;
                    case "Culture":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Culture");
                        break;
                    case "Period":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Period");
                        break;
                    case "Site Date":
                        newArtItem.date = (newArtItem.date == "") ? json.metaData[i].fieldValue : newArtItem.date + ", " + json.metaData[i].fieldValue;
                        break;
                    case "Artifact Materials/Techniques":
                        newArtItem.artworkMedium = (newArtItem.artworkMedium == "") ? json.metaData[i].fieldValue : newArtItem.artworkMedium + " " + json.metaData[i].fieldValue;
                        break;
                    case "Artifact Dimensions":
                        newArtItem.artworkSize = (newArtItem.artworkSize == "") ? json.metaData[i].fieldValue : newArtItem.artworkSize + ", " + json.metaData[i].fieldValue;
                        break;
                    case "Collection":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Collection");
                        break;
                    case "Site Region":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Site Region");
                        break;
                    case "Feature Type":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Feature Type");
                        break;
                    case "Site Modern Location":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Site Modern Location");
                        break;
                    case "Campaign Title":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Campaign Title");
                        break;
                    case "Photographer":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Photographer");
                        break;
                    case "Artifact Title":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Artifact Title");
                        break;
                    case "Artifact Current Location":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Artifact Current Location");
                        break;
                    case "Artifact Condition":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Artifact Condition");
                        break;
                    case "Contributor":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Contributor");
                        break;
                    case "Era":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Era");
                        break;
                    case "Site Number":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Site Number");
                        break;
                    case "Source":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Source");
                        break;
                    case "Artifact Origin":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Artifact Origin");
                        break;
                    case "Artifact Sponsor":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Artifact Sponsor");
                        break;
                    case "Artifact Date":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Artifact Date");
                        break;
                }
            }
            break;
        case "flexspace":
            for (var i = 0; i < json.metaData.length; i++) {
                switch (json.metaData[i].fieldName) {

                    case "Collection":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Collection");
                        break;

                    case "Campus":
                        newArtItem.title = (newArtItem.title == "Unknown") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.title + "; " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                    case "Square Footage":
                        newArtItem.artworkSize = (newArtItem.artworkSize == "") ? json.metaData[i].fieldValue : newArtItem.artworkSize + ", " + json.metaData[i].fieldValue;
                        break;
                    case "General Description":
                        newArtItem.abstractNote = (newArtItem.abstractNote == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.abstractNote + ". " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        break;
                    case "Comments (Technology Integration)":
                        newArtItem.abstractNote = (newArtItem.abstractNote == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.abstractNote + ". " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        break;
                    case "Space Design Type":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Space Design Type");
                        break;
                    case "Building Name":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Building Name");
                        break;
                    case "Room Name":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Room Name");
                        break;
                    case "Primary Room Utilization":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Primary Room Utilization");
                        break;
                    case "Rights":
                        newArtItem.rights = (newArtItem.rights == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.rights + ". " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        break;
                    case "Technology Contact Email":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Technology Contact Email");
                        break;
                }
            }
            break;
        default:
            for (var i = 0; i < json.metaData.length; i++) {
                switch (json.metaData[i].fieldName) {
                    case "Creator":
                        newArtItem.creators.push(ZU.cleanAuthor(json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ").replace(/(&gt;)|(&lt;)/g, ""), "author", false));
                        break;
                    case "Related Item":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Related Item");
                        break;
                    case "Period": ///newArtItem.extra=(newArtItem.extra=="")?"Culture: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Period");
                        break;
                    case "Style Period": ///newArtItem.extra=(newArtItem.extra=="")?"Culture: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Style Period");
                        break;
                    case "ID Number": ///newArtItem.extra=(newArtItem.extra=="")?"Culture: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "ID Number");
                        break;
                    case "Site": ///newArtItem.extra=(newArtItem.extra=="")?"Culture: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Site");
                        break;
                    case "Technique": ///newArtItem.extra=(newArtItem.extra=="")?"Culture: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Technique");
                        break;
                    case "Culture": ///newArtItem.extra=(newArtItem.extra=="")?"Culture: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Culture");
                        break;
                    case "Title":
                        newArtItem.title = (newArtItem.title == "Unknown") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.title + "; " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        break;
                    case "Date":
                        newArtItem.date = (newArtItem.date == "") ? json.metaData[i].fieldValue : newArtItem.date + ", " + json.metaData[i].fieldValue;
                        break;
                    case "Location": //newArtItem.extra=(newArtItem.extra=="")?"Location: "+json.metaData[i].fieldValue.replace(/<wbr\/>/,""):newArtItem.extra+", "+json.metaData[i].fieldValue.replace(/<wbr\/>/,"");
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Location");
                        break;
                    case "Material":
                        newArtItem.artworkMedium = (newArtItem.artworkMedium == "") ? json.metaData[i].fieldValue : newArtItem.artworkMedium + " " + json.metaData[i].fieldValue;
                        break;
                    case "Measurements":
                        newArtItem.artworkSize = (newArtItem.artworkSize == "") ? json.metaData[i].fieldValue : newArtItem.artworkSize + ", " + json.metaData[i].fieldValue;
                        break;
                    case "Work Type":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Work Type");
                        break;
                    case "Credit Line":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Credit Line");
                        break;
                    case "Accesssion Number":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Accesssion Number");
                        break;
                    case "Image Copyright Notice":
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Image Copyright Notice");

                        break;
                    case "Repository":
                        newArtItem.archive = (newArtItem.archive == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.archive + ": " + (json.metaData[i].fieldValue).replace(/<wbr\/>/g, "").replace(/<\/?[^>]+(>|$)/g, " ");
                        break;


                    case "Source": //newArtItem.extra=(newArtItem.extra=="")?"Source: "+json.metaData[i].fieldValue.replace(/<wbr\/>/,""):newArtItem.extra+"; "+(json.metaData[i].fieldValue).replace(/<wbr\/>/,"");
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue.replace(/<wbr\/>/g, ""), "Source");
                        break;
                    case "Rights":
                        newArtItem.rights = (newArtItem.rights == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.rights + ". " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");
                        break;
                    case "Description":
                        newArtItem.abstractNote = (newArtItem.abstractNote == "") ? json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ") : newArtItem.abstractNote + ". " + json.metaData[i].fieldValue.replace(/<\/?[^>]+(>|$)/g, " ");

                        break;
                    case "Subject": //newArtItem.extra=(newArtItem.extra=="")?"Subject: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue, "Subject");

                        break;
                    case "Artstor Collection": //newArtItem.extra=(newArtItem.extra=="")?"Subject: "+json.metaData[i].fieldValue:newArtItem.extra+", "+json.metaData[i].fieldValue;
                        newArtItem.extra = addToExtra(newArtItem.extra, json.metaData[i].fieldValue, "Artstor Collection");

                        break;
                    default:
                }
            }
    }
    return newArtItem;

}

function addToExtra(extraValue, value, label) {
    value = value.replace(/\./, "");
    value = value.replace(/<\/?[^>]+(>|$)/g, " ");
    if (extraValue == "") {
        extraValue = label + ": " + value;
    } else {
        if (extraValue.indexOf(label) == -1) {
            extraValue += "; " + label + ": " + value;

        } else {

            extraValue += ", " + value;
        }

    }
    return extraValue;
}

function scrape(doc, url, metaWindowIds) {
    var savedItems = new Array();
    var saved = 0;
    var urlstub = url.substring(url.indexOf('.org/') + 5, url.length);
    //Zotero.debug(urlstub);

    hash = url;
    if (hash.indexOf("|") < 0) {
        hash = hash.replace(/%7c/gi, "|");

    }
    var param = hash.split("|");

    var suburl = hash.substring(hash.indexOf('|') + 1, url.length);
    var service = param[0].replace(/welcome\.html/, "");
    //var serverURL = param[0].substring(0,param[0].length-2);// http://library.artstor.org:8080/library/
    var serverURL = service.substring(0, service.length - 2);
    Zotero.debug("serverURL  " + serverURL);

    //check TN page type
    var pageType = param[1]; //search, imagegroup, categories, My Personal Collection 
    Zotero.debug("pageType " + pageType);

    var imagesPerPage = doc.getElementById("thumbNavImageButt").innerHTML;
    var pageNo = doc.getElementById("pageNo").value;
    var firstImg = (parseInt(pageNo) - 1) * (parseInt(imagesPerPage)) + 1;

    var sortUL = doc.getElementById("sub0sortList");
    var sortElemWChk = sortUL.getElementsByClassName('sortListItemNav');
    var sortOrder = 0; //scrape from page
    if (sortElemWChk.length > 0) {
        switch (sortElemWChk[0].id) {
            case "thumbSortRelevance0":
                sortOrder = 0;
                break;
            case "thumbSortTitle0":
                sortOrder = 1;
                break;
            case "thumbSortCreator0":
                sortOrder = 2;
                break;
            case "thumbSortDate0":
                sortOrder = 3;
                break;

        }
    }
    switch (pageType) {
        case "search":
            var searchTerm = decodeSearchData(decrypt(param[7]));
            Zotero.debug(searchTerm);
            var kw = searchTerm.kw;
            Zotero.debug("kw " + kw);
            kw = encrypt(kw);
            Zotero.debug("encrypt kw " + kw);
            var type = searchTerm.type;
            var origKW = searchTerm.origKW;
            origKW = escape(origKW);
            var order = 0;
            if (type == "3" || type == "2") {
                //search within IG and categories
                var id = searchTerm.id; //get from URL
                var name = searchTerm.name;
                name = escape(name);
                var p = "secure/search/" + param[2] + "/" + firstImg + "/" + imagesPerPage + "/" + sortOrder + "?type=" + type + "&kw=" +
                    kw + "&origKW=" + origKW + "&id=" + id + "&name=" + name + "&order=" + order + "&tn=1";

            } else if (type == "4") {
                //search notes
                var aType = searchTerm.aType;
                var p = "secure/search/" + param[2] + "/" + firstImg + "/" + imagesPerPage + "/" + sortOrder + "?type=" + type + "&kw=" + kw + "&origKW=" + origKW + "&aType=" + aType + "&order=" + order + "&tn=1";
            } else {
                //KW search type=6, PC, All Coll, Inst Coll, Adv Srch
                var collectionTit = decrypt(param[3]);
                var collectionTitle = collectionTit.split(":");
                Zotero.debug("collectionTitle  " + collectionTitle[0]);
                var id = searchTerm.id; //get from URL
                var geoIds = searchTerm.geoIds; //get from URL
                var clsIds = searchTerm.clsIds; //get from URL
                var collTypes = searchTerm.collTypes; //get from URL
                var prGeoId = searchTerm.prGeoId; //get from URL
                var name = collectionTitle[0];
                name = escape(name);
                var bDate = searchTerm.bDate; //get from URL
                var eDate = searchTerm.eDate; //get from URL
                var dExact = searchTerm.dExact; //get from URL
                var p = "secure/search/" + param[2] + "/" + firstImg + "/" + imagesPerPage + "/" + sortOrder + "?type=" + type + "&kw=" +
                    kw + "&origKW=" + origKW + "&geoIds=" + geoIds + "&clsIds=" + clsIds + "&collTypes=" + collTypes + "&id=" + id + "&name=" + name + "&bDate=" + bDate +
                    "&eDate=" + eDate + "&dExact=" + dExact + "&order=" + order + "&isHistory=false&prGeoId=" + prGeoId + "&tn=1";
            }
            break;
        case "imagegroup":
            //Browse IG
            var p = "secure/imagegroup/" + param[2] + "/thumbnails/" + firstImg + "/" + imagesPerPage + "/" + sortOrder;
            break;
        case "collections":
            //Browse AS Category, PC, Inst Colls
            var p = "secure/collections/" + param[2] + "/thumbnails/" + firstImg + "/" + imagesPerPage + "/" + sortOrder;
            break;
        case "categories":
            var p = "secure/categories/" + param[2] + "/thumbnails/" + firstImg + "/" + imagesPerPage + "/" + sortOrder;
            break;
        case "collaboratoryfiltering":
            var p = "secure/collaboratoryfiltering/" + param[2] + "/thumbnails/" + firstImg + "/" + imagesPerPage + "/" + sortOrder + "?collectionId=" + param[8];
            break;
        case "cluster":
            var p = "secure/cluster/" + param[2] + "/thumbnails/" + firstImg + "/" + imagesPerPage + "/" + sortOrder;
            break;
    }
    var serviceURL4IDs = serverURL + p;
    Zotero.debug(serviceURL4IDs);
    Zotero.Utilities.HTTP.doGet(serviceURL4IDs, function(text) {
        var selected = [];
        var json = eval('(' + text + ')');
        /*var json = JSON.parse(text);*/
        items = new Object();
        var objIdArray = [];
        var idArrayLength = json.thumbnails.length;
        var objTitleArray = [];
        for (var i = 0; i < idArrayLength; i++) {
            objIdArray.push(json.thumbnails[i].objectId + ":" + json.thumbnails[i].objectTypeId); //array of all objectids on page
            objTitleArray.push(json.thumbnails[i].thumbnail1); //array of all titles on page
        }

        Zotero.debug("objTitleArray  " + objTitleArray);
        var itemsArray = [];
        if (metaWindowIds != undefined) {
            //process metadata windows instead of TNs
            for (var j = 0; j < metaWindowIds.length; j++) {
                for (var k = 0; k < objIdArray.length; k++) {
                    if (metaWindowIds[j] == objIdArray[k].substring(0, objIdArray[k].indexOf(":"))) {
                        metaWindowIds[j] = objIdArray[k];
                    }
                }
            }

            getMetadata(metaWindowIds, serverURL, url, doc);
            return;
        }
        var wrap = doc.getElementById("thumbContentWrap");


        var thumbClass = "thumbImageHolder";
        if (wrap.style.display == "none") {
            wrap = doc.getElementById("listContentWrap");
            thumbClass = "listImageHolder";
        }

        var imageElems = wrap.getElementsByClassName(thumbClass + " thumbNailImageSelected");
        var arrayLength = imageElems.length;
        for (var i = 0; i < imageElems.length; i++) {
            var id = imageElems[i].id;
            var imageNum = id.substring(id.indexOf("m") + 1, id.indexOf("_"));
            if (parseInt(imageNum) > idArrayLength) {
                arrayLength--;
            }
        }

        if (arrayLength == 0) {
            //all images	
            imageElems = wrap.getElementsByClassName(thumbClass);
            arrayLength = idArrayLength;
        }

        //selected images
        for (var i = 0; i < arrayLength; i++) {
            var id = imageElems[i].id;
            var imageNum = id.substring(id.indexOf("m") + 1, id.indexOf("_"));
            if (objTitleArray[imageNum - 1] == "") {
                items[objIdArray[imageNum - 1]] = "Untitled";

            } else {
                items[objIdArray[imageNum - 1]] = objTitleArray[imageNum - 1];

            }



        }

        Zotero.selectItems(items, function(selectItems) {
            for (var j in selectItems) {
                itemsArray.push(j);
            }
            getMetadata(itemsArray, serverURL, url, doc);
        });
    });

}

function scrapeIV(doc, url) {
    var ivServerURL = url.substring(0, url.indexOf("iv2")); 

    var serviceURL4IVMetadata = ivServerURL + "secure/metadata/";
    var objectIdMod = doc.getElementById("objID").title;
    var items = objectIdMod.split(":");
    var item = items[0];
    var objectTypeId = items[1];
    var serviceURL = serviceURL4IVMetadata + item;
    //Zotero.debug("item  " +item+" serviceURL "+serviceURL);
    Zotero.Utilities.HTTP.doGet(serviceURL, function(text) {
        Zotero.debug("iv text  " + text + "  doc " + doc + "  objectTypeId  " + objectTypeId);
        var artItem = processMetadata(text, item, doc, ivServerURL);
        var server = ivServerURL.substring(0, ivServerURL.length - 8);
        switch (objectTypeId) {
            case "10":
                /*	var serviceURL4IVURL = serviceURL4IVMetadata+item+"?_method=FpHtml";
                						Zotero.Utilities.HTTP.doGet(serviceURL4IVURL, function(text) {
                						processIVURL(text, artItem,ivServerURL,"");
                						
                						});*/
                break;
            case "11":
                var serviceURL4QTVR = ivServerURL + "secure/imagefpx/" + item + "/7"; //QTVR
                Zotero.Utilities.HTTP.doGet(serviceURL4QTVR, function(text) {
                    var jsonQTVR = eval('(' + text + ')');
                    var urlQTVR = server + "thumb/" + jsonQTVR.imageUrl;
                    artItem.attachments.push({
                        title: "Artstor QuickTime Movie Attachment",
                        url: urlQTVR,
                        mimeType: "video/quicktime"

                    });
                });
                break;
            case "12":
                var serviceURL4AUD = ivServerURL + "secure/imagefpx/" + item + "/10"; //audio 
                Zotero.Utilities.HTTP.doGet(serviceURL4AUD, function(text) {
                    var jsonAUD = eval('(' + text + ')');
                    var urlAUD = server + "thumb/" + jsonAUD.imageUrl;
                    artItem.attachments.push({
                        title: "Artstor Audio File Attachment",
                        url: urlAUD,
                        mimeType: "audio/mpeg3"

                    });
                });
                break;
            case "20":
                var serviceURL4PDF = ivServerURL + "secure/imagefpx/" + item + "/20"; //PDF
                Zotero.Utilities.HTTP.doGet(serviceURL4PDF, function(text) {
                    var jsonPDF = eval('(' + text + ')');
                    var urlPDF = server + "thumb" + jsonPDF.imageUrl;
                    Zotero.debug("PDF url  " + urlPDF);
                    artItem.attachments.push({
                        title: "Artstor PDF Attachment",
                        url: urlPDF,
                        mimeType: "application/pdf"

                    });
                });
                break;
            case "21":
                var serviceURL4PPT = ivServerURL + "secure/imagefpx/" + item + "/21"; //PPT
                Zotero.Utilities.HTTP.doGet(serviceURL4PPT, function(text) {
                    var jsonPPT = eval('(' + text + ')');
                    var urlPPT = server + "thumb" + jsonPPT.imageUrl;
                    artItem.attachments.push({
                        title: "Artstor PowerPoint Attachment",
                        url: urlPPT,
                        mimeType: "application/powerpoint"

                    });
                });
                break;
            case "22":
                var serviceURL4DOC = ivServerURL + "secure/imagefpx/" + item + "/22"; //DOC
                Zotero.Utilities.HTTP.doGet(serviceURL4DOC, function(text) {
                    var jsonDOC = eval('(' + text + ')');
                    var urlDOC = server + "thumb" + jsonDOC.imageUrl;
                    artItem.attachments.push({
                        title: "Artstor Word Documnet Attachment",
                        url: urlDOC,
                        mimeType: "application/msword"

                    });
                });
                break;
            case "23":
                var serviceURL4XXLS = ivServerURL + "secure/imagefpx/" + item + "/23"; //XLS
                Zotero.Utilities.HTTP.doGet(serviceURL4XXLS, function(text) {
                    var jsonXLS = eval('(' + text + ')');
                    var urlXLS = server + "thumb" + jsonXLS.imageUrl;
                    artItem.attachments.push({
                        title: "Artstor Excel Attachment",
                        url: urlXLS,
                        mimeType: "application/excel"

                    });
                });
                break;
            case "24":
                var serviceURL4VID = ivServerURL + "secure/imagefpx/" + item + "/24"; //Video
                Zotero.Utilities.HTTP.doGet(serviceURL4VID, function(text) {
                    var jsonVID = eval('(' + text + ')');
                    var urlVID = jsonVID.imageUrl;
                    artItem.attachments.push({
                        title: "Artstor Video File Attachment",
                        url: urlVID,
                        mimeType: "text/html"

                    });
                });
                break;
        }
        var serviceURL4IVURL = serviceURL4IVMetadata + item + "?_method=FpHtml";
        Zotero.Utilities.HTTP.doGet(serviceURL4IVURL, function(text) {
            processIVURL(text, artItem, ivServerURL, "");

        });
        var service4Commentary = ivServerURL + "/secure/icommentary/" + item;
        Zotero.Utilities.HTTP.doGet(service4Commentary, function(text) {

            var jsonCommentary = eval('(' + text + ')');
            Zotero.debug("commentary " + jsonCommentary.numberOfCommentaries);
            for (var j = 0; j < jsonCommentary.numberOfCommentaries; j = j + 1) {
                if (jsonCommentary.ICommentary[j].status == 2) {
                    //public commentary
                    var comment = "";
                    if (jsonCommentary.ICommentary[j].ownerName == "") {
                        comment = "Note: "

                    } else {

                        comment = "Note by: " + jsonCommentary.ICommentary[j].ownerName + " -  ";

                    }
                    comment += jsonCommentary.ICommentary[j].commentary;
                    artItem.notes.push({
                        note: comment
                    });
                }

            }


        });
        artItem.complete();
    });

    Zotero.done();


}

function scrapeMetaWindow(doc, url) {
    var metaWindowIds = [];
    var metaWindows = doc.getElementsByClassName('MetaDataWidgetRoot');
    for (var i = 0; i < metaWindows.length; i++) {
        metaWindowIds.push(metaWindows[i].id.substring(3));

    }
    Zotero.debug("scrapeMetaWindow  " + metaWindowIds);
    scrape(doc, url, metaWindowIds);

    Zotero.done();
}
