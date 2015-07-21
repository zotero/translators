
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
    "lastUpdated": "2015-07-07 14:45:45"
}

/**
    detectWeb is run to determine whether item metadata can indeed be retrieved from the webpage. 
    The return value of this function should be the detected item type (e.g. “journalArticle”, 
    see the overview of Zotero item types), or, if multiple items are found, “multiple”. 
**/
function detectWeb(doc, url) {
    if (url.match(/\/iv2\.|ExternalIV.jsp/)) {
        // Image viewer window
        return "artwork";
    } else if (url.match(/\#3\|/)) {
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
        } else if (url.match(/zMode/)) {
            return "artwork";
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
        - check if the page is a viewer
            - get the image id and type, process it.
        - check if the page is thumbnail page
            - ignore small window
            - if small windows is popped up, process only small window
                get the object ids from small windows, then process the ids.
            - if no small window, get the selected object and process them
                get the object ids from selected objects, then process the ids.
            - otherwise, select all objects in the thumbnails and prompt user
                get the object ids from users, then process the ids.
    - Process the id
        - find the object type.
        - get the metadta service url from id using service call  [domain]/[approot]/secure/metadata/id
            - fetch and convert the metadata from the metadata service call
                - take into consideration of different metadata field for the portals
                - may need to convert/format the data values.
            - fetch the item notes using: 
        - get the resource link url from id: :[domain]/[approot]/secure/metadata/id?_method=FpHtml
            - fetch the resource from resource url
            - set the item title and item mine type.

    doWeb is run when a user, wishing to save one or more items, activates the selected translator. 
    Sidestepping the retrieval of item metadata, we'll first focus on how doWeb can be used to save 
    retrieved item metadata (as well as attachments and notes) to your Zotero library.
**/
function doWeb(doc, url) {
    if (url.match(/\/iv2\.|ExternalIV.jsp/)) {
        doImageViewer(doc, url);
    }
    if (url.match(/\#3\|/)) {
        // Thumbnail window page
        if ((doc.getElementsByClassName('MetaDataWidgetRoot') != null) && (doc.getElementsByClassName('MetaDataWidgetRoot').length > 0)) {
            doMetadataWindow(doc, url);
        } else {
            doThumbnails(doc, url);
        }
    }
}

function doImageViewer(doc, url) {
    // get the image id and object type from the page
    // this contains the objId and object type separate by : as in "AWSS35953_35953_25701160:11"
    var objID = doc.getElementById("objID");
    if (objID != null) {
        var objItems = [];
        var objItem = objID.title;
        objItems.push(objItem);
        processObjects(doc, url, objItems);
    }
}

function doMetadataWindow(doc, url) {
    // get object id from metadata window.
    var metaWindows = doc.getElementsByClassName('MetaDataWidgetRoot');
    var objItems = [];
    for (var i = 0; i < metaWindows.length; i++) {
        // the dom id is mdwSS7730455_7730455_8806769 that is object id
        // prefixed with mdw.
        var id = metaWindows[i].id.substring(3);
        objItems.push(id);
    }

    processSelectedObject(doc, url, objItems, 1);
}

function htmlDecode(doc, input){
    var fieldValue = input.replace(/<wbr\/>/g, "");
    fieldValue = fieldValue.replace(/<br\/>/g, "");
 
    var decodedValue;
    if (fieldValue.match(/&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/i)) {
        var e = doc.createElement('div');
        e.innerHTML = fieldValue;
         decodedValue = e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    }
    else {
        decodedValue = fieldValue;
    }
    return decodedValue;
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
                        // candidateItems[key] = masterObj.title;
                        candidateItems[key] = htmlDecode(doc, masterObj.title);
                    }
                } else {
                    for (var j = 0; j < masterObjList.length; j++) {
                        masterObj = masterObjList[j];
                        var key = masterObj.id + ":" + masterObj.type;
                        candidateItems[key] = htmlDecode(doc, masterObj.title);
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
            var ele = imageElems[i];
            var divId = ele.id;
            var visible = false;
            if (divId.indexOf('large') >= 0) {
               visible = ele.parentNode.parentNode.parentNode.style.display == "block";
            } 
            else {
                visible = ele.parentNode.parentNode.style.display == "block";
            }
            if (visible) {
                // we need to get the index (1) from id string "custom1_imageHolder"
                var imageNum = divId.substring(divId.indexOf("m") + 1, divId.indexOf("_"));
                indexes.push(parseInt(imageNum) - 1);
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

        getMetaDataItem(doc, url, objItem, dataItem);
    }
}

function getMetaDataItem(doc, url, objItem, dataItem) {
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
            'Artifact Dimensions': 'artworkSize',
            'Rights': 'rights'
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
        processPortalData(doc, dataItem, json, portalMap[portal], portal);
        getNotesDataItem(url, objItem, dataItem);
    });
}

function processPortalData(doc, dataItem, json, fieldMap, portal) {
    var fieldName;
    var fieldValue;
    if (portal == 'archaeology') {
        var hasSiteName = false;
        for (var i = 0; i < json.metaData.length; i++) {
            fieldName = json.metaData[i].fieldName;
            fieldValue = htmlDecode(doc, json.metaData[i].fieldValue);
            if (fieldName in fieldMap) {
                var key = fieldMap[fieldName];
                if (fieldName == 'Site Name') {
                    hasSiteName = true;
                    setItemValue(dataItem, "title", fieldValue);
                } else if (fieldName == 'Artifact Title') {
                    if (hasSiteName) {
                        setItemLabelValue(doc, dataItem, "extra", fieldName, dataItem.title);
                        hasSiteName = false;
                    }
                    setItemValue(dataItem, "title", fieldValue);
                }
                else {
                    setItemValue(dataItem, key, fieldValue);
                }
            } else {
                setItemLabelValue(doc, dataItem, "extra", fieldName, fieldValue);
            }
        }

    } else {
        for (var i = 0; i < json.metaData.length; i++) {
            fieldName = json.metaData[i].fieldName;
            fieldValue = htmlDecode(doc, json.metaData[i].fieldValue);
            // fieldValue = json.metaData[i].fieldValue;
            if (fieldName in fieldMap) {
                var key = fieldMap[fieldName];
                if (key == 'creators') {
                    setItemCreator(dataItem, fieldValue);
                } else {
                    setItemValue(dataItem, key, fieldValue);
                }
            } else {
                setItemLabelValue(doc, dataItem, "extra", fieldName, fieldValue);
            }
        }
    }
    if (dataItem.title == undefined) {
        dataItem.title = "Unknown";
    }
}

function setItemCreator(dataItem, fieldValue) {
    var names = [];
    if (fieldValue.indexOf(';') > 0) {
        names = fieldValue.split(';')
    } else {
        names.push(fieldValue);
    }
    for (var i = 0; i < names.length; i++) {
        var str = names[i];
        var contributor = "author";
        var name = str;
        var value = name.replace(/<\/?[^>]+(>|$)/g, " ").replace(/(&gt;)|(&lt;)/g, "");
        dataItem.creators.push(ZU.cleanAuthor(value, contributor, false));
    }
}

function cleanStringValue(str) {
    var cleanValue = str.replace(/\<wbr\/>/g, "");
    cleanValue = cleanValue.replace(/<\/?[^>]+(>|$)/g, " ");
    return cleanValue;
}
 
function setItemLabelValue(doc, dataItem, key, label, value) {
    var cleanValue = cleanStringValue(value);
 
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
    var cleanValue = cleanStringValue(value);

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
        service = service.substring(0, service.indexOf("</td>")).replace(/<wbr\/>/g, "").substring(service.indexOf("?")).trim();
        dataItem.url = getServerUrl(url) + "/secure/ViewImages" + service + "&zoomparams=&fs=true";
        dataItem.complete();
    });
}

