{
	"translatorID": "7448d1d7-57e4-4685-b6e4-d4d9f7046fc2",
	"label": "SFU IPinCH",
	"creator": "Gladys Tang",
	"target": "^http://www\\.sfu\\.ca/kbipinch/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:43:33"
}

/*
	SFU IPinCH - translator for Zotero
	Copyright (C) 2010 Gladys Tang

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	if (url.match(/records\//)) {
		var metasT = doc.evaluate('//meta', doc, null , XPathResult.ANY_TYPE, null);
		var meta;
		while(meta = metasT.iterateNext()){
			//the catalog has more than 15 different item types records.
			if(meta.name == 'itemType')
				return meta.content;
		}
	}
}

function scrape(doc, url) {
	//namespace code
	var namespace = doc.documentElement.namespaceURI; 
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null; 
	} : null; 	
	var metasT = doc.evaluate('//meta', doc, null , XPathResult.ANY_TYPE, null);
	var meta;
	var item;
	while(meta = metasT.iterateNext()){
		if(meta.name == 'itemType')
			item = meta.content;
	}
		
	var newItem = new Zotero.Item(item);
	
	var items = new Object();
	var isDateStart = 0;
	var isDateEnd =0;
	var isPlace = 0;
	var dateStart ='';
	var dateEnd = '';
	var newspaperTitle = '';
	newItem.url = doc.location.href;
	var metas = doc.evaluate('//meta', doc, null , XPathResult.ANY_TYPE, null);
	while (meta = metas.iterateNext()) {
//		Zotero.debug(meta);
		if(meta.name !='itemType')
		{
			items[meta.name] = meta.content;
			//AUTHOR case
			if(meta.name =='author' ||  meta.name =='translator' || meta.name =='editor' || meta.name =='contributor'  || meta.name =='reviewedAuthor' || meta.name =='interviewee'
			|| meta.name == 'interviewer' || meta.name == 'director' || meta.name == 'recipient' || meta.name == 'artist' || meta.name == 'presenter')
			{	
				var creatorStr	 = meta.content;
				var firstname, lastname;
				var i = creatorStr.indexOf(",");
				if(i!=-1)
				{
					lastname = creatorStr.slice(0, i);
					firstname = creatorStr.slice(i +1 );
					creatorStr = firstname +' ' + lastname;
				}
				newItem.creators.push(Zotero.Utilities.cleanAuthor(creatorStr, meta.name, true));
			}
			else
				if(item='newspaperArticle' && meta.name == 'title')
				{
					if (newspaperTitle == '')
						newspaperTitle = meta.content;
					else						
						newspaperTitle += ', ' +  meta.content
				}	
			else
				//Date start case
				if(meta.name == 'dateY' || meta.name=='dateM' || meta.name=='dateD')
				{
					if(isDateStart ==0)
					{
						items['dateY'] = '';	
						items['dateM'] = '';	
						items['dateD'] = '';	
					}				
					items[meta.name] = meta.content;
					isDateStart = 1;
				}
			else
				//Date end case
				if(meta.name == 'dateYE' || meta.name=='dateME' || meta.name=='dateDE')
				{
					if(isDateEnd ==0)
					{
						items['dateYE'] = '';	
						items['dateME'] = '';	
						items['dateDE'] = '';	
					}				
					items[meta.name] = meta.content;
					isDateEnd = 1;
				}

			else
				if(meta.name == 'placeCountry' || meta.name == 'placeCity')
				{
					if(isPlace ==0)
					{
						items['placeCountry'] = '';	
						items['placeCity'] = '';	
					}				
					items[meta.name] = meta.content;
					isPlace = 1;
				}
			else	
				newItem[meta.name] = meta.content;
		}
	}
	
	if(item='newspaperArticle')
	{
		newItem.title = newspaperTitle;
	}
	if(!newItem.title)
		newItem.title = "No title";
	if (isDateStart==1)
	{	
		if(items['dateM'] == '' && items['dateD']=='')
			dateStart = items['dateY'];
		else		
			dateStart = items['dateM'] + '-' + items['dateD'] + '-' + items['dateY'];
		newItem['date'] = dateStart;
	}
	if (isDateEnd==1)
	{
		if(items['dateME'] == '' && items['dateDE']=='')
			dateEnd = items['dateYE'];
		else		
			dateEnd =' to ' + items['dateME'] + '-' + items['dateDE'] + '-' + items['dateYE'];
		newItem['date'] = dateStart + '-' + dateEnd;
	}
	
	if (isPlace==1)
		newItem['place'] = items['placeCity']  + ' , ' + items['placeCountry'];
	
// No such record yet.	
//	if(item=='document')  //special case, publication location merge to publisher.
//	{
//		newItem['publisher'] = newItem['publisher'] + ',' + newItem['place']					
//	}
	
	newItem.repository = "SFU IPinCH";

	newItem.complete();
}

function doWeb(doc, url) {
	//namespace code
	var namespace = doc.documentElement.namespaceURI; 
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null; 
		} : null; 

	var uris = new Array();
	
	uris =[url];	
	
	Zotero.Utilities.processDocuments(uris, scrape, function() {Zotero.done();});
	Zotero.wait();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sfu.ca/kbipinch/records/125/",
		"items": [
			{
				"itemType": "presentation",
				"creators": [
					{
						"lastName": "Garth Harmsworth",
						"creatorType": "presenter"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.sfu.ca/kbipinch/records/125/",
				"": "IE=EmulateIE7",
				"description": "<p>The Intellectual Property Issues in Cultural Heritage (IPinCH) research project is an international collaboration of over 50 archaeologists, lawyers, anthropologists, museum specialists, ethicists and other specialists, and 25 partnering organizations (including, among others, Parks Canada, the World Intellectual Property Organization, the Champagne and Aishihik First Nation, and the Barunga Community Management Board, an Aboriginal organization from Australia) building a foundation to facilitate fair and equitable exchanges of knowledge relating to archaeology and cultural heritage. The project is concerned with the theoretical, ethical, and practical implications of using knowledge about the past, and how these may affect communities, researchers, and other stakeholders.  Based at the Archaeology Department of Simon Fraser University, in Burnaby, British Columbia, Canada, the project is funded by the Social Sciences and Humanities Research Council of Canada. Project team members and partner organizations can be found in Canada, USA, Australia, New Zealand, UK, Germany, Switzerland and South Africa. A number of partner organizations are indigenous communities. Research will follow a community-based participatory research (CBPR) approach. The IPinCH project provides a foundation of research, knowledge and resources to assist scholars, academic institutions, descendant communities, policy makers, and many other stakeholders in negotiating more equitable and successful terms of research and policies through an agenda of community-based field research and topical exploration of intellectual property issues.</p>",
				"keywords": "IPinCH, ipinch, IP, intellectual property, cultural heritage, traditional knowledge, community-based participatory research, theory, practice, policy, ethics, archaeology, research, Aboriginal, indigenous, culture, anthropology, law, museum, community, knowledge, academic",
				"rights": "Author",
				"title": "Indigenous concepts, values and knowledge for sustainable development: New Zealand case studies",
				"date": "November-22-2002- to -24-",
				"place": "University of Waikato, Hamilton , New Zealand",
				"libraryCatalog": "SFU IPinCH",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Indigenous concepts, values and knowledge for sustainable development"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sfu.ca/kbipinch/records/145/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Joshua P Rosenthal",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.sfu.ca/kbipinch/records/145/",
				"": "IE=EmulateIE7",
				"description": "<p>The Intellectual Property Issues in Cultural Heritage (IPinCH) research project is an international collaboration of over 50 archaeologists, lawyers, anthropologists, museum specialists, ethicists and other specialists, and 25 partnering organizations (including, among others, Parks Canada, the World Intellectual Property Organization, the Champagne and Aishihik First Nation, and the Barunga Community Management Board, an Aboriginal organization from Australia) building a foundation to facilitate fair and equitable exchanges of knowledge relating to archaeology and cultural heritage. The project is concerned with the theoretical, ethical, and practical implications of using knowledge about the past, and how these may affect communities, researchers, and other stakeholders.  Based at the Archaeology Department of Simon Fraser University, in Burnaby, British Columbia, Canada, the project is funded by the Social Sciences and Humanities Research Council of Canada. Project team members and partner organizations can be found in Canada, USA, Australia, New Zealand, UK, Germany, Switzerland and South Africa. A number of partner organizations are indigenous communities. Research will follow a community-based participatory research (CBPR) approach. The IPinCH project provides a foundation of research, knowledge and resources to assist scholars, academic institutions, descendant communities, policy makers, and many other stakeholders in negotiating more equitable and successful terms of research and policies through an agenda of community-based field research and topical exploration of intellectual property issues.</p>",
				"keywords": "IPinCH, ipinch, IP, intellectual property, cultural heritage, traditional knowledge, community-based participatory research, theory, practice, policy, ethics, archaeology, research, Aboriginal, indigenous, culture, anthropology, law, museum, community, knowledge, academic",
				"rights": "Author",
				"publicationTitle": "Current Anthropology",
				"volume": "47(1)",
				"pages": "119-141",
				"title": "Politics, Culture, and Governance in the Development of Prior Informed Consent in Indigenous Communities",
				"date": "2006",
				"libraryCatalog": "SFU IPinCH",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sfu.ca/kbipinch/records/203/",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"lastName": "Daryl Pullman",
						"creatorType": "author"
					},
					{
						"lastName": "Laura Arbour",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.sfu.ca/kbipinch/records/203/",
				"": "IE=EmulateIE7",
				"description": "<p>The Intellectual Property Issues in Cultural Heritage (IPinCH) research project is an international collaboration of over 50 archaeologists, lawyers, anthropologists, museum specialists, ethicists and other specialists, and 25 partnering organizations (including, among others, Parks Canada, the World Intellectual Property Organization, the Champagne and Aishihik First Nation, and the Barunga Community Management Board, an Aboriginal organization from Australia) building a foundation to facilitate fair and equitable exchanges of knowledge relating to archaeology and cultural heritage. The project is concerned with the theoretical, ethical, and practical implications of using knowledge about the past, and how these may affect communities, researchers, and other stakeholders.  Based at the Archaeology Department of Simon Fraser University, in Burnaby, British Columbia, Canada, the project is funded by the Social Sciences and Humanities Research Council of Canada. Project team members and partner organizations can be found in Canada, USA, Australia, New Zealand, UK, Germany, Switzerland and South Africa. A number of partner organizations are indigenous communities. Research will follow a community-based participatory research (CBPR) approach. The IPinCH project provides a foundation of research, knowledge and resources to assist scholars, academic institutions, descendant communities, policy makers, and many other stakeholders in negotiating more equitable and successful terms of research and policies through an agenda of community-based field research and topical exploration of intellectual property issues.</p>",
				"keywords": "IPinCH, ipinch, IP, intellectual property, cultural heritage, traditional knowledge, community-based participatory research, theory, practice, policy, ethics, archaeology, research, Aboriginal, indigenous, culture, anthropology, law, museum, community, knowledge, academic",
				"rights": "Authors",
				"title": "\"Cultural Appropriation\" of Human Genetic Materials: So What's the Question?",
				"date": "n.d",
				"libraryCatalog": "SFU IPinCH",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "\"Cultural Appropriation\" of Human Genetic Materials"
			}
		]
	}
]
/** END TEST CASES **/