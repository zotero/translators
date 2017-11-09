{
	"translatorID": "64f80311-85ec-4089-ae6d-665b535fb3b3",
	"label": "ISMRM Proceedings",
	"creator": "Francesco Santini",
	"target": "http://indexsmart.mirasmart.com/ISMRM[0-9]+/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2017-11-09 15:10:54"
}

var places = {
	'2016': 'Singapore',
	'2017': 'Honolulu (HI, USA)',
	'2018': 'Paris (France)',
	'2019': 'Montreal (QC, Canada)',
	'2020': 'Sydney (NSW, Australia)',
	'2021': 'Vancouver (BC, Canada)',
	'2022': 'London (UK)',
	'2023': 'Toronto (ON, Canada)'
};

function detectWeb(doc, url) {
	if (url.match(/PDFfiles/))
		return "conferencePaper";
	else
		return "multiple";
}

function scrape(doc, url) {
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ? function(prefix) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;
	
  var item = new Zotero.Item("conferencePaper");
	
  var procNamePath = '//div[@id="ctl00_MainContent_ViewSubmissions_divFooter"]/div';
  var procNameObject = doc.evaluate(procNamePath, doc, nsResolver, XPathResult.ANY_TYPE, null);
  var procNameItem = procNameObject.iterateNext();
  if (procNameItem == null) // 2016 uses a different way
  {
  	procNamePath = '//div[@class="col-lg-5 col-md-5 col-sm-5"]';
  	procNameObject = doc.evaluate(procNamePath, doc, nsResolver, XPathResult.ANY_TYPE, null);
  	procNameItem = procNameObject.iterateNext();
  }
  var procName = procNameItem.innerText;

  var year = procName.match(/\(([0-9]+)\)/)[1];

  
  item.date = year;
  item.proceedingsTitle = procName;
  item.url = url;
  item.place = places[year];
  
  var titlePath = '//span[@id="ctl00_MainContent_ViewSubmissions_submissionTitle"]';
  var titleObj = doc.evaluate(titlePath, doc, nsResolver, XPathResult.ANY_TYPE, null);
  var title = titleObj.iterateNext().innerText;

  item.title = title;
  
  var authPath = '//div[@id="affAuthers"]';
  var authObj = doc.evaluate(authPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
  var authItem = authObj.iterateNext().cloneNode(true); // clone a node with children, so we can edit it
  

  
  // remove the affiliation numbers which are superscript nodes
  var supPath = '//SUP';
  var supObj = doc.evaluate(supPath, authItem, nsResolver, XPathResult.ANY_TYPE, null);
  
  while (supItem = supObj.iterateNext())
  {
  	supItem.remove();
  }
  
  //Zotero.debug(authItem);
  var authors = authItem.innerText.split(','); 
  // now authors is an array with First Name(s) Last Name. Last author has a prepended "and"
  authors.forEach(
  	function (author)
  	{
  		var authorObj = new Object();
  		authorObj['creatorType'] = 'author';
  		author = author.trim();
  		if (author.startsWith("and "))
  		{
  			author = author.substr("and ".length);
  		}
  		var authorAtom = author.split(' ');
  		var lastName = authorAtom[authorAtom.length - 1]; // assume last name is the last word
  		var firstName = authorAtom.slice(0,authorAtom.length - 1).join(' ');
  		authorObj['firstName'] = firstName;
  		authorObj['lastName'] = lastName;
  		item.creators.push(authorObj);
  	});
  
  //Zotero.debug(item);
  item.complete();
}

function doWeb(doc, url)
{
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == "x" ) return namespace; else return null;
	} : null;
	
	var urls = new Array();
	var items = new Object();
	
	if (detectWeb(doc, url) == "multiple")
	{
		var eachResult = '//div[@class="full search-result"]';
		var resultTitle = eachResult + '/h2';
		var resultLink = eachResult + '/ul/li/a';
		var resultsIterator = doc.evaluate(eachResult, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var linkIterator = doc.evaluate(resultLink, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var titleIterator = doc.evaluate(resultTitle, doc, nsResolver, XPathResult.ANY_TYPE, null);
		while (resultObj = resultsIterator.iterateNext())
		{
			//Zotero.debug(resultObj)
			var link = linkIterator.iterateNext().href;
			//Zotero.debug(link);
			var title = titleIterator.iterateNext().innerText;
			//Zotero.debug(title);
			items[link] = title;
		}
		items = Zotero.selectItems(items);
		for (var i in items)
		{
			urls.push(i);
		}
		
	} else
	{
		urls = [url];
	}
	
	//Zotero.debug(urls);
	
	Zotero.Utilities.processDocuments(urls, scrape, function(){Zotero.done();});
	Zotero.wait();
}
