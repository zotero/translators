{
	"translatorID": "5ea2edd6-b836-490a-841f-d9274da308f9",
	"label": "JSON-LD",
	"creator": "Martynas Bagdonas",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 310,
	"inRepository": true,
	"translatorType": 5,
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-06-04 03:25:10"
}

function detectWeb(doc, url) {
	let nodes = doc.querySelectorAll('script[type="application/ld+json');
	if (nodes.length) {
		return 'multiple';
	}
}

async function doWeb(doc, url) {
	let nodes = doc.querySelectorAll('script[type="application/ld+json');
	for (let node of nodes) {
		try {
			let jsonld = JSON.parse(node.textContent);
			await processJsonld(url, jsonld);
		}
		catch (err) {
		}
	}
}

async function processJsonld(url, jsonld) {
	let quads = await ZU.jsonldToQuads(url, jsonld);
	
	// Zotero.debug(JSON.stringify(quads, null, 2));
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
	
	let items = [];
	translator.setHandler("itemDone", function (obj, item) {
		items.push(item);
	});
	
	// Wait until the translator object is exposed
	let rdf = await new Promise(function (resolve) {
		translator.getTranslatorObject(resolve);
	});
	
	// Feed RDF quads as triples
	for (let quad of quads) {
		rdf.Zotero.RDF.addStatement(
			quad.subject.value,
			quad.predicate.value,
			quad.object.value,
			quad.object.termType === 'Literal'
		);
	}
	// Zotero.debug(rdf.Zotero.RDF.serialize());
	
	await rdf.doImport();
	
	for (let item of items) {
		item.complete();
	}
}

function getJson() {
	let maxLength = 1024 * 1024;
	let json = Zotero.read(maxLength + 1);
	if (json.length === maxLength) {
		throw new Error('JSON is too large');
	}
	return JSON.parse(json);
}

function detectImport() {
	try {
		// Return true if JSON was successfully parsed
		getJson();
		return true;
	}
	catch (err) {
	
	}
}

