{
	"translatorID": "cf64e005-38f4-4698-82bb-c8b67ffcf05e",
	"label": "The Computer Vision Foundation",
	"creator": "WEI Qisheng",
	"target": "https://openaccess.thecvf.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-17 11:29:33"
}

/*
	Not all CVPR meetings are supported by The CVF, so some papers are not in "openaccess.thecvf.com" (for example, CVPR2012).
*/

function detectWeb(doc, url) {
	if (getSearchResults(doc, true) == "multiple") {
		return "multiple";
	}
	else if (getSearchResults(doc, true) == "single") {
		return "conferencePaper";
	}
	return false;
}

function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "conferencePaper";
		trans.doWeb(doc, url);
	});
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = getSearchResults(doc, false);
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;

	let rows_multiple = doc.querySelectorAll('dt a[href*="_paper.html"]');
	let rows_single = doc.querySelectorAll('dd a[href*="_paper.pdf"]');

	if (rows_multiple.length > 0) {
		if (checkOnly) return "multiple";

		for (let row of rows_multiple) {
			let href = row.href;
			let title = ZU.trimInternal(row.textContent);
			if (!href || !title) continue;
			found = true;
			items[href] = title;
		}
		return found ? items : false;
	}
	else if (rows_single.length > 0) {
		if (checkOnly) return "single";
	}

	return false;
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openaccess.thecvf.com/CVPR2023?day=all",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://openaccess.thecvf.com/content/CVPR2023/html/Ci_GFPose_Learning_3D_Human_Pose_Prior_With_Gradient_Fields_CVPR_2023_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "GFPose: Learning 3D Human Pose Prior With Gradient Fields",
				"creators": [
					{
						"firstName": "Hai",
						"lastName": "Ci",
						"creatorType": "author"
					},
					{
						"firstName": "Mingdong",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Wentao",
						"lastName": "Zhu",
						"creatorType": "author"
					},
					{
						"firstName": "Xiaoxuan",
						"lastName": "Ma",
						"creatorType": "author"
					},
					{
						"firstName": "Hao",
						"lastName": "Dong",
						"creatorType": "author"
					},
					{
						"firstName": "Fangwei",
						"lastName": "Zhong",
						"creatorType": "author"
					},
					{
						"firstName": "Yizhou",
						"lastName": "Wang",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"conferenceName": "Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition",
				"language": "en",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "4800-4810",
				"shortTitle": "GFPose",
				"url": "https://openaccess.thecvf.com/content/CVPR2023/html/Ci_GFPose_Learning_3D_Human_Pose_Prior_With_Gradient_Fields_CVPR_2023_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
