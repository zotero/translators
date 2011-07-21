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
	"lastUpdated": "2011-07-21 13:00:54"
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
		//Zotero.debug("pd");
		var sid = newDoc.evaluate('//input[@name="selectedIds"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		var nid = newDoc.evaluate('//input[@name="SID"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		var post2 = 'product='+product+'&product_sid=' + nid + '&plugin=&product_st_thomas=http://esti.isiknowledge.com:8360/esti/xrpc&export_ref.x=0&export_ref.y=0';
		var post = 'action=go&mode=quickOutput&product='+product+'&SID=' + nid + '&format=ref&fields=BibAbs&mark_id='+product+'&count_new_items_marked=0&selectedIds=' + sid + '&qo_fields=bib&endnote.x=95&endnote.y=12&save_options=default';
		Zotero.Utilities.doPost('http://apps.isiknowledge.com/OutboundService.do', post, function (text, obj) {
			//Zotero.debug("post1");
			Zotero.Utilities.doPost('http://pcs.isiknowledge.com/uml/uml_view.cgi', post2, function (text, obj) {
				//Zotero.debug("post2");
				//Zotero.debug(text);
				importer.setString(text);
				importer.setHandler("itemDone", function (obj, item) {
					item.attachments = [{url: url, type: "text/html", title: "ISI Web of Knowledge Record"}];
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


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\u000aVR 1.0\u000aPT J\u000aAU Zelle, Rintze M.\u000a   Harrison, Jacob C.\u000a   Pronk, Jack T.\u000a   van Maris, Antonius J. A.\u000aTI Anaplerotic Role for Cytosolic Malic Enzyme in Engineered Saccharomyces\u000a   cerevisiae Strains\u000aSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\u000aVL 77\u000aIS 3\u000aBP 732\u000aEP 738\u000aDI 10.1128/AEM.02132-10\u000aPD FEB 2011\u000aPY 2011\u000aAB Malic enzyme catalyzes the reversible oxidative decarboxylation of\u000a   malate to pyruvate and CO(2). The Saccharomyces cerevisiae MAE1 gene\u000a   encodes a mitochondrial malic enzyme whose proposed physiological roles\u000a   are related to the oxidative, malate-decarboxylating reaction. Hitherto,\u000a   the inability of pyruvate carboxylase-negative (Pyc(-)) S. cerevisiae\u000a   strains to grow on glucose suggested that Mae1p cannot act as a\u000a   pyruvate-carboxylating, anaplerotic enzyme. In this study, relocation of\u000a   malic enzyme to the cytosol and creation of thermodynamically favorable\u000a   conditions for pyruvate carboxylation by metabolic engineering, process\u000a   design, and adaptive evolution, enabled malic enzyme to act as the sole\u000a   anaplerotic enzyme in S. cerevisiae. The Escherichia coli NADH-dependent\u000a   sfcA malic enzyme was expressed in a Pyc(-) S. cerevisiae background.\u000a   When PDC2, a transcriptional regulator of pyruvate decarboxylase genes,\u000a   was deleted to increase intracellular pyruvate levels and cells were\u000a   grown under a CO(2) atmosphere to favor carboxylation, adaptive\u000a   evolution yielded a strain that grew on glucose (specific growth rate,\u000a   0.06 +/- 0.01 h(-1)). Growth of the evolved strain was enabled by a\u000a   single point mutation (Asp336Gly) that switched the cofactor preference\u000a   of E. coli malic enzyme from NADH to NADPH. Consistently, cytosolic\u000a   relocalization of the native Mae1p, which can use both NADH and NADPH,\u000a   in a pyc1,2 Delta pdc2 Delta strain grown under a CO(2) atmosphere, also\u000a   enabled slow-growth on glucose. Although growth rates of these strains\u000a   are still low, the higher ATP efficiency of carboxylation via malic\u000a   enzyme, compared to the pyruvate carboxylase pathway, may contribute to\u000a   metabolic engineering of S. cerevisiae for anaerobic, high-yield\u000a   C(4)-dicarboxylic acid production.\u000aTC 0\u000aZ9 0\u000aSN 0099-2240\u000aUT WOS:000286597100004\u000aER\u000a\u000aPT J\u000aAU Zelle, Rintze M.\u000a   Trueheart, Josh\u000a   Harrison, Jacob C.\u000a   Pronk, Jack T.\u000a   van Maris, Antonius J. A.\u000aTI Phosphoenolpyruvate Carboxykinase as the Sole Anaplerotic Enzyme in\u000a   Saccharomyces cerevisiae\u000aSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\u000aVL 76\u000aIS 16\u000aBP 5383\u000aEP 5389\u000aDI 10.1128/AEM.01077-10\u000aPD AUG 2010\u000aPY 2010\u000aAB Pyruvate carboxylase is the sole anaplerotic enzyme in glucose-grown\u000a   cultures of wild-type Saccharomyces cerevisiae. Pyruvate\u000a   carboxylase-negative (Pyc(-)) S. cerevisiae strains cannot grow on\u000a   glucose unless media are supplemented with C(4) compounds, such as\u000a   aspartic acid. In several succinate-producing prokaryotes,\u000a   phosphoenolpyruvate carboxykinase (PEPCK) fulfills this anaplerotic\u000a   role. However, the S. cerevisiae PEPCK encoded by PCK1 is repressed by\u000a   glucose and is considered to have a purely decarboxylating and\u000a   gluconeogenic function. This study investigates whether and under which\u000a   conditions PEPCK can replace the anaplerotic function of pyruvate\u000a   carboxylase in S. cerevisiae. Pyc(-) S. cerevisiae strains\u000a   constitutively overexpressing the PEPCK either from S. cerevisiae or\u000a   from Actinobacillus succinogenes did not grow on glucose as the sole\u000a   carbon source. However, evolutionary engineering yielded mutants able to\u000a   grow on glucose as the sole carbon source at a maximum specific growth\u000a   rate of ca. 0.14 h(-1), one-half that of the (pyruvate\u000a   carboxylase-positive) reference strain grown under the same conditions.\u000a   Growth was dependent on high carbon dioxide concentrations, indicating\u000a   that the reaction catalyzed by PEPCK operates near thermodynamic\u000a   equilibrium. Analysis and reverse engineering of two independently\u000a   evolved strains showed that single point mutations in pyruvate kinase,\u000a   which competes with PEPCK for phosphoenolpyruvate, were sufficient to\u000a   enable the use of PEPCK as the sole anaplerotic enzyme. The PEPCK\u000a   reaction produces one ATP per carboxylation event, whereas the original\u000a   route through pyruvate kinase and pyruvate carboxylase is ATP neutral.\u000a   This increased ATP yield may prove crucial for engineering of efficient\u000a   and low-cost anaerobic production of C(4) dicarboxylic acids in S.\u000a   cerevisiae.\u000aTC 1\u000aZ9 1\u000aSN 0099-2240\u000aUT WOS:000280633400006\u000aER\u000a\u000aPT J\u000aAU Zelle, Rintze M.\u000a   De Hulster, Erik\u000a   Kloezen, Wendy\u000a   Pronk, Jack T.\u000a   van Maris, Antonius J. A.\u000aTI Key Process Conditions for Production of C(4) Dicarboxylic Acids in\u000a   Bioreactor Batch Cultures of an Engineered Saccharomyces cerevisiae\u000a   Strain\u000aSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\u000aVL 76\u000aIS 3\u000aBP 744\u000aEP 750\u000aDI 10.1128/AEM.02396-09\u000aPD FEB 2010\u000aPY 2010\u000aAB A recent effort to improve malic acid production by Saccharomyces\u000a   cerevisiae by means of metabolic engineering resulted in a strain that\u000a   produced up to 59 g liter(-1) of malate at a yield of 0.42 mol (mol\u000a   glucose)(-1) in calcium carbonate-buffered shake flask cultures. With\u000a   shake flasks, process parameters that are important for scaling up this\u000a   process cannot be controlled independently. In this study, growth and\u000a   product formation by the engineered strain were studied in bioreactors\u000a   in order to separately analyze the effects of pH, calcium, and carbon\u000a   dioxide and oxygen availability. A near-neutral pH, which in shake\u000a   flasks was achieved by adding CaCO(3), was required for efficient C(4)\u000a   dicarboxylic acid production. Increased calcium concentrations, a side\u000a   effect of CaCO(3) dissolution, had a small positive effect on malate\u000a   formation. Carbon dioxide enrichment of the sparging gas (up to 15%\u000a   [vol/vol]) improved production of both malate and succinate. At higher\u000a   concentrations, succinate titers further increased, reaching 0.29 mol\u000a   (mol glucose)(-1), whereas malate formation strongly decreased. Although\u000a   fully aerobic conditions could be achieved, it was found that moderate\u000a   oxygen limitation benefitted malate production. In conclusion, malic\u000a   acid production with the engineered S. cerevisiae strain could be\u000a   successfully transferred from shake flasks to 1-liter batch bioreactors\u000a   by simultaneous optimization of four process parameters (pH and\u000a   concentrations of CO(2), calcium, and O(2)). Under optimized conditions,\u000a   a malate yield of 0.48 +/- 0.01 mol (mol glucose)(-1) was obtained in\u000a   bioreactors, a 19% increase over yields in shake flask experiments.\u000aTC 2\u000aZ9 2\u000aSN 0099-2240\u000aUT WOS:000274017400015\u000aER\u000a\u000aPT J\u000aAU Abbott, Derek A.\u000a   Zelle, Rintze M.\u000a   Pronk, Jack T.\u000a   van Maris, Antonius J. A.\u000aTI Metabolic engineering of Saccharomyces cerevisiae for production of\u000a   carboxylic acids: current status and challenges\u000aSO FEMS YEAST RESEARCH\u000aVL 9\u000aIS 8\u000aBP 1123\u000aEP 1136\u000aDI 10.1111/j.1567-1364.2009.00537.x\u000aPD DEC 2009\u000aPY 2009\u000aAB To meet the demands of future generations for chemicals and energy and\u000a   to reduce the environmental footprint of the chemical industry,\u000a   alternatives for petrochemistry are required. Microbial conversion of\u000a   renewable feedstocks has a huge potential for cleaner, sustainable\u000a   industrial production of fuels and chemicals. Microbial production of\u000a   organic acids is a promising approach for production of chemical\u000a   building blocks that can replace their petrochemically derived\u000a   equivalents. Although Saccharomyces cerevisiae does not naturally\u000a   produce organic acids in large quantities, its robustness, pH tolerance,\u000a   simple nutrient requirements and long history as an industrial workhorse\u000a   make it an excellent candidate biocatalyst for such processes. Genetic\u000a   engineering, along with evolution and selection, has been successfully\u000a   used to divert carbon from ethanol, the natural endproduct of S.\u000a   cerevisiae, to pyruvate. Further engineering, which included expression\u000a   of heterologous enzymes and transporters, yielded strains capable of\u000a   producing lactate and malate from pyruvate. Besides these metabolic\u000a   engineering strategies, this review discusses the impact of transport\u000a   and energetics as well as the tolerance towards these organic acids. In\u000a   addition to recent progress in engineering S. cerevisiae for organic\u000a   acid production, the key limitations and challenges are discussed in the\u000a   context of sustainable industrial production of organic acids from\u000a   renewable feedstocks.\u000aTC 11\u000aZ9 11\u000aSN 1567-1356\u000aUT WOS:000271264400001\u000aER\u000a\u000aPT J\u000aAU Zelle, Rintze M.\u000a   de Hulster, Erik\u000a   van Winden, WoUter A.\u000a   de Waard, Pieter\u000a   Dijkema, Cor\u000a   Winkler, Aaron A.\u000a   Geertman, Jan-Maarten A.\u000a   van Dijken, Johannes P.\u000a   Pronk, Jack T.\u000a   van Maris, Antonius J. A.\u000aTI Malic acid production by Saccharomyces cerevisiae: Engineering of\u000a   pyruvate carboxylation, oxaloacetate reduction, and malate export\u000aSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\u000aVL 74\u000aIS 9\u000aBP 2766\u000aEP 2777\u000aDI 10.1128/AEM.02591-07\u000aPD MAY 2008\u000aPY 2008\u000aAB Malic acid is a potential biomass-derivable \"building block\" for\u000a   chemical synthesis. Since wild-type Saccharomyces cerevisiae strains\u000a   produce only low levels of malate, metabolic engineering is required to\u000a   achieve efficient malate production with this yeast. A promising pathway\u000a   for malate production from glucose proceeds via carboxylation of\u000a   pyruvate, followed by reduction of oxaloacetate to malate. This redox-\u000a   and ATP-neutral, CO2-fixing pathway has a theoretical maximum yield of 2\u000a   mol malate (mol glucose)(-1). A previously engineered glucose-tolerant,\u000a   C-2-independent pyruvate decarboxylase-negative S. cerevisiae strain was\u000a   used as the platform to evaluate the impact of individual and combined\u000a   introduction of three genetic modifications: (i) overexpression of the\u000a   native pyruvate carboxylase encoded by PYC2, (ii) high-level expression\u000a   of an allele of the MDH3 gene, of which the encoded malate dehydrogenase\u000a   was retargeted to the cytosol by deletion of the C-terminal peroxisomal\u000a   targeting sequence, and (iii) functional expression of the\u000a   Schizosaccharomyces pombe malate transporter gene SpMAE1. While single\u000a   or double modifications improved malate production, the highest malate\u000a   yields and titers were obtained with the simultaneous introduction of\u000a   all three modifications. In glucose-grown batch cultures, the resulting\u000a   engineered strain produced malate at titers of up to 59 g liter(-1) at a\u000a   malate yield of 0.42 mol (mol glucose)(-1). Metabolic flux analysis\u000a   showed that metabolite labeling patterns observed upon nuclear magnetic\u000a   resonance analyses of cultures grown on C-13-labeled glucose were\u000a   consistent with the envisaged nonoxidative, fermentative pathway for\u000a   malate production. The engineered strains still produced substantial\u000a   amounts of pyruvate, indicating that the pathway efficiency can be\u000a   further improved.\u000aTC 15\u000aZ9 17\u000aSN 0099-2240\u000aUT WOS:000255567900024\u000aER\u000a\u000aEF",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": " Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": " Jacob C.",
						"lastName": " Harrison",
						"creatorType": "author"
					},
					{
						"firstName": " Jack T.",
						"lastName": " Pronk",
						"creatorType": "author"
					},
					{
						"firstName": " Antonius J. A.",
						"lastName": " van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Anaplerotic Role for Cytosolic Malic Enzyme in Engineered Saccharomyces   cerevisiae Strains",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "77",
				"issue": "3",
				"pages": "732-738",
				"DOI": "10.1128/AEM.02132-10",
				"date": "FEB 2011 2011",
				"abstractNote": "Malic enzyme catalyzes the reversible oxidative decarboxylation of   malate to pyruvate and CO(2). The Saccharomyces cerevisiae MAE1 gene   encodes a mitochondrial malic enzyme whose proposed physiological roles   are related to the oxidative, malate-decarboxylating reaction. Hitherto,   the inability of pyruvate carboxylase-negative (Pyc(-)) S. cerevisiae   strains to grow on glucose suggested that Mae1p cannot act as a   pyruvate-carboxylating, anaplerotic enzyme. In this study, relocation of   malic enzyme to the cytosol and creation of thermodynamically favorable   conditions for pyruvate carboxylation by metabolic engineering, process   design, and adaptive evolution, enabled malic enzyme to act as the sole   anaplerotic enzyme in S. cerevisiae. The Escherichia coli NADH-dependent   sfcA malic enzyme was expressed in a Pyc(-) S. cerevisiae background.   When PDC2, a transcriptional regulator of pyruvate decarboxylase genes,   was deleted to increase intracellular pyruvate levels and cells were   grown under a CO(2) atmosphere to favor carboxylation, adaptive   evolution yielded a strain that grew on glucose (specific growth rate,   0.06 +/- 0.01 h(-1)). Growth of the evolved strain was enabled by a   single point mutation (Asp336Gly) that switched the cofactor preference   of E. coli malic enzyme from NADH to NADPH. Consistently, cytosolic   relocalization of the native Mae1p, which can use both NADH and NADPH,   in a pyc1,2 Delta pdc2 Delta strain grown under a CO(2) atmosphere, also   enabled slow-growth on glucose. Although growth rates of these strains   are still low, the higher ATP efficiency of carboxylation via malic   enzyme, compared to the pyruvate carboxylase pathway, may contribute to   metabolic engineering of S. cerevisiae for anaerobic, high-yield   C(4)-dicarboxylic acid production.",
				"ISSN": "0099-2240"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": " Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": " Josh",
						"lastName": " Trueheart",
						"creatorType": "author"
					},
					{
						"firstName": " Jacob C.",
						"lastName": " Harrison",
						"creatorType": "author"
					},
					{
						"firstName": " Jack T.",
						"lastName": " Pronk",
						"creatorType": "author"
					},
					{
						"firstName": " Antonius J. A.",
						"lastName": " van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Phosphoenolpyruvate Carboxykinase as the Sole Anaplerotic Enzyme in   Saccharomyces cerevisiae",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "76",
				"issue": "16",
				"pages": "5383-5389",
				"DOI": "10.1128/AEM.01077-10",
				"date": "AUG 2010 2010",
				"abstractNote": "Pyruvate carboxylase is the sole anaplerotic enzyme in glucose-grown   cultures of wild-type Saccharomyces cerevisiae. Pyruvate   carboxylase-negative (Pyc(-)) S. cerevisiae strains cannot grow on   glucose unless media are supplemented with C(4) compounds, such as   aspartic acid. In several succinate-producing prokaryotes,   phosphoenolpyruvate carboxykinase (PEPCK) fulfills this anaplerotic   role. However, the S. cerevisiae PEPCK encoded by PCK1 is repressed by   glucose and is considered to have a purely decarboxylating and   gluconeogenic function. This study investigates whether and under which   conditions PEPCK can replace the anaplerotic function of pyruvate   carboxylase in S. cerevisiae. Pyc(-) S. cerevisiae strains   constitutively overexpressing the PEPCK either from S. cerevisiae or   from Actinobacillus succinogenes did not grow on glucose as the sole   carbon source. However, evolutionary engineering yielded mutants able to   grow on glucose as the sole carbon source at a maximum specific growth   rate of ca. 0.14 h(-1), one-half that of the (pyruvate   carboxylase-positive) reference strain grown under the same conditions.   Growth was dependent on high carbon dioxide concentrations, indicating   that the reaction catalyzed by PEPCK operates near thermodynamic   equilibrium. Analysis and reverse engineering of two independently   evolved strains showed that single point mutations in pyruvate kinase,   which competes with PEPCK for phosphoenolpyruvate, were sufficient to   enable the use of PEPCK as the sole anaplerotic enzyme. The PEPCK   reaction produces one ATP per carboxylation event, whereas the original   route through pyruvate kinase and pyruvate carboxylase is ATP neutral.   This increased ATP yield may prove crucial for engineering of efficient   and low-cost anaerobic production of C(4) dicarboxylic acids in S.   cerevisiae.",
				"ISSN": "0099-2240"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": " Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": " Erik",
						"lastName": " De Hulster",
						"creatorType": "author"
					},
					{
						"firstName": " Wendy",
						"lastName": " Kloezen",
						"creatorType": "author"
					},
					{
						"firstName": " Jack T.",
						"lastName": " Pronk",
						"creatorType": "author"
					},
					{
						"firstName": " Antonius J. A.",
						"lastName": " van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Key Process Conditions for Production of C(4) Dicarboxylic Acids in   Bioreactor Batch Cultures of an Engineered Saccharomyces cerevisiae   Strain",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "76",
				"issue": "3",
				"pages": "744-750",
				"DOI": "10.1128/AEM.02396-09",
				"date": "FEB 2010 2010",
				"abstractNote": "A recent effort to improve malic acid production by Saccharomyces   cerevisiae by means of metabolic engineering resulted in a strain that   produced up to 59 g liter(-1) of malate at a yield of 0.42 mol (mol   glucose)(-1) in calcium carbonate-buffered shake flask cultures. With   shake flasks, process parameters that are important for scaling up this   process cannot be controlled independently. In this study, growth and   product formation by the engineered strain were studied in bioreactors   in order to separately analyze the effects of pH, calcium, and carbon   dioxide and oxygen availability. A near-neutral pH, which in shake   flasks was achieved by adding CaCO(3), was required for efficient C(4)   dicarboxylic acid production. Increased calcium concentrations, a side   effect of CaCO(3) dissolution, had a small positive effect on malate   formation. Carbon dioxide enrichment of the sparging gas (up to 15%   [vol/vol]) improved production of both malate and succinate. At higher   concentrations, succinate titers further increased, reaching 0.29 mol   (mol glucose)(-1), whereas malate formation strongly decreased. Although   fully aerobic conditions could be achieved, it was found that moderate   oxygen limitation benefitted malate production. In conclusion, malic   acid production with the engineered S. cerevisiae strain could be   successfully transferred from shake flasks to 1-liter batch bioreactors   by simultaneous optimization of four process parameters (pH and   concentrations of CO(2), calcium, and O(2)). Under optimized conditions,   a malate yield of 0.48 +/- 0.01 mol (mol glucose)(-1) was obtained in   bioreactors, a 19% increase over yields in shake flask experiments.",
				"ISSN": "0099-2240"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": " Derek A.",
						"lastName": "Abbott",
						"creatorType": "author"
					},
					{
						"firstName": " Rintze M.",
						"lastName": " Zelle",
						"creatorType": "author"
					},
					{
						"firstName": " Jack T.",
						"lastName": " Pronk",
						"creatorType": "author"
					},
					{
						"firstName": " Antonius J. A.",
						"lastName": " van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Metabolic engineering of Saccharomyces cerevisiae for production of   carboxylic acids: current status and challenges",
				"publicationTitle": "Fems Yeast Research",
				"volume": "9",
				"issue": "8",
				"pages": "1123-1136",
				"DOI": "10.1111/j.1567-1364.2009.00537.x",
				"date": "DEC 2009 2009",
				"abstractNote": "To meet the demands of future generations for chemicals and energy and   to reduce the environmental footprint of the chemical industry,   alternatives for petrochemistry are required. Microbial conversion of   renewable feedstocks has a huge potential for cleaner, sustainable   industrial production of fuels and chemicals. Microbial production of   organic acids is a promising approach for production of chemical   building blocks that can replace their petrochemically derived   equivalents. Although Saccharomyces cerevisiae does not naturally   produce organic acids in large quantities, its robustness, pH tolerance,   simple nutrient requirements and long history as an industrial workhorse   make it an excellent candidate biocatalyst for such processes. Genetic   engineering, along with evolution and selection, has been successfully   used to divert carbon from ethanol, the natural endproduct of S.   cerevisiae, to pyruvate. Further engineering, which included expression   of heterologous enzymes and transporters, yielded strains capable of   producing lactate and malate from pyruvate. Besides these metabolic   engineering strategies, this review discusses the impact of transport   and energetics as well as the tolerance towards these organic acids. In   addition to recent progress in engineering S. cerevisiae for organic   acid production, the key limitations and challenges are discussed in the   context of sustainable industrial production of organic acids from   renewable feedstocks.",
				"ISSN": "1567-1356"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": " Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": " Erik",
						"lastName": " de Hulster",
						"creatorType": "author"
					},
					{
						"firstName": " WoUter A.",
						"lastName": " van Winden",
						"creatorType": "author"
					},
					{
						"firstName": " Pieter",
						"lastName": " de Waard",
						"creatorType": "author"
					},
					{
						"firstName": " Cor",
						"lastName": " Dijkema",
						"creatorType": "author"
					},
					{
						"firstName": " Aaron A.",
						"lastName": " Winkler",
						"creatorType": "author"
					},
					{
						"firstName": " Jan-Maarten A.",
						"lastName": " Geertman",
						"creatorType": "author"
					},
					{
						"firstName": " Johannes P.",
						"lastName": " van Dijken",
						"creatorType": "author"
					},
					{
						"firstName": " Jack T.",
						"lastName": " Pronk",
						"creatorType": "author"
					},
					{
						"firstName": " Antonius J. A.",
						"lastName": " van Maris",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Malic acid production by Saccharomyces cerevisiae: Engineering of   pyruvate carboxylation, oxaloacetate reduction, and malate export",
				"publicationTitle": "Applied and Environmental Microbiology",
				"volume": "74",
				"issue": "9",
				"pages": "2766-2777",
				"DOI": "10.1128/AEM.02591-07",
				"date": "MAY 2008 2008",
				"abstractNote": "Malic acid is a potential biomass-derivable \"building block\" for   chemical synthesis. Since wild-type Saccharomyces cerevisiae strains   produce only low levels of malate, metabolic engineering is required to   achieve efficient malate production with this yeast. A promising pathway   for malate production from glucose proceeds via carboxylation of   pyruvate, followed by reduction of oxaloacetate to malate. This redox-   and ATP-neutral, CO2-fixing pathway has a theoretical maximum yield of 2   mol malate (mol glucose)(-1). A previously engineered glucose-tolerant,   C-2-independent pyruvate decarboxylase-negative S. cerevisiae strain was   used as the platform to evaluate the impact of individual and combined   introduction of three genetic modifications: (i) overexpression of the   native pyruvate carboxylase encoded by PYC2, (ii) high-level expression   of an allele of the MDH3 gene, of which the encoded malate dehydrogenase   was retargeted to the cytosol by deletion of the C-terminal peroxisomal   targeting sequence, and (iii) functional expression of the   Schizosaccharomyces pombe malate transporter gene SpMAE1. While single   or double modifications improved malate production, the highest malate   yields and titers were obtained with the simultaneous introduction of   all three modifications. In glucose-grown batch cultures, the resulting   engineered strain produced malate at titers of up to 59 g liter(-1) at a   malate yield of 0.42 mol (mol glucose)(-1). Metabolic flux analysis   showed that metabolite labeling patterns observed upon nuclear magnetic   resonance analyses of cultures grown on C-13-labeled glucose were   consistent with the envisaged nonoxidative, fermentative pathway for   malate production. The engineered strains still produced substantial   amounts of pyruvate, indicating that the pathway efficiency can be   further improved.",
				"ISSN": "0099-2240"
			}
		]
	}
]
/** END TEST CASES **/