async function doImport() {
	let blocks = getJson();
	// Single or multiple JSON-LD blocks are allowed
	if (!Array.isArray(blocks)) {
		blocks = [blocks];
	}
	
	// We don't have the base URL when importing JSON-LD blocks from a string,
	// therefore some JSON-LD blocks can be improperly expanded
	// if relative URLs are used
	for (let jsonld of blocks) {
		await processJsonld(null, jsonld);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "[{\"@context\":\"https://schema.org/\",\"@graph\":[{\"@graph\":[{\"@context\":\"http://schema.org/\",\"@graph\":[{\"@id\":\"#issue2\",\"@type\":\"PublicationIssue\",\"issueNumber\":\"2\",\"datePublished\":\"2015-04-01\",\"sameas\":\"http://iforest.sisef.org/archive/?action=issue&amp;n=43\"},{\"@id\":\"#volume8\",\"@type\":\"PublicationVolume\",\"volumeNumber\":\"8\",\"sameas\":\"http://iforest.sisef.org/archive/?action=vol&amp;n=8\"},{\"@id\":\"#periodical\",\"@type\":\"Periodical\",\"name\":\"iForest - Biogeosciences and Forestry\",\"issn\":\"1971-7458\",\"publisher\":\"SISEF - The Italian Society of Silviculture and Forest Ecology\"},{\"identifier\":\"10.3832/ifor1209-008\",\"@type\":\"ScholarlyArticle\",\"isPartOf\":[{\"@id\":\"#issue2\"},{\"@id\":\"#volume8\"},{\"@id\":\"#periodical\"}],\"author\":[{\"@type\":\"Person\",\"name\":\"Buiteveld, Joukje\"},{\"@type\":\"Person\",\"name\":\"Van Der Werf, Bert\"},{\"@type\":\"Person\",\"name\":\"Hiemstra, Jelle A\"}],\"name\":\"Comparison of commercial elm cultivars and promising unreleased Dutch clones for resistance to Ophiostoma novo-ulmi\",\"headline\":\"Resistance to Ophiostoma novo-ulmi in commercial elm cultivars\",\"image\":\"http://iforest.sisef.org/papers/thumbs/thumb@1209.gif\",\"thumbnailURL\":\"http://iforest.sisef.org/papers/thumbs/thumb@1209.gif\",\"description\":\"Elms, and especially Ulmus × hollandica have been dominant and very much appreciated trees in cities and rural landscape for centuries in the Netherlands. As a result of two Dutch Elm Disease (DED) epidemics in the 20th century these trees largely disappeared from the landscape. Despite the introduction of new cultivars with increased levels of DED-resistance, by the end of the 20th century the elm had disappeared from the top 20 list of trees produced by Dutch nurseries. New cultivars with increased resistance to DED are used to a limited extent only. Apparently the lasting problems with DED in old cultivars has led to a lack of confidence in the resistance of these latest released cultivars among urban foresters and landscape managers. This paper reports on a study that aims at restoring the position of the elm as a street tree in the Netherlands by providing information on resistance to O. novo-ulmi causing DED of the currently available cultivars. All elm cultivars currently on the Dutch market were compared in an inoculation test. In 2007 a field experiment of 18 cultivars, one species and 10 non-released clones from the Dutch elm breeding program was established. Two cultivars were used as reference clones: “Commelin” (relatively susceptible) and “Lobel” (relatively resistant). In 2008 and 2009 the elms were stem-inoculated with Ophiostoma novo-ulmi and disease development was assessed throughout the summer and the following year. Clear differences in resistance to O. novo-ulmi were found between the cultivars, with “Columella”, “Sapporo Autumn Gold”’ and “Rebella” being highly resistant and significantly different from “Lobel” and “Regal”, “Urban”, “Belgica”, “Den Haag” and the U. laevis seedlings being the most susceptible and comparable to “Commelin”. The non-released clones performed comparable to “Lobel’”or even better. The ranking of the cultivars based on their level of resistance to O. novo-ulmi in this field test corresponds well with experience in urban green practice. Our conclusion is that there is a wide range of cultivars available with a good to excellent level of resistance. The available cultivars have a broad genetic base due to different parentage and use of exotic germplasm in the crossings. This broad genetic background may contribute to the stability of resistance in case new forms of the disease appear. The non-released clones performed well compared to the released cultivars and give good opportunities to further broaden the current range of cultivars on the Dutch and European market.\",\"datePublished\":\"2014-08-02\",\"about\":\"Plant and Forest Pathology\",\"keywords\":\"DED-resistance, Elm Cultivars, Ulmus, Inoculation Test, Ophiostoma novo-ulmi\",\"pageStart\":\"607\",\"pageEnd\":\"613\",\"editor\":[{\"@type\":\"Person\",\"name\":\"Santini, Alberto\"},{\"@type\":\"Person\",\"name\":\"Bucci, Gabriele\"}],\"license\":\"http://creativecommons.org/licenses/by-nc/4.0/\",\"sameAs\":[\"https://doi.org/10.3832/ifor1209-008\",\"http://iforest.sisef.org/contents/?id=ifor1209-008\",\"http://iforest.sisef.org/pdf/?id=ifor1209-008\"],\"copyrightYear\":\"2015\",\"copyrightHolder\":\"SISEF - The Italian Society of Silviculture and Forest Ecology\"}]},{\"@context\":\"https://schema.org\",\"@type\":\"NewsArticle\",\"author\":{\"@type\":\"Organization\",\"name\":\"Federal Reserve Bank of San Francisco\",\"url\":\"\"},\"name\":\"House Prices, Expectations, and Time-Varying Fundamentals\",\"headline\":\"House Prices, Expectations, and Time-Varying Fundamentals\",\"image\":\"\",\"datePublished\":\"May 25, 2017\",\"mainEntityOfPage\":\"https://www.frbsf.org/economic-research/publications/working-papers/2017/may/\",\"description\":\"\",\"publisher\":{\"@type\":\"Organization\",\"name\":\"Federal Reserve Bank of San Francisco\",\"url\":\"https://www.frbsf.org\",\"logo\":{\"@type\":\"ImageObject\",\"url\":\"https://www.frbsf.org/wp-content/themes/sf_fed_rebrand_2015/library/images/logo-org.png\",\"width\":\"600\",\"height\":\"60\"}}}]},{\"@context\":\"https://schema.org/\",\"@type\":\"BreadcrumbList\",\"itemListElement\":[{\"@type\":\"ListItem\",\"position\":1,\"item\":{\"name\":\"Home\",\"@id\":\"http://www.mrforum.com\"}},{\"@type\":\"ListItem\",\"position\":2,\"item\":{\"name\":\"Article\",\"@id\":\"http://www.mrforum.com/product-category/article/\"}},{\"@type\":\"ListItem\",\"position\":3,\"item\":{\"name\":\"Dielectric Materials and Applications\",\"@id\":\"http://www.mrforum.com/product-category/article/dielectric-materials-applications/\"}}]},{\"provider\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"sourceOrganization\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"creator\":[{\"name\":\"LUGO, A.E.\",\"@type\":\"Person\"},{\"name\":\"SCATENA, F.\",\"@type\":\"Person\"},{\"name\":\"JORDAN, C.F.\",\"@type\":\"Person\"}],\"publishingPrinciples\":\"https://daac.ornl.gov/PI/archive.shtml\",\"isAccessibleForFree\":\"true\",\"keywords\":[\"EOSDIS\",\"NPP\",\"BIOSPHERE > ECOLOGICAL DYNAMICS > ECOSYSTEM FUNCTIONS > BIOMASS DYNAMICS\",\"BIOSPHERE > ECOLOGICAL DYNAMICS > ECOSYSTEM FUNCTIONS > PRIMARY PRODUCTION\",\"BIOSPHERE > VEGETATION > BIOMASS\",\"FIELD INVESTIGATION > BALANCE\",\"FIELD INVESTIGATION > STEEL MEASURING TAPE\",\"FIELD INVESTIGATION > CORING DEVICES\",\"FIELD INVESTIGATION > QUADRATS\"],\"spatialCoverage\":{\"geo\":{\"box\":\"18.27 -65.82 18.33 -65.73\",\"@type\":\"GeoShape\"},\"@type\":\"Place\"},\"url\":\"https://doi.org/10.3334/ORNLDAAC/476\",\"about\":{\"url\":\"https://daac.ornl.gov/NPP/guides/NPP_LQL.html\",\"name\":\"User Guide\",\"image\":\"https://daac.ornl.gov/daac_logo.png\",\"@type\":\"WebPage\"},\"publisher\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"contactPoint\":{\"email\":\"uso@daac.ornl.gov\",\"telephone\":\"+18652413952\",\"contactType\":\"customer support\",\"name\":\"ORNL DAAC User Support Office\",\"@type\":\"ContactPoint\"},\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"@type\":\"DataSet\",\"citation\":\"Lugo, A.E., F. Scatena, and C.F. Jordan. 2013. NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1. ORNL DAAC, Oak Ridge, Tennessee, USA. http://dx.doi.org/10.3334/ORNLDAAC/476\",\"dateCreated\":\"2013-10-17\",\"locationCreated\":\"Oak Ridge, Tennessee, USA\",\"thumbnailUrl\":\"\",\"temporalCoverage\":\"1946-01-01/1994-12-31\",\"version\":\"2\",\"name\":\"NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1\",\"description\":\"This data set contains ten ASCII files (.txt format), one NPP file for each of the nine different montane tropical rainforest sites within the Luquillo Experimental Forest (LEF) of Puerto Rico and one file containing climate data. The NPP study sites are located along an environmental gradient of different soils, elevation (100-1,000 m), develop stage, and mean annual rainfall. Field measurements were carried out from 1946 through 1994.\",\"sameAs\":\"https://daac.ornl.gov/cgi-bin/dsviewer.pl?ds_id=476\",\"distribution\":[{\"provider\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"url\":\"https://daac.ornl.gov/daacdata/npp/tropical_forest/NPP_LQL/\",\"name\":\"Direct Access: NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1\",\"publisher\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"encodingFormat\":null,\"description\":\"This link allows direct data access via Earthdata Login to: NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1\",\"@type\":\"DataDownload\"},{\"provider\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"contentSize\":\"140.9KB\",\"name\":\"Download Dataset: NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1\",\"description\":\"Download entire dataset bundle: NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1\",\"url\":\"https://daac.ornl.gov/cgi-bin/download.pl?ds_id=476&source=schema_org_metadata\",\"encodingFormat\":null,\"publisher\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"@type\":\"DataDownload\"}],\"datePublished\":\"2013-10-17\",\"includedInDataCatalog\":[{\"provider\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"url\":\"https://daac.ornl.gov/cgi-bin/dataset_lister.pl?p=13\",\"name\":\"Net Primary Productivity (NPP)\",\"publisher\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"@type\":\"DataCatalog\"},{\"provider\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"url\":\"https://search.earthdata.nasa.gov/search\",\"name\":\"NASA Earthdata Search\",\"publisher\":{\"logo\":\"https://daac.ornl.gov/daac_logo.png\",\"name\":\"ORNL DAAC\",\"url\":\"https://daac.ornl.gov\",\"@type\":\"Organization\"},\"@type\":\"DataCatalog\"}],\"@context\":\"https://schema.org\",\"@id\":\"https://doi.org/10.3334/ORNLDAAC/476\"},{\"@context\":\"https://schema.org/\",\"@type\":\"Product\",\"@id\":\"http://www.mrforum.com/product/9781945291197-44/\",\"name\":\"Evaluation of thermal characterization of PMMA/PPy composite materials\",\"image\":\"http://www.mrforum.com/wp-content/uploads/2016/11/9781945291166-1.jpg\",\"description\":\"<h3>I. BOUKNAITIR, N. ARIBOU, S.A.E. KASSIM, M.E. ACHOUR, L.C. COSTA</h3>\\n<p>Abstract. In this study, the specific heat Cp formed by PMMA with different concentrations of PPy are measured. The specific heat is measured by using differential scanning calorimetry method (DSC). We notice that in this nano-composite (PMMA/PPy) our sample containing 2 - 8 wt% of PPy filler material. For modelisation, we have used the mixture law for thermal properties. As the results show, we have obtained a good agreement between the thermal properties.</p>\\n<p><strong>Keywords</strong><br />\\nSpecific Heat Capacity, DSC, Polypyrrole, Polymethymethacrylate, Composite, Conducting Polymer</p>\\n<p><strong>Published online </strong> 12/10/2016, 4 pages<br />\\nCopyright © 2016 by the author(s)<br />\\nPublished under license by Materials Research Forum LLC., Millersville PA, USA<br />\\n<strong>Citation: </strong> I. BOUKNAITIR, N. ARIBOU, S.A.E. KASSIM, M.E. ACHOUR, L.C. COSTA, 'Evaluation of thermal characterization of PMMA/PPy composite materials', Materials Research Proceedings, Vol. 1, pp  175-178, 2016<br />\\n<strong>DOI: </strong> http://dx.doi.org/10.21741/9781945291197-44</p>\\n<p>The article was published as article 44 of the book <strong><a href=\\\"http://www.mrforum.com/product/dielectric-materials-and-applications/\\\">Dielectric Materials and Applications</a></strong></p>\\n<p><strong>References</strong><br />\\n[1]  J.C. Garland, D.B. Tanner, Electrical transport and optical properties in inho- mogeneous media, in: AIP Conference Proceedings 40, American Institute of Physics, New York, 1977.<br />\\n[2]  S. Torquato, Random Heterogeneous Materials: Microstructure and Macro- scopic Properties, Springer-Verlag, New York, 2002. http://dx.doi.org/10.1007/978-1-4757-6355-3<br />\\n[3]  A.H.Sihvola,ElectromagneticMixingFormulasandApplications,Institutionof Electrical Engineers, London, 1999.<br />\\n[4]  M.E. Achour, Electromagnetic properties of carbon black filled epoxy polymer composites, in: C. Brosseau (Ed.), Prospects in Filled Polymers Engineering: Mesostructure, Elasticity Network, and Macroscopic Properties, Transworld Research Network, Kerala, 2008, pp. 129-174.<br />\\n[5]  J. Belattar, M.P.F. Graça, L.C. Costa, M.E. Achour, C. Brosseau, J. Appl. Phys. 107 (2010) 124111-124116. http://dx.doi.org/10.1063/1.3452366<br />\\n[6]  L.C. Costa, F. Henry, M.A. Valente, S.K. Mendiratta, A.S. Sombra, Eur. Polym. J. 38 (2002) 1495-1499. http://dx.doi.org/10.1016/S0014-3057(02)00044-7<br />\\n[7]  L. Flandin, T. Prasse, R. Schueler, W. Bauhofer, K. Schulte, J.Y. Cavaillé, Phys. Rev. B 59 (1999) 14349-14355. http://dx.doi.org/10.1103/PhysRevB.59.14349<br />\\n[8]  M.T. Connor, S. Roy, T.A. .Ezquerra, F.J.B. .Calleja, Phys. Rev. B 57 (1998) 2286-2294. http://dx.doi.org/10.1103/PhysRevB.57.2286<br />\\n[9]  M. El Hasnaoui, A. Triki, M.P.F. Graça, M.E. Achour, L.C. Costa, M. Arous, J. Non-Cryst. Solids 358 (2012) 2810-2815. http://dx.doi.org/10.1016/j.jnoncrysol.2012.07.008<br />\\n[10]  F. Henry, L.C. Costa, Phys. B: Condens. Matter. B 387 (2007) 250-258. http://dx.doi.org/10.1016/j.physb.2006.04.041<br />\\n[11]  I. Tavman , Y. Aydogdu , M. Kök , A. Turgut , A. Ezan. “ Measurement of heat capacity and thermal conductivity of HDPE/expanded graphite nanocomposites by differential scanning calorimetry,”Archives of materials science and engineering, vol 50, pp. 56-60, July 2011.<br />\\n[12]  A. Belhadj Mohamed, J. L. Miane, H. Zangar. Polym. Int. 50, 773 (2001). http://dx.doi.org/10.1002/pi.686<br />\\n[13]  N. Aribou, A. Elmansouri, M. E. Achour, L. C. Costa, A. Belhadj Mohamed, A. Oueriagli, A. Outzourhit. Spectro. Lett. 45, 477 (2012). http://dx.doi.org/10.1080/00387010.2012.667035<br />\\n[14]  T. Chelidze,. Y.Gueguen. Pressure – induced percolation transitions in composites. J. Phys. D: Applied Phys. 1998. v.31. _ PP. 2877_2885.<br />\\n[15]  T. Chelidze,. Y.Gueguen. Electrical spectroscopy of porous rocks: a review – I.  Theoretical models // Geophys. J. Int. 1999. Vol. 137. PP. 1 – 15.<br />\\n<meta name=\\\"citation_journal_title\\\" content=\\\"Materials Research Proceedings\\\"></meta><meta name=\\\"citation_issn\\\" content=\\\"2474-395X\\\"></meta><meta name=\\\"citation_publisher\\\" content=\\\"Materials Research Forum LLC\\\"></meta><meta name=\\\"citation_title\\\" content=\\\"Evaluation of thermal characterization of PMMA/PPy composite materials\\\"></meta><meta name=\\\"citation_doi\\\" content=\\\"10.21741/9781945291197-44\\\"></meta><meta name=\\\"citation_online_date\\\" content=\\\"2016\\\"></meta><meta name=\\\"citation_volume\\\" content=\\\"1\\\"></meta><meta name=\\\"citation_pdf_url\\\" content=\\\"http://www.mrforum.com/wp-content/uploads/woocommerce_uploads/PDFxyz1/9781945291197/44.pdf\\\"></meta><meta name=\\\"citation_language\\\" content=\\\"en\\\"></meta><meta name=\\\"citation_author\\\" content=\\\"N. ARIBOU\\\"></meta><meta name=\\\"citation_author_institution\\\" content=\\\"LASTID Laboratory, Physics Department, Faculty of Sciences, IbnTofail University, 14000 Kenitra, Morocco\\\"></meta><br />\\n<meta name=\\\"citation_author\\\" content=\\\"L.C. COSTA\\\"></meta><meta name=\\\"citation_author_institution\\\" content=\\\"I3N and Physics Department,University of Aveiro, 3810-193 Aveiro, Portugal\\\"></meta><br />\\n<meta name=\\\"citation_author\\\" content=\\\"S.A.E. KASSIM\\\"></meta><meta name=\\\"citation_author_institution\\\" content=\\\"LASTID Laboratory, Physics Department, Faculty of Sciences, IbnTofail University, 14000 Kenitra, Morocco\\\"></meta><br />\\n<meta name=\\\"citation_author\\\" content=\\\"I. BOUKNAITIR\\\"></meta><meta name=\\\"citation_author_institution\\\" content=\\\"LASTID Laboratory, Physics Department, Faculty of Sciences, IbnTofail University, 14000 Kenitra, Morocco\\\"></meta><br />\\n<meta name=\\\"citation_author\\\" content=\\\"M.E. ACHOUR\\\"></meta><meta name=\\\"citation_author_institution\\\" content=\\\"LASTID Laboratory, Department of Physics, Faculty of Sciences, University Ibn Tofail, BP 133, 14000 Kenitra, Morocco\\\"></meta></p>\\n\",\"sku\":\"\",\"offers\":[{\"@type\":\"Offer\",\"price\":\"12.50\",\"priceSpecification\":{\"price\":\"12.50\",\"priceCurrency\":\"USD\",\"valueAddedTaxIncluded\":\"false\"},\"priceCurrency\":\"USD\",\"availability\":\"https://schema.org/InStock\",\"url\":\"http://www.mrforum.com/product/9781945291197-44/\",\"seller\":{\"@type\":\"Organization\",\"name\":\"Materials Research Forum\",\"url\":\"http://www.mrforum.com\"}}]},{\"@context\":\"http://schema.org\",\"@type\":\"NewsArticle\",\"mainEntityOfPage\":{\"@type\":\"WebPage\",\"@id\":\"https://www.rmj.ru/articles/oftalmologiya/Sravnenie_farmakokinetiki_rekombinantnoy_prourokinazy_pri_neinvazivnyh_metodah_vvedeniya_instillyacii_elektroforez_lechebnye_kontaktnye_linzy/\"},\"headline\":\"Сравнение фармакокинетики рекомбинантной проурокиназы при неинвазивных методах введения (инстилляции, элект...\",\"image\":{\"@type\":\"ImageObject\",\"url\":\"http://www.rmj.ru\",\"height\":\"200\",\"width\":\"250\"},\"datePublished\":\"2017-11-28T00:00:00+03:00\",\"dateModified\":\"2017-12-13T13:53:30+03:00\",\"author\":[{\"@type\":\"Person\",\"name\":\"Бойко Э.В. \"},{\"@type\":\"Person\",\"name\":\"Даниличев В.Ф. \"},{\"@type\":\"Person\",\"name\":\"Сажин Т.Г. \"},{\"@type\":\"Person\",\"name\":\"Белогуров А.А. \"},{\"@type\":\"Person\",\"name\":\"Дельвер Е.П. \"},{\"@type\":\"Person\",\"name\":\"Агафонова О.В. \"},{\"@type\":\"Person\",\"name\":\"Суворов А.С. \"}],\"publisher\":{\"@type\":\"Organization\",\"name\":\"Издательский Дом «РМЖ»\",\"logo\":{\"@type\":\"ImageObject\",\"url\":\"http://www.rmj.ru/local/templates/.default/markup_rmz/_i/logo_rmg.png\",\"width\":87,\"height\":57}},\"description\":\"Представлены результаты исследования по сравнению фармакокинетики препарата Гемаза на основе рекомбинантной проурокиназы при неинвазивных методах введения &#40;инстилляции, электрофорез, лечебные контактные линзы&#41;. Показано, что введение Гемазы неинвазивными методами позволяет достичь достаточной концентрации ферментаи может быть использовано для лечения фибриноидного синдрома. \"}]},{\"@context\":\"http://schema.org\",\"@type\":\"Article\",\"name\":\"Minimizing Occurrence of Pancreatic Fistula during Pancreatoduodenectomy (Pd) Procedure: An Update\",\"author\":{\"@type\":\"Person\",\"name\":\"Mohammad Abdul Mazid, Gazi Shahinur Akter , Zheng Hui Ye, Xiao-Ping Geng, Fu-Bao Liu, Yi-Jun Zhao, Fan-Huang, Kun Xie, Hong-Chuan Zhao\"},\"datePublished\":\"2017-02-27\",\"url\":\"https://www.omicsonline.org/open-access/minimizing-occurrence-of-pancreatic-fistula-during-pancreatoduodenectomypd-procedure-an-update-1584-9341-13-1-3.pdf\"},{\"@context\":\"http://schema.org\",\"@id\":\"https://academic.oup.com/auk/article/122/4/1309/5147711\",\"@type\":\"ScholarlyArticle\",\"name\":\"Phylogeography of the Mallard ( Anas Platyrhynchos ): Hybridization, Dispersal, and Lineage Sorting Contribute to Complex Geographic Structure\",\"datePublished\":\"2005-10-01\",\"isPartOf\":{\"@id\":\"https://academic.oup.com/auk/issue/122/4\",\"@type\":\"PublicationIssue\",\"issueNumber\":\"4\",\"datePublished\":\"2005-10-01\",\"isPartOf\":{\"@id\":\"https://academic.oup.com/auk\",\"@type\":\"Periodical\",\"name\":\"The Auk: Ornithological Advances\",\"issn\":[\"1938-4254\"]}},\"url\":\"http://dx.doi.org/10.1642/0004-8038(2005)122[1309:POTMAP]2.0.CO;2\",\"inLanguage\":\"en\",\"copyrightHolder\":\"American Ornithological Society\",\"copyrightYear\":\"2019\",\"publisher\":\"Oxford University Press\",\"sameAs\":\"https://academic.oup.com/auk/article/122/4/1309/5147711\",\"author\":[{\"name\":\"Kulikova, Irina V.\",\"@type\":\"Person\"},{\"name\":\"Drovetski, Sergei V.\",\"@type\":\"Person\"},{\"name\":\"Gibson, Daniel D.\",\"@type\":\"Person\"},{\"name\":\"Harrigan, Ryan J.\",\"@type\":\"Person\"},{\"name\":\"Rohwer, Sievert\",\"@type\":\"Person\"},{\"name\":\"Sorenson, Michael D.\",\"@type\":\"Person\"},{\"name\":\"Winker, Kevin\",\"@type\":\"Person\"},{\"name\":\"Zhuravlev, Yuri N.\",\"@type\":\"Person\"},{\"name\":\"McCracken, Kevin G.\",\"@type\":\"Person\"}],\"description\":\"Because of an oversight by the authors while processing the proof of Kulikova et al. (Auk 122:949–965), two errors were not detected. In the first sentence of t\",\"pageStart\":\"1309\",\"pageEnd\":\"1309\",\"thumbnailURL\":\"https://oup.silverchair-cdn.com/oup/backfile/Content_public/Journal/auk/Issue/122/4/5/m_cover.gif?Expires=1612949833&Signature=AXqDKYnQReF5sf-J9x9xe8WkQT~Mg4gkAxfcXAi8nkRV~-GIxP88ouH4dr5sP8MUBhBP6SKm390lhy9TPv2oF75uq3~ip~yF-cJdqmTL7geyX68Xs1s5tEa1ncHO0zDIVRGsowptK-80Fk1Ppvha5zwSr1CnRWrxhYOe4W1VmFysfQwweTbnbY-hpYrGvkvVBAWoAe6abBmZm1N4Nnp5TRma6LOYx~zqKpTW4F9rF6JFR75g5tbNz8nwLC44omxrHzqg6yBeBt5foMzHtWRLU7Nab4RWfeDy~nInNpW7CUcGftQX4v7~zfmN~~SRd9Gx5p3jC-1m5vlCHiJO2BMDZw__&Key-Pair-Id=APKAIE5G5CRDK6RD3PGA\",\"headline\":\"Phylogeography of the Mallard ( Anas Platyrhynchos ): Hybridization, Dispersal, and Lineage Sorting Contribute to Complex Geographic Structure\",\"image\":\"https://oup.silverchair-cdn.com/oup/backfile/Content_public/Journal/auk/Issue/122/4/5/m_cover.gif?Expires=1612949833&Signature=AXqDKYnQReF5sf-J9x9xe8WkQT~Mg4gkAxfcXAi8nkRV~-GIxP88ouH4dr5sP8MUBhBP6SKm390lhy9TPv2oF75uq3~ip~yF-cJdqmTL7geyX68Xs1s5tEa1ncHO0zDIVRGsowptK-80Fk1Ppvha5zwSr1CnRWrxhYOe4W1VmFysfQwweTbnbY-hpYrGvkvVBAWoAe6abBmZm1N4Nnp5TRma6LOYx~zqKpTW4F9rF6JFR75g5tbNz8nwLC44omxrHzqg6yBeBt5foMzHtWRLU7Nab4RWfeDy~nInNpW7CUcGftQX4v7~zfmN~~SRd9Gx5p3jC-1m5vlCHiJO2BMDZw__&Key-Pair-Id=APKAIE5G5CRDK6RD3PGA\"}]",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b26",
				"title": "Net Primary Productivity (NPP)",
				"publisher": "ORNL DAAC",
				"institution": "ORNL DAAC",
				"company": "ORNL DAAC",
				"label": "ORNL DAAC",
				"distributor": "ORNL DAAC",
				"url": "https://daac.ornl.gov/cgi-bin/dataset_lister.pl?p=13"
			},
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b29",
				"title": "NASA Earthdata Search",
				"publisher": "ORNL DAAC",
				"institution": "ORNL DAAC",
				"company": "ORNL DAAC",
				"label": "ORNL DAAC",
				"distributor": "ORNL DAAC",
				"url": "https://search.earthdata.nasa.gov/search"
			},
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Бойко",
						"lastName": "Э.В",
						"creatorType": "author"
					},
					{
						"firstName": "Даниличев",
						"lastName": "В.Ф",
						"creatorType": "author"
					},
					{
						"firstName": "Сажин",
						"lastName": "Т.Г",
						"creatorType": "author"
					},
					{
						"firstName": "Белогуров",
						"lastName": "А.А",
						"creatorType": "author"
					},
					{
						"firstName": "Дельвер",
						"lastName": "Е.П",
						"creatorType": "author"
					},
					{
						"firstName": "Агафонова",
						"lastName": "О.В",
						"creatorType": "author"
					},
					{
						"firstName": "Суворов",
						"lastName": "А.С",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b41",
				"title": "Сравнение фармакокинетики рекомбинантной проурокиназы при неинвазивных методах введения (инстилляции, элект...",
				"publisher": "Издательский Дом «РМЖ»",
				"institution": "Издательский Дом «РМЖ»",
				"company": "Издательский Дом «РМЖ»",
				"label": "Издательский Дом «РМЖ»",
				"distributor": "Издательский Дом «РМЖ»",
				"date": "2017-11-28T00:00:00+03:00",
				"lastModified": "2017-12-13T13:53:30+03:00",
				"abstractNote": "Представлены результаты исследования по сравнению фармакокинетики препарата Гемаза на основе рекомбинантной проурокиназы при неинвазивных методах введения &#40;инстилляции, электрофорез, лечебные контактные линзы&#41;. Показано, что введение Гемазы неинвазивными методами позволяет достичь достаточной концентрации ферментаи может быть использовано для лечения фибриноидного синдрома."
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "A. E.",
						"lastName": "LUGO",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "SCATENA",
						"creatorType": "author"
					},
					{
						"firstName": "C. F.",
						"lastName": "JORDAN",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"EOSDIS",
					"NPP",
					"BIOSPHERE > ECOLOGICAL DYNAMICS > ECOSYSTEM FUNCTIONS > BIOMASS DYNAMICS",
					"BIOSPHERE > ECOLOGICAL DYNAMICS > ECOSYSTEM FUNCTIONS > PRIMARY PRODUCTION",
					"BIOSPHERE > VEGETATION > BIOMASS",
					"FIELD INVESTIGATION > BALANCE",
					"FIELD INVESTIGATION > STEEL MEASURING TAPE",
					"FIELD INVESTIGATION > CORING DEVICES",
					"FIELD INVESTIGATION > QUADRATS"
				],
				"seeAlso": [],
				"attachments": [],
				"itemID": "https://doi.org/10.3334/ORNLDAAC/476",
				"title": "NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1",
				"edition": "2",
				"versionNumber": "2",
				"publisher": "ORNL DAAC",
				"institution": "ORNL DAAC",
				"company": "ORNL DAAC",
				"label": "ORNL DAAC",
				"distributor": "ORNL DAAC",
				"date": "2013-10-17",
				"url": "https://doi.org/10.3334/ORNLDAAC/476",
				"abstractNote": "This data set contains ten ASCII files (.txt format), one NPP file for each of the nine different montane tropical rainforest sites within the Luquillo Experimental Forest (LEF) of Puerto Rico and one file containing climate data. The NPP study sites are located along an environmental gradient of different soils, elevation (100-1,000 m), develop stage, and mean annual rainfall. Field measurements were carried out from 1946 through 1994."
			},
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Federal Reserve Bank of San",
						"lastName": "Francisco",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b8",
				"title": "House Prices, Expectations, and Time-Varying Fundamentals",
				"publisher": "Federal Reserve Bank of San Francisco",
				"institution": "Federal Reserve Bank of San Francisco",
				"company": "Federal Reserve Bank of San Francisco",
				"label": "Federal Reserve Bank of San Francisco",
				"distributor": "Federal Reserve Bank of San Francisco",
				"date": "May 25, 2017"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Joukje",
						"lastName": "Buiteveld",
						"creatorType": "author"
					},
					{
						"firstName": "Bert",
						"lastName": "Van Der Werf",
						"creatorType": "author"
					},
					{
						"firstName": "Jelle A.",
						"lastName": "Hiemstra",
						"creatorType": "author"
					},
					{
						"firstName": "Alberto",
						"lastName": "Santini",
						"creatorType": "editor"
					},
					{
						"firstName": "Gabriele",
						"lastName": "Bucci",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"DED-resistance, Elm Cultivars, Ulmus, Inoculation Test, Ophiostoma novo-ulmi"
				],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b2",
				"title": "Resistance to Ophiostoma novo-ulmi in commercial elm cultivars",
				"rights": "http://creativecommons.org/licenses/by-nc/4.0/",
				"pages": "607-613",
				"date": "2014-08-02",
				"url": "https://doi.org/10.3832/ifor1209-008",
				"abstractNote": "Elms, and especially Ulmus × hollandica have been dominant and very much appreciated trees in cities and rural landscape for centuries in the Netherlands. As a result of two Dutch Elm Disease (DED) epidemics in the 20th century these trees largely disappeared from the landscape. Despite the introduction of new cultivars with increased levels of DED-resistance, by the end of the 20th century the elm had disappeared from the top 20 list of trees produced by Dutch nurseries. New cultivars with increased resistance to DED are used to a limited extent only. Apparently the lasting problems with DED in old cultivars has led to a lack of confidence in the resistance of these latest released cultivars among urban foresters and landscape managers. This paper reports on a study that aims at restoring the position of the elm as a street tree in the Netherlands by providing information on resistance to O. novo-ulmi causing DED of the currently available cultivars. All elm cultivars currently on the Dutch market were compared in an inoculation test. In 2007 a field experiment of 18 cultivars, one species and 10 non-released clones from the Dutch elm breeding program was established. Two cultivars were used as reference clones: “Commelin” (relatively susceptible) and “Lobel” (relatively resistant). In 2008 and 2009 the elms were stem-inoculated with Ophiostoma novo-ulmi and disease development was assessed throughout the summer and the following year. Clear differences in resistance to O. novo-ulmi were found between the cultivars, with “Columella”, “Sapporo Autumn Gold”’ and “Rebella” being highly resistant and significantly different from “Lobel” and “Regal”, “Urban”, “Belgica”, “Den Haag” and the U. laevis seedlings being the most susceptible and comparable to “Commelin”. The non-released clones performed comparable to “Lobel’”or even better. The ranking of the cultivars based on their level of resistance to O. novo-ulmi in this field test corresponds well with experience in urban green practice. Our conclusion is that there is a wide range of cultivars available with a good to excellent level of resistance. The available cultivars have a broad genetic base due to different parentage and use of exotic germplasm in the crossings. This broad genetic background may contribute to the stability of resistance in case new forms of the disease appear. The non-released clones performed well compared to the released cultivars and give good opportunities to further broaden the current range of cultivars on the Dutch and European market."
			},
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"firstName": "Gazi Shahinur Akter",
						"lastName": "Mohammad Abdul Mazid",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b0",
				"title": "Minimizing Occurrence of Pancreatic Fistula during Pancreatoduodenectomy (Pd) Procedure: An Update",
				"date": "2017-02-27",
				"url": "https://www.omicsonline.org/open-access/minimizing-occurrence-of-pancreatic-fistula-during-pancreatoduodenectomypd-procedure-an-update-1584-9341-13-1-3.pdf"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Irina V.",
						"lastName": "Kulikova",
						"creatorType": "author"
					},
					{
						"firstName": "Sergei V.",
						"lastName": "Drovetski",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel D.",
						"lastName": "Gibson",
						"creatorType": "author"
					},
					{
						"firstName": "Ryan J.",
						"lastName": "Harrigan",
						"creatorType": "author"
					},
					{
						"firstName": "Sievert",
						"lastName": "Rohwer",
						"creatorType": "author"
					},
					{
						"firstName": "Michael D.",
						"lastName": "Sorenson",
						"creatorType": "author"
					},
					{
						"firstName": "Kevin",
						"lastName": "Winker",
						"creatorType": "author"
					},
					{
						"firstName": "Yuri N.",
						"lastName": "Zhuravlev",
						"creatorType": "author"
					},
					{
						"firstName": "Kevin G.",
						"lastName": "McCracken",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "https://academic.oup.com/auk/article/122/4/1309/5147711",
				"title": "Phylogeography of the Mallard ( Anas Platyrhynchos ): Hybridization, Dispersal, and Lineage Sorting Contribute to Complex Geographic Structure",
				"publicationTitle": "The Auk: Ornithological Advances",
				"issue": "4",
				"number": "4",
				"patentNumber": "4",
				"pages": "1309-1309",
				"publisher": "Oxford University Press",
				"institution": "Oxford University Press",
				"company": "Oxford University Press",
				"label": "Oxford University Press",
				"distributor": "Oxford University Press",
				"date": "2005-10-01",
				"ISSN": "1938-4254",
				"url": "http://dx.doi.org/10.1642/0004-8038(2005)122[1309:POTMAP]2.0.CO;2",
				"abstractNote": "Because of an oversight by the authors while processing the proof of Kulikova et al. (Auk 122:949–965), two errors were not detected. In the first sentence of t",
				"language": "en"
			}
		]
	},
	{
		"type": "web",
		"url": "http://daac.ornl.gov/cgi-bin/dsviewer.pl?ds_id=476",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b10",
				"title": "Net Primary Productivity (NPP)",
				"publisher": "ORNL DAAC",
				"institution": "ORNL DAAC",
				"company": "ORNL DAAC",
				"label": "ORNL DAAC",
				"distributor": "ORNL DAAC",
				"url": "https://daac.ornl.gov/cgi-bin/dataset_lister.pl?p=13",
				"libraryCatalog": "JSON-LD"
			},
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"itemID": "_:b13",
				"title": "NASA Earthdata Search",
				"publisher": "ORNL DAAC",
				"institution": "ORNL DAAC",
				"company": "ORNL DAAC",
				"label": "ORNL DAAC",
				"distributor": "ORNL DAAC",
				"url": "https://search.earthdata.nasa.gov/search",
				"libraryCatalog": "JSON-LD"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "A. E.",
						"lastName": "LUGO",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "SCATENA",
						"creatorType": "author"
					},
					{
						"firstName": "C. F.",
						"lastName": "JORDAN",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"EOSDIS",
					"NPP",
					"BIOSPHERE > ECOLOGICAL DYNAMICS > ECOSYSTEM FUNCTIONS > BIOMASS DYNAMICS",
					"BIOSPHERE > ECOLOGICAL DYNAMICS > ECOSYSTEM FUNCTIONS > PRIMARY PRODUCTION",
					"BIOSPHERE > VEGETATION > BIOMASS",
					"FIELD INVESTIGATION > BALANCE",
					"FIELD INVESTIGATION > STEEL MEASURING TAPE",
					"FIELD INVESTIGATION > CORING DEVICES",
					"FIELD INVESTIGATION > QUADRATS"
				],
				"seeAlso": [],
				"attachments": [],
				"itemID": "https://doi.org/10.3334/ORNLDAAC/476",
				"title": "NPP Tropical Forest: Luquillo, Puerto Rico, 1946-1994, R1",
				"shortTitle": "NPP Tropical Forest",
				"publisher": "ORNL DAAC",
				"institution": "ORNL DAAC",
				"company": "ORNL DAAC",
				"label": "ORNL DAAC",
				"distributor": "ORNL DAAC",
				"date": "2013-10-17",
				"abstractNote": "This data set contains ten ASCII files (.txt format), one NPP file for each of the nine different montane tropical rainforest sites within the Luquillo Experimental Forest (LEF) of Puerto Rico and one file containing climate data. The NPP study sites are located along an environmental gradient of different soils, elevation (100-1,000 m), develop stage, and mean annual rainfall. Field measurements were carried out from 1946 through 1994.",
				"edition": "2",
				"versionNumber": "2",
				"url": "https://doi.org/10.3334/ORNLDAAC/476",
				"libraryCatalog": "JSON-LD"
			}
		]
	}
];
/** END TEST CASES **/
