{
	"translatorID": "5a697ab5-913a-478a-b4ec-98d019aa5dc6",
	"label": "NASA NTRS",
	"creator": "Andrew Bergan",
	"target": "^http://ntrs\\.nasa\\.gov/search\\.jsp\\?",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-03-06 13:44:16"
}

function detectWeb(doc, url) {
	
	// Make sure that we are on a record page or details page
	var contentLabel = ZU.xpathText(doc.getElementById("rightcontent"), './div/h2');

	if (!contentLabel) return;
	
	if (contentLabel.indexOf("Search Results") != -1) {
		return "multiple";
	}
	else if (contentLabel.indexOf("Record Details") != -1) {
		
		var docType = "";
		
		// Look in the left nav menu for the document type
		var docType = ZU.xpathText(doc.getElementById("leftnav"), './/form[@name="find_similar_form"]//input[@name="document_type_1"]/following-sibling::a[1]')
		
		// remove leading and trailing whitespace
		var docType = docType.replace(/^\s*|\s*$/g, '');
		
		// Check against implemented document types
		if (docType.indexOf("Conference Paper") != -1) {
			return "conferencePaper"
		
		} else if (docType.indexOf("Technical Report") != -1) {
			return "report"
		
		} else if (docType.indexOf("Journal Article") != -1) {
			return "journalArticle";
		
		} else if (docType.indexOf("Masters Thesis") != -1 || docType.indexOf("PhD Dissertation") != -1 || docType.indexOf("Thesis") != -1) {
			return "thesis"
			
		} else {
			// No match
			return null;
		}
	}
}

