{
	"translatorID": "b38a44f4-b8af-4553-9edf-fba4d2598d6a",
	"label": "Springer Books",
	"creator": "Jonathan Schulz",
	"target": "^https?://www\\.springer\\.com/\\w\\w/(book)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2017-10-08 12:22:52"
}

function detectWeb(doc, url) {
	var action = url.match(/^https?:\/\/[^\/]+\/[^\/]+\/([^\/?#]+)/);
	if(!action) return;
	switch(action[1]) {
		case "book":
			// test if any relevant <meta> information is available
			if(ZU.xpathText(doc, '//meta[@property="og:title"]/@content')) return "book";
//	add other types in the future
	}
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	//Call the embedded metadata translator
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function(obj, item) {
		//extract information from the title field:
		//item.title = <book title> | <first creator> | Springer
		title_entries = item.title.split(/\s\|\s/);
		item.title = title_entries[0];
		//forward compatibility: check if the embedded metadata translator
		//has found a creator (i.e. relevant metadata)
		if (item.creators.length > 0) {
			item.complete; return;
		}
		Z.debug("no creators found by Embedded Metadata translator");
		//try to extract data from the bibliography fields
		editors = ZU.xpathText(doc, '//li[@itemprop="editor"]/span');
		authors = ZU.xpathText(doc, '//li[@itemprop="author"]/span');
		if (editors || authors) {
			if (editors) editors = editors.split(", "); else editors = [];
			if (authors) authors = authors.split(", "); else authors = [];
			for (var i=0; i<editors.length; i++)
				item.creators.push(ZU.cleanAuthor(editors[i], "editor", editors[i].indexOf(',') != -1));
			for (var i=0; i<authors.length; i++)
				item.creators.push(ZU.cleanAuthor(authors[i], "author", authors[i].indexOf(',') != -1));
		} else if (title_entries[1]) {
			//if that doesn't work use the author formerly in the title field;
			//assume generically that it's an author
			item.creators.push(ZU.cleanAuthor(title_entries[1], "author", title_entries[1].indexOf(',') != -1));
		}
		//Try to find additional information
		if (!item.publisher) {
			publisher = ZU.xpathText(doc, '//dd[@itemprop="publisher"]/span');
			item.publisher = publisher;
		}
		if (!item.ISBN) {
			isbn = ZU.xpathText(doc, '//dd[@itemprop="isbn"]');
			item.ISBN = isbn;
		}
		//The abstract note is shortened in the <meta> field; try to load
		//the full abstract note
		long_abstractNote = ZU.xpath(doc, '//div[@class="product-about"]//div[@class="springer-html"]');
		long_abstractNote = long_abstractNote[0].textContent.trim();
		long_abstractNote = long_abstractNote.replace(/(?:\r\n|\r|\n)/g, ' ');
		//Check for consistency with existing shortened abstractNote
		if (item.abstractNote && item.abstractNote.length>10) {
			if (item.abstractNote.substring(0,9) == long_abstractNote.substring(0,9))
				item.abstractNote = long_abstractNote;
			else
				Z.debug("Error in the detection of the long abstract note.");
		} else {
			item.abstractNote = long_abstractNote;
		}
		
		item.complete();
	});
	translator.translate();
}
