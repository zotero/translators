{
	"translatorID": "b4c83513-921f-474b-adc3-7017ea690ba7",
	"label": "Republik.ch",
	"creator": "Johannes Wüthrich",
	"target": "^https?://www\\.republik\\.ch/[0-9]*/[0-9]*/[0-9]*/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2021-06-13 15:02:28"
}

/*
Tagesspiegel Translator
Copyright (C) 2021 Johannes Wüthrich

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
	// TODO match different types of articles / debates / updates / blog-posts / newsletters etc.
	
	return "newspaperArticle";
}


function doWeb(doc, url) {
	// TODO adapt for multiple type of sources (see above)
	
	scrape(doc, url);
}


function scrape(doc, url) {

	var newItem = new Zotero.Item("newspaperArticle");

	newItem.title = ZU.xpathText(doc, "//article//section[@class='title-block']/h1");
	
	var abstract = ZU.xpathText(doc, "//article//section[@class='title-block']/h1/following::p[1]");
	var meta = ZU.xpathText(doc, "//article//section[@class='title-block']/h1/following::p[2]");
	
	Zotero.debug(abstract);
	Zotero.debug(meta);
	
	if(abstract.localeCompare(meta) == 0) {
		// Catch case without any description / abstract
		meta = abstract
		abstract = "";
	}
	newItem.abstractNote = abstract;
	
	
	const reg_date = /(.*),?\s+([0-3][0-9]\.[0-1][0-9]\.[1-3][0-9][0-9][0-9])$/;
	const reg_function = /(.*)\s+\((.*)\)/
	
	var date = meta.match(reg_date)
	
	if(!date) {
		newItem.date = meta;
	} else {
		
		newItem.date = date[2];
		
		var rest = date[1];
		
		var authors = rest.match(/von\s+(.*)$/i);
		if(authors){
		
			authors = authors[1].split(/,\s|\sund\s/);
			
			Zotero.debug(authors);
		
			for(var aa in authors){

				var author = authors[aa].trim();
				
				var fction = "author";
				
				var clean = author.match(reg_function);
				if(clean) {
					author = clean[1];
					if(clean[2] == "Bilder" || clean[2] == "Illustration" || clean[2] == "Übersetzung") {
						fction = "contributor";
					}
				}
				
				newItem.creators.push(ZU.cleanAuthor(author, fction));
			}
		}
	}

	newItem.url = ZU.xpathText(doc, '//meta[@property="og:url"]/@content') || url;

	newItem.attachments.push({
		url: newItem.url,
		title: "Snapshot",
		mimeType: "text/html"
	});

	var pdfURL = ZU.xpathText(doc, "//article//a[@title='PDF-Optionen']/@href");
	if(pdfURL) {
		newItem.attachments.push({
			url: pdfURL,
			title: "PDF",
			mimeType: "application/pdf"
		});
	}

	// Tags
	newItem.publicationTitle = "Republik";
	newItem.language = "de-CH";
	newItem.complete();

}
