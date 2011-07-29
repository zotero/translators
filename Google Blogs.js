{
	"translatorID": "58641ca2-d324-445b-a618-4e7c4631726f",
	"label": "Google Blogs",
	"creator": "Avram Lyon",
	"target": "^https?://www.google.[^/]+/.*[#&]tbm=blg",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-07-30 03:19:03"
}

function detectWeb(doc, url) {
	return "multiple";
}

function doWeb(doc, url) {
	var list = ZU.xpath(doc, '//div[@id="search"]//ol[@id="rso"]/li/div[@class="vsc"]');
	var i, node;
	var items = [];
	var names = {};
	for (i in list) {
		items[i] = new Zotero.Item("blogPost");
		link = ZU.xpath(list[i], './span/h3/a')[0];
		names[i] = link.textContent;
		items[i].title = link.textContent;
		items[i].url = link.href;
		items[i].attachments.push({url:link.href,
					title:"Blog Snapshot",
					mimeType:"text/html"});
		items[i].blogTitle = ZU.xpath(list[i], './/cite/a')[0].textContent;
		node = ZU.xpath(list[i], './/div[@class="f kb"]')[0].textContent.match(/^(.*) by (.*)$/);
		if (node) {
			items[i].date = node[1];
			items[i].creators.push(ZU.cleanAuthor(node[2], "author"));
		}
	}

	Z.selectItems(names, function(names) {
		var j;
		for (j in names) {
			items[j].complete();
		}
	});
}
