{
	"translatorID": "2c05e2d1-a533-448f-aa20-e919584864cb",
	"label": "DSpace Intermediate Metadata",
	"creator": "Sebastian Karcher",
	"target": "xml",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2022-12-24 19:29:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Sebastian Karcher

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectImport() {
	var text = Zotero.read(1000);
	return text.includes("http://www.dspace.org/xmlns/dspace/dim");
}

function getType(string) {
	string = string.toLowerCase();
	if (string.includes("book_section") || string.includes("chapter")) {
		return "bookSection";
	}
	else if (string.includes("book") || string.includes("monograph")) {
		return "book";
	}
	else if (string.includes("report")) {
		return "report";
	}
	else if (string.includes("proceedings") || string.includes("conference")) {
		return "conferencePaper";
	}
	else {
		return "journalArticle"; // default -- most of the catalog
	}
}
function doImport() {
	var xml = Zotero.getXML();
	var ns = {
		dim: 'http://www.dspace.org/xmlns/dspace/dim',
		mets: 'http://www.loc.gov/METS/',
		xlink: 'http://www.w3.org/TR/xlink/'
	};

	let type = ZU.xpathText(xml, '//dim:field[@element="type"]', ns);
	var item = new Zotero.Item("journalArticle");
	if (type) {
		item.itemType = getType(type);
	}

	item.title = ZU.trimInternal(ZU.xpathText(xml, '//dim:field[@element="title"]', ns));
	let abstract = ZU.xpath(xml, '//dim:field[@qualifier="abstract"]', ns);
	if (abstract.length) {
		item.abstractNote = abstract[0].textContent;
	}
	item.date = ZU.xpathText(xml, '//dim:field[@element="date" and @qualifier="issued"]', ns);
	item.language = ZU.xpathText(xml, '//dim:field[@element="language"]', ns);
	item.issue = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="issue"]', ns);
	item.volume = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="volume"]', ns);
	item.publicationTitle = ZU.xpathText(xml, '//dim:field[@element="title" and @qualifier="parent"]', ns);
	if (!item.publicationTitle) {
		item.publicationTitle = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="title"]', ns);
	}
	item.conferenceName = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="conferencename"]', ns);
	item.publisher = ZU.xpathText(xml, '//dim:field[@element="publisher" and not(@qualifier="place")]', ns);
	item.place = ZU.xpathText(xml, '//dim:field[@element="publisher" and @qualifier="place"]', ns);
	item.series = ZU.xpathText(xml, '//dim:field[@element="relation" and @qualifier="ispartofseries"]', ns);
	item.ISSN = ZU.xpathText(xml, '//dim:field[@element="identifier" and @qualifier="issn"]', ns);
	let pages = ZU.xpathText(xml, '//dim:field[@element="format" and @qualifier="pagerange"]', ns);
	if (pages) {
		item.pages = pages.replace(/pp?\./i, "");
	}
	else if (ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="stpage"]', ns)) {
		item.pages = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="stpage"]', ns)
			+ "-" + ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="endpage"]', ns);
	}
	let numPages = ZU.xpathText(xml, '//dim:field[@element="format" and @qualifier="pages"]', ns);
	if (numPages) {
		item.numPages = numPages.replace(/pp?\.?/i, "");
	}
	item.url = ZU.xpathText(xml, '//dim:field[@element="identifier" and @qualifier="uri"]', ns); // using the handle

	let authors = ZU.xpath(xml, '//dim:field[@element="contributor" and @qualifier="author"]', ns);
	for (let author of authors) {
		item.creators.push(ZU.cleanAuthor(author.textContent, "author", true));
	}

	let tags = ZU.xpath(xml, '//dim:field[@element="subject"]', ns);
	for (let tag of tags) {
		item.tags.push(tag.textContent);
	}
	// getting only the first PDF
	let pdfURL = ZU.xpathText(xml, '//mets:file[@MIMETYPE="application/pdf"][1]/mets:FLocat/@xlink:href', ns);
	if (pdfURL) {
		item.attachments.push({ url: pdfURL, title: "Full Text PDF", mimeType: "application/pdf" });
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n         <mets:METS xmlns:mets=\"http://www.loc.gov/METS/\" xmlns:xlink=\"http://www.w3.org/TR/xlink/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:dim=\"http://www.dspace.org/xmlns/dspace/dim\" PROFILE=\"DSPACE METS SIP Profile 1.0\" LABEL=\"DSpace Item\" OBJID=\"/handle/1834/20117\" ID=\"hdl:1834/20117\" OBJEDIT=\"/admin/item?itemID=17862\">\r\n         <mets:dmdSec GROUPID=\"group_dmd_0\" ID=\"dmd_1\">\r\n         <mets:mdWrap OTHERMDTYPE=\"DIM\" MDTYPE=\"OTHER\">\r\n         <mets:xmlData>\r\n         <dim:dim dspaceType=\"ITEM\">\r\n         <dim:field qualifier=\"author\" authority=\"a80664eb5ce92c976de86df05479756e\" confidence=\"UNCERTAIN\" mdschema=\"dc\" element=\"contributor\">Schittone, Joe</dim:field>\r\n         <dim:field qualifier=\"author\" authority=\"ffe0a5ba180ba325e66815a10079ce12\" confidence=\"UNCERTAIN\" mdschema=\"dc\" element=\"contributor\">Franklin, Erik C.</dim:field>\r\n         <dim:field qualifier=\"author\" authority=\"c1c40f364e922b7700f22e1199138365\" confidence=\"UNCERTAIN\" mdschema=\"dc\" element=\"contributor\">Hudson, J. Harold</dim:field>\r\n         <dim:field qualifier=\"author\" authority=\"86462809e751c2d6b701daf4c232599b\" confidence=\"UNCERTAIN\" mdschema=\"dc\" element=\"contributor\">Anderson, Jeff</dim:field>\r\n         <dim:field qualifier=\"accessioned\" mdschema=\"dc\" element=\"date\">2021-06-24T15:18:40Z</dim:field>\r\n         <dim:field qualifier=\"available\" mdschema=\"dc\" element=\"date\">2021-06-24T15:18:40Z</dim:field>\r\n         <dim:field qualifier=\"issued\" mdschema=\"dc\" element=\"date\">2006</dim:field>\r\n         <dim:field qualifier=\"uri\" mdschema=\"dc\" element=\"identifier\">http://hdl.handle.net/1834/20117</dim:field>\r\n         <dim:field qualifier=\"abstract\" mdschema=\"dc\" element=\"description\">This document presents the results of the monitoring of a repaired coral reef injured by the M/V Connected vessel grounding incident of March 27, 2001. This groundingoccurred in Florida state waters within the boundaries of the Florida Keys National Marine Sanctuary (FKNMS). The National Oceanic and Atmospheric Administration (NOAA) and the Board of Trustees of the Internal Improvement Trust Fund of the State of Florida, (“State of Florida” or “state”) are the co-trustees for the natural resourceswithin the FKNMS and, thus, are responsible for mediating the restoration of the damaged marine resources and monitoring the outcome of the restoration actions. Therestoration monitoring program tracks patterns of biological recovery, determines the success of restoration measures, and assesses the resiliency to environmental andanthropogenic disturbances of the site over time.The monitoring program at the Connected site was to have included an assessment of the structural stability of installed restoration modules and biological condition of reattached corals performed on the following schedule: immediately (i.e., baseline), 1, 3, and 6 years after restoration and following a catastrophic event. Restoration of this site was completed on July 20, 2001. Due to unavoidable delays in the settlement of the case, the“baseline” monitoring event for this site occurred in July 2004. The catastrophic monitoring event occurred on August 31, 2004, some 2 ½ weeks after the passage of Hurricane Charley which passed nearby, almost directly over the Dry Tortugas. In September 2005, the year one monitoring event occurred shortly after the passage of Hurricane Katrina, some 70 km to the NW. This report presents the results of all three monitoring events. (PDF contains 37 pages.)</dim:field>\r\n         <dim:field mdschema=\"dc\" element=\"format\">application/pdf</dim:field>\r\n         <dim:field qualifier=\"mimetype\" mdschema=\"dc\" element=\"format\">application/pdf</dim:field>\r\n         <dim:field qualifier=\"iso\" mdschema=\"dc\" element=\"language\">en</dim:field>\r\n         <dim:field mdschema=\"dc\" element=\"publisher\">NOAA/National Ocean Service/National Marine Sanctuary Program</dim:field>\r\n         <dim:field qualifier=\"ispartofseries\" mdschema=\"dc\" element=\"relation\">Marine Sanctuaries Conservation Series</dim:field>\r\n         <dim:field qualifier=\"uri\" mdschema=\"dc\" element=\"relation\">http://sanctuaries.noaa.gov/science/conservation/pdfs/connected.pdf</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Ecology</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Management</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Environment</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Florida Keys National Marine Sanctuary</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Coral</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Grounding</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Restoration</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Monitoring</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Hurricane Charley</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Hurricane Katrina</dim:field>\r\n         <dim:field qualifier=\"other\" mdschema=\"dc\" element=\"subject\">Acropora palmata</dim:field>\r\n         <dim:field mdschema=\"dc\" element=\"title\">M/V CONNECTED Coral Reef Restoration Monitoring Report,\r\n         Monitoring Events 2004-2005. Florida Keys National Marine Sanctuary Monroe County, Florida</dim:field>\r\n         <dim:field mdschema=\"dc\" element=\"type\">monograph</dim:field>\r\n         <dim:field qualifier=\"issue\" mdschema=\"dc\" element=\"bibliographicCitation\">NMSP-0</dim:field>\r\n         <dim:field qualifier=\"place\" mdschema=\"dc\" element=\"publisher\">Silver Spring, MD</dim:field>\r\n         <dim:field mdschema=\"refterms\" element=\"dateFOA\">2021-06-24T15:18:40Z</dim:field>\r\n         <dim:field qualifier=\"legacyrecordurl\" mdschema=\"dc\" element=\"source\">http://aquaticcommons.org/id/eprint/2312</dim:field>\r\n         <dim:field qualifier=\"legacydepositorid\" mdschema=\"dc\" element=\"source\">403</dim:field>\r\n         <dim:field qualifier=\"legacylastmod\" mdschema=\"dc\" element=\"source\">2011-09-29 19:16:51</dim:field>\r\n         <dim:field qualifier=\"legacyid\" mdschema=\"dc\" element=\"source\">2312</dim:field>\r\n         <dim:field qualifier=\"legacyagency\" mdschema=\"dc\" element=\"source\">United States National Ocean Service</dim:field>\r\n         </dim:dim>\r\n         </mets:xmlData>\r\n         </mets:mdWrap>\r\n         </mets:dmdSec>\r\n         <mets:fileSec>\r\n         <mets:fileGrp USE=\"THUMBNAIL\">\r\n         <mets:file GROUPID=\"group_file_66843\" CHECKSUM=\"73e73b5a14ff38efe11d6b1dacd570fa\" MIMETYPE=\"image/jpeg\" SIZE=\"154876\" ID=\"file_124081\" CHECKSUMTYPE=\"MD5\">\r\n         <mets:FLocat LOCTYPE=\"URL\" xlink:label=\"Generated Thumbnail\" xlink:href=\"/bitstream/handle/1834/20117/connected.pdf.jpg?sequence=3&amp;isAllowed=y\" xlink:type=\"locator\" xlink:title=\"connected.pdf.jpg\"/>\r\n         </mets:file>\r\n         </mets:fileGrp>\r\n         <mets:fileGrp USE=\"TEXT\">\r\n         <mets:file GROUPID=\"group_file_66843\" CHECKSUM=\"629fd05b10aeea0c6cbb759a42cf2241\" MIMETYPE=\"text/plain\" SIZE=\"49772\" ID=\"file_124080\" CHECKSUMTYPE=\"MD5\">\r\n         <mets:FLocat LOCTYPE=\"URL\" xlink:label=\"Extracted text\" xlink:href=\"/bitstream/handle/1834/20117/connected.pdf.txt?sequence=2&amp;isAllowed=y\" xlink:type=\"locator\" xlink:title=\"connected.pdf.txt\"/>\r\n         </mets:file>\r\n         </mets:fileGrp>\r\n         <mets:fileGrp USE=\"CONTENT\">\r\n         <mets:file GROUPID=\"group_file_66843\" CHECKSUM=\"ccf6b4d9996fdafa3eafd3ce981abf20\" MIMETYPE=\"application/pdf\" SIZE=\"3069632\" ID=\"file_66843\" CHECKSUMTYPE=\"MD5\">\r\n         <mets:FLocat LOCTYPE=\"URL\" xlink:href=\"/bitstream/handle/1834/20117/connected.pdf?sequence=1&amp;isAllowed=y\" xlink:type=\"locator\" xlink:title=\"connected.pdf\"/>\r\n         </mets:file>\r\n         </mets:fileGrp>\r\n         </mets:fileSec>\r\n         <mets:structMap LABEL=\"DSpace\" TYPE=\"LOGICAL\">\r\n         <mets:div DMDID=\"dmd_1\" TYPE=\"DSpace Item\">\r\n         <mets:div ID=\"div_2\" TYPE=\"DSpace Content Bitstream\">\r\n         <mets:fptr FILEID=\"file_66843\"/>\r\n         </mets:div>\r\n         </mets:div>\r\n         </mets:structMap>\r\n         </mets:METS>",
		"items": [
			{
				"itemType": "book",
				"title": "M/V CONNECTED Coral Reef Restoration Monitoring Report, Monitoring Events 2004-2005. Florida Keys National Marine Sanctuary Monroe County, Florida",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Schittone",
						"creatorType": "author"
					},
					{
						"firstName": "Erik C.",
						"lastName": "Franklin",
						"creatorType": "author"
					},
					{
						"firstName": "J. Harold",
						"lastName": "Hudson",
						"creatorType": "author"
					},
					{
						"firstName": "Jeff",
						"lastName": "Anderson",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"abstractNote": "This document presents the results of the monitoring of a repaired coral reef injured by the M/V Connected vessel grounding incident of March 27, 2001. This groundingoccurred in Florida state waters within the boundaries of the Florida Keys National Marine Sanctuary (FKNMS). The National Oceanic and Atmospheric Administration (NOAA) and the Board of Trustees of the Internal Improvement Trust Fund of the State of Florida, (“State of Florida” or “state”) are the co-trustees for the natural resourceswithin the FKNMS and, thus, are responsible for mediating the restoration of the damaged marine resources and monitoring the outcome of the restoration actions. Therestoration monitoring program tracks patterns of biological recovery, determines the success of restoration measures, and assesses the resiliency to environmental andanthropogenic disturbances of the site over time.The monitoring program at the Connected site was to have included an assessment of the structural stability of installed restoration modules and biological condition of reattached corals performed on the following schedule: immediately (i.e., baseline), 1, 3, and 6 years after restoration and following a catastrophic event. Restoration of this site was completed on July 20, 2001. Due to unavoidable delays in the settlement of the case, the“baseline” monitoring event for this site occurred in July 2004. The catastrophic monitoring event occurred on August 31, 2004, some 2 ½ weeks after the passage of Hurricane Charley which passed nearby, almost directly over the Dry Tortugas. In September 2005, the year one monitoring event occurred shortly after the passage of Hurricane Katrina, some 70 km to the NW. This report presents the results of all three monitoring events. (PDF contains 37 pages.)",
				"language": "en",
				"place": "Silver Spring, MD",
				"publisher": "NOAA/National Ocean Service/National Marine Sanctuary Program",
				"series": "Marine Sanctuaries Conservation Series",
				"url": "http://hdl.handle.net/1834/20117",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Acropora palmata"
					},
					{
						"tag": "Coral"
					},
					{
						"tag": "Ecology"
					},
					{
						"tag": "Environment"
					},
					{
						"tag": "Florida Keys National Marine Sanctuary"
					},
					{
						"tag": "Grounding"
					},
					{
						"tag": "Hurricane Charley"
					},
					{
						"tag": "Hurricane Katrina"
					},
					{
						"tag": "Management"
					},
					{
						"tag": "Monitoring"
					},
					{
						"tag": "Restoration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
