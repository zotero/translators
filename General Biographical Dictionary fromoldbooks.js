function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

/*
General Biographical Dictionary at fromoldbooks.org Translator
Copyright (C) 2015 Jonathan Meyer

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
FW.Scraper({
	itemType : 'encyclopediaArticle',
	encyclopediaTitle : "General Biographical Dictionary",
	detect : FW.Url().match(/(fromoldbooks\.org\/Chalmers\-Biography\/).(\/).+/),
	title : FW.Xpath('//html/body/div[2]/div[1]/p[@class="breadcrumb"]').text().remove(/^.+(\/)/).remove(/(\[).+/).trim(),
	attachments : [{
		url : FW.Url(),
		title : "General Biographical Dictionary Snapshot",
		type : "text/html"
		}],
	archive : "fromoldbooks.org",
	rights : FW.Xpath('//html/body/div[2]/div[4]/p[@class="disclaimer"]').text().remove(/\n\t\t/g),
	publisher : "J. Nichols and Son, et al",
	place : "London",
	date : '1813',
	numberOfVolumes : '32',
	volume : FW.Xpath('//html/body/div[2]/div[1]/p[@class="breadcrumb"]').text().remove(/^.+(\[)/).remove(/(,).+/),
	hooks : { "scraperDone": function (item,doc,url) {
		item.creators.push({
			"firstName" : "Alexander",
			"lastName" : "Chalmers",
			"creatorType" : "editor"
		})}}
});


/** Search results*/
FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/(fromoldbooks\.org\/Chalmers\-Biography\/).(\/)$/),
choices          : {
  titles :  FW.Xpath('//html/body/div[3]/div/div/div[1]/ul[@class="letterindex"]/li["search-result"]/a').text().trim(),
  urls    :  FW.Xpath('//html/body/div[3]/div/div/div[1]/ul/li["search-result"]/a').key("href")
}
});
