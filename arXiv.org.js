{
	"translatorID": "ecddda2e-4fc6-4aea-9f17-ef3b56d7377a",
	"label": "arXiv.org",
	"creator": "Sean Takats and Michael Berkowitz",
	"target": "^https?://(?:([^\\.]+\\.))?(?:(arxiv\\.org|xxx.lanl.gov)/(?:find/\\w|list/\\w|abs/)|eprintweb.org/S/(?:search|archive|article)(?!.*refs$)(?!.*cited$))",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2013-11-18 13:33:05"
}

function detectWeb(doc, url) {
	var searchRe = new RegExp('^http://(?:([^\.]+\.))?(?:(arxiv\.org|xxx\.lanl\.gov)/(?:find|list)|eprintweb.org/S/(?:archive|search$))');
	
	if(searchRe.test(url)) {
		return "multiple";
	} else {
		return "journalArticle";
	}
}

function getPDF(articleID) {
	return {url:"http://www.arxiv.org/pdf/" + articleID + ".pdf",
			mimeType:"application/pdf", title:articleID + " PDF"};
}

function doWeb(doc, url) {
	// eprintweb appears to be defunct as of mid-2011. leaving relevant code here for now
	var eprintMultRe = new RegExp('^http://(?:www\.)?eprintweb.org/S/(?:search|archive)');
	var eprintMultM = eprintMultRe.exec(url);
	
	var eprintSingRe = new RegExp('^http://(?:www\.)?eprintweb.org/S/(?:article|search/[0-9]+/A[0-9]+)');
	var eprintSingM = eprintSingRe.exec(url);

	if (eprintMultM) {
		var elmtsXPath = '//table/tbody/tr/td[@class="txt"]/a[text()="Abstract"]/../b';
		var titlesXPath = '//table/tbody/tr/td[@class="lti"]';
		var titleNode = './text()';
	} else {
		var elmtsXPath = '//div[@id="dlpage"]/dl/dt/span[@class="list-identifier"]/a[1]';
		var titlesXPath = '//div[@id="dlpage"]/dl/dd/div[@class="meta"]/div[@class="list-title"]';
	}

	var elmts = doc.evaluate(elmtsXPath, doc, null, XPathResult.ANY_TYPE, null);
	var titles = doc.evaluate(titlesXPath, doc, null, XPathResult.ANY_TYPE, null);

	var newURIs = new Array();
	var elmt = elmts.iterateNext();
	var title = titles.iterateNext();
	if (elmt && titles) {
		var availableItems = new Object();
		var arXivCats = new Array();
		var arXivIDs = new Array();
		var i=0;
		if (eprintMultM){
			do {
				var newID = doc.evaluate('./text()', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				newID = newID.replace(/arXiv:/, "");
				newID = newID.replace(/\//g, "%2F");
				newID = newID.replace(/v\d*/, ""); //remove version number  
				availableItems[i] = doc.evaluate(titleNode, title, null, XPathResult.ANY_TYPE, null).iterateNext().textContent; 
				arXivIDs[i] = newID;
				i++;
			} while ((elmt = elmts.iterateNext()) && (title = titles.iterateNext()));
		}
		else{
			do {
				var newID= elmt.textContent;
				newID = newID.replace(/arXiv:/, "");
				newID = newID.replace(/\//g, "%2F");
				newID = newID.replace(/v\d*/, ""); //remove version number 
				availableItems[i] = ZU.trimInternal(title.textContent.replace(/^\s*Title:\s+/, "")); 
				arXivIDs[i] = newID;
				i++;
			} while ((elmt = elmts.iterateNext()) && (title = titles.iterateNext()));
		}
		var items = Zotero.selectItems(availableItems, function(items) {
			if(!items) {
				return true;
			}
			for(var i in items) {
				newURIs.push("http://export.arxiv.org/oai2?verb=GetRecord&identifier=oai%3AarXiv.org%3A" + arXivIDs[i] + "&metadataPrefix=oai_dc");
			}
			Zotero.Utilities.HTTP.doGet(newURIs, parseXML);
		});
	}
	else {
		if (eprintSingM){
			var titleID = doc.evaluate('//td[@class="ti"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			var arXivID = doc.evaluate('//table/tbody/tr[4]/td/table/tbody/tr/td[1]/table/tbody/tr[1]/td[@class="txt"]/b', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			arXivID = arXivID.substring(0, arXivID.indexOf(" "));
			arXivID = arXivID.replace(/arXiv:/, "");
			arXivID = arXivID.replace(/\//g, "%2F");
		} else {
			var arXivID = doc.evaluate('//title', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			var titleRe = /\[([^\]]*)]/;
			var m = titleRe.exec(arXivID);
			arXivID = m[1];
			arXivID = arXivID.replace(/\//g, "%2F");
		}
		arXivID = arXivID.replace(/v\d*/, ""); //remove version number
		
		newURIs.push("http://export.arxiv.org/oai2?verb=GetRecord&identifier=oai%3AarXiv.org%3A" + arXivID + "&metadataPrefix=oai_dc");
 		Zotero.Utilities.HTTP.doGet(newURIs, parseXML);
	}
}

function parseXML(text) {
	//Z.debug(text)
	var newItem = new Zotero.Item("journalArticle");
	//	remove header
	text = text.replace(/<!DOCTYPE[^>]*>/, "").replace(/<\?xml[^>]*\?>/, "");
	//	fix non-compliant XML tags (colons)
	text = text.replace(/<dc:/g, "<dc_").replace(/<\/dc:/g, "</dc_");
	text = text.replace(/<oai_dc:dc/g, "<oai_dc_dc").replace(/<\/oai_dc:dc/g, "</oai_dc_dc");
	text = text.replace(/<OAI-PMH[^>]*>/, "").replace(/<\/OAI-PMH[^>]*>/, "");
	text = "<zotero>" + text + "</zotero>";
	
	var xml = (new DOMParser()).parseFromString(text, "text/xml");

	newItem.title = getXPathNodeTrimmed(xml, "dc_title");
	getCreatorNodes(xml, "dc_creator", newItem, "author");		
	newItem.date = getXPathNodeTrimmed(xml, "dc_date");
		
	var descriptions = ZU.xpath(xml, "//GetRecord/record/metadata/oai_dc_dc/dc_description");
	
	//Put the first description into abstract, all other into notes.
	if (descriptions.length>0){
		newItem.abstractNote = ZU.trimInternal(descriptions[0].textContent);
		for(var j=1; j<descriptions.length; j++) {
			var noteStr = ZU.trimInternal(descriptions[j].textContent);
			newItem.notes.push({note:noteStr});		
		}	
	}	
	var subjects = ZU.xpath(xml, "//GetRecord/record/metadata/oai_dc_dc/dc_subject");
	for(var j=0; j<subjects.length; j++) {
		var subject = ZU.trimInternal(subjects[j].textContent);
		newItem.tags.push(subject);		
	}	
					
	var identifiers = ZU.xpath(xml, "//GetRecord/record/metadata/oai_dc_dc/dc_identifier");
	for(var j=0; j<identifiers.length; j++) {
		var identifier = ZU.trimInternal(identifiers[j].textContent);
		if (identifier.substr(0, 4) == "doi:") {
			newItem.DOI = identifier.substr(4);
		}
		else if (identifier.substr(0, 7) == "http://") {
			newItem.url = identifier;
		}
		else {
			newItem.extra = identifier;
		}
	}	

	var articleID = ZU.xpath(xml, "//GetRecord/record/header/identifier");
	articleID = ZU.trimInternal(articleID[0].textContent);
	articleID = articleID.substr(14);
	articleField = ZU.xpathText(xml, '//GetRecord/record/header/setSpec');
	if (articleField) articleField = " [" + articleField.replace(/^.+?:/, "") + "]";
	if (articleID && articleID.indexOf("/")!=-1) newItem.publicationTitle = "arXiv:" + articleID;
	else newItem.publicationTitle = "arXiv:" + articleID + articleField;
	
//	TODO add "arXiv.org" to bib data?
	newItem.attachments.push({url:newItem.url, title:"arXiv.org Snapshot", mimeType:"text/html"});
	newItem.attachments.push(getPDF(articleID));
	//retrieve and supplement publication data for published articles via DOI
	if (newItem.DOI){
		var DOI = newItem.DOI
		var translate = Zotero.loadTranslator("search");
		translate.setTranslator("11645bd1-0420-45c1-badb-53fb41eeb753");
	
		var item = {"itemType":"journalArticle", "DOI":DOI};
		translate.setSearch(item);
		translate.setHandler("itemDone", function(obj, item) {
			//Z.debug(item)
			newItem.volume = item.volume
			newItem.issue = item.issue
			newItem.pages = item.pages
			newItem.date = item.date
			newItem.ISSN = item.ISSN
			if (item.publicationTitle){
				newItem.extra = newItem.publicationTitle;
				newItem.publicationTitle =  item.publicationTitle
			}
			newItem.date = item.date
		});
		translate.setHandler("done", function(translate){
			newItem.complete();
		});
		translate.setHandler("error", function() {});
		translate.translate();
	}
	else newItem.complete();
}


function getXPathNodeTrimmed(xml, name) {
	var node = ZU.xpath(xml, "//GetRecord/record/metadata/oai_dc_dc/"+name);
	var val = "";
	if(node.length){
		val = Zotero.Utilities.trimInternal(node[0].textContent);
	}
	return val;
}

function getCreatorNodes(xml, name, newItem, creatorType) {
	var nodes = ZU.xpath(xml, "//GetRecord/record/metadata/oai_dc_dc/"+name);
	for(var i=0; i<nodes.length; i++) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(nodes[i].textContent, creatorType, true));
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://arxiv.org/list/astro-ph/new",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://arxiv.org/abs/1107.4612",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "D. T.",
						"lastName": "O'Dea",
						"creatorType": "author"
					},
					{
						"firstName": "C. N.",
						"lastName": "Clark",
						"creatorType": "author"
					},
					{
						"firstName": "C. R.",
						"lastName": "Contaldi",
						"creatorType": "author"
					},
					{
						"firstName": "C. J.",
						"lastName": "MacTavish",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Comment: 7 pages, 4 figures"
					}
				],
				"tags": [
					"Astrophysics - Astrophysics of Galaxies",
					"Astrophysics - Cosmology and Nongalactic Astrophysics"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "arXiv.org Snapshot",
						"mimeType": "text/html"
					},
					{
						"mimeType": "application/pdf",
						"title": "1107.4612 PDF"
					}
				],
				"title": "A Model For Polarised Microwave Foreground Emission From Interstellar Dust",
				"date": "2012-01-11",
				"abstractNote": "The upcoming generation of cosmic microwave background (CMB) experiments face a major challenge in detecting the weak cosmic B-mode signature predicted as a product of primordial gravitational waves. To achieve the required sensitivity these experiments must have impressive control of systematic effects and detailed understanding of the foreground emission that will influence the signal. In this paper, we present templates of the intensity and polarisation of emission from one of the main Galactic foregrounds, interstellar dust. These are produced using a model which includes a 3D description of the Galactic magnetic field, examining both large and small scales. We also include in the model the details of the dust density, grain alignment and the intrinsic polarisation of the emission from an individual grain. We present here Stokes parameter template maps at 150GHz and provide an on-line repository (http://www.imperial.ac.uk/people/c.contaldi/fgpol) for these and additional maps at frequencies that will be targeted by upcoming experiments such as EBEX, Spider and SPTpol.",
				"url": "http://arxiv.org/abs/1107.4612",
				"extra": "arXiv:1107.4612 [astro-ph]",
				"DOI": "10.1111/j.1365-2966.2011.19851.x",
				"publicationTitle": "Monthly Notices of the Royal Astronomical Society",
				"volume": "419",
				"issue": "2",
				"pages": "1795-1803",
				"ISSN": "00358711",
				"libraryCatalog": "arXiv.org"
			}
		]
	},
	{
		"type": "web",
		"url": "http://arxiv.org/abs/astro-ph/0603274",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "A. C.",
						"lastName": "Carciofi",
						"creatorType": "author"
					},
					{
						"firstName": "A. S.",
						"lastName": "Miroshnichenko",
						"creatorType": "author"
					},
					{
						"firstName": "A. V.",
						"lastName": "Kusakin",
						"creatorType": "author"
					},
					{
						"firstName": "J. E.",
						"lastName": "Bjorkman",
						"creatorType": "author"
					},
					{
						"firstName": "K. S.",
						"lastName": "Bjorkman",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "Marang",
						"creatorType": "author"
					},
					{
						"firstName": "K. S.",
						"lastName": "Kuratov",
						"creatorType": "author"
					},
					{
						"firstName": "P. Garcí",
						"lastName": "a-Lario",
						"creatorType": "author"
					},
					{
						"firstName": "J. V. Perea",
						"lastName": "Calderón",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Fabregat",
						"creatorType": "author"
					},
					{
						"firstName": "A. M.",
						"lastName": "Magalhães",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Comment: 27 pages, 9 figures, submitted to ApJ"
					}
				],
				"tags": [
					"Astrophysics"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "arXiv.org Snapshot",
						"mimeType": "text/html"
					},
					{
						"mimeType": "application/pdf",
						"title": "astro-ph/0603274 PDF"
					}
				],
				"title": "Properties of the $\\delta$ Scorpii Circumstellar Disk from Continuum Modeling",
				"date": "12/2006",
				"abstractNote": "We present optical $WBVR$ and infrared $JHKL$ photometric observations of the Be binary system $\\delta$ Sco, obtained in 2000--2005, mid-infrared (10 and $18 \\mu$m) photometry and optical ($\\lambda\\lambda$ 3200--10500 \\AA) spectropolarimetry obtained in 2001. Our optical photometry confirms the results of much more frequent visual monitoring of $\\delta$ Sco. In 2005, we detected a significant decrease in the object's brightness, both in optical and near-infrared brightness, which is associated with a continuous rise in the hydrogen line strenghts. We discuss possible causes for this phenomenon, which is difficult to explain in view of current models of Be star disks. The 2001 spectral energy distribution and polarization are succesfully modeled with a three-dimensional non-LTE Monte Carlo code which produces a self-consistent determination of the hydrogen level populations, electron temperature, and gas density for hot star disks. Our disk model is hydrostatically supported in the vertical direction and radially controlled by viscosity. Such a disk model has, essentially, only two free parameters, viz., the equatorial mass loss rate and the disk outer radius. We find that the primary companion is surrounded by a small (7 $R_\\star$), geometrically-thin disk, which is highly non-isothermal and fully ionized. Our model requires an average equatorial mass loss rate of $1.5\\times 10^{-9} M_{\\sun}$ yr$^{-1}$.",
				"url": "http://arxiv.org/abs/astro-ph/0603274",
				"extra": "arXiv:astro-ph/0603274",
				"DOI": "10.1086/507935",
				"publicationTitle": "The Astrophysical Journal",
				"volume": "652",
				"issue": "2",
				"pages": "1617-1625",
				"ISSN": "0004-637X, 1538-4357",
				"libraryCatalog": "arXiv.org",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://arxiv.org/abs/1307.1469",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Peter W.",
						"lastName": "Sullivan",
						"creatorType": "author"
					},
					{
						"firstName": "Bryce",
						"lastName": "Croll",
						"creatorType": "author"
					},
					{
						"firstName": "Robert A.",
						"lastName": "Simcoe",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Comment: Accepted to PASP"
					}
				],
				"tags": [
					"Astrophysics - Instrumentation and Methods for Astrophysics",
					"Astrophysics - Earth and Planetary Astrophysics"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "arXiv.org Snapshot",
						"mimeType": "text/html"
					},
					{
						"mimeType": "application/pdf",
						"title": "1307.1469 PDF"
					}
				],
				"title": "Precision of a Low-Cost InGaAs Detector for Near Infrared Photometry",
				"date": "2013-07-04",
				"abstractNote": "We have designed, constructed, and tested an InGaAs near-infrared camera to explore whether low-cost detectors can make small (<1 m) telescopes capable of precise (<1 mmag) infrared photometry of relatively bright targets. The camera is constructed around the 640x512 pixel APS640C sensor built by FLIR Electro-Optical Components. We designed custom analog-to-digital electronics for maximum stability and minimum noise. The InGaAs dark current halves with every 7 deg C of cooling, and we reduce it to 840 e-/s/pixel (with a pixel-to-pixel variation of +/-200 e-/s/pixel) by cooling the array to -20 deg C. Beyond this point, glow from the readout dominates. The single-sample read noise of 149 e- is reduced to 54 e- through up-the-ramp sampling. Laboratory testing with a star field generated by a lenslet array shows that 2-star differential photometry is possible to a precision of 631 +/-205 ppm (0.68 mmag) hr^-0.5 at a flux of 2.4E4 e-/s. Employing three comparison stars and de-correlating reference signals further improves the precision to 483 +/-161 ppm (0.52 mmag) hr^-0.5. Photometric observations of HD80606 and HD80607 (J=7.7 and 7.8) in the Y band shows that differential photometry to a precision of 415 ppm (0.45 mmag) hr^-0.5 is achieved with an effective telescope aperture of 0.25 m. Next-generation InGaAs detectors should indeed enable Poisson-limited photometry of brighter dwarfs with particular advantage for late-M and L types. In addition, one might acquire near-infrared photometry simultaneously with optical photometry or radial velocity measurements to maximize the return of exoplanet searches with small telescopes.",
				"url": "http://arxiv.org/abs/1307.1469",
				"publicationTitle": "arXiv:1307.1469 [astro-ph]",
				"libraryCatalog": "arXiv.org",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/