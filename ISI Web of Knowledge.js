{
	"translatorID": "594ebe3c-90a0-4830-83bc-9502825a6810",
	"label": "ISI Web of Knowledge",
	"creator": "Michael Berkowitz, Avram Lyon",
	"target": "(WOS_GeneralSearch|product=WOS|product=CABI)",
	"minVersion": "2.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 5,
	"lastUpdated": "2011-07-21 12:55:37"
}

function detectWeb(doc, url) {
	if ((doc.title.indexOf("Web of Science Results") != -1) | (doc.title.indexOf("CABI Results") != -1)) {
		return "multiple";
	} else if (url.indexOf("full_record.do") != -1) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var ids = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object;
		var xpath = '//a[@class="smallV110"]';
		var titles = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href.match(/\?(.*)/)[1]] = next_title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			for (var i in items) {
				ids.push(i);
			}
			fetchIds(ids, url);
		}); 
	} else {
		ids.push(url.match(/\?(.*)/)[1]);
		fetchIds(ids, url);
	}
}

function fetchIds(ids, url) {
	// Call yourself
	var importer = Zotero.loadTranslator("import");
	importer.setTranslator("594ebe3c-90a0-4830-83bc-9502825a6810");
	Zotero.debug(importer);
	
	var hostRegexp = new RegExp("^(https?://[^/]+)/");
	var m = hostRegexp.exec(url);
	var host = m[1];
	for (var i in ids) {
		ids[i] = host+"/full_record.do?" + ids[i];
	}
	var product = url.match("product=([^\&]+)\&")[1];
	Zotero.Utilities.processDocuments(ids, function (newDoc) {
		var url = newDoc.location.href;
		Zotero.debug("pd");
		var sid = newDoc.evaluate('//input[@name="selectedIds"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		var nid = newDoc.evaluate('//input[@name="SID"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		var post2 = 'product='+product+'&product_sid=' + nid + '&plugin=&product_st_thomas=http://esti.isiknowledge.com:8360/esti/xrpc&export_ref.x=0&export_ref.y=0';
		var post = 'action=go&mode=quickOutput&product='+product+'&SID=' + nid + '&format=ref&fields=BibAbs&mark_id='+product+'&count_new_items_marked=0&selectedIds=' + sid + '&qo_fields=bib&endnote.x=95&endnote.y=12&save_options=default';
		Zotero.Utilities.doPost('http://apps.isiknowledge.com/OutboundService.do', post, function (text, obj) {
			Zotero.debug("post1");
			Zotero.Utilities.doPost('http://pcs.isiknowledge.com/uml/uml_view.cgi', post2, function (text, obj) {
				Zotero.debug("post2");
				Zotero.debug(text);
				importer.setString(text);
				importer.setHandler("itemDone", function (obj, item) {
					item.attachments = [{url: url, mimeType: "text/html", title: "ISI Web of Knowledge Record"}];
					item.complete();
				});
				importer.translate();
			});
		});
	}, function() {});
	Zotero.wait();
}

function detectImport() {
        var line;
        var i = 0;
        while((line = Zotero.read()) !== false) {
                line = line.replace(/^\s+/, "");
                if(line != "") {
                        if(line.substr(0, 4).match(/^PT [A-Z]/)) {
                                return true;
                        } else {
                                if(i++ > 3) {
                                        return false;
                                }
                        }
                }
        }

}

function processTag(item, field, content) {
	var map = {"J": "journalArticle"};
	if (field == "PT") {
		item.itemType = map[content];
		if (item.itemType === undefined) {
			item.itemType = "journalArticle";
			Z.debug("Unknown type: " + content);
		}
	} else if ((field == "AF" || field == "AU")) {
		authors = content.split("\n");
		for each (var i in authors) {
			var author = i.split(",");
			item.creators.push({firstName:author[1], lastName:author[0], creatorType:"author"});
		}
	} else if (field == "TI") {
		item.title = content;
	} else if (field == "SO") {
		// People say ISI is bad about being all-caps; let's try this for now
		// http://forums.zotero.org/discussion/17316
		if (content.toUpperCase() == content)
			content = Zotero.Utilities.capitalizeTitle(content.toLowerCase(), true);
		item.publicationTitle = content;
	} else if (field == "SN") {
		item.ISSN = content;
	} else if (field == "PD" || field == "PY") {
		if (item.date) {
			item.date += " " + content;
		} else {
			item.date = content;
		}
	} else if (field == "VL") {
		item.volume = content;
	} else if (field == "IS") {
		item.issue = content;
	} else if (field == "BP") {
		item.pages = content;
	} else if (field == "EP") {
		item.pages += "-" + content;
	} else if (field == "AB") {
		item.abstractNote = content;
	} else if (field == "DI") {
		item.DOI = content;
	} else {
		Zotero.debug("Discarding: " + field + " => "+content);
	}
}

function completeItem(item) {
	item.complete();
}

function doImport(text) {
	var line = true;
	var tag = data = false;
	do {    // first valid line is type
		line = Zotero.read();
		line = line.replace(/^\s+/, "");
	} while(line !== false && !line.substr(0, 6).match(/^PT [A-Z]/));

	var item = new Zotero.Item();
	var i = 0;

	var tag = "PT";
	
	var data = line.substr(3);
	
	var rawLine;
	while((rawLine = Zotero.read()) !== false) {    // until EOF
		// trim leading space if this line is not part of a note
		line = rawLine.replace(/^\s+/, "");
		var split = line.match(/^([A-Z0-9]{2}) (?:([^\n]*))?/);
		// Force a match for ER
		if (line.substr(0,2) == "ER") split = ["","ER",""];
		if(split) {
			// if this line is a tag, take a look at the previous line to map
			// its tag
			if(tag) {
				//Zotero.debug("tag: '"+tag+"'; data: '"+data+"'");
				processTag(item, tag, data);
			}

			// then fetch the tag and data from this line
			tag = split[1];
			data = split[2];
			
			if(tag == "ER") {	       // ER signals end of reference
				// unset info
				tag = data = false;
				completeItem(item);
			}
			if(tag == "PT") {
				// new item
				item = new Zotero.Item();
				i++;
			}
		} else {
			// otherwise, assume this is data from the previous line continued
			if(tag == "AU") {
				//Z.debug(rawLine);
				// preserve line endings for AU fields
				data += rawLine.replace(/^  /,"\n");
			} else if(tag) {
				// otherwise, concatenate and avoid extra spaces
				if(data[data.length-1] == " " || rawLine[0] == " ") {
					data += rawLine;
				} else {
					data += " "+rawLine;
				}
			}
		}
	}

	if(tag && tag != "ER") {	// save any unprocessed tags
		//Zotero.debug(tag);
		processTag(item, tag, data);
		completeItem(item);
	}
}
