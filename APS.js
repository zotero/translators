{
	"translatorID": "2c310a37-a4dd-48d2-82c9-bd29c53c1c76",
	"label": "APS",
	"creator": "Aurimas Vinckevicius",
	"target": "^https?://journals\\.aps\\.org",
	"minVersion": "3.0.12",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-03-14 16:13:43"
}

function getSearchResults(doc) {
	var articles = doc.getElementsByClassName('article-result');
	var results = [];
	for(var i=0; i<articles.length; i++) {
		if(articles[i].getElementsByClassName('row').length) {
			results.push(articles[i]);
		}
	}
	
	return results;
}

function detectWeb(doc, url) {
	if(getSearchResults(doc).length){
		return "multiple";
	}
	
	var title = doc.getElementById('title');
	if(title && ZU.xpath(title, './/a[@data-reveal-id="export-article"]').length) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == 'multiple') {
		var results = getSearchResults(doc);
		var items = {};
		for(var i=0; i<results.length; i++) {
			var title = ZU.xpath(results[i], './/h5[@class="title"]/a')[0];
			items[title.href] = cleanMath(title.textContent);
		}
		
		Z.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			
			var urls = [];
			for(var i in selectedItems) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

// Extension to mimeType mapping
var suppTypeMap = {
	'pdf': 'application/pdf',
	'zip': 'application/zip',
	'doc': 'application/msword',
	'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'xls': 'application/vnd.ms-excel',
	'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'mov': 'video/quicktime'
};

var dontDownload = [
	'application/zip',
	'video/quicktime'
];

function scrape(doc, url) {
	url = url.replace(/[?#].*/, '').replace(/\/abstract\//, '/{REPLACE}/');
	// fetch RIS
	var risUrl = url.replace('{REPLACE}', 'export')
			   + '?type=ris&download=true';
	ZU.doGet(risUrl, function(text) {
		text = text.replace(/^ID\s+-\s+/mg, 'DO  - ');
		var trans = Zotero.loadTranslator('import');
		trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); //RIS
		trans.setString(text);
		trans.setHandler('itemDone', function(obj, item) {
			// scrape abstract from page
			item.abstractNote = ZU.trimInternal(cleanMath(
				ZU.xpathText(doc, '//section[contains(@class,"abstract")]/div[@class="content"]/p[1]')
			));
			
			// attach PDF
			if(ZU.xpath(doc, '//div[@class="article-nav-actions"]/a[contains(text(), "PDF")]').length) {
				item.attachments.push({
					title: 'Full Text PDF',
					url: url.replace('{REPLACE}', 'pdf'),
					mimeType: 'application/pdf'
				});
			}
			
			item.attachments.push({
				title: "APS Snapshot",
				document: doc
			});
			
			if(Z.getHiddenPref && Z.getHiddenPref('attachSupplementary')) {
				ZU.processDocuments(url.replace('{REPLACE}', 'supplemental'), function(doc) {
					try {
						var asLink = Z.getHiddenPref('supplementaryAsLink');
						var suppFiles = doc.getElementsByClassName('supplemental-file');
						for(var i=0; i<suppFiles.length; i++) {
							var link = suppFiles[i].getElementsByTagName('a')[0];
							if (!link || !link.href) continue;
							var title = link.getAttribute('data-id') || 'Supplementary Data';
							var type = suppTypeMap[link.href.split('.').pop()];
							if(asLink || dontDownload.indexOf(type) != -1) {
								item.attachments.push({
									title: title,
									url: link.href,
									mimeType: type || 'text/html',
									snapshot: false
								});
							} else {
								item.attachments.push({
									title: title,
									url: link.href,
									mimeType: type
								});
							}
						}
					} catch (e) {
						Z.debug('Could not attach supplemental data');
						Z.debug(e);
					}
				}, function() { item.complete() });
			} else {
				item.complete();
			}
		});
		trans.translate();
	});
}

function cleanMath(str) {
	//math tags appear to have duplicate content and are somehow left in even after textContent
	return str.replace(/<(math|mi)[^<>]*>.*?<\/\1>/g, '');
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journals.aps.org/prd/abstract/10.1103/PhysRevD.84.077701",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hints for a nonstandard Higgs boson from the LHC",
				"creators": [
					{
						"lastName": "Raidal",
						"firstName": "Martti",
						"creatorType": "author"
					},
					{
						"lastName": "Strumia",
						"firstName": "Alessandro",
						"creatorType": "author"
					}
				],
				"date": "October 21, 2011",
				"DOI": "10.1103/PhysRevD.84.077701",
				"abstractNote": "We reconsider Higgs boson invisible decays into Dark Matter in the light of recent Higgs searches at the LHC. Present hints in the Compact Muon Solenoid and ATLAS data favor a nonstandard Higgs boson with approximately 50% invisible branching ratio, and mass around 143 GeV. This situation can be realized within the simplest thermal scalar singlet Dark Matter model, predicting a Dark Matter mass around 50 GeV and direct detection cross section just below present bound. The present runs of the Xenon100 and LHC experiments can test this possibility.",
				"issue": "7",
				"journalAbbreviation": "Phys. Rev. D",
				"libraryCatalog": "APS",
				"pages": "077701",
				"publicationTitle": "Physical Review D",
				"url": "http://link.aps.org/doi/10.1103/PhysRevD.84.077701",
				"volume": "84",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "APS Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://journals.aps.org/prd/issues/84/7",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journals.aps.org/search?field=all&q=test&sort=recent&date=&start_date=&end_date=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journals.aps.org/prl/abstract/10.1103/PhysRevLett.114.098105",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Magnetic Flattening of Stem-Cell Spheroids Indicates a Size-Dependent Elastocapillary Transition",
				"creators": [
					{
						"lastName": "Mazuel",
						"firstName": "Francois",
						"creatorType": "author"
					},
					{
						"lastName": "Reffay",
						"firstName": "Myriam",
						"creatorType": "author"
					},
					{
						"lastName": "Du",
						"firstName": "Vicard",
						"creatorType": "author"
					},
					{
						"lastName": "Bacri",
						"firstName": "Jean-Claude",
						"creatorType": "author"
					},
					{
						"lastName": "Rieu",
						"firstName": "Jean-Paul",
						"creatorType": "author"
					},
					{
						"lastName": "Wilhelm",
						"firstName": "Claire",
						"creatorType": "author"
					}
				],
				"date": "March 4, 2015",
				"DOI": "10.1103/PhysRevLett.114.098105",
				"abstractNote": "Cellular aggregates (spheroids) are widely used in biophysics and tissue engineering as model systems for biological tissues. In this Letter we propose novel methods for molding stem-cell spheroids, deforming them, and measuring their interfacial and elastic properties with a single method based on cell tagging with magnetic nanoparticles and application of a magnetic field gradient. Magnetic molding yields spheroids of unprecedented sizes (up to a few mm in diameter) and preserves tissue integrity. On subjecting these spheroids to magnetic flattening (over 150g), we observed a size-dependent elastocapillary transition with two modes of deformation: liquid-drop-like behavior for small spheroids, and elastic-sphere-like behavior for larger spheroids, followed by relaxation to a liquidlike drop.",
				"issue": "9",
				"journalAbbreviation": "Phys. Rev. Lett.",
				"libraryCatalog": "APS",
				"pages": "098105",
				"publicationTitle": "Physical Review Letters",
				"url": "http://link.aps.org/doi/10.1103/PhysRevLett.114.098105",
				"volume": "114",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "APS Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/