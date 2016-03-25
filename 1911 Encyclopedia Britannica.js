function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

/*
1911 Encyclopedia Britannica Translator
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


FW.Scraper({ 
	itemType : 'encyclopediaArticle',
	encyclopediaTitle : "1911 Encyclopædia Britannica",
	detect : FW.Url().match(/(encyclopedia\.jrank\.org\/).{7}(\/).+/),
	title : FW.Xpath('//html/body/div[1]/div[3]/h1').text(),
	attachments : [{
		url : FW.Url(),
		title : "Jrank Snapshot",
		type : "text/html"
		}],
	abstractNote : FW.Xpath('//html/body/div[1]/blockquote[1]/b').text().trim(),
	archive : "Jrank",
	rights : FW.Xpath('//div[@id="footer"]').text(),
	publisher : "Encyclopædia Britannica, Inc.",
	place : "New York",
	edition : "11th ed.",
	numberOfVolumes : '29',
	volume : FW.Xpath('//html/body/div[1]/div[3]/div[@class="tinyText"]').text().remove(/(Originally appearing in Volume\nV)/).remove(/(,)/).remove(/\n/).remove(/(P).+/).remove(/\n/).remove(/(o).+/).prepend("Vol. "),
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
	
		if (item.abstractNote == "There are no comments yet for this article."){
			item.abstractNote = "";
		}
	}} 
});
