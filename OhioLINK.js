function detectWeb(doc, url) {
	if (getRISLink(doc)) return "journalArticle";
}

function getRISLink(doc) {
	return ZU.xpathText(doc, '//p[@id="ris-export"]/a/@href');
}

function doWeb(doc, url) {
	ZU.doGet(getRISLink(doc), function(text) {
		var trans = Zotero.loadTranslator('import');
		// RIS
		trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
		trans.setString(text);
		trans.setHandler('itemDone', function(obj, item) {
			var pdf = ZU.xpath(doc, '//div[@id="manifest"]/a[contains(@title,"PDF")]')[0];
			if (pdf) {
				item.attachments.push({
					title: 'Full Text PDF',
					url: pdf.href,
					mimeType: 'application/pdf'
				});
			}
			
			item.complete();
		});
		trans.translate();
	});
}
