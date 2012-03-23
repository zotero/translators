{
	"translatorID": "99be9976-2ff9-40df-96e8-82edfa79d9f3",
	"label": "Defense Technical Information Center",
	"creator": "Matt Burton",
	"target": "^https?://oai\\.dtic\\.mil/oai/",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gb",
	"lastUpdated": "2012-03-12 00:59:32"
}

function detectWeb(doc, url) {
	if(doc.title.indexOf("DTIC OAI Index for") != -1) {
		return "multiple";
	} else if (url.indexOf("verb=getRecord") != -1){
		return "report";
	}
}

function doWeb(doc, url) {
		var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var newURIs = new Array();
	
	if(detectWeb(doc,url) == "multiple"){
		var links = doc.evaluate("//a/@href", doc, nsResolver, XPathResult.Abstract, null);
		var titles = doc.evaluate("//a/preceding::text()[1]", doc, nsResolver, XPathResult.Abstract, null);
		var items = new Object();
		var link, title;
		while( link = links.iterateNext(), title = titles.iterateNext()){
			items[link.textContent.replace(/&metadataPrefix=html/, "&metadataPrefix=oai_dc")] = title.textContent;
		}
		
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var url in items) {
				newURIs.push(url);
			}
			Zotero.Utilities.processDocuments(newURIs, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();	
		});
		
		
	} else {
		newURIs = url.replace(/&metadataPrefix=html/, "&metadataPrefix=oai_dc");
		scrape(doc, newURIs);
	}
}
	
	function scrape(doc, newURIs){
	// ripped the arXiv.org code, hence the funny var names.
	Zotero.Utilities.HTTP.doGet(newURIs, function(text) {
		var newItem = new Zotero.Item("report");
		//	remove header
		text = text.replace(/<!DOCTYPE[^>]*>/, "").replace(/<\?xml[^>]*\?>/, "");
		//	fix non-compliant XML tags (colons)
		text = text.replace(/<dc:/g, "<dc_").replace(/<\/dc:/g, "</dc_");
		text = text.replace(/<oai_dc:dc/g, "<oai_dc_dc").replace(/<\/oai_dc:dc/g, "</oai_dc_dc");
		text = text.replace(/<OAI-PMH[^>]*>/, "").replace(/<\/OAI-PMH[^>]*>/, "");
		text = "<zotero>" + text + "</zotero>";
		var xml = new XML(text);
		var title;
		var citation = xml.GetRecord.record.metadata.oai_dc_dc;
		var test = xml..responseDate.text().toString();

		if (citation.dc_title.length()){
			title = Zotero.Utilities.trimInternal(citation.dc_title.text().toString());
			newItem.title = title;
		}
		Zotero.debug("article title: " + title);
		var type = "author";
		if(citation.dc_creator.length()) {
		var authors = citation.dc_creator;
			for(var j=0; j<authors.length(); j++) {
				Zotero.debug("author: " + authors[j]);
				newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[j].text().toString(),type,true));
			}
		}
		if (citation.dc_date.length()) {
			var dates = citation.dc_date;
			newItem.date = Zotero.Utilities.trimInternal(dates[0].text().toString());
		}
		if (citation.dc_description.length()) {
			var descriptions = citation.dc_description;
			for (var j=0; j<descriptions.length(); j++) {
				var noteStr = Zotero.Utilities.trimInternal(descriptions[j].text().toString());
				newItem.notes.push({note:noteStr});
			}
		}
		if (citation.dc_subject.length()) {
			var subjects = citation.dc_subject;
			for (var j=0; j<subjects.length(); j++) { 
				var subjectValue = Zotero.Utilities.trimInternal(subjects[j].text().toString());
				newItem.tags.push(subjectValue);
			}
		}
		if (citation.dc_identifier.length()) {
			var identifiers = citation.dc_identifier;
			for (var j=0; j<identifiers.length(); j++) {
				var identifier = Zotero.Utilities.trimInternal(identifiers[j].text().toString());
				if (identifier.substr(0, 4) == "doi:") {
					newItem.DOI = identifier;
				}
				else if (identifier.substr(0, 7) == "http://") {
					newItem.url = identifier;
				}
				else {
					newItem.extra = identifier;
				}
			}
		}
		var articleID = "";
		if (xml.GetRecord.record.header.identifier.length()) {
			articleID = xml.GetRecord.record.header.identifier.text().toString();
			articleID = articleID.substr(14);
			newItem.publicationTitle = articleID;
		}
//		TODO add "arXiv.org" to bib data?
		newItem.attachments.push({url:newItem.url, title:"DTIC Snapshot", mimeType:"text/html"});
		if (newItem.notes[0]['note']) {
			newItem.abstractNote = newItem.notes[0]['note'];
			newItem.notes = new Array();
		}
		newItem.complete();
	})
	}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://oai.dtic.mil/oai/oai?&verb=getRecord&metadataPrefix=html&identifier=ADA466425",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Dennis M.",
						"lastName": "DeCoste",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"CYBERNETICS",
					"*ARTIFICIAL INTELLIGENCE",
					"*SYSTEMS ANALYSIS",
					"*QUALITATIVE ANALYSIS",
					"MONITORING",
					"THESES",
					"*QUALITATIVE REASONING",
					"MEASUREMENT INTERPRETATION",
					"EXPLANATION",
					"*QUALITATIVE PHYSICS",
					"SYSTEMS BEHAVIOR",
					"PINTERP SPACE",
					"PINTERPS",
					"QUALITATIVE STATES",
					"ENVISIONMENTS",
					"FAULTY DATA",
					"INTERPRETATION CREDIBILITIES",
					"DURATION CONSTRAINTS",
					"DEPENDENCY PATHS",
					"COMPLEXITY ANALYSIS",
					"DATMI(DYNAMIC ACROSS-TIME MEASUREMENT INTERPRETATION)"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "DTIC Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Dynamic Across-Time Measurement Interpretation: Maintaining Qualitative Understandings of Physical System Behavior",
				"date": "1990-02",
				"url": "http://stinet.dtic.mil/oai/oai?&verb=getRecord&metadataPrefix=html&identifier=ADA466425",
				"abstractNote": "Incrementally maintaining a qualitative understanding of physical system behavior based on observations is crucial to real-time process monitoring, control, and diagnosis . This paper describes the DATMI theory for dynamically maintaining a pinterp-space, a concise representation of local and global interpretations consistent with the observations over time. Each interpretation signifies alternative paths of states in a qualitative envisionment . Representing a space of interpretations, instead of just a \"current best\" one, avoids the need for extensive backtracking to handle incomplete or faulty data. Domain-specific knowledge about state and transition probabilities can be used to maintain the best working interpretation as well. Domain-specific knowledge about durations of states and paths of states can also be used to further constrain the interpretation space. When all these constraints lead to inconsistencies, faulty-data hypotheses are generated and then tested by adjusting the pinterp-space. The time and space complexity of maintaining the pinterp-space is polynomial in the number of measurements and envisionment states.",
				"libraryCatalog": "Defense Technical Information Center",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Dynamic Across-Time Measurement Interpretation"
			}
		]
	},
	{
		"type": "web",
		"url": "http://oai.dtic.mil/oai/20070613_3_docs.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/