{
	"translatorID": "fcb1b13c-afc8-453c-bd9c-399b06911e3a",
	"label": "Microdata",
	"creator": "Philipp Zumstein",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-05-29 19:17:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Philipp Zumstein

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

function extractMicrodata(doc, url) {
	// The native DOM function will be removed soon:
	// https://bugzilla.mozilla.org/show_bug.cgi?id=909633
	// Thus we use here out own scraping methods for
	// microdata.
	
	// Helpful info: https://blog.scrapinghub.com/2014/06/18/extracting-schema-org-microdata-using-scrapy-selectors-and-xpath/
	
	var schemaItems = ZU.xpath(doc, '//*[@itemscope]');
	
	// Assign the itemid to each item first
	var usedTypes = [];
	for (var i=0; i<schemaItems.length; i++) {
		schemaItems[i].itemid = schemaItems[i].getAttribute("itemid") ||
			(schemaItems[i].getAttribute("id") ? url+"#"+schemaItems[i].getAttribute("id") : url+"#itemid="+i);
		//Z.debug(schemaItems[i].itemid);
		if (schemaItems[i].itemtype != "") {
			usedTypes[schemaItems[i].getAttribute("itemtype")] = (usedTypes[schemaItems[i].getAttribute("itemtype")] ? usedTypes[schemaItems[i].getAttribute("itemtype")]+1 : 1);
		}
	}
	Z.debug(usedTypes);
	
	function microdataValue(propertyNode) {
		//see also https://www.w3.org/TR/microdata/#values
		if (propertyNode.hasAttribute("itemscope")) {
			return propertyNode.itemid;
		}
		switch(propertyNode.tagName.toLowerCase()) {
			case "meta":
				return propertyNode.getAttribute("content");
				break;
			case "audio":
			case "embed":
			case "iframe":
			case "img":
			case "source":
			case "track":
			case "video":
				return propertyNode.getAttribute("src");
				break;
			case "a":
			case "area":
			case "link":
				return propertyNode.getAttribute("href");
				break;
			case "object":
				return propertyNode.getAttribute("data");
				break;
			case "data":
			case "meter":
				return propertyNode.getAttribute("value");
				break;
			case "time":
				return propertyNode.getAttribute("datetime");
				break;
			case "span"://non-standard, but can occur
				if (propertyNode.childNodes.length > 1 && propertyNode.getAttribute("content")) {
					return propertyNode.getAttribute("content");
					break;
				}
			default:
				return propertyNode.textContent;
		}
	}
	
	var statements = [];
	
	for (var i=0; i<schemaItems.length; i++) {
		var refs = schemaItems[i].getAttribute("itemref");//Currently itemref are not handled
		
		var usedProperties = [];
		
		var typesList = schemaItems[i].getAttribute("itemtype");
		if (typesList) {
			var types = typesList.split(" ");
			for (var k=0; k<types.length; k++) {
				statements.push([schemaItems[i].itemid, "rdfs:type", types[k]]);
			}
		}
		
		//get all properties
		var properties = ZU.xpath(schemaItems[i], './/*[@itemprop]');
		var exclude = ZU.xpath(schemaItems[i], './/*[@itemscope]//*[@itemprop]');
		for (var j=0; j<properties.length; j++) {
			if (exclude.indexOf(properties[j]) == -1) {
				var propertyList = properties[j].getAttribute("itemprop");
				var propertyValue = microdataValue(properties[j]);
				//it is possible to assign the same value to multiple
				//properties (separated by space) at the same time
				var propertyNames = propertyList.split(" ");
				for (var k=0; k<propertyNames.length; k++) {
					statements.push([schemaItems[i].itemid, propertyNames[k], propertyValue]);
					//Z.debug(" - " + propertyNames[k] + ":" + propertyValue);

					usedProperties[propertyNames[k]] = (usedProperties[propertyNames[k]]  ? usedProperties[propertyNames[k]]+1 : 1);
					
				}
			}
		}
		Z.debug(typesList);
		Z.debug(usedProperties);
	}
	
	Z.debug(statements);
}

function scrape(doc, url) {
	var item = new Zotero.Item('newspaperArticle');
	extractMicrodata(doc, url);
	//continue here
	
	//item.complete();
}


function doWeb(doc, url) {
	scrape(doc, url);
}

function detectWeb(doc, url) {
	return "newspaperArticle";
}


/* Example Debug Output:
http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php

21:11:23 [
             "http://schema.org/WebPage": 1
             "http://schema.org/Article": 1
             "http://schema.org/Person": 2
             "http://schema.org/ImageObject": 1
             "http://schema.org/VideoObject": 1
             "http://schema.org/UserComments": 17
         ]
21:11:23 http://schema.org/WebPage
21:11:23 [
             "mainContentOfPage": 1
             "author": 1
             "keywords": 1
             "interactionCount": 1
             "comment": 17
         ]
21:11:23 http://schema.org/Article
21:11:23 [
             "headline": 1
             "breadcrumb": 1
             "author": 1
             "datePublished": 1
             "primaryImageOfPage": 1
             "about": 1
             "articleBody": 1
         ]
21:11:23 http://schema.org/Person
21:11:23 [
             "name": 1
         ]
21:11:23 http://schema.org/ImageObject
21:11:23 [
             "video": 1
         ]
21:11:23 http://schema.org/VideoObject
21:11:23 []
21:11:23 http://schema.org/Person
21:11:23 [
             "image": 1
             "url": 2
             "name": 1
             "jobTitle": 1
             "description": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 http://schema.org/UserComments
21:11:23 [
             "creator": 1
             "commentText": 1
             "commentTime": 1
         ]
21:11:23 [
             "0": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "rdfs:type"
                 "2": "http://schema.org/WebPage"
             ]
             "1": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "mainContentOfPage"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
             ]
             "2": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "author"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
             ]
             "3": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "keywords"
                 "2": "French Tech"
             ]
             "4": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "interactionCount"
                 "2": "20  Usercomments"
             ]
             "5": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=6"
             ]
             "6": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=7"
             ]
             "7": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=8"
             ]
             "8": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=9"
             ]
             "9": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=10"
             ]
             "10": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=11"
             ]
             "11": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=12"
             ]
             "12": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=13"
             ]
             "13": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=14"
             ]
             "14": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=15"
             ]
             "15": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=16"
             ]
             "16": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=17"
             ]
             "17": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=18"
             ]
             "18": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=19"
             ]
             "19": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=20"
             ]
             "20": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=21"
             ]
             "21": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=0"
                 "1": "comment"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=22"
             ]
             "22": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "rdfs:type"
                 "2": "http://schema.org/Article"
             ]
             "23": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "headline"
                 "2": "La French Tech se distingue au CES de Shanghai"
             ]
             "24": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "breadcrumb"
                 "2": "\n        Home\n        TECH & WEB\n                Tech & Web\n            "
             ]
             "25": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "author"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=2"
             ]
             "26": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "datePublished"
                 "2": "2016-05-28T08:00:12+02:00"
             ]
             "27": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "primaryImageOfPage"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=3"
             ]
             "28": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "about"
                 "2": "VIDÉO - Les start-up françaises ont accaparé une partie de l'attention à Shanghai, lors du CES Asia qui s'est tenu il y a quelques jours."
             ]
             "29": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#20160528ARTFIG00007"
                 "1": "articleBody"
                 "2": "\n                        Quel bilan pour la French Tech au CES Asia 2016? Une vingtaine de start-up françaises ont participé, du 11 au 13 mai dernier, à la deuxième édition de ce salon créé l'an dernier, à Shanghai (Chine), dans le prolongement de son grand frère, le CES (Consumer Electronics Show) de Las Vegas, un salon qui attire chaque année, sur quatre jours, début janvier, plus de 3000 exposants et près de 180.000 visiteurs qui viennent découvrir 20.000 nouveaux produits.  Pour cette édition à Shanghai, consacrée comme la capitale de l'innovation dans le nouveau plan quinquennal chinois, la CTA (Consumer Technology Association), organisatrice des deux CES, a réussi à multiplier par deux le nombre de halls, passant de deux à quatre. Résultat: une fréquentation en légère hausse (plus de 32.000 visiteurs en trois jours), un intérêt croissant de la part de presse (plus de 1000 journalistes accrédités) et un nombre d'exposants en hausse (ils étaient 425, en provenance de 23 pays) dont 57% ne participaient pas au CES 2016 à Las Vegas. Cette statistique confirme ainsi la vocation régionale du CES Asia, une région du monde qui compte ce qui est sur le point de devenir le plus grand marché mondial: la Chine. Malgré une présence inférieure, en nombre, aux prévisions des coordinateurs de la French Tech Shanghai, les start-up françaises ont accaparé une partie de l'attention à Shanghai, dans la lignée de l'engouement qui accompagne la délégation française à Las Vegas, depuis deux ans. Gary Shapiro, le président de la CTA, particulièrement influent dans l'industrie, a non seulement inauguré le pavillon French Tech, seul pavillon identifié au CES Asia 2016, il a également participé à la réception donnée au consulat de France, avec plusieurs centaines d'invités dans les jardins de la résidence, déclarant, en français: «la French Tech est magnifique».                 "
             ]
             "30": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=2"
                 "1": "rdfs:type"
                 "2": "http://schema.org/Person"
             ]
             "31": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=2"
                 "1": "name"
                 "2": "#auteur"
             ]
             "32": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=3"
                 "1": "rdfs:type"
                 "2": "http://schema.org/ImageObject"
             ]
             "33": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=3"
                 "1": "video"
                 "2": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=4"
             ]
             "34": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=4"
                 "1": "rdfs:type"
                 "2": "http://schema.org/VideoObject"
             ]
             "35": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
                 "1": "rdfs:type"
                 "2": "http://schema.org/Person"
             ]
             "36": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
                 "1": "image"
                 "2": "http://plus.lefigaro.fr/page/benjamin-vincent-0"
             ]
             "37": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
                 "1": "url"
                 "2": "http://plus.lefigaro.fr/page/benjamin-vincent-0"
             ]
             "38": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
                 "1": "name"
                 "2": "http://plus.lefigaro.fr/page/benjamin-vincent-0"
             ]
             "39": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
                 "1": "url"
                 "2": "http://plus.lefigaro.fr/page/benjamin-vincent-0"
             ]
             "40": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
                 "1": "jobTitle"
                 "2": "journaliste"
             ]
             "41": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=5"
                 "1": "description"
                 "2": "Journaliste"
             ]
             "42": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=6"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "43": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=6"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/albertvonlecoq"
             ]
             "44": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=6"
                 "1": "commentText"
                 "2": "\n                On ne dit pas la \"French tech\" mais la technologie française. Est-ce assez clair ?\n\n            "
             ]
             "45": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=6"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 14:57"
             ]
             "46": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=7"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "47": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=7"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/efbe-10986"
             ]
             "48": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=7"
                 "1": "commentText"
                 "2": "\n                Des idées.\n\n            "
             ]
             "49": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=7"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 10:53"
             ]
             "50": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=8"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "51": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=8"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/x-y-20"
             ]
             "52": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=8"
                 "1": "commentText"
                 "2": "\n                Le choix délibéré de se désigner en anglais discrédite complètement ce label.\n\n            "
             ]
             "53": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=8"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 09:58"
             ]
             "54": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=9"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "55": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=9"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/dominique-creuzillet"
             ]
             "56": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=9"
                 "1": "commentText"
                 "2": "\n                Nous ne sommes plus au siècle de Louis XIV et de la suprématie du français.\n\n            "
             ]
             "57": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=9"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 13:30"
             ]
             "58": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=10"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "59": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=10"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/gerard-cavoli"
             ]
             "60": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=10"
                 "1": "commentText"
                 "2": "\n                Cocorico, la french tech a attiré l'attention, on n'en saura pas plus. Par contre on sait comment l'Etat dépense notre argent en cocktails inutiles où se précipitent les pique assiettes.\n\n            "
             ]
             "61": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=10"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 09:32"
             ]
             "62": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=11"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "63": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=11"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/didierlemoine"
             ]
             "64": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=11"
                 "1": "commentText"
                 "2": "\n                Bonjour, a quand un grand CES a Paris pour faire parti des grandes capitales des nouvelles technologies ?\n\n            "
             ]
             "65": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=11"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 08:40"
             ]
             "66": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=12"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "67": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=12"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/etienne-roger-97442"
             ]
             "68": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=12"
                 "1": "commentText"
                 "2": "\n                Cette promotion d'entreprises françaises à l'étranger est une action très positive.\nEn règle générale nos entreprises devraient être plus présentes dans les salons internationaux.\nCe pourrait d'ailleurs être une occasion pour le MEDEF  de favoriser la croissance de leurs compatriotes PME.\nLes grandes entreprises sont implantées dans le monde entier et elles pourraient aider leurs consoeurs qui ne savent pas forcément s'y prendre. .\n\n            "
             ]
             "69": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=12"
                 "1": "commentTime"
                 "2": "Le 28/05/2016 à 20:47"
             ]
             "70": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=13"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "71": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=13"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/1728fd"
             ]
             "72": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=13"
                 "1": "commentText"
                 "2": "\n                Pourquoi utiliser l'anglais pour désigner la technologie français ? Pour faire plus \"moderne\" ?\n\n            "
             ]
             "73": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=13"
                 "1": "commentTime"
                 "2": "Le 28/05/2016 à 20:37"
             ]
             "74": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=14"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "75": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=14"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/jean-historien"
             ]
             "76": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=14"
                 "1": "commentText"
                 "2": "\n                Pour essayer de duper les gens, mais rassurez vous, nul n'est dupe.\n\n            "
             ]
             "77": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=14"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 00:14"
             ]
             "78": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=15"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "79": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=15"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/mrsleepy"
             ]
             "80": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=15"
                 "1": "commentText"
                 "2": "\n                Pour attirer les investisseurs étrangers.\nC'est pas possible de sortir des remarques pareilles en 2016.\n\n            "
             ]
             "81": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=15"
                 "1": "commentTime"
                 "2": "Le 28/05/2016 à 21:19"
             ]
             "82": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=16"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "83": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=16"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/x-y-20"
             ]
             "84": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=16"
                 "1": "commentText"
                 "2": "\n                Excusez moi, c’est bien vous que je trouve « pas possible », même votre pseudo est en anglais, le mieux dans votre cas c’est d’émigrer d’urgence dans un pays anglo-saxon, les français ont la totale possibilité d’utiliser leur langue en science et technologie, domaines où leurs contributions sont nombreuses et reconnues, certes certains sont capitulards dans l’âme, mais à votre contraire, bon nombre d’entre préfèrent travailler dans leur langue, y compris dans le domaine des hautes technologies.\n\n            "
             ]
             "85": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=16"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 10:05"
             ]
             "86": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=17"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "87": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=17"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/vengeurmaskac-366964"
             ]
             "88": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=17"
                 "1": "commentText"
                 "2": "\n                Article qui aurait pu être écrit par Michel Sapin. Autosatisfaction et nombrilisme sont de rigueur. On se fiche de savoir qu'un cocktail a été organisé au consulat de France.\nIl eut été bien plus intéressant de nous expliquer en quoi ces entreprises sont innovantes en parlant, par exemple, de leurs produits. Il eut été également souhaitable de nous parler des nouveautés de ce salon toutes nations confondues. Comme le dit depuis lontemps la célèbre chanson \"Parlez-moi de moi, y'a qu'ça qui m'intéresse\"...\n\n            "
             ]
             "89": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=17"
                 "1": "commentTime"
                 "2": "Le 28/05/2016 à 16:33"
             ]
             "90": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=18"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "91": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=18"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/daly001-45652"
             ]
             "92": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=18"
                 "1": "commentText"
                 "2": "\n                Pendant que vous commentez, des travailleurs innovent...\n\n            "
             ]
             "93": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=18"
                 "1": "commentTime"
                 "2": "Le 28/05/2016 à 19:48"
             ]
             "94": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=19"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "95": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=19"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/x-y-20"
             ]
             "96": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=19"
                 "1": "commentText"
                 "2": "\n                C'est ça... Une baudruche impressionnante, gonflée à grands frais mais pleine de vent quand même.\n\n            "
             ]
             "97": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=19"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 10:07"
             ]
             "98": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=20"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "99": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=20"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/vala-vala"
             ]
             "100": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=20"
                 "1": "commentText"
                 "2": "\n                \"les start-up françaises ont accaparé une partie de l'attention à Shanghai\" : vous donnez des exemples du pourquoi ? Ou est-ce juste pipeau ?\n\n            "
             ]
             "101": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=20"
                 "1": "commentTime"
                 "2": "Le 28/05/2016 à 16:17"
             ]
             "102": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=21"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "103": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=21"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/jean-historien"
             ]
             "104": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=21"
                 "1": "commentText"
                 "2": "\n                Le rêve n'est pas interdit !\nSinon, vous avez raison, c'est du pipeau.\n\n            "
             ]
             "105": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=21"
                 "1": "commentTime"
                 "2": "Le 29/05/2016 à 00:12"
             ]
             "106": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=22"
                 "1": "rdfs:type"
                 "2": "http://schema.org/UserComments"
             ]
             "107": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=22"
                 "1": "creator"
                 "2": "http://plus.lefigaro.fr/page/rabbi-gougueule-0"
             ]
             "108": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=22"
                 "1": "commentText"
                 "2": "\n                Voilà de bonnes nouvelles pour la France ! Notre orgueil patriotique continue de plus belle, c'est le signe que \"ça va mieux\", malgré nos humeurs souvent maussades ou querelleuses.\n\n            "
             ]
             "109": [
                 "0": "http://www.lefigaro.fr/secteur/high-tech/2016/05/28/32001-20160528ARTFIG00007-la-french-tech-se-distingue-au-ces-de-shanghai.php#itemid=22"
                 "1": "commentTime"
                 "2": "Le 28/05/2016 à 13:38"
             ]
         ]
21:11:23 Translation successful
