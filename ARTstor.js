
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
    "lastUpdated": "2015-07-01 18:45:45"
}

/*
    This translator works for Artstor library sites (http://library.artstor.org) and
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

/**
    detectWeb is run to determine whether item metadata can indeed be retrieved from the webpage. 
    The return value of this function should be the detected item type (e.g. “journalArticle”, 
    see the overview of Zotero item types), or, if multiple items are found, “multiple”. 
**/
function detectWeb(doc, url) {
    if (url.match(/iv2/)) {
        // Image viewer window
        return "artwork";
    } else if (url.match(/\#3/)) {
        // Thumbnail window page
        if ((doc.getElementsByClassName('MetaDataWidgetRoot') != null) && (doc.getElementsByClassName('MetaDataWidgetRoot').length > 0)) {
            // There are multiple metadata windows visible
            return "artwork";
        } else if ((doc.getElementById("floatingPlaceHolder") != null) && (doc.getElementById("floatingPlaceHolder").style.display == "block")) {
            // Don't capture date if small window is present
            return false;
        } else if ((doc.getElementById("thumbNavSave1") != null) && (doc.getElementById("thumbNavSave1").style.display == "block")) {
            // Don't capture data if image group window is in editing state.
            return false;
        } else if ((doc.getElementById("ssContentWrap") != null) && (doc.getElementById("ssContentWrap").style.display == "inline")) {
            // Don't capture data if slide show window is present
            return false;
        } else {
            if (url.match(/zMode/)) {
                return "artwork";
            }
        }
        // Allow thumbnail window.
        return "multiple";
    }
    // all other page, data can not be captured.
    return false;
}

/**
    Overall logic:
    - Detect the page context:
        - check if the page is main window (ignore)
        - check if the page is collection splash (ignore)
        - check if the page is thumbnail page
            - ignore small window
            - if small windows is popped up, process only small window
                get the object ids from small windows, then process the ids.
            - if no small window, get the selected object and process them
                get the object ids from selected objects, then process the ids.
            - otherwise, select all objects in the thumbnails
                get the object ids from the thumbnail windows, then process the ids.
        - check if the page is image viewer
            - get the object from the image viewer, then process the id.
    - Process the id
        - find the object type.
        - get the metadta service url from id using service call  http://library.artstor.org/library/secure/metadata/id
            - fetch and convert the metadata from the metadata service call
                - take into consideration of different metadata field for the portals
                - may need to convert/format the data values.
            - fetch the item notes using: 
        - get the resource link url from id: :http://library.artstor.org/library/secure/metadata/id?_method=FpHtml
            - fetch the resource from resource url
            - set the item title and item mine type.

    doWeb is run when a user, wishing to save one or more items, activates the selected translator. 
    Sidestepping the retrieval of item metadata, we'll first focus on how doWeb can be used to save 
    retrieved item metadata (as well as attachments and notes) to your Zotero library.

    detectWeb receives two arguments, the webpage document object and URL (typically named doc and url). 
    In some cases, the URL provides all the information needed to determine whether item metadata is 
    available, allowing for a simple detectWeb function, e.g. (example from Cell Press.js): 
**/
function doWeb(doc, url) {
    if (url.match(/iv2/)) {
        doImageViewer(doc, url);
    }
    if (url.match(/#3/)) {
        // Thumbnail window page
        if ((doc.getElementsByClassName('MetaDataWidgetRoot') != null) && (doc.getElementsByClassName('MetaDataWidgetRoot').length > 0)) {
            doMetadataWindow(doc, url);
        } else {
            var skipThumbnail = false;
            if ((doc.getElementById("floatingPlaceHolder") != null) && (doc.getElementById("floatingPlaceHolder").style.display == "block")) {
                // Don't capture date if small window is present
                skipThumbnail = true;
            }
            if ((doc.getElementById("thumbNavSave1") != null) && (doc.getElementById("thumbNavSave1").style.display == "block")) {
                // Don't capture data if image group window is in editing state.
                skipThumbnail = true;
            }
            if ((doc.getElementById("ssContentWrap") != null) && (doc.getElementById("ssContentWrap").style.display == "inline")) {
                // Don't capture data if slide show window is present
                skipThumbnail = true;
            }
            // Allow thumbnail window.
            if (!skipThumbnail) {
                doThumbnails(doc, url);
            }
        }
    }
}

function doImageViewer(doc, url) {
    // get the image id and object type from the page
    // this contains the objId and object type separate by : as in "AWSS35953_35953_25701160:11"
    var objID = doc.getElementById("objID");
    if (objID != null) {
        var objItems = [];
        var objItem = doc.getElementById("objID").title;
        objItems.push(objItem);
        processObjects(doc, url, objItems);
    }
}

function doMetadataWindow(doc, url) {
    // get object id from metadata window.
    var metaWindows = doc.getElementsByClassName('MetaDataWidgetRoot');
    var objItems = [];
    for (var i = 0; i < metaWindows.length; i++) {
        var id = metaWindows[i].id.substring(3);
        objItems.push(id);
    }

    processSelectedObject(doc, url, objItems, 1);
}

function processSelectedObject(doc, url, selectedObjs, selectionType) {
    var serviceURL = getThumbnailServiceURL(doc, url);
    Zotero.Utilities.HTTP.doGet(serviceURL, function(text) {
        // get the master object list
        var json = JSON.parse(text);
        var objDescItem;
        var masterObjList = [];
        for (var i = 0; i < json.thumbnails.length; i++) {
            var thumbnail = json.thumbnails[i];
            objDescItem = new Object();
            objDescItem.id = thumbnail.objectId;
            objDescItem.type = thumbnail.objectTypeId;
            objDescItem.title = thumbnail.thumbnail1;
            masterObjList.push(objDescItem);
        }
        // Proccess the selected items by look up the data from master list.
        var zMode = false;
        if (url.match(/zMode/)) {
            zMode = true;
        }
        switch (selectionType) {
            case 2: // selection from thumbnals
                var candidateItems = new Object();
                var masterObj;
                if (selectedObjs.length > 0) {
                    for (var j = 0; j < selectedObjs.length; j++) {
                        var idx = selectedObjs[j];
                        masterObj = masterObjList[idx];
                        var key = masterObj.id + ":" + masterObj.type;
                        candidateItems[key] = masterObj.title;
                    }
                } else {
                    for (var j = 0; j < masterObjList.length; j++) {
                        masterObj = masterObjList[j];
                        var key = masterObj.id + ":" + masterObj.type;
                        candidateItems[key] = masterObj.title;
                    }
                }
                if (zMode && Object.keys(candidateItems).length > 0) {
                    var objItems = [];
                    for (var objItem in candidateItems) {
                        objItems.push(objItem);
                        processObjects(doc, url, objItems);
                        break;
                    }
                } else {
                    Zotero.selectItems(candidateItems, function(selectItems) {
                        var objItems = [];
                        for (var objItem in selectItems) {
                            objItems.push(objItem);
                        }
                        processObjects(doc, url, objItems);
                    });
                }
                break;
            case 1: // item from metadata window or image viewer
                // build look up table for eazy look up.
                var masterLookup = new Object();
                for (var m = 0; m < masterObjList.length; m++) {
                    masterLookup[masterObjList[m].id] = masterObjList[m];
                }
                var objItems = [];
                for (var i = 0; i < selectedObjs.length; i++) {
                    var id = selectedObjs[i];
                    if (masterLookup[id] == "") {
                        var item = id + ":10"; // default type as image.
                        objItems.push(item);
                    } else {
                        var item = masterLookup[id].id + ":" + masterLookup[id].type;
                        objItems.push(item);
                    }
                }
                processObjects(doc, url, objItems);
                break;
        }
    }); // Zotero..doGet
};


function doThumbnails(doc, url) {
    var selectedObjs = getSelectedItems(doc, url);
    processSelectedObject(doc, url, selectedObjs, 2);
}

/**
    getMasterThumbnailList gets the thumbnail object id by calling the thumbnail 
    service to get a list of object id and its title.
    It returns with a list of object with object id, and object title.
**/
function getMasterThumbnailList(doc, url, objDescItems) {
    // var objDescItems = [];
    var serviceURL = getThumbnailServiceURL(doc, url);
    Zotero.Utilities.HTTP.doGet(serviceURL, function(text) {
        var json = JSON.parse(text);
        var objDescItem;
        for (var i = 0; i < json.thumbnails.length; i++) {
            var thumbnail = json.thumbnails[i];
            objDescItem = new Object();
            objDescItem.id = thumbnail.objectId;
            objDescItem.type = thumbnail.objectTypeId;
            objDescItem.title = thumbnail.thumbnail1;
            objDescItems.push(objDescItem);
        }
    });
    return objDescItems;
}

/**
    getSelectedItems gets the selected item by checking the items selected.
    It returns with a list of object with index id.
**/
function getSelectedItems(doc, url) {
    var indexes = [];
    var wrap = doc.getElementById("thumbContentWrap");
    if ((wrap !== null) && (wrap.style.display == "none")) {
        wrap = doc.getElementById("listContentWrap");
    }
    if (wrap != null) {
        var imageElems = wrap.getElementsByClassName("thumbNailImageSelected");
        for (var i = 0; i < imageElems.length; i++) {
            if (imageElems[i].parentNode.parentNode.style.display == "block") {
                var id = imageElems[i].id; // we need to get the index (1) from id string "custom1_imageHolder"
                var imageNum = id.substring(id.indexOf("m") + 1, id.indexOf("_"));
                indexes.push(parseInt(imageNum));
            }
        }
    }
    return indexes;
}

/**
    processObjects gets the object data using service call.
    objIds has the following member: id, type
**/
function processObjects(doc, url, objIds) {
    for (var i = 0; i < objIds.length; i++) {
        var objItem = objIds[i];
        var dataItem = new Zotero.Item('artwork');
        dataItem.attachments.push({
            title: "Artstor Thumbnails",
            document: doc
        });

        getMetaDataItem(url, objItem, dataItem);
    }
    Zotero.done();
}

function getMetaDataItem(url, objItem, dataItem) {
    var portalMap = {
        'flexspace': {
            'Campus': 'title',
            'Square Footage': 'artworkSize',
            'General Description': 'abstractNote',
            'Comments (Technology Integration)': 'abstractNote',
            'Rights': 'rights'
        },
        'archaeology': {
            'Site Name': 'title',
            'Artifact Title': 'title',
            'Artifact Description': 'abstractNote',
            'Artifact Repository': 'archive',
            'Rights': 'rights',
            'Site Date': 'date',
            'Artifact Materials/Techniques': 'artworkMedium',
            'Artifact Dimensions': 'artworkSize'
        },
        'default': {
            'Creator': 'creators',
            'Title': 'title',
            'Date': 'date',
            'Material': 'artworkMedium',
            'Measurements': 'artworkSize',
            'Repository': 'archive',
            'Rights': 'rights',
            'Description': 'abstractNote',
            'Accession Number': 'callNumber'
        }
    };

    var itemAry = objItem.split(':');
    var serviceUrl = getServiceUrlRoot(url) + "metadata/" + itemAry[0];
    Zotero.Utilities.HTTP.doGet(serviceUrl, function(text) {
        var json = JSON.parse(text);
        var portal = getPortal(url);
        if (!(portal in portalMap)) {
            portal = 'default';
        }
        processPortalData(dataItem, json, portalMap[portal], portal);
        getNotesDataItem(url, objItem, dataItem);
    });

    return dataItem;
}

function processPortalData(dataItem, json, fieldMap, portal) {
    var fieldName;
    var fieldValue;
    if (portal == 'archaeology') {
        var hasSiteName = false;
        for (var i = 0; i < json.metaData.length; i++) {
            fieldName = json.metaData[i].fieldName;
            fieldValue = json.metaData[i].fieldValue;
            if (fieldName in fieldMap) {
                var key = fieldMap[fieldName];
                if (fieldName == 'Site Name') {
                    hasSiteName = true;
                    setItemValue(dataItem, "title", fieldValue);
                } else if (fieldName == 'Artifact Title') {
                    if (hasSiteName) {
                        setItemLabelValue(dataItem, "extra", fieldName, dataItem.title);
                        hasSiteName = false;
                    }
                    setItemValue(dataItem, "title", fieldValue);
                }
            } else {
                setItemLabelValue(dataItem, "extra", fieldName, fieldValue);
            }
        }

    } else {
        for (var i = 0; i < json.metaData.length; i++) {
            fieldName = json.metaData[i].fieldName;
            fieldValue = json.metaData[i].fieldValue;
            if (fieldName in fieldMap) {
                var key = fieldMap[fieldName];
                if (key == 'creators') {
                    setItemCreator(dataItem, fieldValue);
                } else {
                    setItemValue(dataItem, key, fieldValue);
                }
            } else {
                setItemLabelValue(dataItem, "extra", fieldName, fieldValue);
            }
        }
    }
    if (dataItem.title == undefined) {
        dataItem.title = "Unknown";
    }
}

function setItemCreator(dataItem, fieldValue) {
    fieldValue = fieldValue.replace(/<wbr\/>/g, "");
    var names = [];
    if (fieldValue.indexOf(';')) {
        names = fieldValue.split(';')
    }
    else {
        names.push(fieldValue);
    }
    for (var i = 0; i < names.length; i++) {
        var str = names[i];
        var contributor = "author";
        var name = str;

        if (str.indexOf(':') > 0) {
            var params = str.split(':');
            contributor = params[0];
            name = params[1];
        }
        dataItem.creators.push(ZU.cleanAuthor(name.replace(/<\/?[^>]+(>|$)/g, " ").replace(/(&gt;)|(&lt;)/g, ""), contributor, false));
    }
}

function setItemLabelValue(dataItem, key, label, value) {
    var cleanValue = value.replace(/<\/?[^>]+(>|$)/g, " ");
    cleanValue = cleanValue.replace(/\./, "");
    cleanValue = cleanValue.replace(/<wbr\/>/g, "");

    if (!(key in dataItem)) {
        dataItem[key] = label + ": " + cleanValue;

    } else {
        var fieldValue = dataItem[key];
        if (fieldValue.indexOf(label) >= 0) {
            dataItem[key] += ", " + cleanValue;
        } else {
            dataItem[key] += "; " + label + ": " + cleanValue;

        }
    }
}

function setItemValue(dataItem, key, value, override) {
    var cleanValue = value.replace(/<\/?[^>]+(>|$)/g, " ");
    cleanValue = cleanValue.replace(/\./, "");
    cleanValue = cleanValue.replace(/<wbr\/>/g, "");

    if (!(key in dataItem) || override) {
        dataItem[key] = cleanValue;

    } else {
        dataItem[key] += "; " + cleanValue;
    }
}

function getNotesDataItem(url, objItem, dataItem) {
    var itemAry = objItem.split(':');
    var objType = itemAry[1];
    var serviceURL = getServiceUrlRoot(url) + "icommentary/" + itemAry[0];
    Zotero.Utilities.HTTP.doGet(serviceURL,
        function(text) {
            var json = JSON.parse(text);
            for (var j = 0; j < json.numberOfCommentaries; j = j + 1) {
                if (json.ICommentary[j].status == 2) {
                    //public commentary
                    var comment = "";
                    if (json.ICommentary[j].ownerName == "") {
                        comment = "Note: ";
                    } else {
                        comment = "Note by: " + json.ICommentary[j].ownerName + " -  ";
                    }
                    comment += json.ICommentary[j].commentary;
                    dataItem.notes.push({
                        note: comment
                    });
                }
            }
            getResourceDataItem(url, objItem, dataItem);
        }
    ); //doGet

}


function getResourceDataItem(url, objItem, dataItem) {
    var itemAry = objItem.split(':');
    var serviceURL = getServiceUrlRoot(url) + "metadata/" + itemAry[0] + "/" + "?_method=FpHtml";

    Zotero.Utilities.HTTP.doGet(serviceURL, function(text) {
        var service = text.substring(text.indexOf("secure"));
        service = service.substring(0, service.indexOf("</td>"));
        service = service.replace(/<wbr\/>/g, "");
        service = service.substring(service.indexOf("?"));
        service = service.trim();
        dataItem.url = getServerUrl(url) + "secure/ViewImages" + service + "&zoomparams=&fs=true"; 
        getNonImageDataItem(url, objItem, dataItem);
    });
}

function getNonImageDataItem(url, objItem, dataItem) {
    var ARTSTOR_MEDIA_MAPPINGS = {
        "11": ["7", "Artstor QuickTime Movie Attachment", "video/quicktime"], //qtvr
        "12": ["10", "Artstor Audio File Attachment", "audio/mpeg3"], // audio
        "20": ["20", "Artstor PDF Attachment", "application/pdf"], // pdf
        "21": ["21", "Artstor PowerPoint Attachment", "application/powerpoint"], // powerpoint
        "22": ["22", "Artstor Word Attachment", "application/msword"], // word
        "23": ["23", "Artstor Excel Attachment", "application/excel"], // excel
        "24": ["24", "Artstor Video File Attachment", "text/html"], // video
    };

    var itemAry = objItem.split(':');
    var objType = itemAry[1];
    var mediaInfo = ARTSTOR_MEDIA_MAPPINGS[objType];
    if (mediaInfo !== undefined) {
        var serviceURL = getServiceUrlRoot(url) + "imagefpx/" + itemAry[0] + "/" + mediaInfo[0];

        Zotero.Utilities.HTTP.doGet(serviceURL, function(text) {

            var json = JSON.parse(text);
            var imageUrl = json.imageUrl;
            var mediaUrl;
            if (imageUrl.indexOf('http') >= 0) {
                mediaUrl = json.imageUrl;
            } else {
                if (imageUrl.indexOf('/') == 0) {
                    mediaUrl = getFileRoot(url) + "/thumb" + imageUrl;
                } else {
                    mediaUrl = getFileRoot(url) + "/thumb/" + imageUrl;
                }
            }
            dataItem.attachments.push({
                title: mediaInfo[1],
                url: mediaUrl,
                mimeType: mediaInfo[2]
            });
            dataItem.url = url;
            dataItem.complete();
        });
    } else {
        dataItem.complete();
    }
    Zotero.done();
}

function getPortal(url) {
    var portal = url.substring(7, url.indexOf("."));
    return portal;
}

function getServerUrl(url) {
    var serverUrl;
    if (url.indexOf('/iv2') > 0) {
        serverUrl = url.substring(0, url.indexOf('iv2\.'));
    } else {
        serverUrl = url.substring(0, url.indexOf('#3'));
    }
    serverUrl = serverUrl.substring(0, serverUrl.lastIndexOf('/'));
    return serverUrl;
}

function getThumbnailServiceURL(doc, url) {
    var serverUrl = getServerUrl(url);
    var paramStr = url.substring(url.indexOf('#'));

    // process escapde "|"
    if (paramStr.indexOf('|') < 0) {
        paramStr = parramStr.replace(/%7c/gi, "|");
    }

    var params = paramStr.split('|');
    var pageType = params[1];
    var contentId = params[2];

    // get page number
    var pageNo = 0;
    var pageNoDOM = doc.getElementById("pageNo");
    if (pageNoDOM != null) {
        pageNo = parseInt(pageNoDOM.value);
    }

    // get page size
    var imagesPerPage = "1";
    var pageDOM = doc.getElementById("thumbNavImageButt");
    if (pageDOM != null)
            imagesPerPage = pageDOM.innerHTML;
    var pageSize = parseInt(imagesPerPage);
    var startIdx = (pageNo - 1) * pageSize + 1;

    // get sort order
    var sortOrder = 0; //scrape from page
    var sortUL = doc.getElementById("sub0sortList");
    if (sortUL !== null) {
        var sortElemWChk = sortUL.getElementsByClassName('sortListItemNav');
        if ((sortElemWChk != null) &&  (sortElemWChk.length > 0)) {
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
    }

    var serviceURL = "";
    switch (pageType) {
        case "search":
            var searchTerm = decodeSearchData(decrypt(params[7]));

            var kw = searchTerm.kw;
            kw = encrypt(kw);
            var type = searchTerm.type;

            var origKW = searchTerm.origKW;
            origKW = escape(origKW);
            var order = 0;
            if (type == "3" || type == "2") {
                //search within IG and categories
                serviceURL = getServiceUrlRoot(url) + pageType + "/" + params[2] + "/" + startIdx + "/" + pageSize + "/" + sortOrder + "?type=" + type + "&kw=" +
                    kw + "&origKW=" + origKW + "&id=" + searchTerm.id + "&name=" + escape(searchTerm.name); + "&order=" + order + "&tn=1";

            } else if (type == "4") {
                //search notes
                var aType = searchTerm.aType;
                serviceURL = getServiceUrlRoot(url) + pageType + "/" + params[2] + "/" + startIdx + "/" + pageSize + "/" + sortOrder + "?type=" + type + "&kw=" + kw + "&origKW=" + origKW + "&aType=" + aType + "&order=" + order + "&tn=1";

            } else {
                //KW search type=6, PC, All Coll, Inst Coll, Adv Srch
                var collectionTit = decrypt(params[3]);
                var collectionTitle = collectionTit.split(":");
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

                serviceURL = getServiceUrlRoot(url) + pageType + "/" + params[2] + "/" + startIdx + "/" + pageSize + "/" + sortOrder + "?type=" + type + "&kw=" +
                    kw + "&origKW=" + origKW + "&geoIds=" + geoIds + "&clsIds=" + clsIds + "&collTypes=" + collTypes + "&id=" + id + "&name=" + name + "&bDate=" + bDate +
                    "&eDate=" + eDate + "&dExact=" + dExact + "&order=" + order + "&isHistory=false&prGeoId=" + prGeoId + "&tn=1";
            }
            //p=escape(p);
            break;
        case "collaboratoryfiltering":
            var serviceURL = getServiceUrlRoot(url) + pageType + "/" + params[2] + "/thumbnails/" + startIdx + "/" + pageSize + "/" + sortOrder + "?collectionId=" + params[8];
            break;
        case "imagegroup": // image group
        case "collections":
        case "categories":
        case "cluster":
        default:
            serviceURL = getServiceUrlRoot(url) + pageType + "/" + contentId + "/thumbnails/" + startIdx + "/" + pageSize + "/" + sortOrder;
    }
    return serviceURL;
}

function getServiceUrlRoot(url) {
    var serviceRoot = getServerUrl(url) + "/secure/";
    return serviceRoot;

}

function getFileRoot(url) {
    var fileRoot = getServerUrl(url).substring(0, getServerUrl(url).lastIndexOf('/'));
    return fileRoot;
}

/**
    decodeSearchData is an helper function to process the search result page.
    It converts the search url parameter into arrary of parameter values.
**/
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
        } else {
            searchData[id] = value;
        }
    }
    return searchData;
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
    //              '5C' : '\\',
    '5D': ']',
    '5E': '^',
    '5F': '_',
    '60': '`',
    '7B': '{',
    '7C': '|',
    '7D': '}',
    '7E': '~'
};

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
    // '\\' : '5C',
    ']': '5D',
    '^': '5E',
    '_': '5F',
    '`': '60',
    '{': '7B',
    '|': '7C',
    '}': '7D',
    '~': '7E'
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

