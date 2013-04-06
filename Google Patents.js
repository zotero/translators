{
	"translatorID": "d71e9b6d-2baa-44ed-acb4-13fe2fe592c0",
	"label": "Google Patents",
	"creator": "Adam Crymble, Avram Lyon",
	"target": "^https?://(www\\.)?google\\.[^/]+/(?:patents|[^/]*[&?#]tbm=pts)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-05 23:25:55"
}

function detectWeb(doc, url) {
	if (!doc.getElementsByTagName("body")[0].hasChildNodes()) return;

	if (getSearchResults(doc).length) {
		return "multiple";
	} else if(getScraper(doc)) {
		return "patent";
	}
}

function getSearchResults(doc) {
	return ZU.xpath(doc, '//div[@id="ires"]//li[@class="g"]//h3/a');
}

function fixAuthorCase(name) {
	if(name.toUpperCase() == name) {
		return ZU.capitalizeTitle(name, true).replace(/\sa(\.?)\s/,' A$1 ');
	} else {
		return name;
	}
}

var scrapers = [
	//U.S. (?) patent page. E.g. http://www.google.com/patents/US20090289560
	{
		getBoxes: function(doc) {
			return ZU.xpath(doc, '(//div[@class="patent_bibdata"]//*[./b]|//div[@class="patent_bibdata"][./b])');
		},
		detect: function(doc) {
			return this.getBoxes(doc).length;
		},
		fieldMap: {
			'PATENT NUMBER': 'patentNumber',
			'FILING DATE': 'filingDate',
			'ISSUE DATE': 'date',
			'APPLICATION NUMBER': 'applicationNumber',
			'ORIGINAL ASSIGNEE': 'assignee',
			'INVENTORS': 'creators',
			'INVENTOR': 'creators',
			'CURRENT U.S. CLASSIFICATION': 'extra/U.S. Classification',
			'INTERNATIONAL CLASSIFICATION': 'extra/International Classification'
		/*	'PRIMARY EXAMINER':
			'SECONDARY EXAMINER':
			'ATTORNEY':
			'ATTORNEYS':
		*/
		},
		addField: function(fields, label, value) {
			if(!value.length) return;
			var zField = this.fieldMap[label];
			if(value.length && zField) {
				zField = zField.split('/');
				switch(zField[0]) {
					case 'creators':
						if(!fields.creators) fields.creators = [];
						fields.creators = fields.creators.concat(value);
					break;
					case 'extra':
						if(fields.extra) fields.extra += '\n';
						else fields.extra = '';

						if(zField[1]) fields.extra += zField[1] + ': ';
						fields.extra += value.join('; ');
					break;
					default:
						if(fields[zField[0]]) return;	//do not overwrite previous fields
						fields[zField[0]] = value.join('; ');
				}
			}
		},
		addValue: function(label, value, node) {
			switch(label) {
				case 'PATENT NUMBER':
				case 'FILING DATE':
				case 'ISSUE DATE':
				case 'APPLICATION NUMBER':
				case 'PRIMARY EXAMINER':
				case 'SECONDARY EXAMINER':
					value[0] = node.textContent.trim().replace(/^:\s*/,'');
				break;
				case 'ATTORNEY':
				case 'ATTORNEYS':
					value = value.concat(
						fixAuthorCase(
							node.textContent.trim()
									.replace(/^:\s*/,'')
						).split(/\s*,\s*(?=\S)(?!(?:LLC|LLP|Esq)\b)/i));
				break;
				case 'ORIGINAL ASSIGNEE':
					if(node.nodeName.toUpperCase() != 'A') break;
					value[0] = fixAuthorCase(node.textContent.trim());
				break;
				case 'INVENTORS':
				case 'INVENTOR':
					if(node.nodeName.toUpperCase() != 'A') break;
					var name = node.textContent.trim().split(/\s*,\s*/);	//look for suffix
					var inv = ZU.cleanAuthor(fixAuthorCase(name[0]), 'inventor');
					if(name[1]) {	//re-add suffix if we had one
						inv.firstName += ', ' + name[1];
					}
					value.push(inv);
				break;
				case 'CURRENT U.S. CLASSIFICATION':
					if(node.nodeName.toUpperCase() != 'A') break;
					value.push(node.textContent.trim());
				break;
				case 'INTERNATIONAL CLASSIFICATION':
					value = value.concat(node.textContent.trim()
									.replace(/^:\s*/,'')
									.split(/\s*;\s*/));
				break;
			}
			return value;
		},
		getMetadata: function(doc) {
			var fieldBoxes = this.getBoxes(doc);
			var fields = {};
			for(var i=0, n=fieldBoxes.length; i<n; i++) {
				//within each box, the fields are labeled in bold and separated by a <br/>
				var box = fieldBoxes[i];
				var node = box.firstChild;
				var label, value = [];
				while(node) {
					switch(node.nodeName.toUpperCase()) {
						case 'B':
							if(!label) {
								label = node.textContent.trim().toUpperCase();
							} else {
								value = this.addValue(label, value, node);
							}
						break;
						case 'BR':
							if(label) {
								if(value.length) {
									this.addField(fields, label, value);
								}
								label = undefined;
								value = [];
							}
						break;
						default:
							if(!label) break;
							value = this.addValue(label, value, node);
					}
					node = node.nextSibling;
				}
				if(label && value.length) {
					this.addField(fields, label, value);
				}
			}

			//add some other fields
			fields.abstractNote = ZU.xpathText(doc, '//p[@class="patent_abstract_text"]');
			fields.title = ZU.xpathText(doc, '//h1[@class="gb-volume-title"]');
			if(fields.title.toUpperCase() == fields.title) {
				fields.title = ZU.capitalizeTitle(fields.title, true);
			}
			if(fields.extra && fields.extra.indexOf('U.S. Classification') != -1) {
				fields.country = "United States";
			}

			var url = doc.location.href;
			fields.url = 'http://' + doc.location.host + doc.location.pathname;
			var m;
			if(m = url.match(/[?&](id=[^&]+)/)) fields.url += '?' + m[1];
			Z.debug(fields.url)
			fields.attachments = [
				{
					url: ZU.xpathText(doc, '//a[@id="appbar-download-pdf-link"]/@href'),
					title: "Google Patents PDF",
					mimeType: "application/pdf"
				}
			];
			return fields;
		}
	},
	//European (?) patent page. E.g. http://www.google.com/patents/EP0011951A1
	{
		detect: function(doc) { return this.getRows(doc).length; },
		getRows: function(doc) {
			return ZU.xpath(doc, '//table[contains(@class,"patent-bibdata")]//tr[not(@class)][./td[@class="patent-bibdata-heading"]]');
		},
		getMetadata: function(doc) {
			var rows = this.getRows(doc);
			var label, values, zField;
			var fields = {};
			for(var i=0, n=rows.length; i<n; i++) {
				label = ZU.xpathText(rows[i], './td[@class="patent-bibdata-heading"]');
				values = ZU.xpath(rows[i], './td[@class="single-patent-bibdata"]|.//div[@class="patent-bibdata-value"]');
				if(!values.length) continue;

				switch(label.trim().toUpperCase()) {
					case 'PUBLICATION NUMBER':
						if(!zField) zField = 'patentNumber';
					case 'PUBLICATION DATE':
						if(!zField) zField = 'date';
					case 'FILING DATE':
						if(!zField) zField = 'filingDate';
					case 'APPLICANT':
						if(!zField) zField = 'assignee';
						fields[zField] = values[0].textContent.trim();
					break;
					//case 'PRIORITY DATE':
					//case 'ALSO PUBLISHED AS':
					case 'INVENTORS':
						fields.creators = [];
						for(var j=0, m=values.length; j<m; j++) {
							fields.creators.push(
								ZU.cleanAuthor(values[j].textContent.trim(), 'inventor')
							);
						}
					break;
					case 'INTERNATIONAL CLASSIFICATION':
						if(!zField) zField = 'International Classification';
					case 'EUROPEAN CLASSIFICATION':
						if(!zField) zField = 'U.S. Classification';

						if(fields.extra) fields.extra += '\n';
						else fields.extra = '';

						fields.extra += zField + ': '
							+ values.map(function(v) { 
									return v.textContent.trim();
								}).join('; ');
					break;
					default:
				}
				zField = undefined;
			}
			
			//add other data
			fields.title = ZU.xpathText(doc, '//span[@class="patent-title"]');
			var abs = ZU.xpath(doc, '//p[@class="abstract"]');
			fields.abstractNote = '';
			for(var i=0, n=abs.length; i<n; i++) {
				fields.abstractNote += ZU.trimInternal(abs[i].textContent) + '\n';
			}
			fields.abstractNote = fields.abstractNote.trim();

			if(fields.patentNumber && fields.patentNumber.indexOf('EP') === 0) {
				fields.country = 'European Union';
			}
			else if(fields.patentNumber && fields.patentNumber.indexOf('US') === 0) {
				fields.country = 'United States';
				//looks like only US patents have PDFs
				var pdfurl = doc.location.href.replace(/\?.+/, "") + ".pdf"
				fields.attachments = [
				{
					url: pdfurl,
					title: "Google Patents PDF",
					mimeType: "application/pdf"
				}
			];
			}
					
			return fields;
		}
	}
];

