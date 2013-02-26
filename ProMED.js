{
	"translatorID": "3e9dbe21-10f2-40be-a921-f6ec82760927",
	"label": "ProMED",
	"creator": "Brandon Minich",
	"target": "http://www.promedmail.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-02-26 16:35:41"
}

function detectWeb(doc, url)  {
	if (url.toLowerCase().indexOf("direct.php?id=") != -1)  {
		return "email";
	}
} 
function doWeb(doc, url) {
		var newItem = new Zotero.Item('email');
		var info = ZU.xpathText(doc, '//div[@id="content_container"]//p[1]');
		var infos = info.replace(/Published Date:/, "").split(/Subject:|Archive Number:/)
		newItem.title = infos[1];
		newItem.date =infos[0];
		newItem.extra = "Archive Number: " + infos[2];
		newItem.url = doc.location.href;
		newItem.attachments = [{document:doc, title:"ProMED Email Snapshot", mimeType: "text/html"}]
		newItem.creators = [{lastName:"Internataional Society for Infection Diseases", fieldMode:true}]
	newItem.complete();
}
