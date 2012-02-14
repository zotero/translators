{
	"translatorID": "032ae9b7-ab90-9205-a479-baf81f49184a",
	"translatorType": 2,
	"label": "TEI",
	"creator": "Stefan Majewski",
	"target": "xml",
	"minVersion": "2.1b3",
	"maxVersion": null,
	"priority": 25,
	"inRepository": true,
	"configOptions": {
		"dataMode": "xml/e4x",
		"getCollections": "true"
	},
	"displayOptions": {
		"exportNotes": false,
		"Export Tags": false,
		"Generate XML IDs": true,
		"Full TEI Document": false,
		"Export Collections": false
	},
	"lastUpdated": "2012-02-14 08:03:26"
}

// ********************************************************************
//
// tei-zotero-translator. Zotero 2 to TEI P5 exporter.
//
// Copyright (C) 2010 Stefan Majewski <xml@stefanmajewski.eu>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.


// *********************************************************************
//
// This script does fairly well with papers, theses, websites and
// books.  Some item properties, important for the more exotic
// publication types, are still missing. That means, the first 30 are
// implemented, the rest may be added when I need them. If you like to
// see some particular item property and you also have a basic idea
// how to represent them in TEI (without breaking the, to me, more
// important ones), please contact me or send a patch.
//
// <analytic> vs <monogr> Both elements are used. The script tries to
// figure out where which information might be appropriately placed. I
// hope this works.
//
// INSTALLATION
//
// For installation in Zotero 2 or above, you just have to drop this
// file into the folder
//
// <mozProfileDir>/zotero/translators
//
// using Linux, this should be typically something like:
// /home/username/.mozilla/firefox/ca9dfjvs.default/zotero/translators
//
// For Windows 6-7, people told me that you find this folder somewhere like
// C:\Users\UserName\AppData\Roaming\Mozilla\Firefox\ca9dfjvs.default\zotero\translators
//
// For Windows -5 probably (not tested) C:\Documents and Settings\UserName\Application Data\Mozilla\Firefox\ca9dfjvs.default\zotero\translators
//
// The important thing is that you locate your Firefox profile dir. If
// you can't find it
// http://kb.mozillazine.org/Profile_folder_-_Firefox#Finding_the_profile_folder
// could be helpful.
//
// Zotero 1.x is not supported, mainly due to installation
// issues. Zotero 1.x stores translators in the sqlite database and
// not in file-space. If you feel brave enough you may use the
// scaffold add-on for firefox, to manually add the translator to the
// database.
//
// TROUBLESHOOTING
//
// As far as I have tested it so far, it should be rather robust. So, chances
// are good that you will not run into trouble.
//
// But, if it doesn't work, it doesn't work. Unfortunately the error
// messages are not very specific. Usually, when there is something
// wrong with the translator it does not work at all. Sometimes,
// nevertheless, there are messages in the JavaScript error console.
//
// If you encounter a non-responsive Firefox after having installed
// this script, just delete the script and everything should be
// alright again.
// ******************************************************************

// Zotero.addOption("exportNotes", false);
// Zotero.addOption("generateXMLIds", true);

var exportedXMLIds = [];
var generatedItems = [];
var allItems = [];


