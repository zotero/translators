{
	"translatorID": "e4660e05-a935-43ec-8eec-df0347362e4c",
	"label": "ERIC",
	"creator": "Ramesh Srigiriraju, Avram Lyon",
	"target": "^http://(?:www\\.)?eric\\.ed\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-10-18 16:28:37"
}

function detectWeb(doc, url)	{
	// Search results
	var searchpath='//div[@id="searchFaceted"]//td[@class="resultHeader"]';
	if(doc.evaluate(searchpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext())
		return "multiple";
	// Clipboard
	if(url.match(/ERICWebPortal\/search\/clipboard\.jsp/))
		return "multiple";	
	// folder
	if(url.match(/ERICWebPortal\/MyERIC\/clipboard\/viewFolder\.jsp\?folderIndex/))
		return "multiple";	
	// Individual record
	var singpath='//div[@id="titleBarBlue"]';
	var res = doc.evaluate(singpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if(res && res.textContent.indexOf("Record Details") !== -1)	{
		var typepath='//tr[td/span/a/strong/text()="Pub Types:"]/td[2]/text()';
		var typestr=doc.evaluate(typepath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
		var typereg=new RegExp("([^;/\-]+)");
		var typearr=typereg.exec(typestr);
		if(typearr[1]=="Journal Articles")
			return "journalArticle";
		if(typearr[1]=="Information Analyses")
			return "journalArticle";
		if(typearr[1]="Machine")
			return "computerProgram";
		if(typearr[1]="Computer Programs")
			return "computerProgram";
		if(typearr[1]="Dissertations")
			return "thesis";
		if(typearr[1]="Reports")
			return "report";
		if(typearr[1]="Non")
			return "audioRecording";
		if(typearr[1]="Legal")
			return "statute";
		else
			return "book";
	}
}

function doWeb(doc, url)	{
	if(detectWeb(doc, url) == "multiple")	{
		var string="http://eric.ed.gov/ERICWebPortal/custom/portlets/clipboard/performExport.jsp";
		var items=new Array();
		if(url.match(/ERICWebPortal\/search\/clipboard\.jsp/)
			|| url.match(/ERICWebPortal\/MyERIC\/clipboard\/viewFolder\.jsp\?folderIndex/)) {
			// We have a clipboard or folder page; structure is the same
			var rowpath='//table[@class="tblDataTable"]/tbody/tr[td]';
			var rows = doc.evaluate(rowpath, doc, null, XPathResult.ANY_TYPE, null);
			var row, id, title;
			while(row = rows.iterateNext()) {
				title = doc.evaluate('./td[2]/a', row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				id = doc.evaluate('./td[6]', row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				Zotero.debug(title + id);
				items[id] = Zotero.Utilities.cleanTags(Zotero.Utilities.trimInternal(title));
			}
		} else {
			// We have normal search results
			var idpath='//a[img[@width="64"]]';
			var ids=doc.evaluate(idpath, doc, null, XPathResult.ANY_TYPE, null);
			var titlpath='//table[@class="tblSearchResult"]//td[@class="resultHeader"][1]/p/a';
			var titlerows=doc.evaluate(titlpath, doc, null, XPathResult.ANY_TYPE, null);
			var id;
			while(id=ids.iterateNext())
				items[id.id]=Zotero.Utilities.cleanTags(Zotero.Utilities.trimInternal(titlerows.iterateNext().textContent));
		}
	Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
		var string="http://eric.ed.gov/ERICWebPortal/MyERIC/clipboard/performExport.jsp?";
		for(var ids in items)
			string+="accno="+ids+"&";
		string+="texttype=endnote&citationtype=brief&Download.x=86&Download.y=14";
		Zotero.debug(string);
		Zotero.Utilities.HTTP.doGet(string, function(text)	{
			var trans=Zotero.loadTranslator("import");
			trans.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			trans.setString(text);
			trans.setHandler("itemDone", function(obj, newItem)	{
				var linkpath='//tbody[tr/td/a/@id="'+newItem.itemID+'"]/tr/td/p/a[@class="action"]';
				var link=doc.evaluate(linkpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
				if(link)
					newItem.attachments.push({url:link.href, title:newItem.title, mimeType:"application/pdf"});
				if (newItem.ISSN) newItem.ISSN = newItem.ISSN.replace(/ISSN-?/,"");
				if (newItem.ISBN) newItem.ISBN = newItem.ISBN.replace(/ISBN-?/,"");
				newItem.complete();
			});
			trans.translate();
		});
	});
	}
	var type = detectWeb(doc, url);
	if(type && type != "multiple")	{
		var idpath='//tr[/td[1]/span/a/strong/contains("ERIC #")]/td[2]';
		var idpath2='//meta[@name="eric #"]/@content';
		var id = url.match(/accno=([^&]+)/)[1];
		var string="http://eric.ed.gov/ERICWebPortal/MyERIC/clipboard/performExport.jsp?";
		string+= "accno="+ id+"&texttype=endnote&citationtype=brief&Download.x=86&Download.y=14";
		Zotero.debug(string);
		Zotero.Utilities.HTTP.doGet(string, function(text)	{
			var trans=Zotero.loadTranslator("import");
			trans.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			trans.setString(text);
			trans.setHandler("itemDone", function(obj, newItem)	{
				var linkpath='//tr/td/p[img/@alt="PDF"]/a';
				var link=doc.evaluate(linkpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
				if(link)
					var pdfid = link.href.match(/accno=([A-Z0-9]+)/)[1];
					Z.debug(pdfid)
					var pdfurl = "http://www.eric.ed.gov/PDFS/"+ pdfid +".pdf";
					newItem.attachments.push({url:pdfurl, title:newItem.title, mimeType:"application/pdf"});
				if (newItem.ISSN) newItem.ISSN = newItem.ISSN.replace(/ISSN-?/,"");
				if (newItem.ISBN) newItem.ISBN = newItem.ISBN.replace(/ISBN-?/,"");
				newItem.complete();
			});
			trans.translate();
		});
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://eric.ed.gov/ERICWebPortal/search/recordDetails.jsp?ERICExtSearch_SearchValue_0=EJ956651&searchtype=keyword&ERICExtSearch_SearchType_0=no&_pageLabel=RecordDetails&accno=EJ956651&_nfls=false&source=ae",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Post",
						"firstName": "Phyllis B.",
						"creatorType": "author"
					},
					{
						"lastName": "Ceballos",
						"firstName": "Peggy L.",
						"creatorType": "author"
					},
					{
						"lastName": "Penn",
						"firstName": "Saundra L.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Cultural Influences",
					"Therapy",
					"Play Therapy",
					"Parent Participation",
					"Cooperative Planning",
					"Counseling Techniques",
					"Guidelines",
					"Cultural Relevance",
					"Counselor Role",
					"Interpersonal Relationship"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Collaborating with Parents to Establish Behavioral Goals in Child-Centered Play Therapy",
						"mimeType": "application/pdf"
					}
				],
				"title": "Collaborating with Parents to Establish Behavioral Goals in Child-Centered Play Therapy",
				"volume": "20",
				"issue": "1",
				"pages": "51-57",
				"journalAbbreviation": "Family Journal: Counseling and Therapy for Couples and Families",
				"publisher": "SAGE Publications. 2455 Teller Road, Thousand Oaks, CA 91320. Tel: 800-818-7243; Tel: 805-499-9774; Fax: 800-583-2665; e-mail: journals@sagepub.com; Web site: http://sagepub.com",
				"ISSN": "1066-4807",
				"abstractNote": "The purpose of this article is to provide specific guidelines for child-centered play therapists to set behavioral outcome goals to effectively work with families and to meet the demands for accountability in the managed care environment. The child-centered play therapy orientation is the most widely practiced approach among play therapists who identify a specific theoretical orientation. While information about setting broad objectives is addressed using this approach to therapy, explicit guidelines for setting behavioral goals, while maintaining the integrity of the child-centered theoretical orientation, are needed. The guidelines are presented in three phases of parent consultation: (a) the initial engagement with parents, (b) the ongoing parent consultations, and (c) the termination phase. In keeping with the child-centered approach, the authors propose to work with parents from a person-centered orientation and seek to appreciate how cultural influences relate to parents' concerns and goals for their children. A case example is provided to demonstrate how child-centered play therapists can accomplish the aforementioned goals.",
				"url": "http://www.eric.ed.gov/ERICWebPortal/detail?accno=EJ956651",
				"date": "January 2012",
				"publicationTitle": "Family Journal: Counseling and Therapy for Couples and Families",
				"libraryCatalog": "ERIC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/