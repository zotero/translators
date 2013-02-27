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
	"lastUpdated": "2013-02-26 16:14:33"
}

function detectWeb(doc, url) {
	if(url.indexOf("jsp?N") != -1) {
		return "multiple";
	} else if (url.indexOf("jsp?R=") != -1) {
		
		if (url.indexOf("N%3D0") != -1) {
			return "conferencePaper"
			
		} else if (url.indexOf("N%3D4294967061") != -1) {
			return "report"
		
		} else if (url.indexOf("N%3D4294937145") != -1) {
			return "journalArticle";
		
		} else if (url.indexOf("N%3D4294908218") != -1 || url.indexOf("N%3D4294374694") != -1 || url.indexOf("N%3D4294777085") != -1) {
			return "thesis"
			
		} else {
			return null;
		}
	} else {
		return null;
	}
}

// For some reason Zotero cleanAuthor is not
// properly handling author name in the format
// last, first. So here's a quick function to
// deal with it
function formatAuthor(authorName) {
	if (authorName.match(", ")) {
		var splitName = authorName.split(", ");
		return splitName[1] + " " + splitName[0];
	} else {
		return authorName;
	}
	
}

function scrape(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == "x" ) return namespace; else return null;
	} : null;
	
	// Get the item type
	if (detectWeb(doc,url) == "conferencePaper") {
		var newItem = new Zotero.Item("conferencePaper");
	} else if (detectWeb(doc, url) == "report") {
		var newItem = new Zotero.Item("report");
	} else if (detectWeb(doc, url) == "journalArticle") {
		var newItem = new Zotero.Item("journalArticle");
	} else if (detectWeb(doc, url) == "thesis") {
		var newItem = new Zotero.Item("thesis");
	}
	
	// Get the url
	newItem.url = doc.location.href;
	newItem.title = "No title found";
	
	// Build an array of the items containing the bibliographic data
	var items = new Object();
	var tagsContent = new Array();
	var headers;
	var content;
	var headerXPath = '//table[@id="doctable"]/tbody/tr/td[1]';
	var contentXPath = '//table[@id="doctable"]/tbody/tr/td[2]';
	var headerXPathObject = doc.evaluate(headerXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	var contentXPathObject = doc.evaluate(contentXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	while (headers = headerXPathObject.iterateNext()) {
		content = contentXPathObject.iterateNext().textContent.replace(/^\s*|\s*$/g, '');
		items[headers.textContent]=content;
	}

	// Format and save author field
	if (items["Author:"]) {
		var author = items["Author:"];

		// Handle multiple authors
		if (author.match("; ")) {
			var authors = author.split("; ");
			for (var i in authors) {
				var newName = formatAuthor(authors[i]);
				newItem.creators.push(Zotero.Utilities.cleanAuthor(newName, "author"));
			}
		} else {
			var newName = formatAuthor(author);
			newItem.creators.push(Zotero.Utilities.cleanAuthor(newName, "author"));
		}	
	}
	
	// Save tags
	if (items["Subject Terms:"]) {
		var tags = items["Subject Terms:"].split("; ");
		for (var i = 0; i < tags.length; i++) {
			newItem.tags[i] = tags[i];
		}
	}
	
	// Save the date
	newItem.date = items["Publication Date:"];
	
	// Save the place / conference name
	if (newItem.itemType == "conferencePaper") {
		if (items["Meeting Information:"].match("; ")) {
			var confNameLocation = items["Meeting Information:"].split("; ");
			
			// Save the conference name
			newItem.conferenceName = confNameLocation[0];
			
			// Save the location
			newItem.place = confNameLocation[2] + ", " + confNameLocation[3];
		}
	}
	
	// Save the title
	newItem.title = items["Title:"];
	
	// Save the abstract
	newItem.abstractNote = items["Abstract:"];
	
	newItem.complete();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == "x" ) return namespace; else return null;
	} : null;
	
	// Local variables
	var nextTitle;
	var articles = new Object();

	// Handle multiple entries ie search results
	if (detectWeb(doc,url) == "multiple") {
		var titles = doc.evaluate('//table[@class="recordTable"]/tbody/tr/td/a[1]',doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		// Loop through each title and grab the link to the document page
		// store the link in articles
		while (nextTitle = titles.iterateNext()){
			articles[nextTitle.href] = nextTitle.textContent;
		}
		
		// Get pages the user wants to save
		Zotero.selectItems(articles, function(articles) {
			// If the user doesn't select any, quit
			if(!articles) return true;
			
			// Build an array with the user selected items
			var urls = [];
			for (var article in articles) urls.push(article);
			
			// Call scrape for each article selected
			Zotero.Utilities.processDocuments(urls, scrape, function() {Zotero.done();});
			Zotero.wait();
		});
	} else {
		scrape(doc, url)
	}
	
	Zotero.wait();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?N=0&Ntk=All&Ntt=jegley&Ntx=mode%20matchallpartial%20",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20130002630&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D0%26Ntt%3Djegley",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Dawn C.",
						"lastName": "Jegley",
						"creatorType": "author"
					},
					{
						"firstName": "Alex",
						"lastName": "Velicki",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"AIRCRAFT DESIGN",
					"AIRCRAFT STRUCTURES",
					"COMPOSITE MATERIALS",
					"COMPOSITE STRUCTURES",
					"DRAG",
					"LIFT DRAG RATIO",
					"NOISE INTENSITY",
					"NOISE POLLUTION",
					"NOISE REDUCTION",
					"SHAPES",
					"TRANSPORT AIRCRAFT",
					"WINGS"
				],
				"seeAlso": [],
				"attachments": [],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20130002630&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D0%26Ntt%3Djegley",
				"title": "Status of Advanced Stitched Unitized Composite Aircraft Structures",
				"date": "January 07, 2013",
				"conferenceName": "51st AIAA Aerospace Sciences Meeting",
				"place": "Grapevine, TX, United States",
				"abstractNote": "NASA has created the Environmentally Responsible Aviation (ERA) Project to explore and document the feasibility, benefits and technical risk of advanced vehicle configurations and enabling technologies that will reduce the impact of aviation on the environment. A critical aspect of this pursuit is the development of a lighter, more robust airframe that will enable the introduction of unconventional aircraft configurations that have higher lift-to-drag ratios, reduced drag, and lower community noise levels. The primary structural concept being developed under the ERA project in the Airframe Technology element is the Pultruded Rod Stitched Efficient Unitized Structure (PRSEUS) concept. This paper describes how researchers at NASA and The Boeing Company are working together to develop fundamental PRSEUS technologies that could someday be implemented on a transport size aircraft with high aspect ratio wings or unconventional shapes such as a hybrid wing body airplane design.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=20110007017&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D4294967061%26Ntt%3Djegley",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Dawn C.",
						"lastName": "Jegley",
						"creatorType": "author"
					},
					{
						"firstName": "K. Chauncey",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "James E.",
						"lastName": "Phelps",
						"creatorType": "author"
					},
					{
						"firstName": "Martin J.",
						"lastName": "McKenney",
						"creatorType": "author"
					},
					{
						"firstName": "Leonard",
						"lastName": "Oremont",
						"creatorType": "author"
					},
					{
						"firstName": "Ansley",
						"lastName": "Barnard",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"COMPOSITE STRUCTURES",
					"EPOXY MATRIX COMPOSITES",
					"FABRICATION",
					"FAILURE",
					"FITTINGS",
					"LOADS (FORCES)",
					"PREDICTION ANALYSIS TECHNIQUES",
					"SPACECRAFT STRUCTURES",
					"STRUTS"
				],
				"seeAlso": [],
				"attachments": [],
				"url": "http://ntrs.nasa.gov/search.jsp?R=20110007017&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D4294967061%26Ntt%3Djegley",
				"title": "Evaluation of Long Composite Struts",
				"date": "February 2011",
				"abstractNote": "Carbon-epoxy tapered struts are structurally efficient and offer opportunities for weight savings on aircraft and spacecraft structures. Seven composite struts were designed, fabricated and experimentally evaluated through uniaxial loading. The design requirements, analytical predictions and experimental results are presented. Struts with a tapered composite body and corrugated titanium end fittings successfully supported their design ultimate loads with no evidence of failure.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=19930054656&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D4294937145%26Ntt%3Djegley",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "D.",
						"lastName": "Jegley",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"AXIAL STRESS",
					"COMPRESSION LOADS",
					"FAILURE ANALYSIS",
					"FRACTURE MECHANICS",
					"GRAPHITE",
					"IMPACT DAMAGE",
					"MOIRE INTERFEROMETRY",
					"PANELS",
					"RESIN MATRIX COMPOSITES",
					"SANDWICH STRUCTURES",
					"THERMOPLASTIC RESINS",
					"X RAY ANALYSIS"
				],
				"seeAlso": [],
				"attachments": [],
				"url": "http://ntrs.nasa.gov/search.jsp?R=19930054656&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D4294937145%26Ntt%3Djegley",
				"title": "Impact-damaged graphite-thermoplastic trapezoidal-corrugation sandwich and semi-sandwich panels",
				"date": "1993",
				"abstractNote": "The results of a study of the effects of impact damage on compression-loaded trapezoidal-corrugation sandwich and semi-sandwich graphite-thermoplastic panels are presented. Sandwich panels with two identical face sheets and a trapezoidal corrugated core between them, and semi-sandwich panels with a corrugation attached to a single skin are considered in this study. Panels were designed, fabricated and tested. The panels were made using the manufacturing process of thermoforming, a less-commonly used technique for fabricating composite parts. Experimental results for unimpacted control panels and panels subjected to impact damage prior to loading are presented. Little work can be found in the literature about these configurations of thermoformed panels.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ntrs.nasa.gov/search.jsp?R=19880004005&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D4294777085%26Ntt%3Djegley",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "Dawn C.",
						"lastName": "Jegley",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"ANISOTROPY",
					"BUCKLING",
					"CYLINDRICAL BODIES",
					"DEFORMATION",
					"LAMINATES",
					"LOADS (FORCES)",
					"PLY ORIENTATION",
					"PREDICTION ANALYSIS TECHNIQUES",
					"SHEAR"
				],
				"seeAlso": [],
				"attachments": [],
				"url": "http://ntrs.nasa.gov/search.jsp?R=19880004005&hterms=jegley&qs=Ntx%3Dmode%2520matchallpartial%2520%26Ntk%3DAll%26N%3D4294777085%26Ntt%3Djegley",
				"title": "An analytical study of the effects of transverse shear deformation and anisotropy on buckling loads of laminated cylinders",
				"date": "Oct 1, 1987",
				"abstractNote": "Buckling loads of thick-walled orthotropic and anisotropic simply supported circular cylinders are predicted using a higher-order transverse-shear deformation theory. A comparison of buckling loads predicted by the conventional first-order transverse-shear deformation theory and the higher-order theory show that the additional allowance for transverse shear deformation has a negligible effect on the predicted buckling loads of medium-thick metallic isotropic cylinders. However, the higher-order theory predicts buckling loads which are significantly lower than those predicted by the first-order transverse-shear deformation theory for certain short, thick-walled cylinders which have low through-the-thickness shear moduli. A parametric study of the effects of ply orientation on the buckling load of axially compressed cylinders indicates that laminates containing 45 degree plies are most sensitive to transverse-shear deformation effects. Interaction curves for buckling loads of cylinders subjected to axial compressive and external pressure loadings indicate that buckling loads due to external pressure loadings are as sensitive to transverse-shear deformation effects as buckling loads due to axial compressive loadings. The effects of anisotropy are important over a much wider range of cylinder geometries than the effects of transverse shear deformation.",
				"libraryCatalog": "NASA NTRS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/