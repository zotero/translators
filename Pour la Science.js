{
	"translatorID": "7b79dfb0-e215-44e5-9ec7-35343b6d1a37",
	"label": "Pour la Science",
	"creator": "Philippe Guglielmetti",
	"target": "^https?://(www\\.)?pourlascience\\.fr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-20 20:34:13"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Philippe Guglielmetti

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

function detectWeb(doc, _url) {
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (doc.querySelector('h1.title, h1') && (
		doc.querySelector('.infos-article, .chapo, .chapeau, .lead, .infos-author, .infos-authors')
		|| doc.querySelector('meta[property="og:type" i][content="article" i]')
		|| doc.querySelector('script[type="application/ld+json"]')
	)) {
		return 'magazineArticle';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('section.articles article, .list-articles article');
	for (let row of rows) {
		let link = row.querySelector('a[href*=".php"]:not([href*="pour-la-science-n"])') || row.querySelector('a[href*=".php"]');
		let titleEl = row.querySelector('h2.title, .title, h2, h3');
		if (!link || !titleEl) continue;
		let href = link.href;
		let title = ZU.trimInternal(titleEl.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			await scrape(await requestDocument(itemUrl), itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location?.href) {
	url = url || doc.location?.href || '';
	let item = new Zotero.Item('magazineArticle');
	item.publicationTitle = 'Pour la Science';
	item.url = url;
	item.language = 'fr';

	let title = doc.querySelector('h1.title, h1')?.textContent;
	if (!title) {
		title = doc.querySelector('meta[property="og:title"]')?.content;
	}
	if (title) {
		title = title.replace(/\s*\|\s*Pour la Science.*$/i, '');
		item.title = ZU.trimInternal(title);
	}

	let chapo = doc.querySelector('.chapo, .chapeau, .lead, .article-chapo')?.textContent;
	if (chapo) {
		item.abstractNote = ZU.trimInternal(chapo);
	}
	else {
		let desc = doc.querySelector('meta[name="description"], meta[property="og:description"]')?.content;
		if (desc) {
			item.abstractNote = ZU.trimInternal(desc);
		}
	}

	let authorNodes = doc.querySelectorAll('.infos-author');
	for (let authorNode of authorNodes) {
		let name = ZU.trimInternal(authorNode.textContent);
		if (name && !/^pour la science$/i.test(name)) {
			item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
	}

	if (!item.creators.length) {
		let jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
		for (let script of jsonLdScripts) {
			try {
				let data = JSON.parse(script.textContent);
				let authors = data.author;
				if (authors) {
					if (!Array.isArray(authors)) authors = [authors];
					for (let a of authors) {
						let name = a.name || a;
						if (typeof name === 'string' && !/^pour la science$/i.test(name)) {
							item.creators.push(ZU.cleanAuthor(name, 'author'));
						}
					}
				}
			}
			catch (e) {}
		}
	}

	if (!item.creators.length) {
		let metaAuthor = doc.querySelector('meta[name="author"]')?.content;
		if (metaAuthor && !/^pour la science$/i.test(metaAuthor)) {
			item.creators.push(ZU.cleanAuthor(metaAuthor, 'author'));
		}
	}

	let infosText = doc.querySelector('.infos-article')?.textContent || '';
	let issueMatch = infosText.match(/POUR LA SCIENCE\s+N[°o]\s*(\d+)/i) || (url && url.match(/pour-la-science-n(\d+)/i));
	if (issueMatch) {
		item.issue = issueMatch[1];
	}

	let dateMatch = infosText.match(/(\d{1,2}\s+[a-zéû]+\s+\d{4})/i) || infosText.match(/(\d{2}\/\d{2}\/\d{4})/);
	if (dateMatch) {
		item.date = dateMatch[1];
	}
	else {
		let jsonDate = doc.querySelector('script[type="application/ld+json"]');
		if (jsonDate) {
			try {
				let data = JSON.parse(jsonDate.textContent);
				if (data.datePublished) {
					item.date = ZU.strToISO(data.datePublished);
				}
			}
			catch (e) {}
		}
		if (!item.date) {
			let metaDate = doc.querySelector('meta[property="article:published_time"]')?.content;
			if (metaDate) {
				item.date = ZU.strToISO(metaDate);
			}
		}
	}

	let keywords = doc.querySelector('meta[name="keywords"]')?.content;
	if (keywords) {
		let tags = keywords.split(',');
		for (let tag of tags) {
			tag = ZU.trimInternal(tag);
			if (tag && !/^pour la science$/i.test(tag)) {
				item.tags.push(tag);
			}
		}
	}

	item.attachments.push({
		document: doc,
		title: 'Snapshot',
		mimeType: 'text/html'
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.pourlascience.fr/sd/physique-particules/pour-la-science-n588-29539.php",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pourlascience.fr/sd/physique-particules/la-physique-des-particules-a-t-elle-atteint-ses-limites-29579.php",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "La physique des particules a-t-elle atteint ses limites ?",
				"creators": [
					{
						"firstName": "Jean-Philippe",
						"lastName": "Martinez",
						"creatorType": "author"
					}
				],
				"date": "21 septembre 2026",
				"abstractNote": "Les physiciens des hautes énergies sont-ils face au « désert » qu’ils redoutaient depuis longtemps ? Il est possible qu’aucune nouvelle particule ne puisse désormais être découverte dans la gamme d’énergie accessible expérimentalement. Pour dépasser cette limite, il faut changer d’approche, voire repenser la notion même de particule…",
				"issue": "588",
				"language": "fr",
				"libraryCatalog": "Pour la Science",
				"publicationTitle": "Pour la Science",
				"url": "https://www.pourlascience.fr/sd/physique-particules/la-physique-des-particules-a-t-elle-atteint-ses-limites-29579.php",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Accélérateurs de particules"
					},
					{
						"tag": "CERN"
					},
					{
						"tag": "LHC"
					},
					{
						"tag": "boson de higgs"
					},
					{
						"tag": "collisionneur"
					},
					{
						"tag": "modèle standard"
					},
					{
						"tag": "nouvelle physique"
					},
					{
						"tag": "particules"
					},
					{
						"tag": "ultra-haute énergie"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pourlascience.fr/sd/astrophysique/3iatlas-cette-comete-venue-d-ailleurs-serait-deux-fois-plus-vieille-que-le-systeme-solaire-29431.php",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "3I/Atlas : cette comète venue d’ailleurs serait deux fois plus vieille que le Système solaire",
				"creators": [
					{
						"firstName": "Sean",
						"lastName": "Bailly",
						"creatorType": "author"
					}
				],
				"date": "27 août 2026",
				"abstractNote": "L’analyse isotopique de la composition de cette visiteuse interstellaire suggère qu’elle serait née il y a 11 à 12 milliards d’années, bien avant le Système solaire, à une période de formation intense d’étoiles dans la Voie lactée.",
				"issue": "587",
				"language": "fr",
				"libraryCatalog": "Pour la Science",
				"publicationTitle": "Pour la Science",
				"shortTitle": "3I/Atlas",
				"url": "https://www.pourlascience.fr/sd/astrophysique/3iatlas-cette-comete-venue-d-ailleurs-serait-deux-fois-plus-vieille-que-le-systeme-solaire-29431.php",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "3I/Atlas"
					},
					{
						"tag": "comètes"
					},
					{
						"tag": "interstellaire"
					},
					{
						"tag": "système solaire"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