function genXMLId (item){
    var xmlid = '';
    if(item.creators && item.creators[0] && item.creators[0].lastName){
        xmlid = item.creators[0].lastName;
        if(item.date) {
            var date = Zotero.Utilities.strToDate(item.date);
            if(date.year) {
                xmlid += date.year;
            }
        }
        // Replace space and colon by "_"
        xmlid = xmlid.replace(/([ \t\[\]:])+/g,"_");

        // Remove any non xml NCName characters

        // Namestart = ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] |
        // [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF]
        // | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] |
        // [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] |
        // [#x10000-#xEFFFF]
        
        // Name =  NameStartChar | "-" | "." | [0-9] | #xB7 |
        // [#x0300-#x036F] | [#x203F-#x2040]

        xmlid = xmlid.replace(/^[^A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF]/, "");
        xmlid = xmlid.replace(/[^-A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF.0-9\u00B7\u0300-\u036F\u203F-\u2040]/g, "");
    }
    else{
        xmlid += 'zoteroItem_' + item.itemID;
    }
    // this is really inefficient
    var curXmlId = xmlid;
    if(exportedXMLIds[curXmlId]){
        // append characters to make xml:id unique
        // a-z aa-az ba-bz
        var charA = 97;
        var charZ = 122;
        var firstId = xmlid + "a";
        // reset id of previous date-only item to <date> + "a";
        if(exportedXMLIds[curXmlId] && 
           !exportedXMLIds[firstId]){
            var xml = new Namespace("xml", "http://www.w3.org/XML/1998/namespace");
            exportedXMLIds[curXmlId].@xml::id = firstId;
            exportedXMLIds[firstId] = exportedXMLIds[curXmlId];
        }
        // then start from b
        for (var i = charA + 1; exportedXMLIds[curXmlId]; i++){
            curXmlId = xmlid + String.fromCharCode(i);
            if(i == charZ){
                i = charA;
                xmlid += String.fromCharCode(charA);
            }
        }
        xmlid = curXmlId;
    }
    // set in main loop
    // exportedXMLIds[xmlid] = true;
    return xmlid;
}