function getScraper(doc) {
	for(var i=0, n=scrapers.length; i<n; i++) {
		if(scrapers[i].detect(doc)) return scrapers[i];
	}
}

function scrape(doc) {
	var scraper = getScraper(doc);

	if(!scraper) return;

	//go through all the fields and add them to an item
	var item = new Zotero.Item("patent");

	var fields = scraper.getMetadata(doc);
	var f;
	for(f in fields) {
		item[f] = fields[f];
	}

	item.complete();
}

//Fix url so it leads us to the right page
function fixUrl(url) {
	if (url.match(/printsec=|v=onepage|v=thumbnail|google\.(?!com\/)|[&?]hl=(?!en)(?:&|$)/)) {
		var id;
		var cLang = url.match(/[&?#]cl=([^&#]+)/);	//content language
		var cleanUrl = url.replace(/[#?].*/, '')
			+ '?hl=en'		//interface language
			+ (cLang?'&cl=' + cLang[1]:'');	//content language

		//patent pages directly navigated to from search results have the id somewhere in the URL
		if (id = url.match(/[&?#]id=([^&#]+)/)) {
			cleanUrl += '&id=' + id[1];
		}
		return cleanUrl;
	}
	return url;
}

function doWeb(doc, url) {
	var host = 'http://' + doc.location.host + "/";

	if (detectWeb(doc, url) == "multiple") {
		var res = getSearchResults(doc);
		var items = {};
		for (var i=0, n=res.length; i<n; i++) {
			items[fixUrl(res[i].href)] = res[i].textContent;
		}

		Zotero.selectItems(items, function (items) {
			if(!items) return true;

			var articles = new Array();
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		var newurl = fixUrl(url);
		if(newurl != url) {
			ZU.processDocuments(newurl, scrape)
		} else {
			scrape(doc, url);
		}
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.google.com/search?tbm=pts&tbo=1&hl=en&q=book&btnG=Search+Patents",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents/about?id=j5NSAAAAEBAJ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "T.",
						"lastName": "Shook",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.google.com/patents/US1065211.pdf",
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"country": "United States",
				"extra": "U.S. Classification: 215/273",
				"patentNumber": "1065211",
				"date": "Jun 17, 1913",
				"filingDate": "Aug 3, 1912",
				"title": "Bottle-Stopper",
				"url": "http://www.google.com/patents/about?id=j5NSAAAAEBAJ",
				"libraryCatalog": "Google Patents",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents/about?id=KchEAAAAEBAJ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Jonathan A.",
						"lastName": "Hunt",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"patentNumber": "1120656",
				"filingDate": "Jan 14, 1914",
				"date": "Dec 8, 1914",
				"assignee": "Hunt Specialty Manufacturing Company",
				"extra": "U.S. Classification: 411/477; 24/711.4",
				"title": "A Corpobation Of",
				"country": "United States",
				"url": "http://www.google.com/patents/about?id=KchEAAAAEBAJ",
				"libraryCatalog": "Google Patents",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.fr/patents?id=Nh17AAAAEBAJ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Hisatada",
						"lastName": "Miyatake",
						"creatorType": "inventor"
					},
					{
						"firstName": "Kohki",
						"lastName": "Noda",
						"creatorType": "inventor"
					},
					{
						"firstName": "Toshio",
						"lastName": "Sunaga",
						"creatorType": "inventor"
					},
					{
						"firstName": "Hiroshi",
						"lastName": "Umezaki",
						"creatorType": "inventor"
					},
					{
						"firstName": "Hideo",
						"lastName": "Asano",
						"creatorType": "inventor"
					},
					{
						"firstName": "Koji",
						"lastName": "Kitamura",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"patentNumber": "7123498",
				"filingDate": "12 Oct 2004",
				"date": "17 Oct 2006",
				"applicationNumber": "10/964,352",
				"assignee": "International Business Machines Corporation",
				"extra": "U.S. Classification: 365/63; 365/33; 365/46; 365/55; 365/66; 365/97; 365/100; 365/158",
				"abstractNote": "MRAM has read word lines WLR and write word line WLW extending in the y direction, write/read bit line BLW/R and write bit line BLW extending in the x direction, and the memory cells MC disposed at the points of the intersection of these lines. The memory MC includes sub-cells SC1 and SC2. The sub-cell SC1 includes magneto resistive elements MTJ1 and MTJ2 and a selection transistor Tr1, and the sub-cell SC2 includes magneto resistive elements MTJ3 and MTJ4 and a selection transistor Tr2. The magneto resistive elements MTJ1 and MTJ2 are connected in parallel, and the magneto resistive elements MTJ3 and MTJ4 are also connected in parallel. Further, the sub-cells SC1 and SC2 are connected in series between the write/read bit line BLW/R and the ground.",
				"title": "Non-volatile memory device",
				"country": "United States",
				"url": "http://www.google.fr/patents?id=Nh17AAAAEBAJ",
				"libraryCatalog": "Google Patents",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents?id=PGk-AAAAEBAJ&printsec=abstract#v=onepage&q&f=false",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "O'Dean P.",
						"lastName": "Judd",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"patentNumber": "4390992",
				"filingDate": "Jul 17, 1981",
				"date": "Jun 28, 1983",
				"assignee": "The United States of America as represented by the United States Department of Energy",
				"extra": "U.S. Classification: 372/70; 372/78\nInternational Classification: H01S  3091",
				"abstractNote": "A device and method for optically pumping a gaseous laser using blackbody radiation produced by a plasma channel which is formed from an electrical discharge between two electrodes spaced at opposite longitudinal ends of the laser. A preionization device which can comprise a laser or electron beam accelerator produces a preionization beam which is sufficient to cause an electrical discharge between the electrodes to initiate the plasma channel along the preionization path. The optical pumping energy is supplied by a high voltage power supply rather than by the preionization beam. High output optical intensities are produced by the laser due to the high temperature blackbody radiation produced by the plasma channel, in the same manner as an exploding wire type laser. However, unlike the exploding wire type laser, the disclosed invention can be operated in a repetitive manner by utilizing a repetitive pulsed preionization device.",
				"title": "Plasma channel optical pumping device and method",
				"country": "United States",
				"url": "http://www.google.com/patents?id=PGk-AAAAEBAJ",
				"libraryCatalog": "Google Patents",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"defer": true,
		"url": "http://www.google.fr/#q=ordinateur&hl=fr&prmd=imvns&source=lnms&tbm=pts&sa=X&ei=oJJfUJKgBOiU2gWqwIHYCg&ved=0CBIQ_AUoBQ&tbo=1&prmdo=1&bav=on.2,or.r_gc.r_pw.r_qf.&fp=ec5bd0c9391b4cc0&biw=1024&bih=589",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents/EP1808414A1?cl=en&dq=water&hl=en&sa=X&ei=fLS-UL-FIcTY2gXcg4CABw&ved=0CDcQ6AEwAQ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Michel",
						"lastName": "Billon",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"patentNumber": "EP1808414 A1",
				"date": "Jul 18, 2007",
				"filingDate": "Jan 16, 2006",
				"assignee": "Billon, Michel",
				"extra": "International Classification: C02F1/00\nU.S. Classification: E03B 1/04B2; E03D 5/00B1; E03B 1/04; E03D 5/00B",
				"title": "Device for recycling sanitary water",
				"abstractNote": "The installation for recycling used water originating from sanitary equipment and re-use of water for rinsing a water closet bowl, comprises a control system having an electronic terminal with a micro controller, and an additional drain to pour an overflow of a tank directly in an evacuation pipe of the water closet bowl. The water closet bowl is equipped with a flush water saver system, which surmounts the bowl. The saver system comprises tank (3) with a water reserve, and a water-flushing device placed in the tank to supply the flush water to the water closet bowl. The installation for recycling used water originating from sanitary equipment and re-use of water for rinsing a water closet bowl, comprises a control system having an electronic terminal with a micro controller, and an additional drain to pour an overflow of a tank directly in an evacuation pipe of the water closet bowl. The water closet bowl is equipped with a flush water saver system, which surmounts the bowl. The saver system comprises tank (3) with a water reserve, and a water-flushing device placed in the tank to supply the flush water to the water closet bowl, water supply pipes, a filter and a raising pump are arranged in one of the pipes, a water level detector to control the water reserve level contained in the tank, and a flapper valve to control the arrival of running water. The flapper valve is normally closed and temporarily opened when quantity of water contained in the tank is lower than a predetermined quantity detected by the detector. The water-flushing device comprises a drain valve (25A) with a vertical actuation inside a flow regulation tube, which extends on all the height of the tank and communicates with the rest of the tank by openings in lateral surface of the tube. The drain valve is operated automatically by a motor reducer, which is connected to the valve by a rod and a chain. The drain valve is equipped with a cam and limit switch. The level detector comprises a probe connected to the flapper valve. One of the water supply pipes comprises a flow regulator in which the pipe is bent so as to present an outlet opening in the bottom of the tank. The sanitary equipment generates used water comprises bathtub, shower and/or washbasin. The capacity of the tank is higher than 150 liters. The used water path is traversed between the sanitary equipment and the tank. The filter is placed in an upstream of the pump. The filter comprises a basket filter for a coarse filtration, a float sensor and reed contact, and an outlet towards the overflow discharge. The basket filter contains a solid preference product for the used water treatment, which dissolves gradually during draining by sanitary equipment. The raising pump is equipped with a plunger of automatic startup when water is reached a predetermined level, a non-return valve, and a venting device. The control system comprises a device to regulate/modify the volume of water supplied by the actuation of the flushing water, and a device to- control the flow of the water in the tank, and check and display the electronic installation, the pump and the filter. The terminal comprises display board e.g. liquid crystals, which allows message display. The control system is programmed to operate the actuator periodically in the drain valve. Another water supply pipe in the tank is connected by an upstream of the flapper valve with a rainwater collection device. The water closet bowl is connected to a forced ventilation device.",
				"country": "European Union",
				"libraryCatalog": "Google Patents"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents/EP0011951A1?dq=water&ei=fLS-UL-FIcTY2gXcg4CABw&cl=en",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Joseph S.",
						"lastName": "Racciato",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"patentNumber": "EP0011951 A1",
				"date": "Jun 11, 1980",
				"filingDate": "Nov 6, 1979",
				"assignee": "Merck & Co., Inc.",
				"extra": "International Classification: D06M15/01; C08L5/00; C08B37/00\nU.S. Classification: D06M 15/01; C08B 37/00P6",
				"title": "Cold-water soluble tamarind gum, process for its preparation and its application in sizing textile warp",
				"abstractNote": "A novel composition of crude tamarind kernel powder (TKP) is disclosed. The novel composition results from a process which makes TKP soluble in cold water; this process is not dependent on purification of TKP, but involves dissolving it in hot water and evaporating the resulting solution. The novel TKP composition has utility in textile, paper, and oilfield applications.",
				"country": "European Union",
				"libraryCatalog": "Google Patents"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents/US4748058",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Jr Chester L.",
						"lastName": "Craig",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"patentNumber": "US4748058 A",
				"date": "May 31, 1988",
				"filingDate": "Feb 10, 1987",
				"assignee": "Craig, Jr.; Chester L.",
				"extra": "International Classification: A47G33/00; A47G33/06\nU.S. Classification: A47G 33/06",
				"title": "Artificial tree",
				"abstractNote": "An artificial tree assembly, and a tree constructed therefrom, are provided. The assembly comprises a collapsible three-piece pole; a base member formed by the bottom of a box for storing the tree assembly and including a pole support member secured thereto for supporting the pole; and a plurality of limb sections and interconnecting garlands. The limb-sections each comprise a central ring portion and a plurality of limb members extending radially outwardly from the central ring portions. The ring portions of the limb sections are stacked, when not in use, on the pole support member and are disposed, in use, along the length of pole in spaced relationship therealong. The garlands interconnect the limb portions so that as the ring portions are lifted, from the top, from the stacked positions thereof on the pole support member and slid along the pole, the garlands between adjacent limb section are tensioned, in turn, and thus serve to lift the next adjacent limb section until the tree is fully erected.",
				"country": "United States",
				"libraryCatalog": "Google Patents"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.google.com/patents/US5979603?dq=tree&hl=en&sa=X&ei=ILS-UOOfLYXu2QXxyYC4Dw&ved=0CDoQ6AEwAQ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "Ronald R.",
						"lastName": "Woller",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Patents PDF",
						"mimeType": "application/pdf"
					}
				],
				"patentNumber": "US5979603 A",
				"date": "Nov 9, 1999",
				"filingDate": "Jan 6, 1995",
				"assignee": "Summit Specialties, Inc.",
				"extra": "International Classification: A01M31/00; A45F3/00; A45F3/26; A01M31/02\nU.S. Classification: A45F 3/26; A01M 31/02",
				"title": "Portable tree stand having fiber composite platform",
				"abstractNote": "A climbing device for a tree or other vertical columnar member having a platform fashioned from fiber-reinforced composite material. The platform is a one-piece structure having a peripheral skin with bi-directionally oriented reinforcing fibers and longitudinally extending reinforcing fibers. The back bar is also fashioned from fiber-reinforced composite material having a peripheral skin with bi-directionally oriented reinforcing fibers and longitudinally extending reinforcing fibers. Fiber-reinforced members include a foam core for shape retention. The manufacturing process permits use of T-shaped joints in fiber-reinforced structures.",
				"country": "United States",
				"libraryCatalog": "Google Patents"
			}
		]
	}
]
/** END TEST CASES **/