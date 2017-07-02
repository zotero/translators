{
	"translatorID": "6b09b92d-f47e-4573-8a00-74245f7c6c5e",
	"label": "Bayerische Staatsbibliothek (OpacPlus)",
	"creator": "bkroll",
	"target": "^https://opacplus.bsb-muenchen.de/metaopac/singleHit.do.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2017-07-02 19:51:29"
}

function detectWeb(doc, url) {
	mediaTypeIcon = doc.getElementById("mediaTypeIcon");
	mediaTypeNode = mediaTypeIcon.getElementsByTagName("img");
	mediaType = mediaTypeNode[0].getAttribute("alt");

	if (mediaType == "Buch") {
		return "book";
	}
}

/** get MarcXml representation from opac dataset and use MarcXml translator **/
function doWeb(doc, url) {
	marcxmlLinkNode = doc.getElementById("marcLink");
	marcxmlLinkString = marcxmlLinkNode.getAttribute("href");
	Zotero.Utilities.doGet("https://opacplus.bsb-muenchen.de" + marcxmlLinkString, translateMarcxml);
}

function translateMarcxml(marcxmlString, responseObject, responseUrl) {
	var marcxmlTranslator = Zotero.loadTranslator("import");
	marcxmlTranslator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
	marcxmlTranslator.setString(marcxmlString);
	marcxmlTranslator.translate();
}
