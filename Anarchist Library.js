{
	"translatorID": "1a31e4c5-22ed-4b5b-a75f-55476db29a44",
	"label": "Anarchist Library",
	"creator": "Sister Baæ'l",
	"target": "https://theanarchistlibrary.org/(latest|library|stats/popular|category/topic|category/author|special/index|search)",
	"minVersion": "7.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-07 11:18:38"
}

var urlBase = "https://theanarchistlibrary.org/";

function getListItems(doc, url) {

}

function getSearchItems(doc, url) {

}

function getLibraryItem(doc, url) {

}

var listRe = new RegExp(String.raw`${urlBase}(category/topic/|category/author/|latest|popular)`);
var searchRe = new RegExp(String.raw`${urlBase}search?`);
var libraryRe = new RegExp(String.raw`library/`);

var urlToTypeAndGet = {
	listRe : { type: "multiple", get: getListItems },
	searchRe : { type: "multiple", get: getSearchItems },
	libraryRe: { type: "webpage", get: getLibraryItem }
};

function detectWeb(doc, url) {	
	// ToDo: Error handling
	let itemType = doc.head.querySelector('[property~="og:type"]').content
	if (url.match(libraryRe)) {
		return "webpage";
	} else if (url.match(listRe) || url.match(searchRe)) {
		return "multiple";
	}
	
	return false;
}

function getPreambleVal(doc, id) {
	let preamble = doc.body.querySelector("div#preamble")
	return text(preamble, `div#${id}`).slice(text(preamble, `span#${id}-label`).length)
}

function doWeb(doc, url) {
	let item;
	let date;
	// ToDo: localize this
	let languageNames = new Intl.DisplayNames(['en'], {type: 'language'});
	let language = languageNames.of(attr(doc, "html", "lang"))
	// ToDo: Error handling
	if (url.match(libraryRe)) {
		item = new Zotero.Item('webpage');
		
		let itemType = doc.head.querySelector('[property~="og:type"]').content
		const tagNodeList = doc.head.querySelectorAll(`[property~="og:${itemType}:tag"]`);
		let description = doc.head.querySelector('[property~="og:description"]').content
		let author = doc.head.querySelector(`[property~="og:${itemType}:author"]`).content;
		let authorFirstName = author.substring(0, author.indexOf(' '));
		let authorLastName = author.substring(author.indexOf(' ') + 1);
		item.creators.push({"creatorType": "author", "firstName": authorFirstName, "lastName": authorLastName}); 
		
		if (description) {
			item.description = description
			let re = /(?<=[Tt]ranslated(?: +to [Ee]nglish)? +by ).*$/u
			let translated_match = description.match(re)
			if (translated_match) {
				let translator = {"creatorType": "translator",}
				if (translated_match[0].match(/ /)) {
					translator["firstName"] = translated_match[0].substring(0, translated_match.indexOf(' '));
					translator["lastName"] = translated_match[0].substring(translated_match.indexOf(' ') + 1);

				} else {
					translator["lastName"] = translated_match[0]
				}
				item.creators.push(translator)
			}
		}
		
		date = getPreambleVal(doc, "textdate")
		let notes = getPreambleVal(doc, "preamblenotes")
		// misses link here: https://theanarchistlibrary.org/library/margaret-killjoy-it-s-time-to-build-resilient-communities
		let source = getPreambleVal(doc, "preamblesrc")

		let tags = []
		for (let i = 0; i < tagNodeList.length; i++) {
			tags = tags.concat(tagNodeList[i].content)
		}

		let title = doc.head.querySelector('[property~="og:title"][content]').content;
		item.title = title;
		item.tags = tags;
		if (notes) {
			item.notes.push({"note": notes.trim()})
		}
		if (source) {
			item.notes.push({"note": `Source: ${source.trim()}`})
		}
		item.attachments = [{
			"document": doc,
			//"url": doc.location.href,
			"title": "Snapshot"
			//"mimeType": "text/html",
			//"snapshot": true
		},
		{
			"title": "Epub",
			"url": `${doc.location.href}.epub`
		},
		// ToDo: Do this conditionally
		{
			"title": "Latex",
			"url": `${doc.location.href}.tex`
		}];
	} else if (url.match(listRe) || url.match(searchRe)) {
		item = new Zotero.Item('multiple');;
	}
	if (date) {
		item.date = date
	}
	item.accessed = new Date().toString();
	item.url = url
	item.language = language
	
	return item.complete();
	 
}






