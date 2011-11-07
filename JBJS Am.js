{
	"translatorID": "8a325571-c2a8-417a-8a25-b1dca65154c3",
	"label": "JBJS Am",
	"creator": "Max Gordon and Avram Lyon",
	"target": "^https?://(?:www\\.)?jbjs\\.org[^\\/]*/(?:searchresults|issue|article)\\.aspx",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2011-11-06 23:37:43"
}

/*
   JBJS Translator
   Copyright (C) 2011 Max Gordon and Avram Lyon

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 This translator is derived from the Wiley Online Library translator, which
 was first written by Sean Takats and Michael Berkowitz.
 */

function detectWeb(doc, url){
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	if (url.match(/\/issue|\/searchresults/)) {
		return "multiple";
	} else return "journalArticle";
}

function doWeb(doc, url){
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	var host = 'http://' + doc.location.host + "/";
	
	var urls = new Array();
	if(detectWeb(doc, url) == "multiple") {  //search
		var title;
		var availableItems = new Array();
		var articles = doc.evaluate('//div[@class="articleContent"]//a[@class="relatedArticle"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		//Zotero.debug(articles);
		var article = false;
		while (article = articles.iterateNext()) {
			availableItems[article.href] = article.textContent;
		}
		Zotero.selectItems(availableItems, function (items) {
			if(!items) {
				return true;
			}
			for (var i in items) {
				urls.push(i);
			}
			Zotero.Utilities.processDocuments(urls, scrape, function () { Zotero.done(); });
		});
	} else { //single article
		scrape(doc, url);
	}
	Zotero.wait();
}

function scrape(doc,url)
{
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	   
	var newItem=new Zotero.Item("journalArticle");
	   var temp;
	   var xpath;
	   var row;
	   var rows;

	   newItem.url = doc.location.href;
	   var metaTags = doc.getElementsByTagName("meta");

	   var pages = [false, false];
	   var doi = false;
	   var pdf = false;
	   var html = false;
	for (var i = 0; i< metaTags.length; i++) {
		var tag = metaTags[i].getAttribute("name");
		var value = metaTags[i].getAttribute("content");
		//Zotero.debug(pages + pdf + html);
	   		//Zotero.debug("Have meta tag: " + tag + " => " + value);
		switch (tag) {
			// Google.
			case "citation_journal_title": if (!newItem.publicationTitle) newItem.publicationTitle = value; break;
			case "citation_journal_abbrev": if (!newItem.journalAbbreviation) newItem.journalAbbreviation = value; break;
			case "citation_author":    			
				newItem.creators.push(Zotero.Utilities.cleanAuthor(value, "author", false));
			case "citation_title": if (!newItem.title) newItem.title = value; break;
			case "citation_publisher": if (!newItem.publisher) newItem.publisher = value; break;
			case "citation_date": if (!newItem.date && value != "NaN" && value != "") newItem.date = value; break;
			case "citation_year": if (!newItem.date && value != "NaN" && value != "") newItem.date = value; break;
			case "citation_volume": if (!newItem.volume && value != "NaN" && value != "") newItem.volume = value; break;
			case "citation_issue": if (!newItem.issue && value != "NaN" && value != "") newItem.issue = value; break;
			case "citation_firstpage": if (!pages[0] && value != "NaN" && value != "") pages[0] = value; break;
			case "citation_lastpage": if (!pages[1] && value != "NaN" && value != "") pages[1] = value; break;
			case "citation_issn": if (!newItem.ISSN && value != "NaN" && value != "") newItem.ISSN = value; break;
			case "citation_isbn": if (!newItem.ISBN && value != "NaN" && value != "") newItem.ISBN = value; break;
			case "citation_doi": if (!newItem.DOI) newItem.DOI = value; break;
			case "citation_reference": break; // These are citations in the paper-- Z doesn't use them
			default:
				//Zotero.debug("Ignoring meta tag: " + tag + " => " + value);
		}
	}
		
	if (pages[0] && pages[1]) newItem.pages = pages.join('-')
	else newItem.pages = pages[0] ? pages[1] : (pages[1] ? pages[1] : "");

	// Get the abstract
	var abstractNode = doc.evaluate('//div[h2/text()="Abstract"]/following-sibling::div[1]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if (abstractNode) newItem.abstractNote = abstractNode.textContent;
	
	newItem.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://jbjs.org/issue.aspx?journalid=12&issueid=4324",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://jbjs.org/article.aspx?articleid=178197",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Kevin L.",
						"lastName": "Ju",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Zurakowski",
						"creatorType": "author"
					},
					{
						"firstName": "Mininder S.",
						"lastName": "Kocher",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://jbjs.org/article.aspx?articleid=178197",
				"publicationTitle": "The Journal of Bone and Joint Surgery (American)",
				"journalAbbreviation": "JBJS",
				"title": "Differentiating Between Methicillin-Resistant and Methicillin-Sensitive Staphylococcus aureus Osteomyelitis in Children: An Evidence-Based Clinical Prediction Algorithm",
				"volume": "93",
				"issue": "18",
				"date": "2011/09/21",
				"ISSN": "0021-9355",
				"DOI": "10.2106/JBJS.J.01154",
				"publisher": "The Journal of Bone and Joint Surgery",
				"pages": "1693-1701",
				"abstractNote": "Background: \n  Although osteomyelitis was once commonly due to methicillin-sensitive Staphylococcus aureus (MSSA), methicillin-resistant Staphylococcus aureus (MRSA)—which causes more virulent and invasive infections—has emerged as an increasingly important cause. Differentiating clinically between MRSA and MSSA can be challenging, but is necessary in order to promptly administer appropriate antibiotics and maintain vigilance against possible sequelae of MRSA osteomyelitis. The purpose of our study was to develop a clinical prediction algorithm to distinguish between MRSA and MSSA osteomyelitis in children.Methods: \n  A retrospective review of 129 children presenting with culture-proven Staphylococcus aureus osteomyelitis between 2000 and 2009 was performed. The demographics, symptoms, vital signs, and laboratory test values in the MSSA group (n = 118) and the MRSA group (n = 11) were compared with use of univariate analysis. Multivariate logistic regression with backward stepwise selection was then used to identify independent multivariate predictors of MRSA osteomyelitis, and each of these predictors was subjected to receiver operating characteristic curve analysis to determine the optimal cutoff value. Finally, a prediction algorithm for differentiating between MRSA and MSSA osteomyelitis on the basis of these independent predictors was constructed.Results: \n  Patients with MRSA osteomyelitis differed significantly from those with MSSA osteomyelitis with regard to non-weight-bearing status, antibiotic use at presentation, body temperature, hematocrit value, heart rate, white blood-cell count, platelet count, C-reactive protein level, and erythrocyte sedimentation rate. Four significant independent multivariate predictors were identified: a temperature of >38°C, a hematocrit value of <34%, a white blood-cell count of >12,000 cells/μL, and a C-reactive protein level of >13 mg/L. The predicted probability of MRSA osteomyelitis, determined on the basis of the number of these predictors that a child satisfied, was 92% for all four predictors, 45% for three, 10% for two, 1% for one, and 0% for zero predictors. Receiver operating characteristic curve analysis was used to evaluate the predictive accuracy of the number of multivariate predictors, and this analysis revealed a steep shoulder and an area under the curve of 0.94 (95% confidence interval, 0.88 to 1.00).Conclusions: \n  Our proposed set of four predictors provided excellent diagnostic performance in differentiating between MRSA and MSSA osteomyelitis in children, and thus would be able to guide patient management and facilitate timely antibiotic selection.Level of Evidence: \n  Diagnostic Level IV. See Instructions to Authors for a complete description of levels of evidence.",
				"libraryCatalog": "JBJS Am",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Differentiating Between Methicillin-Resistant and Methicillin-Sensitive Staphylococcus aureus Osteomyelitis in Children"
			}
		]
	}
]
/** END TEST CASES **/