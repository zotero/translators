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
	"browserSupport": "gcsv",
	"lastUpdated": "2013-03-06 23:09:14"
}

/**
	Copyright (c) 2012 Aurimas Vinckevicius
	
	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
	Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public
	License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

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
Z.debug(url)
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

			//some sites have tags in all caps. make those lower case
			for(var i=0, n=item.tags.length; i<n; i++) {
				if(!(/[a-z]/).test(item.tags[i])) {
					item.tags[i] = item.tags[i].toLowerCase();
				}
			}

			item.complete();
		});

		translator.getTranslatorObject(function(obj) {
			obj.setKeywordSplitOnSpace(false);
			obj.setKeywordDelimRe(';\\s*');

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
					"equations of state",
					"water",
					"thermodynamic properties",
					"specific heat",
					"data compilation",
					"reviews",
					"medium temperature",
					"high temperature",
					"very high temperature",
					"scaling laws",
					"high pressure",
					"very high pressure",
					"joulethomson effect"
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
					"aluminium compounds",
					"gallium compounds",
					"III-V semiconductors",
					"liquid phase epitaxial growth",
					"luminescence",
					"molecular beam epitaxial growth",
					"red shift",
					"semiconductor heterojunctions",
					"semiconductor quantum wells",
					"silicon compounds",
					"ultraviolet spectra",
					"wide band gap semiconductors"
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
	}
]
/** END TEST CASES **/