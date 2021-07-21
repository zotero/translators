{
	"translatorID": "599ff9de-2049-4b99-ad67-691bde0df74a",
	"label": "Stabikat",
	"creator": "Marcel Klotz",
	"target": "^https?://(www\\\\.)?stabikat.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-21 17:41:17"
}

function typeMapper(type) {
	switch (type) {
		case 'Bücher' || 'Books':
			return 'book';
		case 'Briefe' || 'Letters':
			return 'letter';
		case 'Musikalien' || 'Music':
			return 'music';
		case 'Zeitschriften/Serien (ohne Online-Zeitschr.)' || 'Periodicals (non-online)':
			return 'periodicals_non-online';
		case 'Filme, Videos, etc.' || 'Audio visual':
			return 'film';
		case 'Tonträger' || 'Sound':
			return 'audioRecording';
		case 'Online-Zeitschriften' || 'Online periodicals':
			// periodicals -- in contrast to their articles -- will use book-entries, as there is no specific type
			return 'periodicals_online';
		case 'Bilder' || 'Pictures':
			return 'picture';
		case 'Datenträger' || 'Software':
			return 'Datenträger';
		case 'E-Books/Online Ressourcen' || 'Online resources (without periodicals)':
			// periodicals -- in contrast to their articles -- will use book-entries, as there is no specific type
			return 'book';
		case 'Kartenmaterial' || 'Cartography':
			return 'map';
		case 'Mikroformen' || 'Microfilm':
			return 'microfilm';
		case 'Aufsätze' || 'Articles':
			return 'article';
		case 'Manuskripte' || 'Handwriting':
			return 'manuscript';
		case 'Spiele, Skulpturen, etc.' || 'Games, Scupture, etc.':
			return 'other';
		default:
			return 'book';
	}
}

function detectWeb(doc, url) {
	if (url.includes('ACT=SRCH') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	else {
		var type = attr(doc, "#maticon", "alt");
		return typeMapper(type);
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
			return false;
		});
	}
	else {
		scrape(doc);
	}
}

