{
	"translatorID": "d75381ee-7d8d-4a3b-a595-b9190a06f43f",
	"label": "Scitation",
	"creator": "Aurimas Vinckevicius",
	"target": "/resource/\\d+/|/servlet/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-14 17:16:27"
}

function getId(doc) {
	var onclick = ZU.xpathText(doc,
		'//a[./img[substring(@src,string-length(@src)-12)="/bicon-dl.gif"]]/@onclick')
		|| ZU.xpathText(doc, '(//a[./img[substring(@src,string-length(@src)-14)=\
				"/icon_email.gif"]])[1]/@onclick');
	if(onclick) {
		var m = onclick.match(/'Download',\s*'([^']+)'/);
		if(m) return m[1];
	}

	//e.g. asmedl.org has this value on the add to cart form
	// I'm not sure where we can find this if the user is logged in
	return ZU.xpathText(doc, '//input[@name="SelectCheck"]/@value');
}

function detectWeb(doc, url) {

	if(!ZU.xpath(doc, '/html/head/script[contains(@src,"/js/scitation.utilities.js")]').length &&
		!ZU.xpath(doc, '//script[contains(@src, "/js/scitationGlobal.js")]').length) {
		return;
	}

	if(getId(doc)) {
		// Can't tell what it is unless we download the citation.
		// Pretend it's a journal article.
		// This is not compatible with testing
		return 'journalArticle';
	}
}

