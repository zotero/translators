{
	"translatorID": "1c1ad84d-623e-48b5-baf3-caabab63734c",
	"label": "Thorlabs",
	"creator": "malekinho8",
	"target": "^https?://www\\.thorlabs\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-17 18:55:57"
}

function detectWeb(doc, url) {
	if (url.includes("thorlabs.com")) {
		return "webpage";
	}
	return false;

}

function doWeb(doc, url) {
	var item = new Zotero.Item("webpage");
	item.title = doc.title;
	item.url = url;
	item.accessDate = new Date().toISOString();
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thorlabs.com/thorProduct.cfm?partNumber=RA90/M",
		"items": [
			{
				"itemType": "webpage",
				"title": "Thorlabs - RA90/M Right-Angle Clamp for Ø1/2\" Posts, 5 mm Hex",
				"creators": [],
				"url": "https://www.thorlabs.com/thorProduct.cfm?partNumber=RA90/M",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