function scrape(doc) {
	// get the identifaction number necessary for the api call
	// This is somehow not perfect, but there is no class or id specific for the permalink element, but the picture used for the link. 
	var el = doc.querySelector("img[src='https://stabikat.de:443/img_psi/2.0/gui/permalink_du.gif']");
	var permalink = el.parentElement.href;
	var ppn = permalink.slice(permalink.indexOf("PPN=") + 4);
	var otherParams = ppn.indexOf("&");
	if (otherParams !== -1) {
		ppn = ppn.slice(0,otherParams);
	}
	var translator = Zotero.loadTranslator('search');
	// Set translator to search translator, K10Plus PICA JSON
	translator.setTranslator('041335e4-6984-4540-b683-494bc923057a');
	Zotero.debug(ppn);
	translator.setSearch({ ppn: ppn });
	translator.translate();
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.hit');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].childNodes[1] && rows[i].childNodes[1].href ? rows[i].childNodes[1].href : "";
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://stabikat.de/DB=1/XMLPRS=N/PPN?PPN=1737430592",
		"items": [
			{
				"itemType": "book",
				"title": "Die Spur der Gesellschaft: Reflexionen zur Gesellschaftstheorie nach Luhmann",
				"creators": [
					{
						"firstName": "Tobias",
						"lastName": "Arenz",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9783748911661",
				"edition": "Erste Auflage",
				"extra": "Beteiligte Personen: Tobias Arenz(VerfasserIn)\nHochschulschrift\nDissertation (Deutsche Sporthochschule Köln, 2019)\nAngesichts gegenwärtiger Krisenerfahrungen erlebt die Soziologie ein comeback des Gesellschaftsbegriffs. Hatte man diesen zunächst verabschiedet, weil seine häufig normativ überfrachteten Ganzheitsvorstellungen dem pluralistischen Anspruch der westlichen Welt nicht gerecht wurden, so stellt sich heute erneut die Frage nach der Einheit des Sozialen. Das Problem mit radikalem Fokus gerade auf die Differenz des Sozialen zu bearbeiten, war Niklas Luhmanns Strategie. Seine Systemtheorie sollte Gesellschaft möglichst abstrakt und komplexitätsbewusst beschreiben. Ihr formal-funktionalistischer Blick kann den neuen Herausforderungen jedoch nicht mehr adäquat begegnen. Tobias Arenz’ These lautet deshalb, dass Luhmann zu überwinden ist – jedoch von innen heraus, um nicht hinter ihn zurückzufallen. Entscheidend dafür ist die Reflexion der impliziten Normativität der Systemtheorie, die im Anschluss an das Theorieprogramm Mediale Moderne und das formkritische Rechtsverständnis Christoph Menkes erfolgt. Die Studie entwickelt dergestalt ein neues, mit Pluralität zu vereinbarendes Normativitätskonzept. Ihre hochaktuelle Pointe lautet, dass jede wissenschaftliche Analyse sozialer Verhältnisse notwendig innerhalb eines normativen gesellschaftstheoretischen Rahmens durchgeführt wird, der in der Moderne inhaltlich durch die interne Verknüpfung von Freiheit und Herrschaft bestimmt ist.",
				"libraryCatalog": "Stabikat",
				"numPages": "1 Online-Ressource (266 Seiten)",
				"place": "Weilerswist",
				"publisher": "Velbrück Wissenschaft",
				"series": "Nomos eLibrary",
				"seriesNumber": "Soziologie",
				"shortTitle": "Die Spur der Gesellschaft",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"title": "Classification Data",
						"note": "BK: 71.02, 71.11\nVLBWG: 1720"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://stabikat.de/DB=1/XMLPRS=N/PPN?PPN=1693565242",
		"items": [
			{
				"itemType": "book",
				"title": "The Dark Energy Survey: the story of a cosmological experiment",
				"creators": [
					{
						"firstName": "Ofer",
						"lastName": "Lahav",
						"creatorType": "editor"
					},
					{
						"firstName": "Lucy",
						"lastName": "Calder",
						"creatorType": "editor"
					},
					{
						"firstName": "Julian",
						"lastName": "Mayers",
						"creatorType": "editor"
					},
					{
						"firstName": "Joshua A.",
						"lastName": "Frieman",
						"creatorType": "editor"
					}
				],
				"date": "2021",
				"ISBN": "9781786348357",
				"extra": "Beteiligte Personen: Ofer Lahav(HerausgeberIn), Lucy Calder(HerausgeberIn), Julian Mayers(HerausgeberIn), Joshua A. Frieman(HerausgeberIn)\nAufsatzsammlung\n\"This book is about the Dark Energy Survey, a cosmological experiment designed to investigate the physical nature of dark energy by measuring its effect on the expansion history of the universe and on the growth of large-scale structure. The survey saw first light in 2012, after a decade of planning, and completed observations in 2019. The collaboration designed and built a 570-megapixel camera and installed it on the four-metre Blanco telescope at the Cerro Tololo Inter-American Observatory in the Chilean Andes. The survey data yielded a three-dimensional map of over 300 million galaxies and a catalogue of thousands of supernovae. Analysis of the early data has confirmed remarkably accurately the model of cold dark matter and a cosmological constant. The survey has also offered new insights into galaxies, supernovae, stellar evolution, solar system objects and the nature of gravitational wave events. A project of this scale required the long-term commitment of hundreds of scientists from institutions all over the world. The chapters in the first three sections of the book were either written by these scientists or based on interviews with them. These chapters explain, for a non-specialist reader, the science analysis involved. They also describe how the project was conceived, and chronicle some of the many and diverse challenges involved in advancing our understanding of the universe. The final section is trans-disciplinary, including inputs from a philosopher, an anthropologist, visual artists and a poet. Scientific collaborations are human endeavours and the book aims to convey a sense of the wider context within which science comes about. This book is addressed to scientists, decision makers, social scientists and engineers, as well as to anyone with an interest in contemporary cosmology and astrophysics\"--\nIncludes bibliographical references and index",
				"libraryCatalog": "Stabikat",
				"numPages": "xxii, 421 Seiten",
				"place": "New Jersey",
				"publisher": "World Scientific Publishing",
				"shortTitle": "The Dark Energy Survey",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"title": "Classification Data",
						"note": "LCC: QB791.3\nDDC: 523.01\nBK: 39.30\nRVK: US 3460"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://stabikat.de/DB=1/TTL=1/PRS/PPN?PPN=649879910",
		"items": [
			{
				"itemType": "book",
				"title": "Systemtheoretische Literaturwissenschaft: Begriffe - Methoden - Anwendungen",
				"creators": [],
				"date": "2011",
				"ISBN": "9783110219012",
				"extra": "Beteiligte Personen: Niels Werber\nThis handbook gives an overview of systems theory in the field of literature, culture and media studies. The individual entries provide an introduction to the key concepts and problems in such a way that their added heuristic value becomes clear, without requiring a detailed understanding of the whole architecture of Luhmann's theory for this purpose. The book tests these concepts and problems in exemplary applications and thus demonstrates how works of art, texts and media can be observed in concrete individual analyses from a systems-theoretical perspective\nIncludes bibliographical references",
				"libraryCatalog": "Stabikat",
				"numPages": "Online-Ressource (IX, 514 S.))",
				"place": "Berlin [u.a.]",
				"publisher": "de Gruyter",
				"series": "de Gruyter Lexikon",
				"shortTitle": "Systemtheoretische Literaturwissenschaft",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"title": "Classification Data",
						"note": "LCC: PN6231.S93\nDDC: 809.001/1\nRVK: EC 1850, EC 1820, EC 1680\nBISAC: LIT000000\nVLBWG: 9562"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