function doWeb(doc, url) {
	var id = getId(doc);

	if(!id) return;

	var url = 'http://scitation.aip.org/getabs/servlet/GetCitation?'+
				'source=scitation&fn=open_bibtex2&SelectCheck=' + id;

	ZU.doGet(url, function(text) {
		// use BibTeX translator
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);

		translator.setHandler("itemDone", function(obj, item) {
			if(!item.abstractNote) {
				item.abstractNote = ZU.xpathText(doc,
					'//div[@class="abstract"]/div[@class="aip-paragraph"]',
					null, "\n");
				if(item.abstractNote) {
					item.rights = ZU.xpathText(doc, '//div[@class="abstract"]/p');
					if(item.rights) item.rights = ZU.trimInternal(item.rights);
				} else {
					var abs = ZU.xpathText(doc, '//div[@id="abstract"]');
					if(abs) {
						abs = abs.split('©');
						if(abs.length > 1) {
							item.rights = ZU.trimInternal(
											'©' + abs.splice(abs.length-1, 1));
						}
						item.abstractNote = ZU.trimInternal(abs.join('©'));
					}
				}
			}

			item.attachments = [
				{	title: 'Full Text PDF',
					url: 'http://scitation.aip.org/getpdf/servlet/GetPDFServlet?' +
						'filetype=pdf&id=' + id,
					mimeType: 'application/pdf' },

				{	title: 'Snapshot',
					document: doc }
			];

			item.complete();
		});

		translator.getTranslatorObject(function(obj) {
			obj.setKeywordSplitOnSpace(false);
			obj.setKeywordDelimRe(/;\s*/);

			obj.doImport();
		});
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://jpcrd.aip.org/resource/1/jpcrbu/v18/i4/p1537_s1?isAuthorized=no",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "A.",
						"lastName": "Saul",
						"creatorType": "author"
					},
					{
						"firstName": "W.",
						"lastName": "Wagner",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"EQUATIONS OF STATE; WATER; THERMODYNAMIC PROPERTIES; SPECIFIC HEAT; DATA COMPILATION; REVIEWS; MEDIUM TEMPERATURE; HIGH TEMPERATURE; VERY HIGH TEMPERATURE; SCALING LAWS; HIGH PRESSURE; VERY HIGH PRESSURE; JOULETHOMSON EFFECT"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "A Fundamental Equation for Water Covering the Range from the Melting Line to 1273 K at Pressures up to 25 000 MPa",
				"publisher": "NIST",
				"date": "1989",
				"publicationTitle": "Journal of Physical and Chemical Reference Data",
				"volume": "18",
				"issue": "4",
				"pages": "1537-1564",
				"url": "http://link.aip.org/link/?JPR/18/1537/1",
				"DOI": "10.1063/1.555836",
				"abstractNote": "In order to represent the thermodynamic properties of water (H2O) over an extremely large range of temperature and pressure that is not covered by existing equations of state, a new fundamental equation has been developed. The Helmholtz function was fitted to the following kinds of experimental data: (a) pρT data, (b) thermal properties of the saturation curve (ps,ρ′,ρ″), (c) speed of sound w, (d) isobaric heat capacity cp, (e) isochoric heat capacity cv, (f) differences of the internal energy u, (g) differences of the enthalpy h, (h) Joule–Thomson coefficient μ, and (i) the isothermal throttling coefficient δT. A new statistical selection method was used to determine the final form of the equation from a ‘‘bank’’ of 630 terms which also contained functional forms that have not been previously used. This 58‐coefficient equation covers the entire fluid region from the melting line to 1273 K at pressures up to 25 000 MPa, and represents the data within their experimental accuracy also in the ‘‘difficult’’ regions below 0 °C, on the entire saturation curve, in the critical region and at very high pressures. The equation was constrained at the critical point as defined by the parameters internationally recommended by the International Association for the Properties of Steam (IAPS). Besides the 58‐coefficient equation for the entire pressure range, a 38‐coefficient equation is presented for providing a ‘‘fast’’ equation for practical and scientific calculations in the pressure range below 1000 MPa. This equation has, with the exception of the critical region, nearly the same accuracy as the 58‐coefficient equation. The quality of the new equations will be illustrated by comparing the values calculated from them with selected experimental data and with the IAPS‐84 formulation and the Scaling‐Law equation.",
				"libraryCatalog": "Scitation",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://avspublications.org/jvstb/resource/1/jvtbd9/v30/i2/p02B119_s1?isAuthorized=no",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Wei",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "A. Yu",
						"lastName": "Nikiforov",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Thomidis",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Woodward",
						"creatorType": "author"
					},
					{
						"firstName": "H.",
						"lastName": "Sun",
						"creatorType": "author"
					},
					{
						"firstName": "Chen-Kai",
						"lastName": "Kao",
						"creatorType": "author"
					},
					{
						"firstName": "D.",
						"lastName": "Bhattarai",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Moldawer",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Zhou",
						"creatorType": "author"
					},
					{
						"firstName": "D. J.",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "T. D.",
						"lastName": "Moustakas",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"aluminium compounds; gallium compounds; III-V semiconductors; liquid phase epitaxial growth; luminescence; molecular beam epitaxial growth; red shift; semiconductor heterojunctions; semiconductor quantum wells; silicon compounds; ultraviolet spectra; wide band gap semiconductors"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Molecular beam epitaxy growth of AlGaN quantum wells on 6H-SiC substrates with high internal quantum efficiency",
				"publisher": "AVS",
				"date": "2012",
				"publicationTitle": "Journal of Vacuum Science & Technology B: Microelectronics and Nanometer Structures",
				"volume": "30",
				"issue": "2",
				"pages": "02B119",
				"url": "http://link.aip.org/link/?JVB/30/02B119/1",
				"DOI": "10.1116/1.3678208",
				"abstractNote": "The authors report the development of high internal quantum efficiency AlN/AlGaN/AlN double heterostructures and AlGaN/AlN multiple quantum wells (MQWs) grown on 6H-SiC and 4H-SiC substrates of various miscuts by plasma-assisted molecular-beam epitaxy. The authors find that the luminescence spectra for identical MQWs show a single peak across the gap, with a wavelength that is redshifted by ∼20 nm as the excess Ga during growth of the wells increases. The internal quantum efficiency of the double heterostructures emitting at 250 nm is found to be 43%, and that of the multiple quantum wells emitting at 245 nm is 68%. These results suggest that AlGaN alloys on SiC substrates are capable of producing deep-ultraviolet emitters with high efficiency. The authors propose that these results can be accounted for by the introduction of lateral band structure potential fluctuations due to the changing of the growth mode from physical vapor phase epitaxy to liquid phase epitaxy (LPE) as the excess gallium increases. In this LPE mode the arriving active nitrogen species from the plasma source and aluminum atoms from the aluminum effusion cells dissolve in the excess liquid gallium and incorporate into the film from the liquid phase.",
				"rights": "© 2012 American Vacuum Society",
				"libraryCatalog": "Scitation",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://asmedl.org/getabs/servlet/GetabsServlet?prog=normal&id=JDSMAA000128000003000482000001&idtype=cvips&gifs=Yes&ref=no",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Kevin B.",
						"lastName": "Fite",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Goldfarb",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"telerobotics; manipulators; nonlinear control systems; impedance matrix; stability; multivariable control systems"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Multivariable Loop-Shaping in Bilateral Telemanipulation",
				"publisher": "ASME",
				"date": "2006",
				"publicationTitle": "Journal of Dynamic Systems, Measurement, and Control",
				"volume": "128",
				"issue": "3",
				"pages": "482-488",
				"url": "http://link.aip.org/link/?JDS/128/482/1",
				"DOI": "10.1115/1.2229251",
				"abstractNote": "This paper presents an architecture and control methodology for obtaining transparency and stability robustness in a multivariable bilateral teleoperator system. The work presented here extends a previously published single-input, single-output approach to accommodate multivariable systems. The extension entails the use of impedance control techniques, which are introduced to render linear the otherwise nonlinear dynamics of the master and slave manipulators, in addition to a diagonalization multivariable loop shaping technique, used to render tractable the multivariable compensator design. A multivariable measure of transparency is proposed based on the relative singular values of the environment and transmitted impedance matrices. The approach is experimentally demonstrated on a three degree-of-freedom scaled telemanipulator pair with a highly coupled environment. Using direct measurement of the power delivered to the operator to assess the system's stability robustness, along with the proposed measure of multivariable transparency, the loop-shaping compensation is shown to improve the stability robustness by a factor of two and the transparency by more than a factor of five.",
				"rights": "©2006 American Society of Mechanical Engineers",
				"libraryCatalog": "Scitation",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://digital-library.theiet.org/getabs/servlet/GetabsServlet?prog=normal&id=IMAPCH000006000001000001000001&idtype=cvips&gifs=Yes&ref=no",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "S. I.",
						"lastName": "Latif",
						"creatorType": "author"
					},
					{
						"firstName": "L.",
						"lastName": "Shafai",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"circular polarisation; dual-layer square-ring microstrip antennas; axial ratio bandwidth; sequential rotation; wide axial ratio beamwidth; finite ground plane; right-hand CP gain"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Circular polarisation from dual-layer square-ring microstrip antennas",
				"publisher": "IET",
				"date": "2012",
				"publicationTitle": "IET Microwaves, Antennas & Propagation",
				"volume": "6",
				"issue": "1",
				"pages": "1-9",
				"url": "http://link.aip.org/link/?MAP/6/1/1",
				"DOI": "10.1049/iet-map.2011.0273",
				"abstractNote": "Stacked microstrip square-ring antennas are investigated for circular polarisation (CP). Enhancement of axial ratio bandwidth is obtained using stacked square rings and applying corner perturbations to both parasitic and driven rings. Both negative and positive corner perturbations are used and wide axial ratio bandwidths are demonstrated. A novel approach is presented, where a combination of positive and negative perturbations is adopted in the driven and parasitic rings, respectively, which resembles a sequential rotation and offers broad axial ratio bandwidth, along with a wide axial ratio beamwidth. The effects of finite ground plane on the CP performance of this antenna are studied, and methods are presented to overcome the problems associated with the degradation of the CP performance because of the finite ground plane. The effect of positioning the antenna asymmetrically on the ground plane is also studied, which shows that the ground plane symmetry is important for the CP antenna. The measured 3 dB axial ratio bandwidth of approximately 5.15% is achieved for dual-layer square-ring antennas. The measured right-hand CP (RHCP) gain is in excess of 7 dBic for a wide frequency range. The simulation results are in good agreement with the measured data.",
				"libraryCatalog": "Scitation",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scitation.aip.org/getabs/servlet/GetabsServlet?prog=normal&id=VIRT04000012000002000021000001&idtype=cvips&gifs=yes&ref=no",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "K. A.",
						"lastName": "Patel",
						"creatorType": "author"
					},
					{
						"firstName": "J. F.",
						"lastName": "Dynes",
						"creatorType": "author"
					},
					{
						"firstName": "A. W.",
						"lastName": "Sharpe",
						"creatorType": "author"
					},
					{
						"firstName": "Z. L.",
						"lastName": "Yuan",
						"creatorType": "author"
					},
					{
						"firstName": "R. V.",
						"lastName": "Penty",
						"creatorType": "author"
					},
					{
						"firstName": "A. J.",
						"lastName": "Shields",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"gigacount-second photon detection; avalanche photodiodes; telecom wavelengths; thermoelectrically-cooled semiconductor diode; photon flux; detection sensitivity; APD; high-bit-rate quantum information applications; frequency 2 GHz; InGaAs"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Gigacount/second photon detection with InGaAs avalanche photodiodes",
				"publisher": "IEE",
				"date": "2012",
				"publicationTitle": "Electronics Letters",
				"volume": "48",
				"issue": "2",
				"pages": "111-113",
				"url": "http://link.aip.org/link/?ELL/48/111/1",
				"DOI": "10.1049/el.2011.3265",
				"abstractNote": "High count rate single photon detection at telecom wavelengths has been demonstrated using a thermoelectrically-cooled semiconductor diode. The device consists of a single InGaAs avalanche photodiode driven by a 2 GHz gating frequency signal and coupled to a tunable self-differencing circuit for enhanced detection sensitivity. The count rate is linear with the photon flux in the single photon detection regime over approximately four orders of magnitude, and saturates at 1 gigacount/s at high photon fluxes. This result highlights promising potential for APDs in high-bit-rate quantum information applications.",
				"libraryCatalog": "Scitation",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://spiedigitallibrary.org/jnp/resource/1/jnoacq/v6/i1/p064501_s1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Traian",
						"lastName": "Dumitrica",
						"creatorType": "author"
					},
					{
						"firstName": "Suneel",
						"lastName": "Kodambaka",
						"creatorType": "author"
					},
					{
						"firstName": "Sukky",
						"lastName": "Jun",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Synthesis, electromechanical characterization, and applications of graphene nanostructures",
				"publisher": "SPIE",
				"date": "2012",
				"publicationTitle": "Journal of Nanophotonics",
				"volume": "6",
				"pages": "064501",
				"url": "http://link.aip.org/link/?JNP/6/064501/1",
				"DOI": "10.1117/1.JNP.6.064501",
				"abstractNote": "The emerging field of graphene brings together scientists and engineers as the discovered fundamental properties and effects encountered in this new material can be rapidly exploited for practical applications. There is potential for a two-dimensional graphene-based technology and recent works have already demonstrated the utility of graphene in building nanoelectromechanical systems, complex electronic circuits, photodetectors and ultrafast lasers. The state-of-the-art of substrate-suported graphene growth, and the current fundamental understanding of the electromechanical properties of graphene and graphene nanoribbons, represent important knowledge for developing new applications.",
				"rights": "© 2012 Society of Photo-Optical Instrumentation Engineers",
				"libraryCatalog": "Scitation",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scitation.aip.org/vsearch/servlet/VerityServlet?KEY=FREESR&smode=results&maxdisp=10&possible1=graphene+nanostructures&possible1zone=article&OUTLOG=NO&viewabs=ECSTF8&key=DISPLAY&docID=2&page=0&chapter=0",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Luis A.",
						"lastName": "Jauregui",
						"creatorType": "author"
					},
					{
						"firstName": "Yanan",
						"lastName": "Yue",
						"creatorType": "author"
					},
					{
						"firstName": "Anton N.",
						"lastName": "Sidorov",
						"creatorType": "author"
					},
					{
						"firstName": "Jiuning",
						"lastName": "Hu",
						"creatorType": "author"
					},
					{
						"firstName": "Qingkai",
						"lastName": "Yu",
						"creatorType": "author"
					},
					{
						"firstName": "Gabriel",
						"lastName": "Lopez",
						"creatorType": "author"
					},
					{
						"firstName": "Romaneh",
						"lastName": "Jalilian",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel K.",
						"lastName": "Benjamin",
						"creatorType": "author"
					},
					{
						"firstName": "Derek A.",
						"lastName": "Delkd",
						"creatorType": "author"
					},
					{
						"firstName": "Wei",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Zhihong",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Xinwei",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Zhigang",
						"lastName": "Jiang",
						"creatorType": "author"
					},
					{
						"firstName": "Xiulin",
						"lastName": "Ruan",
						"creatorType": "author"
					},
					{
						"firstName": "Jiming",
						"lastName": "Bao",
						"creatorType": "author"
					},
					{
						"firstName": "Steven S.",
						"lastName": "Pei",
						"creatorType": "author"
					},
					{
						"firstName": "Yong P.",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Srinivasan",
						"creatorType": "editor"
					},
					{
						"firstName": "Z.",
						"lastName": "Karim",
						"creatorType": "editor"
					},
					{
						"firstName": "Y.",
						"lastName": "Obeng",
						"creatorType": "editor"
					},
					{
						"firstName": "S.",
						"lastName": "De-Gendt",
						"creatorType": "editor"
					},
					{
						"firstName": "D.",
						"lastName": "Misra",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Thermal Transport in Graphene Nanostructures: Experiments and Simulations",
				"publisher": "ECS",
				"date": "2010",
				"publicationTitle": "ECS Transactions",
				"volume": "28",
				"issue": "5",
				"pages": "73-83",
				"url": "http://link.aip.org/link/abstract/ECSTF8/v28/i5/p73/s1",
				"DOI": "10.1149/1.3367938",
				"abstractNote": "Abstract Thermal transport in graphene and graphene nanostructures have been studied experimentally and theoretically. Methods and previous work to measure and calculate the thermal conductivities of graphene and related nanostructures are briefly reviewed. We demonstrate that combining Raman spectroscopy for thermometry and electrical transport for Joule heating is an effective approach to measure both graphene thermal conductivity and graphene-substrate interface thermal resistance. This technique has been applied to a variety of exfoliated or CVD-grown graphene samples (both suspended and substrate-supported), yielding values comparable with those measured using all-optical or all-electrical techniques. We have also employed classical molecular dynamics simulation to study thermal transport in graphene nanostructures and suggest such structures may be used as promising building blocks for nanoscale thermal engineering.",
				"rights": "©2010 COPYRIGHT ECS - The Electrochemical Society",
				"libraryCatalog": "Scitation",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Thermal Transport in Graphene Nanostructures"
			}
		]
	}
]
/** END TEST CASES **/