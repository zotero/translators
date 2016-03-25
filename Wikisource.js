{
	"translatorID": "076bd26a-1517-469d-85e9-31316a6f6cb0",
	"label": "Wikisource",
	"creator": "Sebastian Karcher",
	"target": "^https?://en\\.wikisource\\.org/w",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-08-15 23:08:53"
}

function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

/*
Wikisource Translator
Copyright (C) 2013 Sebastian Karcher
Updated by Jonathan Meyer 2015

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.-
*/

/**Sources*/
/**Scraper for Dictionary of National Biography 1885*/
FW.Scraper({
	itemType : 'encyclopediaArticle',
	encyclopediaTitle : "Dictionary of National Biography",
	detect : FW.Xpath('//html/body/div[3]/h1[contains(text(),"(DNB00)")]'),
	title : FW.Xpath('//h1[@id="firstHeading"]').text().trim().remove(/\n.+/g).remove(/(\(DNB00\))/),
	attachments : [{
		url : FW.Url(),
		title : "Wikisource Snapshot",
		type : "text/html"
		}],
	tags	 : FW.Xpath('//div[@id="mw-normal-catlinks"]/ul/li/a').text(),
	creators : FW.Xpath('//span[@id="header_author_text"]').text().cleanAuthor("author"),
	abstractNote : FW.Xpath('//div[contains(@class, "header_notes")]').text().trim().remove(/.+?\n\n/).remove(/\n\n+.+/g),
	archive : "Wikisource",
	rights : FW.Xpath('//li[@id="footer-info-copyright"]').text(),
	publisher : "Smith, Elder, & CO.",
	place : "London",
	numberOfVolumes : '63',
	volume : FW.Xpath('//a[contains(text(),"Volume")]').text().remove(/(Volume )/).remove(/[0](?=[1-9])/).prepend("Vol. "),
	hooks : { "scraperDone": function (item,doc, url) {
		var volNum = (item.volume).substring(5,7);
		if (volNum <= 26){ 
			item.creators.push({
			"firstName" : "Leslie",
			"lastName" : "Stephen",
			"creatorType" : "editor"
		})}
		if (volNum >= 22){ 
			item.creators.push({
			"firstName" : "Sidney",
			"lastName" : "Lee",
			"creatorType" : "editor"
		})}
		item.date = ~~((volNum-1)/4)+1885;
	}} 	
});


