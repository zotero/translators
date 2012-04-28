{
	"translatorID": "594ebe3c-90a0-4830-83bc-9502825a6810",
	"label": "ISI Web of Knowledge",
	"creator": "Michael Berkowitz, Avram Lyon",
	"target": "^https?://[^/]*webofknowledge\\.com/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 5,
	"browserSupport": "gcs",
	"lastUpdated": "2012-04-27 19:42:46"
}

function detectWeb(doc, url) {
	if (url.indexOf("full_record.do") !== -1) {
		return "journalArticle";
	} else if ((doc.title.indexOf(" Results") !== -1) 
		|| url.indexOf("search_mode=") !== -1) {
		return "multiple";
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
	// XXX Use only the first selected ID, since otherwise we have problems
	Z.debug("Fetching only first selected item, since we have errors on multi-item save.");
	ids = [ids[0]];
	// Call yourself
	var importer = Zotero.loadTranslator("import");
	importer.setTranslator("594ebe3c-90a0-4830-83bc-9502825a6810");
	
	var hostRegexp = new RegExp("^(https?://[^/]+)/");
	var m = hostRegexp.exec(url);
	var host = m[1];
	for (var i in ids) {
		ids[i] = host+"/full_record.do?" + ids[i];
	}
	var product = url.match("product=([^\&]+)\&")[1];
	Zotero.Utilities.processDocuments(ids, function (newDoc) {
		var url = newDoc.location.href;
		//Z.debug(url);
		var names = ["recordID", "colName", "SID", "selectedIds", "sortBy", "qid", "product" ];
		var values = {};
		var n;
		for each (n in names) {
			values[n] = newDoc.evaluate('//input[@name="'+n+'"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		}
		// locale=en_US&fileOpt=fieldtagged&colName=&action=saveDataToRef&qid=2&sortBy=PY.D%3BLD.D%3BVL.D%3BSO.A%3BPG.A%3BAU.A&SID=2Al7l8BHkljH2J%402gPc&product=UA&filters=ISSN_ISBN+CITTIMES+SOURCE+TITLE+AUTHORS++&numRecords=1&locale=en_US
/*
			<input type="hidden" id="locale" name="locale" value="en_US" />
		 	<input type="hidden" id="fileOpt" name="fileOpt" value='fieldtagged' />
		 	<input type="hidden" id="colName" name="colName" value='WOS' />
		 	<input type="hidden" id="action" name="action" value='saveDataToRef' />
		 	<input type="hidden" id="qid" name="qid" value='8' />
		 	<input type="hidden" id="sortBy" name="sortBy" value='PY.D;LD.D;VL.D;SO.A;PG.A;AU.A' />
		 	<input type="hidden" id="SID" name="SID" value="2Al7l8BHkljH2J@2gPc" />
		 	<input type="hidden" id="product" name="product" value="UA" />
		 	<input type="hidden" id="filters" name="filters" value='FUNDING SUBJECT_CATEGORY JCR_CATEGORY LANG IDS PAGEC SABBR CITREFC ISSN PUBINFO KEYWORDS CITTIMES ADDRS CONFERENCE_SPONSORS DOCTYPE ABSTRACT CONFERENCE_INFO SOURCE TITLE AUTHORS  ' />
			 <input type="hidden" id="numRecords" name="numRecords" value="1" />
		 	<div class="QprocInstruct">Please wait while your request is processed.<br />
		 	  (Note: Depending on the number of records, this may take a few moments.) </div>
		 	  <input type="hidden" id="locale" name="locale" value="en_US" />
*/
		// viewType=summary&product=UA&mark_id=UA&colName=&sortBy=PY.D%3BLD.D%3BVL.D%3BSO.A%3BPG.A%3BAU.A&mode=outputService&qid=1&SID=2Al7l8BHkljH2J%402gPc&format=saveToRef&filters=ISSN_ISBN+CITTIMES+SOURCE+TITLE+AUTHORS++&selectedIds=1&mark_to=&mark_from=&count_new_items_marked=0&value%28record_select_type%29=selrecords&markFrom=&markTo=&fields_selection=ISSN_ISBN+CITTIMES+SOURCE+TITLE+AUTHORS++&rurl=&save_options=fieldtagged
		// FOR ONE:
		// action=go&viewType=fullRecord&product=UA&mark_id=UA&colName=WOS&recordID=WOS%3A000287717800001&sortBy=PY.D%3BLD.D%3BVL.D%3BSO.A%3BPG.A%3BAU.A&mode=outputService&qid=1&SID=2Al7l8BHkljH2J%402gPc&format=saveToRef&filters=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&selectedIds=1&mark_to=&mark_from=&count_new_items_marked=0&value%28record_select_type%29=selrecords&marked_list_candidates=1&LinksAreAllowedRightClick=CitedRefList.do&LinksAreAllowedRightClick=CitingArticles.do&LinksAreAllowedRightClick=OneClickSearch.do&LinksAreAllowedRightClick=full_record.do&fields_selection=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&save_options=fieldtagged
		// locale=en_US&fileOpt=fieldtagged&colName=WOS&action=saveDataToRef&qid=6&sortBy=PY.D%3BLD.D%3BVL.D%3BSO.A%3BPG.A%3BAU.A&SID=2Al7l8BHkljH2J%402gPc&product=UA&filters=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&numRecords=1&locale=en_US
		// locale=en_US&fileOpt=fieldtagged&colName=WOS&action=saveDataToRef&qid=17&sortBy=PY.D%3BLD.D%3BVL.D%3BSO.A%3BPG.A%3BAU.A&SID=2Cb1oI6ijMjk8hNDk51&product=UA&filters=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&numRecords=1&locale=en_US
		// locale=en_US&fileOpt=fieldtagged&colName=WOS&action=saveDataToRef&qid=15&sortBy=PY.D%3BLD.D%3BVL.D%3BSO.A%3BPG.A%3BAU.A&SID=2Cb1oI6ijMjk8hNDk51&product=WOS&filters=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&numRecords=1&locale=en_US
		var post = 'action=go&viewType=fullRecord&product='+values.product
				+'&mark_id='+values.product+'&colName=' + values.colName
				+'&recordID='+values.recordID.replace(/;/g,"%3B").replace(/:/g,"%3A")
				+'&sortBy='+values.sortBy.replace(/;/g,"%3B").replace(/:/g,"%3A")+'&mode=outputService'
				+'&qid='+values.qid+'&SID='+values.SID
				+'&format=saveToRef&filters=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&selectedIds=3&mark_to=&mark_from=&count_new_items_marked=0&value%28record_select_type%29=selrecords&marked_list_candidates=3&LinksAreAllowedRightClick=CitedRefList.do&LinksAreAllowedRightClick=CitingArticles.do&LinksAreAllowedRightClick=OneClickSearch.do&LinksAreAllowedRightClick=full_record.do&fields_selection=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&save_options=fieldtagged';
		//Z.debug(post);
		Zotero.Utilities.doPost('http://apps.webofknowledge.com/OutboundService.do',post, function (text, obj) {
			//Z.debug(text);
			var qid = text.match(/<input type="hidden" id="qid" name="qid" value='(\d+)' \/>/)[1];
			var post2 = 'locale=en_US&fileOpt=fieldtagged'+
					'&colName=' + values.colName + '&action=saveDataToRef'+
					'&qid='+qid+'&sortBy='+values.sortBy.replace(/;/g,"%3B").replace(/:/g,"%3A")+
					'&SID='+values.SID+'&product='+'UA'+'&filters=FUNDING+SUBJECT_CATEGORY+JCR_CATEGORY+LANG+IDS+PAGEC+SABBR+CITREFC+ISSN+PUBINFO+KEYWORDS+CITTIMES+ADDRS+CONFERENCE_SPONSORS+DOCTYPE+ABSTRACT+CONFERENCE_INFO+SOURCE+TITLE+AUTHORS++&numRecords=1&locale=en_US';
			//Z.debug(post2);
			Zotero.Utilities.doPost('http://ets.webofknowledge.com/ETS/saveDataToRef.do',post2, function (text, obj) {
				//Z.debug(text);
				importer.setString(text);
				importer.setHandler("itemDone", function (obj, item) {
					item.attachments = [{url: url, type: "text/html", title: "ISI Web of Knowledge Record"}];
					//remove all caps from titles and authors.
					for (i in item.creators){
						if (item.creators[i].lastName && item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
							item.creators[i].lastName = Zotero.Utilities.capitalizeTitle(item.creators[i].lastName.toLowerCase(),true);
						}
						if (item.creators[i].firstName && item.creators[i].firstName == item.creators[i].firstName.toUpperCase()) {
							item.creators[i].firstName = Zotero.Utilities.capitalizeTitle(item.creators[i].firstName.toLowerCase(),true);
						}
					}
					if (item.title == item.title.toUpperCase()) {
						item.title = Zotero.Utilities.capitalizeTitle(item.title.toLowerCase(),true);
					}					
					//Z.debug(item.title);
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
	var map = {
		"J": "journalArticle",
		"S": "bookSection", // Not sure
		"P": "patent",
		"B": "book"
	};
	if (field == "PT") {
		item.itemType = map[content];
		if (item.itemType === undefined) {
			item.itemType = "journalArticle";
			Zotero.debug("Unknown type: " + content);
		}
	} else if ((field == "AF" || field == "AU")) {
		Z.debug("author: " + content);
		authors = content.split("\n");
		for each (var i in authors) {
			var author = i.split(",");
			item.creators[0][field].push({firstName:author[1].trim(),
					lastName:author[0].trim(),
					creatorType:"author"});
		}
	} else if ((field == "BE")) {
		//Z.debug(content);
		authors = content.split("\n");
		for each (var i in authors) {
			var author = i.split(",");
			item.creators[1].push({firstName:author[1].trim(),
					lastName:author[0].trim(),
					creatorType:"editor"});
		}
	} else if (field == "TI") {
		item.title = content;
	} else if (field == "JI") {
		item.journalAbbreviation = content;
	} else if (field == "SO") {
		item.publicationTitle = content;
	} else if (field == "SN") {
		item.ISSN = content;
	} else if (field == "BN") {
		item.ISBN = content;
	} else if (field == "PD" || field == "PY") {
		if (item.date) {
			item.date += " " + content;
		} else {
			item.date = content;
		}
		var year = item.date.match(/\d{4}/);
		// If we have a double year, eliminate one
		if (year && item.date.replace(year[0],"").indexOf(year[0]) !== -1)
			item.date = item.date.replace(year[0],"");
	} else if (field == "VL") {
		item.volume = content;
	} else if (field == "IS") {
		item.issue = content;
	} else if (field == "UT") {
		item.extra += content;
	} else if (field == "BP") {
		item.pages = content;
	} else if (field == "EP") {
		item.pages += "-" + content;
	} else if (field == "AB") {
		item.abstractNote = content;
	} else if (field == "PI" || field == "C1") {
		item.place = content;
	} else if (field == "LA") {
		item.language = content;
	} else if (field == "PU") {
		item.publisher = content;
	// Patent stuff
	} else if (field == "DG") {
		item.issueDate = content;
	} else if (field == "PN") {
		item.patentNumber = content;
	} else if (field == "AE") {
		item.assignee = content;
	} else if (field == "PL") { // not sure...
		item.priorityNumber = content;
	} else if (field == "PC") { // use for patents
		item.country = content;
	// A whole mess of tags
	} else if (field == "DE" || field == "BD"
			|| field == "OR" || field == "ID"
			|| field == "MC" || field == "MQ") {
		item.tags = item.tags.concat(content.split(";"));
	} else if (field == "DI") {
		item.DOI = content;
	} else {
		Zotero.debug("Discarding: " + field + " => "+content);
	}
}

function completeItem(item) {
	var i;
	var creators = [];
	// If we have full names, drop the short ones
	if (item.creators[0]["AF"].length) {
		creators = item.creators[0]["AF"];
	} else {
		creators = item.creators[0]["AU"];
	}
	// Add other creators
	if (item.creators[1])
		item.creators = creators.concat(item.creators[1]);
	else
		item.creators = creators;
		
	// If we have a patent, change author to inventor
	if (item.itemType == "patent") {
		for (i in item.creators) {
			if (item.creators[i].creatorType == "author") {
				item.creators[i].creatorType = "inventor";
			}
		}
	}
	
	// Fix caps, trim in various places
	for (i in item.tags) {
		item.tags[i] = item.tags[i].trim();
		if (item.tags[i].toUpperCase() == item.tags[i])
			item.tags[i]=item.tags[i].toLowerCase();
	}
	
	var toFix = ["publisher", "publicationTitle", "place"];
	for (i in toFix) {
		var field = toFix[i];
		if (item[field] && item[field].toUpperCase() == item[field])
			item[field]=ZU.capitalizeTitle(item[field].toLowerCase(),true);		
	}

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
	item.creators = [{"AU":[], "AF":[]}, []];
	item.extra = "";


	var tag = "PT";
	
	var data = line.substr(3);
	
	var rawLine;
	while((rawLine = Zotero.read()) !== false) {    // until EOF
		// trim leading space if this line is not part of a note
		line = rawLine.replace(/^\s+/, "");
		Z.debug("line: " + line);
		var split = line.match(/^([A-Z0-9]{2})\s(?:([^\n]*))?/);
		// Force a match for ER
		if (line == "ER") split = ["","ER",""];
		if(split) {
			// if this line is a tag, take a look at the previous line to map
			// its tag
			if(tag) {
				Zotero.debug("tag: '"+tag+"'; data: '"+data+"'");
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
				item.creators = [{"AU":[], "AF":[]}, []];
				item.extra = "";
				i++;
			}
		} else {
			// otherwise, assume this is data from the previous line continued
			if(tag == "AU" || tag == "AF" || tag == "BE") {
				Z.debug(rawLine);
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


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT J\nAU Zelle, Rintze M.\n   Harrison, Jacob C.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Anaplerotic Role for Cytosolic Malic Enzyme in Engineered Saccharomyces\n   cerevisiae Strains\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 77\nIS 3\nBP 732\nEP 738\nDI 10.1128/AEM.02132-10\nPD FEB 2011\nPY 2011\nAB Malic enzyme catalyzes the reversible oxidative decarboxylation of\n   malate to pyruvate and CO(2). The Saccharomyces cerevisiae MAE1 gene\n   encodes a mitochondrial malic enzyme whose proposed physiological roles\n   are related to the oxidative, malate-decarboxylating reaction. Hitherto,\n   the inability of pyruvate carboxylase-negative (Pyc(-)) S. cerevisiae\n   strains to grow on glucose suggested that Mae1p cannot act as a\n   pyruvate-carboxylating, anaplerotic enzyme. In this study, relocation of\n   malic enzyme to the cytosol and creation of thermodynamically favorable\n   conditions for pyruvate carboxylation by metabolic engineering, process\n   design, and adaptive evolution, enabled malic enzyme to act as the sole\n   anaplerotic enzyme in S. cerevisiae. The Escherichia coli NADH-dependent\n   sfcA malic enzyme was expressed in a Pyc(-) S. cerevisiae background.\n   When PDC2, a transcriptional regulator of pyruvate decarboxylase genes,\n   was deleted to increase intracellular pyruvate levels and cells were\n   grown under a CO(2) atmosphere to favor carboxylation, adaptive\n   evolution yielded a strain that grew on glucose (specific growth rate,\n   0.06 +/- 0.01 h(-1)). Growth of the evolved strain was enabled by a\n   single point mutation (Asp336Gly) that switched the cofactor preference\n   of E. coli malic enzyme from NADH to NADPH. Consistently, cytosolic\n   relocalization of the native Mae1p, which can use both NADH and NADPH,\n   in a pyc1,2 Delta pdc2 Delta strain grown under a CO(2) atmosphere, also\n   enabled slow-growth on glucose. Although growth rates of these strains\n   are still low, the higher ATP efficiency of carboxylation via malic\n   enzyme, compared to the pyruvate carboxylase pathway, may contribute to\n   metabolic engineering of S. cerevisiae for anaerobic, high-yield\n   C(4)-dicarboxylic acid production.\nTC 0\nZ9 0\nSN 0099-2240\nUT WOS:000286597100004\nER\n\nPT J\nAU Zelle, Rintze M.\n   Trueheart, Josh\n   Harrison, Jacob C.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Phosphoenolpyruvate Carboxykinase as the Sole Anaplerotic Enzyme in\n   Saccharomyces cerevisiae\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 76\nIS 16\nBP 5383\nEP 5389\nDI 10.1128/AEM.01077-10\nPD AUG 2010\nPY 2010\nAB Pyruvate carboxylase is the sole anaplerotic enzyme in glucose-grown\n   cultures of wild-type Saccharomyces cerevisiae. Pyruvate\n   carboxylase-negative (Pyc(-)) S. cerevisiae strains cannot grow on\n   glucose unless media are supplemented with C(4) compounds, such as\n   aspartic acid. In several succinate-producing prokaryotes,\n   phosphoenolpyruvate carboxykinase (PEPCK) fulfills this anaplerotic\n   role. However, the S. cerevisiae PEPCK encoded by PCK1 is repressed by\n   glucose and is considered to have a purely decarboxylating and\n   gluconeogenic function. This study investigates whether and under which\n   conditions PEPCK can replace the anaplerotic function of pyruvate\n   carboxylase in S. cerevisiae. Pyc(-) S. cerevisiae strains\n   constitutively overexpressing the PEPCK either from S. cerevisiae or\n   from Actinobacillus succinogenes did not grow on glucose as the sole\n   carbon source. However, evolutionary engineering yielded mutants able to\n   grow on glucose as the sole carbon source at a maximum specific growth\n   rate of ca. 0.14 h(-1), one-half that of the (pyruvate\n   carboxylase-positive) reference strain grown under the same conditions.\n   Growth was dependent on high carbon dioxide concentrations, indicating\n   that the reaction catalyzed by PEPCK operates near thermodynamic\n   equilibrium. Analysis and reverse engineering of two independently\n   evolved strains showed that single point mutations in pyruvate kinase,\n   which competes with PEPCK for phosphoenolpyruvate, were sufficient to\n   enable the use of PEPCK as the sole anaplerotic enzyme. The PEPCK\n   reaction produces one ATP per carboxylation event, whereas the original\n   route through pyruvate kinase and pyruvate carboxylase is ATP neutral.\n   This increased ATP yield may prove crucial for engineering of efficient\n   and low-cost anaerobic production of C(4) dicarboxylic acids in S.\n   cerevisiae.\nTC 1\nZ9 1\nSN 0099-2240\nUT WOS:000280633400006\nER\n\nPT J\nAU Zelle, Rintze M.\n   De Hulster, Erik\n   Kloezen, Wendy\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Key Process Conditions for Production of C(4) Dicarboxylic Acids in\n   Bioreactor Batch Cultures of an Engineered Saccharomyces cerevisiae\n   Strain\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 76\nIS 3\nBP 744\nEP 750\nDI 10.1128/AEM.02396-09\nPD FEB 2010\nPY 2010\nAB A recent effort to improve malic acid production by Saccharomyces\n   cerevisiae by means of metabolic engineering resulted in a strain that\n   produced up to 59 g liter(-1) of malate at a yield of 0.42 mol (mol\n   glucose)(-1) in calcium carbonate-buffered shake flask cultures. With\n   shake flasks, process parameters that are important for scaling up this\n   process cannot be controlled independently. In this study, growth and\n   product formation by the engineered strain were studied in bioreactors\n   in order to separately analyze the effects of pH, calcium, and carbon\n   dioxide and oxygen availability. A near-neutral pH, which in shake\n   flasks was achieved by adding CaCO(3), was required for efficient C(4)\n   dicarboxylic acid production. Increased calcium concentrations, a side\n   effect of CaCO(3) dissolution, had a small positive effect on malate\n   formation. Carbon dioxide enrichment of the sparging gas (up to 15%\n   [vol/vol]) improved production of both malate and succinate. At higher\n   concentrations, succinate titers further increased, reaching 0.29 mol\n   (mol glucose)(-1), whereas malate formation strongly decreased. Although\n   fully aerobic conditions could be achieved, it was found that moderate\n   oxygen limitation benefitted malate production. In conclusion, malic\n   acid production with the engineered S. cerevisiae strain could be\n   successfully transferred from shake flasks to 1-liter batch bioreactors\n   by simultaneous optimization of four process parameters (pH and\n   concentrations of CO(2), calcium, and O(2)). Under optimized conditions,\n   a malate yield of 0.48 +/- 0.01 mol (mol glucose)(-1) was obtained in\n   bioreactors, a 19% increase over yields in shake flask experiments.\nTC 2\nZ9 2\nSN 0099-2240\nUT WOS:000274017400015\nER\n\nPT J\nAU Abbott, Derek A.\n   Zelle, Rintze M.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Metabolic engineering of Saccharomyces cerevisiae for production of\n   carboxylic acids: current status and challenges\nSO FEMS YEAST RESEARCH\nVL 9\nIS 8\nBP 1123\nEP 1136\nDI 10.1111/j.1567-1364.2009.00537.x\nPD DEC 2009\nPY 2009\nAB To meet the demands of future generations for chemicals and energy and\n   to reduce the environmental footprint of the chemical industry,\n   alternatives for petrochemistry are required. Microbial conversion of\n   renewable feedstocks has a huge potential for cleaner, sustainable\n   industrial production of fuels and chemicals. Microbial production of\n   organic acids is a promising approach for production of chemical\n   building blocks that can replace their petrochemically derived\n   equivalents. Although Saccharomyces cerevisiae does not naturally\n   produce organic acids in large quantities, its robustness, pH tolerance,\n   simple nutrient requirements and long history as an industrial workhorse\n   make it an excellent candidate biocatalyst for such processes. Genetic\n   engineering, along with evolution and selection, has been successfully\n   used to divert carbon from ethanol, the natural endproduct of S.\n   cerevisiae, to pyruvate. Further engineering, which included expression\n   of heterologous enzymes and transporters, yielded strains capable of\n   producing lactate and malate from pyruvate. Besides these metabolic\n   engineering strategies, this review discusses the impact of transport\n   and energetics as well as the tolerance towards these organic acids. In\n   addition to recent progress in engineering S. cerevisiae for organic\n   acid production, the key limitations and challenges are discussed in the\n   context of sustainable industrial production of organic acids from\n   renewable feedstocks.\nTC 11\nZ9 11\nSN 1567-1356\nUT WOS:000271264400001\nER\n\nPT J\nAU Zelle, Rintze M.\n   de Hulster, Erik\n   van Winden, WoUter A.\n   de Waard, Pieter\n   Dijkema, Cor\n   Winkler, Aaron A.\n   Geertman, Jan-Maarten A.\n   van Dijken, Johannes P.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Malic acid production by Saccharomyces cerevisiae: Engineering of\n   pyruvate carboxylation, oxaloacetate reduction, and malate export\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 74\nIS 9\nBP 2766\nEP 2777\nDI 10.1128/AEM.02591-07\nPD MAY 2008\nPY 2008\nAB Malic acid is a potential biomass-derivable \"building block\" for\n   chemical synthesis. Since wild-type Saccharomyces cerevisiae strains\n   produce only low levels of malate, metabolic engineering is required to\n   achieve efficient malate production with this yeast. A promising pathway\n   for malate production from glucose proceeds via carboxylation of\n   pyruvate, followed by reduction of oxaloacetate to malate. This redox-\n   and ATP-neutral, CO2-fixing pathway has a theoretical maximum yield of 2\n   mol malate (mol glucose)(-1). A previously engineered glucose-tolerant,\n   C-2-independent pyruvate decarboxylase-negative S. cerevisiae strain was\n   used as the platform to evaluate the impact of individual and combined\n   introduction of three genetic modifications: (i) overexpression of the\n   native pyruvate carboxylase encoded by PYC2, (ii) high-level expression\n   of an allele of the MDH3 gene, of which the encoded malate dehydrogenase\n   was retargeted to the cytosol by deletion of the C-terminal peroxisomal\n   targeting sequence, and (iii) functional expression of the\n   Schizosaccharomyces pombe malate transporter gene SpMAE1. While single\n   or double modifications improved malate production, the highest malate\n   yields and titers were obtained with the simultaneous introduction of\n   all three modifications. In glucose-grown batch cultures, the resulting\n   engineered strain produced malate at titers of up to 59 g liter(-1) at a\n   malate yield of 0.42 mol (mol glucose)(-1). Metabolic flux analysis\n   showed that metabolite labeling patterns observed upon nuclear magnetic\n   resonance analyses of cultures grown on C-13-labeled glucose were\n   consistent with the envisaged nonoxidative, fermentative pathway for\n   malate production. The engineered strains still produced substantial\n   amounts of pyruvate, indicating that the pathway efficiency can be\n   further improved.\nTC 15\nZ9 17\nSN 0099-2240\nUT WOS:000255567900024\nER\n\nEF",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Jacob C.",
						"lastName": "Harrison",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "WOS:000286597100004",
				"title": "Anaplerotic Role for Cytosolic Malic Enzyme in Engineered Saccharomyces   cerevisiae Strains",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "77",
				"issue": "3",
				"pages": "732-738",
				"DOI": "10.1128/AEM.02132-10",
				"date": "FEB  2011",
				"abstractNote": "Malic enzyme catalyzes the reversible oxidative decarboxylation of   malate to pyruvate and CO(2). The Saccharomyces cerevisiae MAE1 gene   encodes a mitochondrial malic enzyme whose proposed physiological roles   are related to the oxidative, malate-decarboxylating reaction. Hitherto,   the inability of pyruvate carboxylase-negative (Pyc(-)) S. cerevisiae   strains to grow on glucose suggested that Mae1p cannot act as a   pyruvate-carboxylating, anaplerotic enzyme. In this study, relocation of   malic enzyme to the cytosol and creation of thermodynamically favorable   conditions for pyruvate carboxylation by metabolic engineering, process   design, and adaptive evolution, enabled malic enzyme to act as the sole   anaplerotic enzyme in S. cerevisiae. The Escherichia coli NADH-dependent   sfcA malic enzyme was expressed in a Pyc(-) S. cerevisiae background.   When PDC2, a transcriptional regulator of pyruvate decarboxylase genes,   was deleted to increase intracellular pyruvate levels and cells were   grown under a CO(2) atmosphere to favor carboxylation, adaptive   evolution yielded a strain that grew on glucose (specific growth rate,   0.06 +/- 0.01 h(-1)). Growth of the evolved strain was enabled by a   single point mutation (Asp336Gly) that switched the cofactor preference   of E. coli malic enzyme from NADH to NADPH. Consistently, cytosolic   relocalization of the native Mae1p, which can use both NADH and NADPH,   in a pyc1,2 Delta pdc2 Delta strain grown under a CO(2) atmosphere, also   enabled slow-growth on glucose. Although growth rates of these strains   are still low, the higher ATP efficiency of carboxylation via malic   enzyme, compared to the pyruvate carboxylase pathway, may contribute to   metabolic engineering of S. cerevisiae for anaerobic, high-yield   C(4)-dicarboxylic acid production.",
				"ISSN": "0099-2240"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Josh",
						"lastName": "Trueheart",
						"creatorType": "author"
					},
					{
						"firstName": "Jacob C.",
						"lastName": "Harrison",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "WOS:000280633400006",
				"title": "Phosphoenolpyruvate Carboxykinase as the Sole Anaplerotic Enzyme in   Saccharomyces cerevisiae",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "76",
				"issue": "16",
				"pages": "5383-5389",
				"DOI": "10.1128/AEM.01077-10",
				"date": "AUG  2010",
				"abstractNote": "Pyruvate carboxylase is the sole anaplerotic enzyme in glucose-grown   cultures of wild-type Saccharomyces cerevisiae. Pyruvate   carboxylase-negative (Pyc(-)) S. cerevisiae strains cannot grow on   glucose unless media are supplemented with C(4) compounds, such as   aspartic acid. In several succinate-producing prokaryotes,   phosphoenolpyruvate carboxykinase (PEPCK) fulfills this anaplerotic   role. However, the S. cerevisiae PEPCK encoded by PCK1 is repressed by   glucose and is considered to have a purely decarboxylating and   gluconeogenic function. This study investigates whether and under which   conditions PEPCK can replace the anaplerotic function of pyruvate   carboxylase in S. cerevisiae. Pyc(-) S. cerevisiae strains   constitutively overexpressing the PEPCK either from S. cerevisiae or   from Actinobacillus succinogenes did not grow on glucose as the sole   carbon source. However, evolutionary engineering yielded mutants able to   grow on glucose as the sole carbon source at a maximum specific growth   rate of ca. 0.14 h(-1), one-half that of the (pyruvate   carboxylase-positive) reference strain grown under the same conditions.   Growth was dependent on high carbon dioxide concentrations, indicating   that the reaction catalyzed by PEPCK operates near thermodynamic   equilibrium. Analysis and reverse engineering of two independently   evolved strains showed that single point mutations in pyruvate kinase,   which competes with PEPCK for phosphoenolpyruvate, were sufficient to   enable the use of PEPCK as the sole anaplerotic enzyme. The PEPCK   reaction produces one ATP per carboxylation event, whereas the original   route through pyruvate kinase and pyruvate carboxylase is ATP neutral.   This increased ATP yield may prove crucial for engineering of efficient   and low-cost anaerobic production of C(4) dicarboxylic acids in S.   cerevisiae.",
				"ISSN": "0099-2240"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Erik",
						"lastName": "De Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "Wendy",
						"lastName": "Kloezen",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "WOS:000274017400015",
				"title": "Key Process Conditions for Production of C(4) Dicarboxylic Acids in   Bioreactor Batch Cultures of an Engineered Saccharomyces cerevisiae   Strain",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "76",
				"issue": "3",
				"pages": "744-750",
				"DOI": "10.1128/AEM.02396-09",
				"date": "FEB  2010",
				"abstractNote": "A recent effort to improve malic acid production by Saccharomyces   cerevisiae by means of metabolic engineering resulted in a strain that   produced up to 59 g liter(-1) of malate at a yield of 0.42 mol (mol   glucose)(-1) in calcium carbonate-buffered shake flask cultures. With   shake flasks, process parameters that are important for scaling up this   process cannot be controlled independently. In this study, growth and   product formation by the engineered strain were studied in bioreactors   in order to separately analyze the effects of pH, calcium, and carbon   dioxide and oxygen availability. A near-neutral pH, which in shake   flasks was achieved by adding CaCO(3), was required for efficient C(4)   dicarboxylic acid production. Increased calcium concentrations, a side   effect of CaCO(3) dissolution, had a small positive effect on malate   formation. Carbon dioxide enrichment of the sparging gas (up to 15%   [vol/vol]) improved production of both malate and succinate. At higher   concentrations, succinate titers further increased, reaching 0.29 mol   (mol glucose)(-1), whereas malate formation strongly decreased. Although   fully aerobic conditions could be achieved, it was found that moderate   oxygen limitation benefitted malate production. In conclusion, malic   acid production with the engineered S. cerevisiae strain could be   successfully transferred from shake flasks to 1-liter batch bioreactors   by simultaneous optimization of four process parameters (pH and   concentrations of CO(2), calcium, and O(2)). Under optimized conditions,   a malate yield of 0.48 +/- 0.01 mol (mol glucose)(-1) was obtained in   bioreactors, a 19% increase over yields in shake flask experiments.",
				"ISSN": "0099-2240"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Derek A.",
						"lastName": "Abbott",
						"creatorType": "author"
					},
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "WOS:000271264400001",
				"title": "Metabolic engineering of Saccharomyces cerevisiae for production of   carboxylic acids: current status and challenges",
				"publicationTitle": "Fems Yeast Research",
				"volume": "9",
				"issue": "8",
				"pages": "1123-1136",
				"DOI": "10.1111/j.1567-1364.2009.00537.x",
				"date": "DEC  2009",
				"abstractNote": "To meet the demands of future generations for chemicals and energy and   to reduce the environmental footprint of the chemical industry,   alternatives for petrochemistry are required. Microbial conversion of   renewable feedstocks has a huge potential for cleaner, sustainable   industrial production of fuels and chemicals. Microbial production of   organic acids is a promising approach for production of chemical   building blocks that can replace their petrochemically derived   equivalents. Although Saccharomyces cerevisiae does not naturally   produce organic acids in large quantities, its robustness, pH tolerance,   simple nutrient requirements and long history as an industrial workhorse   make it an excellent candidate biocatalyst for such processes. Genetic   engineering, along with evolution and selection, has been successfully   used to divert carbon from ethanol, the natural endproduct of S.   cerevisiae, to pyruvate. Further engineering, which included expression   of heterologous enzymes and transporters, yielded strains capable of   producing lactate and malate from pyruvate. Besides these metabolic   engineering strategies, this review discusses the impact of transport   and energetics as well as the tolerance towards these organic acids. In   addition to recent progress in engineering S. cerevisiae for organic   acid production, the key limitations and challenges are discussed in the   context of sustainable industrial production of organic acids from   renewable feedstocks.",
				"ISSN": "1567-1356"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Erik",
						"lastName": "de Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "WoUter A.",
						"lastName": "van Winden",
						"creatorType": "author"
					},
					{
						"firstName": "Pieter",
						"lastName": "de Waard",
						"creatorType": "author"
					},
					{
						"firstName": "Cor",
						"lastName": "Dijkema",
						"creatorType": "author"
					},
					{
						"firstName": "Aaron A.",
						"lastName": "Winkler",
						"creatorType": "author"
					},
					{
						"firstName": "Jan-Maarten A.",
						"lastName": "Geertman",
						"creatorType": "author"
					},
					{
						"firstName": "Johannes P.",
						"lastName": "van Dijken",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "WOS:000255567900024",
				"title": "Malic acid production by Saccharomyces cerevisiae: Engineering of   pyruvate carboxylation, oxaloacetate reduction, and malate export",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "74",
				"issue": "9",
				"pages": "2766-2777",
				"DOI": "10.1128/AEM.02591-07",
				"date": "MAY  2008",
				"abstractNote": "Malic acid is a potential biomass-derivable \"building block\" for   chemical synthesis. Since wild-type Saccharomyces cerevisiae strains   produce only low levels of malate, metabolic engineering is required to   achieve efficient malate production with this yeast. A promising pathway   for malate production from glucose proceeds via carboxylation of   pyruvate, followed by reduction of oxaloacetate to malate. This redox-   and ATP-neutral, CO2-fixing pathway has a theoretical maximum yield of 2   mol malate (mol glucose)(-1). A previously engineered glucose-tolerant,   C-2-independent pyruvate decarboxylase-negative S. cerevisiae strain was   used as the platform to evaluate the impact of individual and combined   introduction of three genetic modifications: (i) overexpression of the   native pyruvate carboxylase encoded by PYC2, (ii) high-level expression   of an allele of the MDH3 gene, of which the encoded malate dehydrogenase   was retargeted to the cytosol by deletion of the C-terminal peroxisomal   targeting sequence, and (iii) functional expression of the   Schizosaccharomyces pombe malate transporter gene SpMAE1. While single   or double modifications improved malate production, the highest malate   yields and titers were obtained with the simultaneous introduction of   all three modifications. In glucose-grown batch cultures, the resulting   engineered strain produced malate at titers of up to 59 g liter(-1) at a   malate yield of 0.42 mol (mol glucose)(-1). Metabolic flux analysis   showed that metabolite labeling patterns observed upon nuclear magnetic   resonance analyses of cultures grown on C-13-labeled glucose were   consistent with the envisaged nonoxidative, fermentative pathway for   malate production. The engineered strains still produced substantial   amounts of pyruvate, indicating that the pathway efficiency can be   further improved.",
				"ISSN": "0099-2240"
			}
		]
	},
	{
		"type": "import",
		"input": "FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT J\nAU Smith, L. J.\n   Schwark, W. S.\n   Cook, D. R.\n   Moon, P. F.\n   Erb, H. N.\n   Looney, A. L.\nTI Pharmacokinetics of intravenous mivacurium in halothane-anesthetized\n   dogs.\nSO Veterinary Surgery\nVL 27\nIS 2\nPS 170\nPY 1998\nUT CABI:19982209000\nDT Abstract only\nLA English\nSN 0161-3499\nCC LL900Animal Toxicology, Poisoning and Pharmacology (Discontinued March\n   2000); LL070Pets and Companion Animals\nCN 151-67-7\nDE anaesthesia; halothane; muscle relaxants; pharmacokinetics\nOR dogs\nBD Canis; Canidae; Fissipeda; carnivores; mammals; vertebrates; Chordata;\n   animals; small mammals; eukaryotes\nER\n\nEF",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "L. J.",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "W. S.",
						"lastName": "Schwark",
						"creatorType": "author"
					},
					{
						"firstName": "D. R.",
						"lastName": "Cook",
						"creatorType": "author"
					},
					{
						"firstName": "P. F.",
						"lastName": "Moon",
						"creatorType": "author"
					},
					{
						"firstName": "H. N.",
						"lastName": "Erb",
						"creatorType": "author"
					},
					{
						"firstName": "A. L.",
						"lastName": "Looney",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"anaesthesia",
					"halothane",
					"muscle relaxants",
					"pharmacokinetics",
					"dogs",
					"Canis",
					"Canidae",
					"Fissipeda",
					"carnivores",
					"mammals",
					"vertebrates",
					"Chordata",
					"animals",
					"small mammals",
					"eukaryotes"
				],
				"seeAlso": [],
				"attachments": [],
				"extra": "CABI:19982209000",
				"title": "Pharmacokinetics of intravenous mivacurium in halothane-anesthetized   dogs.",
				"publicationTitle": "Veterinary Surgery",
				"volume": "27",
				"issue": "2",
				"date": "1998",
				"language": "English",
				"ISSN": "0161-3499"
			}
		]
	},
	{
		"type": "import",
		"input": "FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT J\nAU Smith, JM \nAF Smith, J. Mark\nTI Gripewater\nSO FIDDLEHEAD\nLA English \nDT Poetry\nNR 0\nTC 0\nZ9 0\nPU UNIV NEW BRUNSWICK\nPI FREDERICTON\nPA DEPT ENGLISH, CAMPUS HOUSE, PO BOX 4400, FREDERICTON, NB E3B 5A3, CANADA\nSN 0015-0630\nJ9 FIDDLEHEAD\nJI Fiddlehead\nPD SPR\nPY 2011\nIS 247\nBP 82\nEP 82\nPG 1\nWC Literary Reviews\nSC Literature\nGA 757VG\nUT WOS:000290115300030\nER\n\nEF",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "J. Mark",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "WOS:000290115300030",
				"title": "Gripewater",
				"publicationTitle": "Fiddlehead",
				"language": "English",
				"publisher": "Univ New Brunswick",
				"place": "Fredericton",
				"ISSN": "0015-0630",
				"journalAbbreviation": "Fiddlehead",
				"date": "SPR 2011",
				"issue": "247",
				"pages": "82-82"
			}
		]
	},
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT S\nAU McCormick, MC\n   Litt, JS\n   Smith, VC\n   Zupancic, JAF\nAF McCormick, Marie C.\n   Litt, Jonathan S.\n   Smith, Vincent C.\n   Zupancic, John A. F.\nBE Fielding, JE\n   Brownson, RC\n   Green, LW\nTI Prematurity: An Overview and Public Health Implications\nSO ANNUAL REVIEW OF PUBLIC HEALTH, VOL 32\nSE Annual Review of Public Health\nLA English\nDT Review\nDE infant mortality; childhood morbidity; prevention\nID LOW-BIRTH-WEIGHT; NEONATAL INTENSIVE-CARE; QUALITY-OF-LIFE; EXTREMELY\n   PRETERM BIRTH; YOUNG-ADULTS BORN; AGE 8 YEARS; CHILDREN BORN;\n   BRONCHOPULMONARY DYSPLASIA; LEARNING-DISABILITIES; EXTREME PREMATURITY\nAB The high rate of premature births in the United States remains a public\n   health concern. These infants experience substantial morbidity and\n   mortality in the newborn period, which translate into significant\n   medical costs. In early childhood, survivors are characterized by a\n   variety of health problems, including motor delay and/or cerebral palsy,\n   lower IQs, behavior problems, and respiratory illness, especially\n   asthma. Many experience difficulty with school work, lower\n   health-related quality of life, and family stress. Emerging information\n   in adolescence and young adulthood paints a more optimistic picture,\n   with persistence of many problems but with better adaptation and more\n   positive expectations by the young adults. Few opportunities for\n   prevention have been identified; therefore, public health approaches to\n   prematurity include assurance of delivery in a facility capable of\n   managing neonatal complications, quality improvement to minimize\n   interinstitutional variations, early developmental support for such\n   infants, and attention to related family health issues.\nC1 [McCormick, MC] Harvard Univ, Dept Soc Human Dev & Hlth, Sch Publ Hlth, Boston, MA 02115 USA\n   [McCormick, MC; Litt, JS; Smith, VC; Zupancic, JAF] Beth Israel Deaconess Med Ctr, Dept Neonatol, Boston, MA 02215 USA\n   [Litt, JS] Childrens Hosp Boston, Div Newborn Med, Boston, MA 02115 USA\nRP McCormick, MC (reprint author), Harvard Univ, Dept Soc Human Dev & Hlth, Sch Publ Hlth, Boston, MA 02115 USA\nEM mmccormi@hsph.harvard.edu\n   vsmith1@bidmc.harvard.edu\n   jzupanci@bidmc.harvard.edu\n   Jonathan.Litt@childrens.harvard.edu\nNR 91\nTC 1\nZ9 1\nPU ANNUAL REVIEWS\nPI PALO ALTO\nPA 4139 EL CAMINO WAY, PO BOX 10139, PALO ALTO, CA 94303-0897 USA\nSN 0163-7525\nBN 978-0-8243-2732-3\nJ9 ANNU REV PUBL HEALTH\nJI Annu. Rev. Public Health\nPY 2011\nVL 32\nBP 367\nEP 379\nDI 10.1146/annurev-publhealth-090810-182459\nPG 13\nGA BUZ33\nUT WOS:000290776200020\nER\n\nEF",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Marie C.",
						"lastName": "McCormick",
						"creatorType": "author"
					},
					{
						"firstName": "Jonathan S.",
						"lastName": "Litt",
						"creatorType": "author"
					},
					{
						"firstName": "Vincent C.",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "John A. F.",
						"lastName": "Zupancic",
						"creatorType": "author"
					},
					{
						"firstName": "JE",
						"lastName": "Fielding",
						"creatorType": "editor"
					},
					{
						"firstName": "RC",
						"lastName": "Brownson",
						"creatorType": "editor"
					},
					{
						"firstName": "LW",
						"lastName": "Green",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"infant mortality",
					"childhood morbidity",
					"prevention",
					"low-birth-weight",
					"neonatal intensive-care",
					"quality-of-life",
					"extremely   preterm birth",
					"young-adults born",
					"age 8 years",
					"children born",
					"bronchopulmonary dysplasia",
					"learning-disabilities",
					"extreme prematurity"
				],
				"seeAlso": [],
				"attachments": [],
				"extra": "WOS:000290776200020",
				"title": "Prematurity: An Overview and Public Health Implications",
				"publicationTitle": "Annual Review of Public Health, Vol 32",
				"language": "English",
				"abstractNote": "The high rate of premature births in the United States remains a public   health concern. These infants experience substantial morbidity and   mortality in the newborn period, which translate into significant   medical costs. In early childhood, survivors are characterized by a   variety of health problems, including motor delay and/or cerebral palsy,   lower IQs, behavior problems, and respiratory illness, especially   asthma. Many experience difficulty with school work, lower   health-related quality of life, and family stress. Emerging information   in adolescence and young adulthood paints a more optimistic picture,   with persistence of many problems but with better adaptation and more   positive expectations by the young adults. Few opportunities for   prevention have been identified; therefore, public health approaches to   prematurity include assurance of delivery in a facility capable of   managing neonatal complications, quality improvement to minimize   interinstitutional variations, early developmental support for such   infants, and attention to related family health issues.",
				"place": "Palo Alto",
				"publisher": "Annual Reviews",
				"ISSN": "0163-7525",
				"ISBN": "978-0-8243-2732-3",
				"journalAbbreviation": "Annu. Rev. Public Health",
				"date": "2011",
				"volume": "32",
				"pages": "367-379",
				"DOI": "10.1146/annurev-publhealth-090810-182459"
			}
		]
	},
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT P\nUT BIOSIS:PREV201100469175\nDT Patent\nTI Indexing cell delivery catheter\nAU Solar, Matthew S.\n   Parmer, Kari\n   Smith, Philip\n   Murdock, Frank\nPN US 07967789\nAE Medtronic Inc\nDG June 28, 2011\nPC USA\nPL 604-16501\nSO Official Gazette of the United States Patent and Trademark Office\n   Patents\nPY 2011\nPD JUN 28 2011\nLA English\nAB An insertion device with an insertion axis includes an axial actuator\n   with a first portion and a second portion. The first portion is moveable\n   along the insertion axis relative to the second portion. The insertion\n   device further includes a first tube coupled to the first portion of the\n   axial actuator, and the first tube is movable along the insertion axis\n   in response to movement of the first portion relative to the second\n   portion. The device further includes a second tube having a radially\n   biased distal end. The distal end is substantially contained within the\n   first tube in a first state, and the second tube is rotatable with\n   respect to the first tube. Also, the second tube is axially movable to a\n   second state, and a portion of a distal end of the second tube is\n   exposed from a distal end of the first tube in the second state.\nC1 Indialantic, FL USA\nSN 0098-1133\nMC Human Medicine (Medical Sciences); Equipment Apparatus Devices and\n   Instrumentation\nCC 12502, Pathology - General\nMQ indexing cell delivery catheter; medical supplies\nER\n\nEF",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Matthew S.",
						"lastName": "Solar",
						"creatorType": "inventor"
					},
					{
						"firstName": "Kari",
						"lastName": "Parmer",
						"creatorType": "inventor"
					},
					{
						"firstName": "Philip",
						"lastName": "Smith",
						"creatorType": "inventor"
					},
					{
						"firstName": "Frank",
						"lastName": "Murdock",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [
					"Human Medicine (Medical Sciences)",
					"Equipment Apparatus Devices and   Instrumentation",
					"indexing cell delivery catheter",
					"medical supplies"
				],
				"seeAlso": [],
				"attachments": [],
				"extra": "BIOSIS:PREV201100469175",
				"title": "Indexing cell delivery catheter",
				"patentNumber": "US 07967789",
				"assignee": "Medtronic Inc",
				"issueDate": "June 28, 2011",
				"country": "USA",
				"priorityNumber": "604-16501",
				"publicationTitle": "Official Gazette of the United States Patent and Trademark Office   Patents",
				"date": "JUN 28 2011",
				"language": "English",
				"abstractNote": "An insertion device with an insertion axis includes an axial actuator   with a first portion and a second portion. The first portion is moveable   along the insertion axis relative to the second portion. The insertion   device further includes a first tube coupled to the first portion of the   axial actuator, and the first tube is movable along the insertion axis   in response to movement of the first portion relative to the second   portion. The device further includes a second tube having a radially   biased distal end. The distal end is substantially contained within the   first tube in a first state, and the second tube is rotatable with   respect to the first tube. Also, the second tube is axially movable to a   second state, and a portion of a distal end of the second tube is   exposed from a distal end of the first tube in the second state.",
				"place": "Indialantic, FL USA",
				"ISSN": "0098-1133"
			}
		]
	},
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT B\nAU Smith, W. G.\nTI Ecological anthropology of households in East Madura, Indonesia.\nSO Ecological anthropology of households in East Madura, Indonesia\nPD 2011\nPY 2011\nZ9 0\nBN 978-90-8585933-8\nUT CABI:20113178956\nER\n\nPT J\nAU Smith, S. A.\nTI Production and characterization of polyclonal antibodies to\n   hexanal-lysine adducts for use in an ELISA to monitor lipid oxidation in\n   a meat model system.\nSO Dissertation Abstracts International, B\nVL 58\nIS 9\nPD 1998, thesis publ. 1997\nPY 1998\nZ9 0\nSN 0419-4217\nUT FSTA:1998-09-Sn1570\nER\n\nPT J\nAU Smith, E. H.\nTI The enzymic oxidation of linoleic and linolenic acid.\nSO Dissertation Abstracts International, B\nVL 49\nIS 4\nBP BRD\nPD 1988\nPY 1988\nZ9 0\nSN 0419-4217\nUT FSTA:1989-04-N-0004\nER\n\nPT J\nAU Smith, C. S.\nTI The syneresis of renneted milk gels.\nSO Dissertation Abstracts International. B, Sciences and Engineering\nVL 49\nIS 5\nBP 1459\nPD 1988\nPY 1988\nZ9 0\nSN 0419-4217\nUT CABI:19910448509\nER\n\nEF",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "W. G.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "CABI:20113178956",
				"title": "Ecological anthropology of households in East Madura, Indonesia.",
				"publicationTitle": "Ecological anthropology of households in East Madura, Indonesia",
				"date": "2011",
				"ISBN": "978-90-8585933-8"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "S. A.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "FSTA:1998-09-Sn1570",
				"title": "Production and characterization of polyclonal antibodies to   hexanal-lysine adducts for use in an ELISA to monitor lipid oxidation in   a meat model system.",
				"publicationTitle": "Dissertation Abstracts International, B",
				"volume": "58",
				"issue": "9",
				"date": ", thesis publ. 1997 1998",
				"ISSN": "0419-4217"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "E. H.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "FSTA:1989-04-N-0004",
				"title": "The enzymic oxidation of linoleic and linolenic acid.",
				"publicationTitle": "Dissertation Abstracts International, B",
				"volume": "49",
				"issue": "4",
				"pages": "BRD",
				"date": "1988",
				"ISSN": "0419-4217"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "C. S.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"extra": "CABI:19910448509",
				"title": "The syneresis of renneted milk gels.",
				"publicationTitle": "Dissertation Abstracts International. B, Sciences and Engineering",
				"volume": "49",
				"issue": "5",
				"pages": "1459",
				"date": "1988",
				"ISSN": "0419-4217"
			}
		]
	}
]
/** END TEST CASES **/