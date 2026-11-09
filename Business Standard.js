{
	"translatorID": "e8d40f4b-c4c9-41ca-a59f-cf4deb3d3dc5",
	"label": "Business Standard",
	"creator": "Sebastian Karcher, Avram Lyon, Vera de Kok",
	"target": "^https?://(?:www|hindi)\\.business-standard\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-09 10:12:53"
}

/*
   Business Standard India Translator
   Copyright (C) 2012 Sebastian Karcher, Avram Lyon and Vera de Kok

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


function getArticle(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		let nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
		for (let node of nodes) {
			if ([].concat(node['@type']).some(type => /^(NewsArticle|Article|ReportageNewsArticle|AnalysisNewsArticle)$/.test(type))) {
				return node;
			}
		}
	}
	return null;
}

function detectWeb(doc) {
	let article = getArticle(doc);
	if (doc.querySelector('h1') && article) {
		return /^podcast$/i.test(article.articleSection || '') ? 'podcast' : 'newspaperArticle';
	}
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	for (let link of doc.querySelectorAll('a[href]')) {
		let href = link.href;
		if (!/^https?:\/\/(www|hindi)\.business-standard\.com\/.+(?:\d+_\d+\.html|-id-\d+\/?)(?:[?#].*)?$/.test(href)) continue;
		let title = ZU.trimInternal(link.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		items[href] = title;
	}
	return Object.keys(items).length ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let selected = await Zotero.selectItems(getSearchResults(doc, false));
		if (!selected) return;
		for (let selectedURL of Object.keys(selected)) {
			await scrape(await requestDocument(selectedURL));
		}
	}
	else {
		await scrape(doc);
	}
}

function getCreators(article) {
	let creators = [];
	for (let author of [].concat(article.author || [])) {
		let name = typeof author == 'string' ? author : author.name;
		if (!name) continue;
		name = ZU.trimInternal(name);
		// The site also labels news agencies and its web team as Person.
		if (author['@type'] == 'Organization'
			|| /^(Press Trust of India|PTI|Reuters|Bloomberg|ANI|IANS|Associated Press|AP|BS Reporter|BS Web Team|Team TMS|Business Standard|भाषा|वेब टीम)$/i.test(name)) {
			creators.push({ lastName: name, creatorType: 'author', fieldMode: 1 });
		}
		else {
			creators.push(ZU.cleanAuthor(name, 'author'));
		}
	}
	return creators;
}

function nameKey(name) {
	return name.normalize('NFC').toLowerCase().replace(/[.\s]+/g, '');
}
function getTags(doc, article, item) {
	let keywords = article.keywords;
	let tags = item.tags.map(tag => (typeof tag == 'string' ? tag : tag.tag));
	let topicTags = Array.from(doc.querySelectorAll('meta[property="article:tag"]'), tag => tag.content);
	if (topicTags.length) {
		tags = topicTags;
	}
	else if (typeof keywords == 'string') {
		// Decode before splitting; entity semicolons and thousands commas are not separators.
		tags = ZU.unescapeHTML(keywords).split(/;|,(?!\d)/);
	}
	else if (Array.isArray(keywords)) {
		tags = keywords;
	}
	let excluded = item.creators.map(creator => nameKey([creator.firstName, creator.lastName].filter(Boolean).join(' ')));
	excluded.push(nameKey(item.title));
	let seen = new Set();
	return tags.map(tag => ZU.trimInternal(ZU.unescapeHTML(tag)))
		.filter((tag) => {
			let key = nameKey(tag);
			if (!key || excluded.includes(key) || seen.has(key)) return false;
			seen.add(key);
			return true;
		}).map(tag => ({ tag }));
}
async function scrape(doc) {
	let article = getArticle(doc);
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		let creators = getCreators(article);
		if (creators.length) item.creators = creators;
		if (article.headline) item.title = ZU.unescapeHTML(ZU.cleanTags(article.headline));
		let columnTitle = item.title.match(/^([^:]+):\s*(.+)$/);
		if (columnTitle && item.creators.some(creator => nameKey([creator.firstName, creator.lastName].filter(Boolean).join(' ')) == nameKey(columnTitle[1]))) {
			item.shortTitle = columnTitle[2].trim();
		}
		if (article.description) item.abstractNote = article.description;
		if (article.datePublished) item.date = ZU.strToISO(article.datePublished);
		if (article.url) item.url = article.url;
		if (item.itemType == 'podcast') {
			for (let creator of item.creators) creator.creatorType = 'podcaster';
			let episode = item.title.match(/^(.+?)\s*Ep(?:isode)?\.?\s*(\d+)\s*:\s*(.+)$/i);
			if (episode) {
				item.seriesTitle = episode[1].trim();
				item.episodeNumber = episode[2];
				item.title = episode[3].trim();
				delete item.shortTitle;
			}
		}
		else {
			if (article.articleSection) item.section = article.articleSection;
			item.publicationTitle = 'Business Standard';
			item.place = 'New Delhi';
		}
		item.libraryCatalog = 'Business Standard';
		item.language = article.inLanguage || doc.documentElement.lang;
		item.tags = getTags(doc, article, item);
		item.complete();
	});
	let em = await translator.getTranslatorObject();
	em.itemType = detectWeb(doc);
	await em.doWeb(doc, doc.location.href);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.business-standard.com/india/search_news.php?search=argentina&select=keyword",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.business-standard.com/technology/tech-news/anthropic-report-ai-fake-newsrooms-dating-surveillance-scams-126091100730_1.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "AI scaling fake newsrooms, surveillance, and online dating scams: Anthropic",
				"creators": [
					{
						"firstName": "Harsh",
						"lastName": "Shivam",
						"creatorType": "author"
					}
				],
				"date": "2026-09-11",
				"abstractNote": "Anthropic AI misuse report: Anthropic also said it identified and disrupted cases in which users attempted to use Claude models for malicious activity that could potentially support development of biological weapons",
				"language": "en",
				"libraryCatalog": "Business Standard",
				"publicationTitle": "Business Standard",
				"place": "New Delhi",
				"section": "Tech News",
				"shortTitle": "AI scaling fake newsrooms, surveillance, and online dating scams",
				"url": "https://www.business-standard.com/technology/tech-news/anthropic-report-ai-fake-newsrooms-dating-surveillance-scams-126091100730_1.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "AI cyberattacks"
					},
					{
						"tag": "AI misuse report"
					},
					{
						"tag": "Anthropic AI misuse report"
					},
					{
						"tag": "Anthropic AI threat report September 2026"
					},
					{
						"tag": "Anthropic Claude misuse"
					},
					{
						"tag": "Anthropic threat intelligence report"
					},
					{
						"tag": "technology news"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hindi.business-standard.com/companies/industrial/voltas-appoints-sunil-d-souza-chairman-as-noel-tata-retires-november-11-id-566091/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Noel Tata 11 नवंबर को छोड़ेंगे Voltas के चेयरमैन का पद, आगे सुनील डिसूजा करेंगे कंपनी की अगुवाई",
				"creators": [
					{
						"lastName": "वेब टीम",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-11-07",
				"abstractNote": "Tata Group की कंपनी Voltas में बड़ा नेतृत्व बदलाव होने जा रहा है। नोएल टाटा 11 नवंबर को चेयरमैन पद से रिटायर होंगे। सुनील डिसूजा 12 नवंबर से नए चेयरमैन बनेंगे, जबकि नोएल टाटा ‘चेयरमैन एमेरिटस’ रहेंगे",
				"language": "hi-IN",
				"libraryCatalog": "Business Standard",
				"publicationTitle": "Business Standard",
				"place": "New Delhi",
				"section": "इंडस्ट्री",
				"url": "https://hindi.business-standard.com/companies/industrial/voltas-appoints-sunil-d-souza-chairman-as-noel-tata-retires-november-11-id-566091/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Jayant Balan Voltas MD"
					},
					{
						"tag": "Noel Tata Chairman Emeritus"
					},
					{
						"tag": "Noel Tata Voltas Retirement"
					},
					{
						"tag": "Sunil Dsouza Voltas Chairman"
					},
					{
						"tag": "Tata Group Leadership Changes"
					},
					{
						"tag": "Voltas Chairman 2026"
					},
					{
						"tag": "Voltas Leadership Change"
					},
					{
						"tag": "Voltas New Chairman"
					},
					{
						"tag": "टाटा समूह में बड़ा बदलाव"
					},
					{
						"tag": "नोएल टाटा रिटायरमेंट"
					},
					{
						"tag": "वोल्टास के नए चेयरमैन"
					},
					{
						"tag": "सुनील डिसूजा वोल्टास चेयरमैन"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.business-standard.com/companies/news/three-investors-offload-1-84-stake-in-groww-for-2-457-crore-in-bulk-deals-126110701037_1.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Three investors offload 1.84% stake in Groww for ₹2,457 crore in bulk deals",
				"creators": [
					{
						"lastName": "Press Trust of India",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-11-07",
				"abstractNote": "The three investors offloaded more than 11.52 crore shares, representing a combined 1.84 per cent stake in Groww on Friday, as per the data",
				"language": "en",
				"libraryCatalog": "Business Standard",
				"publicationTitle": "Business Standard",
				"place": "New Delhi",
				"section": "News",
				"url": "https://www.business-standard.com/companies/news/three-investors-offload-1-84-stake-in-groww-for-2-457-crore-in-bulk-deals-126110701037_1.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Goldman Sachs Groww shares"
					},
					{
						"tag": "Groww stake sale"
					},
					{
						"tag": "Peak XV Partners Groww"
					},
					{
						"tag": "Y Combinator Groww stake sale"
					},
					{
						"tag": "₹2,457 crore Groww bulk deal"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hindi.business-standard.com/markets/commodities/gold-price-outlook-goldman-sachs-cuts-gold-target-for-2026-and-2027-fed-rate-id-565723/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Gold Price: गोल्डमैन सैक्स ने सोने का टारगेट करीब 11% घटाया, क्या अब थम जाएगी कीमतों में तेजी?",
				"creators": [
					{
						"firstName": "दिग्विजय",
						"lastName": "सिंह",
						"creatorType": "author"
					}
				],
				"date": "2026-11-06",
				"abstractNote": "गोल्डमैन सैक्स ने सोने के टारगेट में कटौती की मुख्य वजह अमेरिकी फेडरल रिजर्व का सख्त रुख बताया है। बैंक का मानना है कि अमेरिका में ब्याज दरें लंबे समय तक ऊंची रहने से सोने में निवेश की मांग प्रभावित हो सकती है।",
				"language": "hi-IN",
				"libraryCatalog": "Business Standard",
				"publicationTitle": "Business Standard",
				"place": "New Delhi",
				"section": "जिंस",
				"shortTitle": "Gold Price",
				"url": "https://hindi.business-standard.com/markets/commodities/gold-price-outlook-goldman-sachs-cuts-gold-target-for-2026-and-2027-fed-rate-id-565723/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Dhanteras"
					},
					{
						"tag": "Dhanteras Gold Price"
					},
					{
						"tag": "Dhanteras Silver Price"
					},
					{
						"tag": "Gold Price Forecast"
					},
					{
						"tag": "Gold Price Today"
					},
					{
						"tag": "Gold Rate Today"
					},
					{
						"tag": "Goldman Sachs Gold Forecast"
					},
					{
						"tag": "Goldman Sachs Gold Target Cut"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.business-standard.com/article/companies/air-india-unions-withdraw-strike-threat-112033100032_1.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Air India unions withdraw strike threat",
				"creators": [
					{
						"lastName": "BS Reporter",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2012-03-31",
				"abstractNote": "Air India employees have withdrawn their threat to go on “no pay, no work” strike after the airline on Friday assured them of clearing all pay dues by June end.",
				"language": "en",
				"libraryCatalog": "Business Standard",
				"publicationTitle": "Business Standard",
				"place": "New Delhi",
				"section": "News",
				"url": "https://www.business-standard.com/article/companies/air-india-unions-withdraw-strike-threat-112033100032_1.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Air India"
					},
					{
						"tag": "Rohit Nandan"
					},
					{
						"tag": "strike"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.business-standard.com/article/opinion/t-n-ninan-make-believe-solutions-112033100081_1.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "T N Ninan: Make-believe solutions",
				"creators": [
					{
						"firstName": "T. N.",
						"lastName": "Ninan",
						"creatorType": "author"
					}
				],
				"date": "2012-03-31",
				"abstractNote": "The government has been trying to get rid of the impression that it is caught in “policy paralysis”.",
				"language": "en",
				"libraryCatalog": "Business Standard",
				"publicationTitle": "Business Standard",
				"place": "New Delhi",
				"section": "Columns",
				"shortTitle": "Make-believe solutions",
				"url": "https://www.business-standard.com/article/opinion/t-n-ninan-make-believe-solutions-112033100081_1.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Coal India"
					},
					{
						"tag": "FDI in retail trade"
					},
					{
						"tag": "Kingfisher"
					},
					{
						"tag": "LIC"
					},
					{
						"tag": "ONGC"
					},
					{
						"tag": "Railway Budget"
					},
					{
						"tag": "WEEKEND RUMINATIONS"
					},
					{
						"tag": "new manufacturing policy"
					},
					{
						"tag": "power stations"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hindi.business-standard.com/companies/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://hindi.business-standard.com/india-news/government-has-no-plans-to-raise-ethanol-blending-beyond-20pc-says-hardeep-singh-puri-id-563359/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "पेट्रोल में 20% से ज्यादा एथनॉल नहीं मिलाएगी सरकार, हरदीप सिंह पुरी का बड़ा बयान",
				"creators": [
					{
						"lastName": "भाषा",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-10-27",
				"abstractNote": "Government Has No Plans to Raise Ethanol Blending Beyond 20pc, Says Hardeep Singh Puri E20 Petrol, Ethanol Blending, Hardeep Singh Puri, Ethanol Blended Petrol, E20 Fuel, Flex Fuel Vehicles, E85 Fuel, E100 Fuel, Petroleum Ministry, Biofuel India, Petrol…",
				"language": "hi-IN",
				"libraryCatalog": "Business Standard",
				"publicationTitle": "Business Standard",
				"place": "New Delhi",
				"section": "देश",
				"url": "https://hindi.business-standard.com/india-news/government-has-no-plans-to-raise-ethanol-blending-beyond-20pc-says-hardeep-singh-puri-id-563359/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Biofuel India"
					},
					{
						"tag": "E100 Fuel"
					},
					{
						"tag": "E20 Fuel"
					},
					{
						"tag": "E20 Petrol"
					},
					{
						"tag": "E85 Fuel"
					},
					{
						"tag": "Ethanol Blended Petrol"
					},
					{
						"tag": "Ethanol Blending"
					},
					{
						"tag": "Ethanol Mixing"
					},
					{
						"tag": "Ethanol Policy"
					},
					{
						"tag": "Flex Fuel Vehicles"
					},
					{
						"tag": "Fuel Economy"
					},
					{
						"tag": "Hardeep Singh Puri"
					},
					{
						"tag": "Petrol Engine"
					},
					{
						"tag": "Petroleum Ministry"
					},
					{
						"tag": "ई20 पेट्रोल"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.business-standard.com/podcast/tms-ep640-sc-on-patanjali-blinkit-vodafone-idea-stock-cbam-124022900064_1.html",
		"items": [
			{
				"itemType": "podcast",
				"title": "SC on Patanjali, Blinkit, Vodafone Idea stock, CBAM",
				"creators": [
					{
						"lastName": "Team TMS",
						"creatorType": "podcaster",
						"fieldMode": 1
					}
				],
				"date": "2024-02-29",
				"abstractNote": "Where does the buck stop after SC rap on Patanjali? Can Blinkit challenge Amazon & Flipkart? Why did Vodafone Idea's fundraise plan fail? What is the Carbon Border Adjustment Mechanism? Answers here",
				"seriesTitle": "TMS",
				"episodeNumber": "640",
				"language": "en",
				"libraryCatalog": "Business Standard",
				"url": "https://www.business-standard.com/podcast/tms-ep640-sc-on-patanjali-blinkit-vodafone-idea-stock-cbam-124022900064_1.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Amazon"
					},
					{
						"tag": "Blinkit"
					},
					{
						"tag": "Carbon Border Adjustment Mechanism"
					},
					{
						"tag": "EU imports"
					},
					{
						"tag": "European Union"
					},
					{
						"tag": "FMCG firms"
					},
					{
						"tag": "Flipkart"
					},
					{
						"tag": "Indian Medical Association"
					},
					{
						"tag": "January 2026"
					},
					{
						"tag": "Patanjali Ayurveda"
					},
					{
						"tag": "Ramdev"
					},
					{
						"tag": "Supreme Court"
					},
					{
						"tag": "Supreme Court corridors"
					},
					{
						"tag": "TMS"
					},
					{
						"tag": "Vodafone Idea"
					},
					{
						"tag": "Yoga guru"
					},
					{
						"tag": "Zomato"
					},
					{
						"tag": "advertisements"
					},
					{
						"tag": "advertising"
					},
					{
						"tag": "aluminium"
					},
					{
						"tag": "anticipation of a turnaround"
					},
					{
						"tag": "buck stop"
					},
					{
						"tag": "casting a long shadow"
					},
					{
						"tag": "debt"
					},
					{
						"tag": "dipping sale"
					},
					{
						"tag": "disappoint investors"
					},
					{
						"tag": "e-commerce giant"
					},
					{
						"tag": "electronic gadgets"
					},
					{
						"tag": "fruits"
					},
					{
						"tag": "fund infusion"
					},
					{
						"tag": "fundraising"
					},
					{
						"tag": "groceries"
					},
					{
						"tag": "kirana store"
					},
					{
						"tag": "medicinal products"
					},
					{
						"tag": "misleading"
					},
					{
						"tag": "quick commerce"
					},
					{
						"tag": "sharp selling"
					},
					{
						"tag": "startups"
					},
					{
						"tag": "steel"
					},
					{
						"tag": "tax"
					},
					{
						"tag": "tax regime"
					},
					{
						"tag": "transition"
					},
					{
						"tag": "vegetables"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