/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/mohammed-a-bamyeh-the-no-state-solution",
		"detectedItemType": "website",
		"items": []
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/abel-paz-durruti-in-the-spanish-revolution",
		"detectedItemType": "website",
		"items": []
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/search?query=kropotkin",
		"items": "multiple"
	}
]
/** END TEST CASES **/

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/abel-paz-durruti-in-the-spanish-revolution",
		"items": [
			{
				"itemType": "webpage",
				"title": "Durruti in the Spanish Revolution",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Abel",
						"lastName": "Paz"
					},
					{
						"creatorType": "translator",
						"firstName": "",
						"lastName": "Chuck Morse"
					}
				],
				"date": "1996",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Epub"
					},
					{
						"title": "Latex"
					}
				],
				"tags": [
					{
						"tag": "Buenaventura Durruti"
					},
					{
						"tag": "Spanish Revolution"
					},
					{
						"tag": "biography"
					}
				],
				"notes": [
					{
						"note": "Translated to English by Chuck Morse"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/jp-o-malley-the-utopia-of-rules-david-graeber-interview",
		"items": [
			{
				"itemType": "webpage",
				"title": "The Utopia of Rules, David Graeber Interview",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "JP",
						"lastName": "O’ Malley"
					}
				],
				"date": "1st April 2015",
				"language": "English",
				"url": "https://theanarchistlibrary.org/library/jp-o-malley-the-utopia-of-rules-david-graeber-interview",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Epub"
					},
					{
						"title": "Latex"
					}
				],
				"tags": [
					{
						"tag": "bureaucracy"
					},
					{
						"tag": "interview"
					}
				],
				"notes": [
					{
						"note": "JP O’ Malley interviews anthropologist, activist, anarchist and author, David Graeber, who was one of the early organisers of Occupy Wall Street."
					},
					{
						"note": "Source: Retrieved on 15th October 2024 from bellacaledonia.org.uk"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/errico-malatesta-the-general-strike-and-the-insurrection-in-italy",
		"items": [
			{
				"itemType": "webpage",
				"title": "The General Strike and the Insurrection in Italy",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Errico",
						"lastName": "Malatesta"
					}
				],
				"date": "1914",
				"language": "English",
				"url": "https://theanarchistlibrary.org/library/errico-malatesta-the-general-strike-and-the-insurrection-in-italy",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Epub"
					},
					{
						"title": "Latex"
					}
				],
				"tags": [
					{
						"tag": "General Strike"
					},
					{
						"tag": "Italy"
					},
					{
						"tag": "history"
					},
					{
						"tag": "insurrection"
					}
				],
				"notes": [
					{
						"note": "Freedom (London) 28, no. 303 (July 1914). In the article, written shortly after his escape from Italy and return to London, Malatesta provides an account of the Red Week, which broke out on 7 June 1914 in Ancona, where Malatesta lived."
					},
					{
						"note": "Source: The Method of Freedom: An Errico Malatesta Reader, edited by Davide Turcato, translated by Paul Sharkey."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/voltairine-de-cleyre-report-of-the-work-of-the-chicago-mexican-liberal-defense-league",
		"detectedItemType": "webpage",
		"items": [
			{
				"itemType": "webpage",
				"title": "Report of the Work of the Chicago Mexican Liberal Defense League",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Voltairine",
						"lastName": "de Cleyre"
					}
				],
				"date": "1912",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Mexican revolution"
					},
					{
						"tag": "history"
					}
				],
				"notes": [
					{
						"note": "From ‘Mother Earth’, April 1912, New York City, published by Emma Goldman, edited by Alexander Berkman."
					},
					{
						"source": "Retrieved on 2024-02-02 from <mgouldhawke.wordpress.com/2024/02/01/report-of-the-work-of-the-chicago-mexican-liberal-defense-league-voltairine-de-cleyre-1912>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/search?query=kropotkin"
	}
]
/** END TEST CASES **/