function getPortal(url) {
    var portal = url.substring(url.indexOf('://') + 3, url.indexOf('.'));
    return portal;
}

function getServerUrl(url) {
    var serverUrl;
    if (url.indexOf('/iv2\.') > 0) {
        serverUrl = url.substring(0, url.indexOf('iv2\.'));
    } else if (url.indexOf('/ExternalIV.jsp') > 0) {
       serverUrl = url.substring(0, url.indexOf('ExternalIV.jsp'));
    }
    else {
        serverUrl = url.substring(0, url.indexOf('#3'));
    }
    serverUrl = serverUrl.substring(0, serverUrl.lastIndexOf('/'));
    return serverUrl;
}

function getSortOrder(doc) {
    var sortOrder = 0; 
    var sortUL = doc.getElementById("sub0sortList");
    if (sortUL !== null) {
        var sortElemWChk = sortUL.getElementsByClassName('sortListItemNav');
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
    }
    return sortOrder;
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
    if (pageDOM != null) {
        imagesPerPage = pageDOM.innerHTML;
    }
    var pageSize = parseInt(imagesPerPage);
    var startIdx = (pageNo - 1) * pageSize + 1;

    // get sort order
    var sortOrder = getSortOrder(doc);

    var serviceURL = "";
    switch (pageType) {
        case "search":
            var searchTerm = decodeSearchData(decrypt(params[7]));

            var kw = searchTerm.kw;
            kw = encodeURIComponent(kw);
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
                serviceURL = getServiceUrlRoot(url) + pageType + "/" + params[2] + "/" + startIdx + "/" + pageSize + "/" + sortOrder + "?type=" + type + "&kw=" +
                    kw + "&origKW=" + origKW + "&aType=" + aType + "&order=" + order + "&tn=1";

            } else {
                //KW search type=6, PC, All Coll, Inst Coll, Adv Srch
                var collectionTit = decrypt(params[3]);
                var collectionTitle = collectionTit.split(":");
                var name = escape(collectionTitle[0]);
                serviceURL = getServiceUrlRoot(url) + pageType + "/" + params[2] + "/" + startIdx + "/" + pageSize + "/" + sortOrder + "?type=" + type + "&kw=" +
                    kw + "&origKW=" + origKW + "&geoIds=" + searchTerm.geoIds + "&clsIds=" + searchTerm.clsIds + "&collTypes=" + searchTerm.collTypes + "&id=" +
                    searchTerm.id + "&name=" + name + "&bDate=" + searchTerm.bDate +
                    "&eDate=" + searchTerm.eDate + "&dExact=" + searchTerm.dExact + "&order=" + order + "&isHistory=false&prGeoId=" + searchTerm.prGeoId + "&tn=1";
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

    It converts
    type=6&kw=stimson hall|all#and,1925|all&geoIds=&clsIds=&collTypes=&id=all&bDate=-2019&eDate=2030&dExact=1&prGeoId=&origKW=stimson hall|all#and,1925|all
    to  {
             "type": 6
             "kw": "stimson hall|all#and,1925|all"
             "geoIds": ""
             "clsIds": ""
             "collTypes": ""
             "id": "all"
             "bDate": "-2019"
             "eDate": "2030"
             "dExact": "1"
             "prGeoId": ""
             "origKW": "stimson hall|all#and,1925|all"
         }
**/
function decodeSearchData(str) {
    var param = str.split('&');
    var searchData = new Object();
    var sparam;
    var id;
    var value;
    for (var i = 0; i < param.length; i++) {
        sparam = param[i].split('=');
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

/**
    Converts two character number character to special character
    it converts 
        type3D3626kw3Dairstream20trailer26geoIds3D
    to
        type=6&kw=airstream trailer&geoIds=
**/
function decrypt(s) {
    return s.replace(/!(\d{1,5})!|(\d[\dA-F])/g, function(m, unicode, hex) {
        // Either unicode or hex are set, not both. unicode has priority over hex in the match
        if (unicode) {
            return String.fromCharCode(parseInt(unicode)); // Always parses because of regexp
        } 

        // must be hex
        try {  
            return decodeURIComponent('%' + hex) 
        }
        catch(e) { 
            /* Some hex character escapes are invalid */ 
        }

        return m; // Fail-safe
    });
}


/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "artwork",
        "url": "http://www.sscommons.org/openlibrary/ExternalIV.jsp?objectId=4jEkdDElLjUzRkY6fz5%2BRXlDOHkje1x9fg%3D%3D&fs=true",
        "items": [
            {
                "itemType": "artwork",
                "title": "Trailer Home; Exterior view",
                "creators": [
                    {
                        "firstName": "Image by: Barbara",
                        "lastName": "Lane",
                        "creatorType": "author"
                    }
                ],
                "date": "Photographed: 2001",
                "extra": "Location: Bradford County, Pennsylvania; Collection: Bryn Mawr College Faculty/Staff/Student Photographs; ID Number: 01-07828; Source: Personal photographs of Professor Barbara Lane, 2001",
                "libraryCatalog": "ARTstor",
                "rights": "Copyright is owned by the photographer. Questions can be directed to sscommons@brynmawr.edu.; This image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/our-organization/o-html/copyright.shtml for contact information and instructions on how to proceed.",
                "url": "http://www.sscommons.org/openlibrary/secure/ViewImages?id=4jEkdDElLjUzRkY6fz5%2BRXlDOHkje1x9fg%3D%3D&userId=gDFB&zoomparams=&fs=true",
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