function scrape(doc, url) {

	// Get the item
	var newItem = new Zotero.Item(detectWeb(doc, url));
	
	// Get the url
	newItem.url = doc.location.href.replace(/\?.*?\b(R=\d+)(?:&.*)?$/, '?$1');
	
	// Set a temporary title (placeholder in case the entry doesn't have a title)
	newItem.title = "No title found";
	
	// Build an array of the items containing the bibliographic data
	var items = new Object();
	var rows = ZU.xpath(doc.getElementById("doctext"), './table/tbody/tr');
	for (var i in rows) {
		var label = ZU.xpathText(rows[i], './td[1]').replace(/^\s*|\s*$/g, '').replace(/:/, '');
		// Handle the document link differently
		if (label.indexOf("Online Source") != -1) {
			
			// Online source
			var contents = ZU.xpathText(rows[i], './td[2]/a/@href').split(', ');
			var content  = contents[0];
		} else {
			var content = ZU.xpathText(rows[i], './td[2]').replace(/^\s*|\s*$/g, '');
		}

		items[label] = content;
	}
	
	// Save the document as a link attachment
	if (items["Online Source"]) {
		var linkurl = items["Online Source"];
		if (linkurl.match("doi.org")) {
			newItem.DOI = linkurl.replace(/http:\/\/dx.doi.org\//, '');
		} else {
			newItem.attachments = [{ 
				url: linkurl,
				title: "NASA NTRS Full Text PDF",
				mimeType: "application/pdf"
			}];
		}
	}
	
	
	// Save a snapshot
	newItem.attachments.push({title: "Snapshot", document: doc});

	// Format and save author field
	if (items["Author"]) {
		var author = items["Author"];
		
		// Handle multiple authors
		var authors = author.split("; ");
		for (var i in authors) {
			var authorName = authors[i];
			newItem.creators.push(Zotero.Utilities.cleanAuthor(authorName, "author", authorName.indexOf(', ') != -1));
		}	
	}
	
	// Save tags
	if (items["Subject Terms"]) {
		var tags = items["Subject Terms"].split("; ");
		for (var i = 0; i < tags.length; i++) {
			newItem.tags[i] = tags[i].toLowerCase();
		}
	}
	
	// Save the date
	if (items["Publication Date"]) {
		newItem.date = items["Publication Date"].replace(/\[(.*?)\]/g, "$1");
	}
	
	// Save the place / conference name
	if (newItem.itemType == "conferencePaper") {
		if (items["Meeting Information"]) {
			if (items["Meeting Information"].match("; ")) {
				var confNameLocation = items["Meeting Information"].split("; ");
				
				// Save the conference name
				newItem.conferenceName = confNameLocation.shift();
				
				// Save the location
				newItem.place = confNameLocation.pop();
				if (confNameLocation.length) newItem.place = confNameLocation.pop() + ", " + newItem.place;
			}
		}
	}
	
	// Save journal publication information: journal name, vol, issue, pages
	if (items["Publication Information"]) {
		journalInfo = items["Publication Information"].split('; ');
		
		// Save the journal name
		if (journalInfo[0].indexOf("=") == -1) {
			newItem.publicationTitle = journalInfo[0].replace(/\(.*\)/, '');
		}
		
		for (var i in journalInfo) {
			
			var content =journalInfo[i];
			
			// Save the volume
			if (content.indexOf("Volume") != -1) {
				newItem.volume = content.replace(/Volume /, '');
			}
			
			// Save the page numbers
			if (content.match(/^(.*)[0-9]+-[0-9]+$/)) {
				newItem.pages = content;
			}
			
			// Save the issue number
			if (content.indexOf("no.") != -1) {
				newItem.issue = content.replace(/no. /, '');
			} else if (content.indexOf("Issue") != -1) {
				newItem.issue = content.replace(/Issue /, '');
			}
			
			// Save the ISSN
			if (ZU.cleanISSN) {
				Z.debug("Found ISSN function")
				if (issn) newItem.ISSN = issn;
			}
		}
	}
	
	// Save the title
	if (items["Title"]) newItem.title = items["Title"];
	
	// Save the abstract
	newItem.abstractNote = items["Abstract"];
	
	// Save notes
	if (items["Notes"]) newItem.notes.push(items["Notes"]);
	
	newItem.complete();
}

function doWeb(doc, url) {
	
	// Local variables
	var nextTitle;
	var articles = new Object();

	// Handle multiple entries ie search results
	if (detectWeb(doc,url) == "multiple") {
		var titles = ZU.xpath(doc, '//table[@class="recordTable"]/tbody/tr/td/a[1]');
		//var titles = doc.evaluate('//table[@class="recordTable"]/tbody/tr/td/a[1]',doc, null, XPathResult.ANY_TYPE, null);
		
		// Loop through each title and grab the link to the document page
		// store the link in articles
		for (var i in titles) {
			articles[titles[i].href] = titles[i].textContent;
		}
		
		// Get pages the user wants to save
		Zotero.selectItems(articles, function(articles) {
			// If the user doesn't select any, quit
			if(!articles) return true;
			
			// Build an array with the user selected items
			var urls = [];
			for (var article in articles) urls.push(article);
			
			// Call scrape for each article selected
			Zotero.Utilities.processDocuments(urls, scrape);
			Zotero.wait();
		});
	} else {
		scrape(doc, url)
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20130009946&qs=N%3D4294937145",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Marianne",
						"lastName": "Mosher",
						"creatorType": "author"
					},
					{
						"firstName": "Michael E.",
						"lastName": "Watts",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Barnes",
						"creatorType": "author"
					},
					{
						"firstName": "Jorge",
						"lastName": "Bardina",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"acoustic measurement",
					"aerodynamic noise",
					"aircraft noise",
					"noise measurement",
					"phased arrays",
					"real time operation",
					"signal to noise ratios",
					"sound generators",
					"wind measurement",
					"wind tunnels"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NASA NTRS Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20130009946",
				"title": "Microphone Array Phased Processing System (MAPPS): Phased Array System for Acoustic Measurements in a Wind Tunnel",
				"date": "October 19, 1999",
				"abstractNote": "A processing system has been developed to meet increasing demands for detailed noise measurement of aircraft in wind tunnels. Phased arrays enable spatial and amplitude measurements of acoustic sources, including low signal-to-noise sources not measurable by conventional measurement techniques. The Microphone Array Phased Processing System (MAPPS) provides processing and visualization of acoustic array measurements made in wind tunnels. The system uses networked parallel computers to provide noise maps at selected frequencies in a near real-time testing environment. The system has been successfully used in two subsonic, hard-walled wind tunnels, the NASA Ames 7- by 10-Foot Wind Tunnel and the NASA Ames 12-Foot Wind Tunnel. Low level airframe noise that can not be measured with traditional techniques was measured in both tests.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Microphone Array Phased Processing System (MAPPS)"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20130010240&qs=N%3D4294937145",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Alan E.",
						"lastName": "Rubin",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"breccia",
					"cavities",
					"chondrites",
					"crystal defects",
					"enstatite",
					"geochronology",
					"impact melts",
					"melts (crystal growth)",
					"metamorphism (geology)",
					"silicates",
					"silicon dioxide",
					"sulfides"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NASA NTRS Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20130010240",
				"title": "Sinoite (Si2N2O): Crystallization from EL Chondrite Impact Melts",
				"date": "September 1997",
				"publicationTitle": "American Mineralogist",
				"volume": "82",
				"pages": "1001-1006",
				"abstractNote": "Sinoite (Si,NP) was previously observed only in EL6 chondrites and recently modeled as having formed over geologic time scales at metamorphic temperatures of approx. 950 C. I found several approx. 10-210 micron-sized subhedral and euhedral grains of twinned, optically zoned sinoite associated with euhedral enstatite and euhedral graphite within impact-melted portions of QUE94368, the first EL4 chondrite. The presence of sinoite within a type 4 chondrite mitigates against the metamorphic model of sinoite formation; it seems more likely that si noite crystallized from a liquid. During impact melting of EL material. N, may have been released from lattice defects in sulfides whereupon it reacted with reduced Si dissolved in the metallic Fe-Ni melt and with fine-grained or molten silica derived from the silicate fraction of the EL assemblage. The N that formed the sinoite was derived from the silicate melt or from temporary, melt-filled cavities constructed from unmelted EL material in which the nitrogen fugacity may have reached approx.40 to 130 bars (0.004 to 0.013 GPa). Sinoite in EL6 chondrites may have formed either metamorphically, as previously proposed. or by means of crystallization from an impact melt, as in QUE94368. In the latter case, sinoite-bearing EL6 chondrites would be annealed impact-melt breccias.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Sinoite (Si2N2O)"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20130010248&qs=N%3D4294967219",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Jeffrey C.",
						"lastName": "Luvall",
						"creatorType": "author"
					},
					{
						"firstName": "William A.",
						"lastName": "Sprigg",
						"creatorType": "author"
					},
					{
						"firstName": "Goran",
						"lastName": "Pejanovic",
						"creatorType": "author"
					},
					{
						"firstName": "Slobodan",
						"lastName": "Nickovic",
						"creatorType": "author"
					},
					{
						"firstName": "Anup",
						"lastName": "Prasad",
						"creatorType": "author"
					},
					{
						"firstName": "Ana",
						"lastName": "Vukovic",
						"creatorType": "author"
					},
					{
						"firstName": "Miram",
						"lastName": "Vujadinovic",
						"creatorType": "author"
					},
					{
						"firstName": "Estelle",
						"lastName": "Levetin",
						"creatorType": "author"
					},
					{
						"firstName": "Landon",
						"lastName": "Bunderson",
						"creatorType": "author"
					},
					{
						"firstName": "Peter K.",
						"lastName": "VandeWater",
						"creatorType": "author"
					},
					{
						"firstName": "Amy",
						"lastName": "Budge",
						"creatorType": "author"
					},
					{
						"firstName": "William",
						"lastName": "Hudspeth",
						"creatorType": "author"
					},
					{
						"firstName": "Alfredo",
						"lastName": "Huete",
						"creatorType": "author"
					},
					{
						"firstName": "Alan",
						"lastName": "Zelicoff",
						"creatorType": "author"
					},
					{
						"firstName": "Theresa",
						"lastName": "Crimmins",
						"creatorType": "author"
					},
					{
						"firstName": "Jake",
						"lastName": "Welzin",
						"creatorType": "author"
					},
					{
						"firstName": "Heide",
						"lastName": "Krapfl",
						"creatorType": "author"
					},
					{
						"firstName": "Barbara",
						"lastName": "Toth",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"aerosols",
					"asthma",
					"atmospheric models",
					"decision support systems",
					"meteorology",
					"phenology",
					"pollen",
					"public health",
					"regression analysis",
					"seasons",
					"texas",
					"trajectory analysis",
					"trees (plants)",
					"vegetation",
					"wind direction"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NASA NTRS Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20130010248",
				"title": "Integration of Airborne Aerosol Prediction Systems and Vegetation Phenology to Track Pollen for Asthma Alerts in Public Health Decision Support Systems",
				"date": "January 06, 2013",
				"conferenceName": "213th American Meteorological Society (AMS) Meeting",
				"place": "Austin, TX, United States",
				"abstractNote": "No abstract available",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20130010247&qs=N%3D4294967219",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Chryssa",
						"lastName": "Kouveliotou",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"astrophysics",
					"cosmology",
					"gamma ray bursts",
					"gravitational fields",
					"magnetars",
					"magnetic fields",
					"red shift",
					"universe"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NASA NTRS Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20130010247",
				"title": "Extreme Transients in the High Energy Universe",
				"date": "January 08, 2013",
				"conferenceName": "219th American Astronomical Society (AAS) Meeting",
				"place": "Austin, TX, United States",
				"abstractNote": "The High Energy Universe is rich in diverse populations of objects spanning the entire cosmological (time)scale, from our own present-day Milky Way to the re-ionization epoch. Several of these are associated with extreme conditions irreproducible in laboratories on Earth. Their study thus sheds light on the behavior of matter under extreme conditions, such as super-strong magnetic fields (in excess of 10^14 G), high gravitational potentials (e.g., Super Massive Black Holes), very energetic collimated explosions resulting in relativistic jet flows (e.g., Gamma Ray Bursts, exceeding 10^53 ergs). In the last thirty years, my work has been mostly focused on two apparently different but potentially linked populations of such transients: magnetars (highly magnetized neutron stars) and Gamma Ray Bursts (strongly beamed emission from relativistic jets), two populations that constitute unique astrophysical laboratories, while also giving us the tools to probe matter conditions in the Universe to redshifts beyond z=10, when the first stars and galaxies were assembled. I did not make this journey alone I have either led or participated in several international collaborations studying these phenomena in multi-wavelength observations; solitary perfection is not sufficient anymore in the world of High Energy Astrophysics. I will describe this journey, present crucial observational breakthroughs, discuss key results and muse on the future of this field.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20130010221&qs=N%3D4294967061",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Lewis M.",
						"lastName": "Parrish",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"carbon dioxide",
					"chemical cleaning",
					"convergent-divergent nozzles",
					"cryogenic equipment",
					"heat exchangers",
					"liquid air",
					"liquid nitrogen",
					"liquid-gas mixtures",
					"natural gas",
					"pipes (tubes)",
					"spray nozzles",
					"supercritical pressures",
					"supersonic nozzles"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NASA NTRS Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20130010221",
				"title": "Gas-Liquid Supersonic Cleaning and Cleaning Verification Spray System",
				"date": "March 2009",
				"abstractNote": "NASA Kennedy Space Center (KSC) recently entered into a nonexclusive license agreement with Applied Cryogenic Solutions (ACS), Inc. (Galveston, TX) to commercialize its Gas-Liquid Supersonic Cleaning and Cleaning Verification Spray System technology. This technology, developed by KSC, is a critical component of processes being developed and commercialized by ACS to replace current mechanical and chemical cleaning and descaling methods used by numerous industries. Pilot trials on heat exchanger tubing components have shown that the ACS technology provides for: Superior cleaning in a much shorter period of time. Lower energy and labor requirements for cleaning and de-scaling uper.ninih. Significant reductions in waste volumes by not using water, acidic or basic solutions, organic solvents, or nonvolatile solid abrasives as components in the cleaning process. Improved energy efficiency in post-cleaning heat exchanger operations. The ACS process consists of a spray head containing supersonic converging/diverging nozzles, a source of liquid gas; a novel, proprietary pumping system that permits pumping liquid nitrogen, liquid air, or supercritical carbon dioxide to pressures in the range of 20,000 to 60,000 psi; and various hoses, fittings, valves, and gauges. The size and number of nozzles can be varied so the system can be built in configurations ranging from small hand-held spray heads to large multinozzle cleaners. The system also can be used to verify if a part has been adequately cleaned.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=19780070036&qs=N%3D4294967061",
		"items": [
			{
				"itemType": "report",
				"creators": [],
				"notes": [],
				"tags": [
					"apollo spacecraft",
					"comparison",
					"latches",
					"separation",
					"spacecraft launching",
					"systems analysis"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=19780070036",
				"title": "Apollo Separation Systems Comparisons",
				"date": "Oct 1, 1962",
				"abstractNote": "No abstract available",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20130010127&qs=N%3D4294937145",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Alan E.",
						"lastName": "Rubin",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"chondrites",
					"ilmenite",
					"impact melts",
					"meteorites",
					"meteoritic composition",
					"mineralogy",
					"minerals",
					"phosphates",
					"snc meteorites"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20130010127",
				"title": "Mineralogy of Meteorite Groups: An Update",
				"DOI": "10.1111/j.1945-5100.1997.tb01558.x",
				"date": "September 1997",
				"publicationTitle": "Meteoritics and Planetary Science",
				"volume": "32",
				"issue": "5",
				"pages": "733-734",
				"abstractNote": "Twenty minerals that were not included in the most recent list of meteoritic minerals have been reported as occurring in meteorites. Extraterrestrial anhydrous Ca phosphate should be called menillite, not whitlockite.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Mineralogy of Meteorite Groups"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20040200977",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "Dawn C.",
						"lastName": "Jegley",
						"creatorType": "author"
					},
					{
						"firstName": "Dulnath D.",
						"lastName": "Wijayratne",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"aerodynamics",
					"aeroelasticity",
					"bending",
					"box beams",
					"composite structures",
					"data processing",
					"design analysis",
					"displacement",
					"fiber composites",
					"finite element method",
					"flutter",
					"loads (forces)",
					"mathematical models",
					"panels",
					"predictions",
					"stability",
					"wings"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NASA NTRS Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20040200977",
				"title": "Validation of Design and Analysis Techniques of Tailored Composite Structures",
				"date": "December 2004",
				"abstractNote": "Aeroelasticity is the relationship between the elasticity of an aircraft structure and its aerodynamics. This relationship can cause instabilities such as flutter in a wing. Engineers have long studied aeroelasticity to ensure such instabilities do not become a problem within normal operating conditions. In recent decades structural tailoring has been used to take advantage of aeroelasticity. It is possible to tailor an aircraft structure to respond favorably to multiple different flight regimes such as takeoff, landing, cruise, 2-g pull up, etc. Structures can be designed so that these responses provide an aerodynamic advantage. This research investigates the ability to design and analyze tailored structures made from filamentary composites. Specifically the accuracy of tailored composite analysis must be verified if this design technique is to become feasible. To pursue this idea, a validation experiment has been performed on a small-scale filamentary composite wing box. The box is tailored such that its cover panels induce a global bend-twist coupling under an applied load. Two types of analysis were chosen for the experiment. The first is a closed form analysis based on a theoretical model of a single cell tailored box beam and the second is a finite element analysis. The predicted results are compared with the measured data to validate the analyses. The comparison of results show that the finite element analysis is capable of predicting displacements and strains to within 10% on the small-scale structure. The closed form code is consistently able to predict the wing box bending to 25% of the measured value. This error is expected due to simplifying assumptions in the closed form analysis. Differences between the closed form code representation and the wing box specimen caused large errors in the twist prediction. The closed form analysis prediction of twist has not been validated from this test.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/