function generateItem(item) {
    // fixme not all conferencepapers are analytic!
    var analyticItemTypes = {"journalArticle":true,
                             "bookSection":true,
                             "magazineArticle":true,
                             "newspaperArticle":true,
                             "conferencePaper":true};
    var xml = new Namespace("xml", "http://www.w3.org/XML/1998/namespace");

    var isAnalytic = analyticItemTypes[item.itemType];    
    var bibl = <biblStruct type={item.itemType} xmlns="http://www.tei-c.org/ns/1.0"/>;

    if(Zotero.getOption("Generate XML IDs")){
        if(!generatedItems[item.itemID]){ 
            var xmlid =  genXMLId(item);
            bibl.@xml::id = xmlid;
            exportedXMLIds[xmlid] = bibl;
        }
        else{
            var xml = new Namespace("xml", "http://www.w3.org/XML/1998/namespace");
            var xmlid = "#" + generatedItems[item.itemID].@xml::id;
            var myXmlid = "zoteroItem_" + item.itemID;

            bibl.@sameAs = xmlid;

            if(xmlid != myXmlid){
                bibl.@xml::id = myXmlid;
                exportedXMLIds[myXmlid] = bibl;
            }
        }
    }

    generatedItems[item.itemID] = bibl;

    /** CORE FIELDS **/
    
    // create title or monogr
    if(isAnalytic){
        bibl.analytic = <analytic/>;
        bibl.monogr = <monogr/>;
        if(item.title){
            bibl.analytic.appendChild(<title>{item.title}</title>);
        }
        else{
            bibl.analytic.appendChild(<title/>);
        }
        // there should be a publication title!
        if(item.publicationTitle){
            bibl.monogr.appendChild(<title>{item.publicationTitle}</title>);
        }
        // nonetheless if the user pleases this has to be possible
        else if(!item.conferenceName){
            bibl.monogr.appendChild(<title/>);
        }
    }
    else {
        bibl.monogr = <monogr/>;
        if(item.title){
            bibl.monogr.appendChild(<title>{item.title}</title>);
        }
        else if(!item.conferenceName){
            bibl.monogr.appendChild(<title/>);
        }
    }

    // add name of conference
    if(item.conferenceName){
        bibl.monogr.appendChild(<title type="conferenceName">{item.conferenceName}</title>);
    }

    // itemTypes in Database do unfortunately not match fields
    // of item
    if(item.series || item.seriesTitle){
        bibl.series = <series/>;
        if(item.series){
            bibl.series.appendChild = <title>{item.series}</title>;
        }
        if(item.seriesTitle){
            bibl.series.appendChild = <title type="alternative">{item.seriesTitle}</title>;
        }
        if(item.seriesText){
            bibl.series.appendChild = <note type="description">{item.seriesText}</note>;
        }
        if(item.seriesNumber){
            bibl.series.appendChild(<biblScope type="vol">{item.seriesNumber}</biblScope>);
        }
    }

    // creators are all people only remotely involved into the creation of
    // a resource
    for(var i in item.creators){
        var role = '';
        var curCreator = '';
        var curRespStmt = null;
        var type = item.creators[i].creatorType;
        if(type == "author"){
            curCreator = <author/>;
        }
        else if (type == "editor"){
            curCreator = <editor/>;                         
        }
        else if (type == "seriesEditor"){
            curCreator = <editor/>;
        }
        else if (type == "bookAuthor"){
            curCreator = <author/>;                         
        }
        else {
            curRespStmt = <respStmt/>;
            curRespStmt.appendChild(<resp>{type}</resp>);
            curCreator = <persName/>;
            curRespStmt.appendChild(curCreator);
        }
        // add the names of a particular creator
        if(item.creators[i].firstName){
            curCreator.appendChild(<forename>{item.creators[i].firstName}</forename>);
        }
        if(item.creators[i].lastName){
            if(item.creators[i].firstName){
                curCreator.appendChild(<surname>{item.creators[i].lastName}</surname>);
            }
            else{
                curCreator.appendChild(<name>{item.creators[i].lastName}</name>);
            }
        }

        // make sure the right thing gets added
        if(curRespStmt){
            curCreator = curRespStmt;
        }

        //decide where the creator shall appear
        if(type == "seriesEditor"){
            bibl.series.editor = curCreator;
        }
        else if(isAnalytic && (type != 'editor' && type != 'bookAuthor')){
            // assuming that only authors go here
            bibl.analytic.appendChild(curCreator);
        }
        else{
            bibl.monogr.appendChild(curCreator);
        }
    }

    if(item.edition){
        bibl.monogr.edition = item.edition;
    }
    // software
    else if (item.version){
        bibl.monogr.edition = item.version;
    }


    //create the imprint
    bibl.monogr.imprint = <imprint/>;

    if(item.place){
        bibl.monogr.imprint.pubPlace = item.place;
    }
    if(item.volume){
        bibl.monogr.imprint.appendChild(<biblScope type="vol">{item.volume}</biblScope>);
    }
    if(item.issue){
        bibl.monogr.imprint.appendChild(<biblScope type="issue">{item.issue}</biblScope>);
    }
    if(item.section){
        bibl.monogr.imprint.appendChild(<biblScope type="chap">{item.section}</biblScope>);
    }
    if(item.pages){
        bibl.monogr.imprint.appendChild(<biblScope type="pp">{item.pages}</biblScope>);
    }
    if(item.publisher){
        bibl.monogr.imprint.publisher = item.publisher;
    }
    if(item.date){
        var date = Zotero.Utilities.strToDate(item.date);
        if(date.year) {
            bibl.monogr.imprint.date = date.year;
        }
        else{
            bibl.monogr.imprint.date = item.date;
        }
    }

    // flag unpublished if there is no date | publisher | place
    if(!(item.date || item.publisher || item.place)){
        bibl.monogr.imprint.publisher = "unpublished"
    }
    if(item.accessDate){
        bibl.monogr.imprint.appendChild(<note type="accessed">{item.accessDate}</note>);
    }
    if(item.url){
        bibl.monogr.imprint.appendChild(<note type="url">{item.url}</note>);
    }
    if(item.thesisType){
        bibl.monogr.imprint.appendChild(<note type="thesisType">{item.thesisType}</note>);
    }

    //export notes
    if(Zotero.getOption("exportNotes")) {
        for(var n in item.notes) {
            // do only some basic cleaning of the html
            bibl.appendChild(<note>{item.notes[n].note.replace(/<(([^>"]*)|("[^"]*"))+>/g,"")}</note>);
            // bibl.appendChild(<note>{item.notes[n].note.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*( +[a-zA-Z][a-zA-Z0-9]*=\"[-_a-zA-Z0-9 ,.;:]*\")*\/?>/g,"")}</note>);
        }
    }

    //export tags, if available
    if(Zotero.getOption("Export Tags") && item.tags && item.tags.length > 0) {
      var tags = <note type="tags"/>
      for(var n in item.tags) {
            tags.appendChild(<note type="tag">{item.tags[n].tag}</note>);
        }
      bibl.appendChild(tags);
    }

    // the canonical reference numbers
    if(item.ISBN){
        bibl.appendChild(<idno type="ISBN">{item.ISBN}</idno>);
    }
    if(item.ISSN){
        bibl.appendChild(<idno type="ISSN">{item.ISSN}</idno>);
    }
    if(item.DOI){
        bibl.appendChild(<idno type="DOI">{item.DOI}</idno>);
    }
    if(item.callNumber){
        bibl.appendChild(<idno type="callNumber">{item.callNumber}</idno>);
    }
    return bibl;
}

function generateCollection(collection){
    var listBibl;
    var children = collection.children ? collection.children : collection.descendents;


    if(children.length > 0){
        listBibl = <listBibl xmlns="http://www.tei-c.org/ns/1.0"/>;
        listBibl.head = collection.name;
        for each(child in children){
            if(child.type == "collection"){
                listBibl.appendChild(generateCollection(child));
            }
            else if(allItems[child.id]){
                listBibl.appendChild(generateItem(allItems[child.id]));
            }
        }
    }
    return listBibl;
}

function generateTEIDocument(listBibls){
    var tei = // <TEI/>
        <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
        <fileDesc>
        <titleStmt>
        <title>Exported from Zotero</title>
        </titleStmt>
        <publicationStmt>
        <p>unpublished</p>
        </publicationStmt>
        <sourceDesc>
        <p>Generated from Zotero database</p>
        </sourceDesc>
        </fileDesc>
        </teiHeader>
        </TEI>;
    tei.text = <text/>;
    tei.text.body = <body/>;
    for each(lb in listBibls){
        tei.text.body.appendChild(lb);
    }
    return tei;
}

function doExport() {
    Zotero.debug("starting TEI-XML export");
    Zotero.setCharacterSet("utf-8");
    Zotero.debug("TEI-XML Exporting items");

    var item = null;
    while(item = Zotero.nextItem()){
        allItems[item.itemID] = item;
    }


    var collection = Zotero.nextCollection();
    var listBibls = new Array();
    if(Zotero.getOption("Export Collections") && collection){
        var curListBibl = generateCollection(collection);
        if(curListBibl){
            listBibls.push(curListBibl);
        }
        while(collection = Zotero.nextCollection()){
            curListBibl = generateCollection(collection);
            if(curListBibl){
                listBibls.push(curListBibl);
            }
        }
    }
    else {
        var listBibl = <listBibl xmlns="http://www.tei-c.org/ns/1.0" />;
        for each(item in allItems){
            //skip attachments
            if(item.itemType == "attachment"){
                continue;
            }
            listBibl.appendChild(generateItem(item));
        }
        listBibls.push(listBibl);
    }



    var outputDocument;

    if(Zotero.getOption("Full TEI Document")){
        outputDocument = generateTEIDocument(listBibls);
    }
    else{
        if(listBibls.length > 1){
            outputDocument =  <listBibl xmlns="http://www.tei-c.org/ns/1.0"/>;
            for each(lb in listBibls){
                outputDocument.appendChild(lb);
            }
        }
        else if(listBibls.length == 1){
            outputDocument = listBibls[0];
        }
        else{
            outputDocument = <empty/>
        }
    }

    // write to file.
    Zotero.write('<?xml version="1.0"?>'+"\n");
    Zotero.write(outputDocument.toXMLString());
}