/**Scraper for Dictionary of National Biography 1901 supplement */
FW.Scraper({
	itemType : 'encyclopediaArticle',
	encyclopediaTitle : "Dictionary of National Biography, 1901 Supplement",
	detect : FW.Xpath('//html/body/div[3]/h1[contains(text(),"(DNB01)")]'),
	title : FW.Xpath('//h1[@id="firstHeading"]').text().trim().remove(/\n.+/g).remove(/(\(DNB01\))/),
	attachments : [{
		url : FW.Url(),
		title : "Wikisource Snapshot",
		type : "text/html"
		}],
	tags	 : FW.Xpath('//div[@id="mw-normal-catlinks"]/ul/li/a').text(),
	creators : FW.Xpath('//span[@id="header_author_text"]').text().remove(/\n/g).remove(/\(.+/).cleanAuthor("author"),
	abstractNote : FW.Xpath('//div[contains(@class, "header_notes")]').text().trim().remove(/.+?\n\n/).remove(/\n\n+.+/g),
	archive : "Wikisource",
	rights : FW.Xpath('//li[@id="footer-info-copyright"]').text(),
	publisher : "Smith, Elder, & CO.",
	place : "London",
	date : "1901",
	numberOfVolumes : '3',
	volume : FW.Xpath('/html/body/div[3]/div[3]/div[5]/div[1]/div[2]/div[1]/a').key('title')
		.remove(/(Page:Dictionary_of_National_Biography._Sup._Vol_)/).remove(/(_).+/).prepend("Vol. "),
	hooks : { "scraperDone": function (item,doc, url) {
			item.creators.push({
			"firstName" : "Sidney",
			"lastName" : "Lee",
			"creatorType" : "editor"
		})
	}} 	
});

/**Scraper for Dictionary of National Biography 1912 supplement */
FW.Scraper({
	itemType : 'encyclopediaArticle',
	encyclopediaTitle : "Dictionary of National Biography, 1912 Supplement",
	detect : FW.Xpath('//html/body/div[3]/h1[contains(text(),"(DNB12)")]'),
	title : FW.Xpath('//h1[@id="firstHeading"]').text().trim().remove(/\n.+/g).remove(/(\(DNB12\))/),
	attachments : [{
		url : FW.Url(),
		title : "Wikisource Snapshot",
		type : "text/html"
		}],
	tags	 : FW.Xpath('//div[@id="mw-normal-catlinks"]/ul/li/a').text(),
	creators : FW.Xpath('//span[@id="header_author_text"]').text().remove(/\n/g).remove(/\(.+/).cleanAuthor("author"),
	abstractNote : FW.Xpath('//div[contains(@class, "header_notes")]').text().trim().remove(/.+?\n\n/).remove(/\n\n+.+/g),
	archive : "Wikisource",
	rights : FW.Xpath('//li[@id="footer-info-copyright"]').text(),
	publisher : "Smith, Elder, & CO.",
	place : "London",
	date : "1912",
	numberOfVolumes : '3',
	volume : FW.Xpath('/html/body/div[3]/div[3]/div[5]/div[1]/div[2]/div[1]/a').key('title')
		.remove(/(Page:Dictionary_of_National_Biography,_Second_Supplement,_volume_)/).remove(/(\.).+/).prepend('Vol. '),
	hooks : { "scraperDone": function (item,doc, url) {
			item.creators.push({
			"firstName" : "Sidney",
			"lastName" : "Lee",
			"creatorType" : "editor"
		})
	}} 	
});

/**Scraper for 1911 Encyclopædia Britannica */
FW.Scraper({ 
	itemType : 'encyclopediaArticle',
	encyclopediaTitle : "1911 Encyclopædia Britannica",
	detect : FW.Xpath('//html/body/div[3]/h1[contains(text(),"1911 Encyclopædia Britannica")]'),
	title : FW.Xpath('//span[@id="header_section_text"]').text(),
	attachments : [{
		url : FW.Url(),
		title : "Wikisource Snapshot",
		type : "text/html"
		}],
	tags	 : FW.Xpath('//div[@id="mw-normal-catlinks"]/ul/li/a').text(),
//	creators : FW.Xpath('//span[@id="header_author_text"]').text().cleanAuthor("author"),
	abstractNote : FW.Xpath('//div[contains(@class, "header_notes")]').text().trim().remove(/.+?\n\n/).remove(/\n\n+.+/g),
	archive : "Wikisource",
	rights : FW.Xpath('//li[@id="footer-info-copyright"]').text(),
	publisher : "Encyclopædia Britannica, Inc.",
	place : "New York",
//	date : "1911",
	edition : "11th ed.",
	numberOfVolumes : '29',
	volume : FW.Xpath('//a[@class="mw-redirect"]').text().remove(/(Volume)/).prepend("Vol."),
	hooks : { "scraperDone": function (item,doc, url) {
		item.creators.push({
		"firstName" : "Hugh",
		"lastName" : "Chisholm",
		"creatorType" : "editor"
		})
		var volNum = (item.volume).substring(5,7);
		if (volNum <= 9){
			item.date = 1910;
		}else {item.date = 1911}
	}} 
})	

/**Scraper for 1922 Encyclopædia Britannica, AKA 1911 Supplement*/
FW.Scraper({ 
	itemType : 'encyclopediaArticle',
	encyclopediaTitle : "1922 Encyclopædia Britannica (11th ed. Supplement)",
	detect : FW.Xpath('//html/body/div[3]/h1[contains(text(),"1922 Encyclopædia Britannica")]'),
	title : FW.Xpath('//span[@id="header_section_text"]').text(),
	attachments : [{
		url : FW.Url(),
		title : "Wikisource Snapshot",
		type : "text/html"
		}],
	tags	 : FW.Xpath('//div[@id="mw-normal-catlinks"]/ul/li/a').text(),
//	creators : FW.Xpath('//span[@id="header_author_text"]').text().remove(/\n/g).remove(/\(.+/).cleanAuthor("author"),
	abstractNote : FW.Xpath('//div[contains(@class, "header_notes")]').text().trim().remove(/.+?\n\n/).remove(/\n\n+.+/g),
	archive : "Wikisource",
	rights : FW.Xpath('//li[@id="footer-info-copyright"]').text(),
	publisher : "Encyclopædia Britannica, Inc.",
	place : "New York",
	date : "1922",
	numberOfVolumes : '3',
//	volume : FW.Xpath('//a[@class="mw-redirect"]').text().remove(/(Volume)/).prepend("Vol."),
	edition : "12th ed.",
	hooks : { "scraperDone": function (item,doc, url) {
		item.creators.push({
		"firstName" : "Hugh",
		"lastName" : "Chisholm",
		"creatorType" : "editor"
		}) 
		if (item.title <= "English History"){
			item.volume = "Vol. 30"
		}
		if (item.title > "English History" && item.title <= "Oyama, Iwao"){
			item.volume = "Vol. 31"
		}
		if (item.title > "Oyama, Iwao"){
			item.volume = "Vol. 32"
		}
	}} 
});	

/**Everything else*/
FW.Scraper({
	itemType : 'manuscript',
	detect : FW.Xpath('//h1[@id="firstHeading"]'),
	title : FW.Xpath('//h1[@id="firstHeading"]').text().trim().remove(/\n.+/g),
	attachments : [{
  		url : FW.Url(),
		title : "Wikisource Snapshot",
  		type : "text/html"
		}],
	tags	 : FW.Xpath('//div[@id="mw-normal-catlinks"]/ul/li/a').text(),
	creators : FW.Xpath('//span[@id="header_author_text"]').text().remove(/\n/g).remove(/\(.+/).cleanAuthor("author"),
	abstractNote : FW.Xpath('//div[contains(@class, "header_notes")]').text().trim().remove(/.+?\n\n/).remove(/\n\n+.+/g),
	//date : FW.Xpath('//tr/td[@id="fileinfotpl_date"]/following-sibling::td').text(),
	archive : "Wikisource",
	rights : FW.Xpath('//li[@id="footer-info-copyright"]').text()
}); 


/** Search results */
FW.MultiScraper({
itemType : "multiple",
detect : FW.Xpath('//ul[contains(@class, "search-results")]'),
choices : {
  titles : FW.Xpath('//ul[contains(@class, "search-results")]//a').text(),
  urls : FW.Xpath('//ul[contains(@class, "search-results")]//a').key('href').text()
}});