/* Not working in test framework */
/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "artwork",
        "url": "http://www.sscommons.org/openlibrary/welcome.html#3|collections|7730455||zModeBryn20Mawr20College20Faculty2FStaff2FStudent20Photographs||||||",
        "defer": true,
        "items": [
            {
                "itemType": "artwork",
                "title": "Trailer Home; Exterior view",
                "creators": [
                    {
                        "firstName": "Barbara",
                        "lastName": "Lane",
                        "creatorType": "Image by"
                    }
                ],
                "date": "Photographed: 2001",
                "extra": "Location: Bradford County, Pennsylvania; Collection: Bryn Mawr College Faculty/Staff/Student Photographs; ID Number: 01-07828; Source: Personal photographs of Professor Barbara Lane, 2001",
                "libraryCatalog": "ARTstor",
                "rights": "Copyright is owned by the photographer Questions can be directed to sscommons@brynmawr.edu.; This image has been  selected and made av ailable by a user us ing Artstor's softwa re tools Artstor ha s not screened or se lected this image or  cleared any rights  to it and is acting  as an online service  provider pursuant t o 17 U.S.C. §512. Ar tstor disclaims any  liability associated  with the use of thi s image. Should you  have any legal objec tion to the use of t his image, please vi sit http://www.artst or.org/our-organizat ion/o-html/copyright .shtml for contact i nformation and instr uctions on how to pr oceed.",
                "url": "http://www.sscommons.org/openlibrarysecure/ViewImages?id=4jEkdDElLjUzRkY6fz5%2BRXlDOHkje1x9fg%3D%3D&userId=gDFB&zoomparams=&fs=true",
                "attachments": [
                    {
                        "title": "Artstor Thumbnails"
                    }
                ],
                "tags": [],
                "notes": [],
                "seeAlso": []
            }
        ]
    }
]
/** END TEST CASES **/

