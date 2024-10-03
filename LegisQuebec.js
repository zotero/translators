{
	"translatorID": "1df061ed-e572-4a5f-988c-9171993ab2e5",
	"label": "LegisQuébec",
	"creator": "Marc Lajoie",
	"target": "^https?://(www\\.)?legisquebec\\.gouv\\.qc\\.ca/(en|fr)/",
	"minVersion": "6.0.30",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-17 20:13:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Marc Lajoie

	// @fr-CA, english will follow
	
	Ce fichier est une composante de Zotero.
	Voir : <https://www.zotero.org/>

	Ce traducteur est un logiciel libre : vous pouvez le redistribuer ou le
	modifier selon les termes de la Licence Publique Générale Affero GNU
	telle que publiée par la Free Software Foundation, soit la version 3 de
	la licence, ou toute version ultérieure.

	Ce traducteur est distribué dans l'espoir qu'il sera utile,
	mais SANS AUCUNE GARANTIE ; sans même la garantie implicite de
	QUALITÉ MARCHANDE ou D'ADÉQUATION À UN USAGE PARTICULIER. Voir la Licence
	Publique Générale Affero GNU pour plus de détails.

	Vous pouvez trouver une copie de la Licence Publique Générale Affero GNU.
	Voir : <https://www.gnu.org/licenses/>.

	Demande d'attribution non contraignante :

	Bien que ce ne soit pas une exigence de la GNU AGPL, si vous utilisez
	ce traducteur, nous vous invitons à fournir une reconnaissance appropriée
	dans tout produit dérivé. Par exemple, " Cet ouvrage utilise un traducteur
	Zotero développé par Marc Lajoie. Pour toute question ou information
	complémentaire, vous pouvez contacter l'auteur à <marclajoie@me.com>."
	
	// @en-CA
	
	This file is part of Zotero. See <https://www.zotero.org/>
	
	This translator is free software: you can redistribute it or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or any later version.

	This translator is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
	Affero General Public License for more details.

	You can find a copy of the GNU Affero General Public License.
	See : <https://www.gnu.org/licenses/>.

	Non-binding attribution Request:

	Although it is not a requirement under the GNU AGPL, if you are
	using this translator, we invite you to provide appropriate acknowledgment
	in any derived work. For example " This work utilizes a Zotero translator
	developed by Marc Lajoie. For inquiries or further information, you may
	contact the author at <marclajoie@me.com>."

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	// @fr Si l'url inclus l'un des motifs, la fonction retourne "statute"
	// @en If the url includes one of the patterns, the function returns 'statute"
	if (url.includes('/version/') || url.includes('/document')) {
		return "statute";
	}
	// @fr Si l'url inclus l'un des motifs, la fonction retourne "multiple"
	// @en If the url includes one of the patterns, the function returns 'multiple"
	else if (url.includes('/chapitres?corpus=') || url.includes('/chapters?corpus=')) {
		return "multiple";
	}
	// @fr Dans les autres cas, la fonction retourne "false" (faux)
	// @en In all other cases, the function returns "false"
	return false;
}

/* 	@en Function to randomly generate a delay plus or minus 500 ms from time
	@fr Fonction permettant de générer aléatoirement un délai de plus ou moins
	500 ms par rapport à la valeur de time
*/
function delay(time) {
	// 	@en Generate a random number between -500 and 500 @fr Génère un nombre aléatoire entre -500 et 500
	var randomOffset = Math.random() * 1000 - 500;
	// @en Add this offset var time @fr S'ajoute pour décaler var time
	var adjustedTime = time + randomOffset;
	return new Promise(resolve => setTimeout(resolve, adjustedTime));
}

/* @fr	Extrait la Table des Matières (TOC) du document fourni.
		Sélectionne tous les éléments d'ancre à l'intérieur de '#tdmContent ul' pour construire la TOC.
		Itère sur ces éléments pour les formater et les ajouter comme paragraphes HTML avec des liens.
		Retourne la chaîne HTML représentant la TOC.
*/
/* @en	Extract the Table of Contents (TOC) from the provided document.
		Selects all anchor elements within '#tdmContent ul' to construct the TOC.
		Iterates over these elements to format and append them as HTML paragraphs with links.
		Returns the HTML string representing the TOC.
*/
function extractStatuteTOC(tocDoc) {
	let tocItems = tocDoc.querySelectorAll('#tdmContent ul a');
	let tocContent = '';
	tocItems.forEach((item) => {
		let text = item.textContent; // The text of the item
		let url = item.href; // The URL the item points to
		tocContent += `<p><a href="${url}">${text}</a></p>`;
	});
	return tocContent;
}

/* @fr 	Extrait la Table des Matières (TOC) du document fourni (tocDoc).
		Sélectionne tous les éléments d'item de liste à l'intérieur de '.card-body' pour construire la TOC.
		Itère sur ces éléments, en extrayant et en formatant le texte et les URLs associés en paragraphes HTML
		avec des liens.
		Concatène une URL de base avec chaque href pour former des URLs complètes.
		Retourne la chaîne HTML représentant la TOC.
*/
/* @en	Extract the Table of Contents (TOC) for regulations from the provided document.
		Selects all list item elements within '.card-body' to construct the TOC.
		Iterates over these elements, extracting and formatting text and associated URLs as HTML paragraphs with links.
		Concatenates a base URL with each href to form full URLs.
		Returns the HTML string representing the TOC and logs it for debugging.
*/
function extractRegsTOC(tocDoc) {
	let tocItems = tocDoc.querySelectorAll(".card-body li");
	let tocContent = '';
	tocItems.forEach((item) => {
		let text = item.textContent.trim(); // The text of the item
		let anchor = item.querySelector('a'); // Get the <a> element inside the <li>
		let url = anchor ? anchor.getAttribute('href') : '#'; // Get the href attribute from the <a> tag, if it exists
		let baseUrl = "https://www.legisquebec.gouv.qc.ca";
		url = baseUrl + url;
		tocContent += `<p><a href="${url}">${text}</a></p>`;
	});
	return tocContent;
}

/* @fr	Extrait les résultats de recherche du document.
		Parcourt les lignes de tableau identifiées par un motif spécifique dans leur ID et contenant des liens.
		Ignore les lignes avec un contenu textuel vide.
		Extrait l'attribut href et le contenu textuel de chaque ligne pour construire un titre.
		Extrait également un code d'une colonne correspondante dans la même ligne.
		Construit un dictionnaire d'éléments où l'URL est la clé et la combinaison du code et du titre est la valeur.
		Retourne ce dictionnaire si des éléments sont trouvés ou false si aucun élément n'est trouvé.
*/
/* @en	Extracts search results from the document.
		Iterates through table rows identified by a specific pattern in their ID and containing links.
		Skips rows with empty text content.
		Extracts the href attribute and text content of each row to build a title.
		Additionally, extracts a code from a corresponding column in the same row.
		Constructs a dictionary of items where the URL is the key and the combined code and title is the value.
		Returns this dictionary if items are found or false if no items are found.
*/
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('tr.clickable[id^="row"] a[href]');
	var codes = doc.querySelectorAll('tr.clickable[id^="row"] th');
	var counter = 0;
	for (let row of rows) {
		if (row.textContent === '') {
			continue;
		}
		else {
			let href = row.href;
			let title = ZU.trimInternal(row.textContent);
			let code = codes[counter] && codes[counter].textContent;
			code = '(' + code + ')';
			if (!href || !title) continue;
			if (checkOnly) return true;
			found = true;
			items[href] = code + ' ' + title;
			counter += 1;
		}
	}
	return found ? items : false;
}

async function doWeb(doc, url) { /* @fr	Fonction principale pour traiter la page web dans Zotero.
		Si la page contient plusieurs éléments (comme détecté par detectWeb), elle permet à l'utilisateur
		de sélectionner les éléments à importer.
		Pour chaque élément sélectionné, elle extrait les données du chapitre et attend un délai poli avant
		de passer au suivant.
		Si l'URL correspond à certains motifs, elle extrait directement les données du chapitre.
	*/
	/* @en	Main function for processing the webpage in Zotero.
			If the page contains multiple items (as detected by detectWeb), it allows the user to select which
			items to import.
			For each selected item, it scrapes the chapter data and waits a polite delay before moving to the next.
			If the URL matches certain patterns, it directly scrapes the chapter.
	*/
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrapeChapter(await requestDocument(url), url);
			await delay(750);
		}
	}
	else if (url.includes('/document/lc') || url.includes('/document/cs') || url.includes('/document/rc') || url.includes('/document/cr')) {
		await scrapeChapter(doc, url);
	}
	else if (url.includes('/version')) {
		await scrapeVersion(doc, url);
	}
}

/* @fr	Extrait les données communes à tous les documents : le type de document (statute), le titre,
		la langue, les droits, le Code et crée une pièce jointe instantanée.
		Ajoute l'emoji "bâtiment classique" en tant que marqueur.
		Retourne l'élément Zotero construit.
*/
/* @en	Extracts data common to all documents: document type (statute), title,
	language, rights, Code and creates an instant attachment.
	Adds the emoji "classical building" tag to the element.
	Returns the constructed Zotero element.
*/
async function scrapeCommon(doc) {
	// @fr Crée un nouvel objet Zotero de type "statute"
	// @en Create a new Zotero object of type "statute"
	var newItem = new Zotero.Item("statute");
	
	// @fr Récupère le contenu de la balise meta avec le nom "dc.title"
	// @en Retrieve the content of the meta tag with name "dc.title"
	var metaTitle = doc.querySelector('meta[name="dc.title"]');
	
	// @fr Assigner à statuteTitle le contenu de metaTitle, sinon laisser vide si metaTitle est null
	// @en Assign the content of metaTitle to statuteTitle, or leave empty if metaTitle is null
	var statuteTitle = metaTitle ? metaTitle.getAttribute('content') : '';

	// @fr Extraire la partie après le premier tiret de statuteTitle et supprimer les espaces superflus
	// @en Extract the part after the first dash in statuteTitle and trim any extra spaces
	statuteTitle = statuteTitle.split('-')[1].trim();


	// @fr Attribuer le titre extrait à l'élément newItem de Zotero
	// @en Assign the extracted title to the Zotero item newItem
	newItem.title = statuteTitle;

	// @fr Sélectionne le contenu textuel de l'élément avec la classe 'Identification-Id'
	// @en Select the text content of the element with the class 'Identification-Id'
	var chapter = doc.querySelector('.Identification-Id').textContent;

	// @fr Remplace 'chapitre' ou 'chapter' (insensible à la casse) par 'c' dans la chaîne chapter
	// @en Replace 'chapitre' or 'chapter' (case-insensitive) with 'c' in the chapter string
	chapter = chapter.replace(/chapitre|chapter/gi, 'c');

	// @fr Trouver la langue du document
	// @en Find the document language
	var metaLanguage = doc.querySelector('meta[name="dc.language"]');
	var language = metaLanguage ? metaLanguage.getAttribute('content') : '';

	// @fr Déclare la variable consolidated
	// @en Declare the variable consolidated
	var consolidated;

	// @fr Vérifie si la langue est le français et ajuste les valeurs de langue et consolidated en conséquence
	// @en Check if the language is French and adjust the language and consolidated values accordingly
	if (language === 'fre') {
		language = 'fr-CA';
		// Recueil des lois et des règlements du Québec => (RLRQ)
		// chapitre => (c)
		consolidated = 'RLRQ';
	}
	
	// @fr Vérifie si la langue est l'anglais et ajuste les valeurs de langue et consolidated en conséquence
	// @en Check if the language is English and adjust the language and consolidated values accordingly
	else if (language === 'eng') {
		language = 'en-CA';
		// Compilation of Québec Laws and Regulations => (CQLR)
		// chapter => (c)
		consolidated = 'CQLR';
	}
	
	// @fr Attribue la langue spécifiée à l'objet newItem de Zotero
	// @en Assign the specified language to the Zotero newItem object
	newItem.language = language;
	
	// @fr Attribue les droits d'auteur à l'objet newItem
	// @en Assign copyright to the newItem object
	newItem.rights = "© Éditeur officiel du Québec";
	
	// @fr Combine le code consolidé et le chapitre pour former le code complet, et l'attribue à newItem
	// @en Combine the consolidated code and the chapter to form the complete code, and assign it to newItem
	newItem.code = consolidated + ' ' + chapter;
	
	/*	@en adding the classical building emoji to tag
		@fr ajout de l'émoticon du bâtiment classique comme marqueur
	*/
	newItem.tags.push({ tag: '\uD83C\uDFDB' });

	// @fr Retourne l'objet newItem de Zotero rempli
	// @en Return the filled Zotero newItem object
	return newItem;
}

/* @fr	En plus des données obtenues par la fonction scrapeCommon, il ajoute une
		note comportant une table des notes historiques et des dates d'entrée en vigueur correspondantes
		d'un article en particulier d'une loi ou d'un règlement refondu. Un usager a ensuite l'option de
		fusionner la version avec le document obtenu avec la fonction scrapeChapter ou de déplacer la note.
		La note peut être utile à toute personne qui souhaite accéder rapidement à la version d'un article
		tel qu'il se lisait à une date donnée.
*/
/* @en	In addition to the data obtained by the scrapeCommon function, it adds a note containing a table
		of historical notes and corresponding effective dates of a particular section of a statute or
		regulation. A user then has the option of merge the version with the document obtained with the
		scrapeChapter function or move the note of this document. The note can be useful for anyone who
		needs quick access to the version of an article of an article as it read on a given date.
*/
async function scrapeVersion(doc, url) {
	// @fr Trouver le titre de la page @en Find the title of the page
	var articleHeaderElement = doc.querySelector('.page-header h4');
	var articleTitle = articleHeaderElement ? articleHeaderElement.textContent.trim() : '';
	
	// @fr Supprimer les mots "Versions de la disposition" @en Remove the words "Disposition versions"
	articleTitle = articleTitle.replace('Versions de la disposition', '').replace('Disposition versions', '');

	// @fr Définir un tableau pour recevoir les dates d'entrée en vigueur
	// @en Define an array for in Force dates
	let inForceDate = [];
	
	// @fr Sélectionner tous les éléments avec la classe div = "card"
	// @en Select all elements with the div class ="card"
	var cards = doc.querySelectorAll('div.card');
	
	// @fr Définir un tableau pour recevoir les notes hisorique e.g 1985, c. 6, s. 1
	// @en Define an array for historic notes
	var historicalNotesArray = [];
	
	// @fr Passer en revue chaque élément card pour trouver la date d'entrée en vigueur et la note historique.
	// @en Iterate over each card element to find inForce Date and historical note
	cards.forEach(function (card) {
		var historicalNoteDiv = card.querySelector('div.HistoricalNote');

		let spans = historicalNoteDiv.querySelectorAll('span');
		
		// @fr Initialiser une variable locale pour recevoir une note historique
		// @en Initialize a local variable to receive a historical note
		let historicalNote = '';
		
		// @fr Trouver les dates d'entrée en vigueur de chaque carte
		// @en Find the inForce dates of each card
		let cardTitle = card.querySelector('.card-title');

		/* @fr	Tente de trouver une date dans le titre de la carte en utilisant une expression régulière.
				Le format attendu de la date est 'AAAA-MM-JJ' (année-mois-jour).*/
		/* @en	Attempts to match a date in the card title using a regular expression.
				The expected date format is 'YYYY-MM-DD' (year-month-day). */
		let dateMatch = cardTitle.textContent.trim().match(/\d{4}-\d{2}-\d{2}/);

		// @fr Vérifie si aucune date correspondante n'a été trouvée dans le titre de la carte.
		// @en Checks if no matching date was found in the card title.
		if (dateMatch === null) {
			// @fr Si aucune date n'est trouvée, interrompt la fonction.
			// @en If no date is found, exits the function.
			return;
		}
		else {
			// @fr Si une date correspondante est trouvée, l'ajoute au tableau 'inForceDate'.
			// @en If a matching date is found, adds it to the 'inForceDate' array.
			inForceDate.push(dateMatch[0]);
		}
		
		/* @fr Crée un tableau 'visibleSpans' à partir de 'spans', en filtrant pour ne garder
		que les éléments qui n'ont pas la classe 'Hidden'.*/
		/* @en Creates an array 'visibleSpans' from 'spans', filtering to only include elements
		that do not have the 'Hidden' class.*/
		var visibleSpans = Array.from(spans).filter(span => !span.classList.contains('Hidden'));

		/* @fr Crée un tableau 'visibleAdded' à partir de 'visibleSpans', en filtrant pour ne garder
		que les éléments qui possèdent l'attribut 'integrity:added' ou 'integrity:order'.*/
		/* @en Creates an array 'visibleAdded' from 'visibleSpans', filtering to include only elements
		that have the 'integrity:added' or 'integrity:order' attribute.*/
		var visibleAdded = Array.from(visibleSpans).filter(span => span.hasAttribute('integrity:added') || span.hasAttribute('integrity:order'));

		// @fr Vérifie si l'URL cible la version d'un réglement '/version/rc' ou '/version/cr'
		// @en Check if the URL targets the version of a regulation  '/version/rc' or '/version/cr'
		if (url.includes('/version/rc') || url.includes('/version/cr')) {
			// @fr Initialise un tableau pour stocker les notes d'enregistrement historiques
			// @en Initialize an array to store historical registration notes
			var histRegNoteArray = [];
			// @fr Pour chaque élément 'span' dans 'visibleAdded', traiter son contenu textuel
			// @en For each 'span' element in 'visibleAdded', process its text content
			visibleAdded.forEach((span) => {
				// @fr Récupère le contenu textuel de 'span', le nettoie et le stocke dans 'text'
				// @en Trim the text content of the span and store it in 'text'
				let text = span.textContent.trim();
				// @fr Si 'text' n'est pas vide, l'ajouter au tableau 'histRegNoteArray'
				// @en If 'text' is not empty, add it to the 'histRegNoteArray'
				if (text) {
					histRegNoteArray.push(text);
				}
			});
			// @fr Joint les éléments du tableau en une seule chaîne
			// @en Join the array elements into a single string
			var histRegNote = histRegNoteArray.join("");
			
			// @fr Remplace les occurrences de ',a.' ou ',s.' par ', a. ' ou ', s. ' (respectivement)
			// @en Replace occurrences of ',a.' or ',s.' with ', a. ' or ', s. ' (respectively)
			histRegNote = histRegNote.replace(/,(a|s)\./g, ", $1. ");
			
			// @fr Remplace plusieurs espaces blancs par un seul espace
			// @en Replace multiple whitespace characters with a single space
			histRegNote = histRegNote.replace(/\s+/g, " ");
			
			// @fr Divise la chaîne par ';' et nettoie chaque élément résultant
			// @en Split the string by ';' and trim each resulting element
			histRegNote = histRegNote.split(";").map(element => element.trim());
		}
		// @fr Définir un tableau pour recevoir histStatuteNoteArray, respectant la syntaxe des notes historiques des lois e.g. 1985, c. 6, a. 1
		// @en Define an array to receive histStatuteNoteArray, respecting the syntax of statutes historical notes e.g. 1985, c. 6, s. 1
		let histStatuteNoteArray = [];
		// @fr Passer en revue chaque élément visibleAdded pour vérifier et revoir, le cas échéant, la syntaxe de la note historique.
		// @en Review each visibleAdded element to check and revise, if necessary, the syntax of the historical note.
		visibleAdded.forEach((span, index) => {
			// @fr Récupère et nettoie le texte du span en supprimant les espaces inutiles en début et en fin.
			// @en Retrieves and cleans the text content of the span by trimming any leading or trailing whitespace.
			let text = span.textContent.trim();
			
			/* @fr	Définit une expression régulière 'fullPattern' pour correspondre à un motif spécifique d'une note
			historique d'une loi. e.g. e.g. 1978, c. 67, a. 3 */
			/* @en  Defines a regular expression 'fullPattern' to match a specific statute historical note pattern.
			e.g. 1978, c. 67, a. 3*/
			let fullPattern = /\d{4}, c\. \d+, [as]\. \d+/; // Full pattern matching the desired format

			/* @fr	Définit une expression régulière 'partialPattern'.
					Le motif attendu comprend une année (4 chiffres) suivie de ', c. ' et d'un autre nombre. */
			/* @en  Defines a regular expression 'partialPattern'.
					The expected pattern includes a year (4 digits) followed by ', c. ' and another number.*/
			let partialPattern = /\d{4}, c\. \d+/;
			if (text.includes(';')) { // @fr Si le texte inclus un point-virgule @en If the text includes a semi-colon
				// @fr Passer en revue chaque text et diviser le texte par point-virgule s'il en contient
				// @en Iterate over text and split the text by semi-colon if it contains any
				text.split(';').forEach((part) => {
					// @fr Nettoie le texte en supprimant les espaces inutiles en début et en fin.
					// @en Cleans the text by trimming any leading or trailing whitespace.
					part = part.trim();
					
					// @fr Ajouter au tableau si cela correspond au modèle complet et n'est pas déjà dans le tableau
					// @en Add to array if it matches the full pattern and is not already in the array
					if (fullPattern.test(part) && !histStatuteNoteArray.includes(part)) {
						histStatuteNoteArray.push(part);
					}
				});
			}
			// @fr Sinon, si le texte correspond directement au modèle complet et n'est pas un doublon, l'ajouter au tableau
			// @en Else if the text directly matches the full pattern and is not a duplicate, add it to the array
			else if (fullPattern.test(text) && !histStatuteNoteArray.includes(text)) {
				histStatuteNoteArray.push(text);
			}
			// @fr Sinon, si le texte correspond directement au modèle partialPattern
			// @en Else if the text directly matches partialPattern
			else if (partialPattern.test(text)) {
				// @fr Stocke le texte actuel dans 'combinedText'
				// @en Store the current text in 'combinedText'
				let combinedText = text;
				// @fr Parcourir jusqu'à 3 éléments suivants pour les combiner avec le texte actuel
				// @en Iterate up to 3 following elements to combine with the current text
				for (let i = 1; i <= 3 && (index + i) < visibleAdded.length; i++) {
					// @fr Nettoie le texte de l'élément suivant et le stocke dans 'nextText'
					// @en Trim the text of the next element and store it in 'nextText'
					let nextText = visibleAdded[index + i].textContent.trim();
					// @fr Si 'nextText' n'est pas vide, l'ajouter à 'combinedText'
					// @en If 'nextText' is not empty, add it to 'combinedText'
					if (nextText) {
						combinedText += nextText.startsWith(',') || nextText.startsWith('.') ? nextText : ' ' + nextText;
					}
				}
				// @fr Si 'combinedText' correspond à 'fullPattern' et n'est pas déjà dans 'histStatuteNoteArray', l'ajouter
				// @en If 'combinedText' matches 'fullPattern' and is not already in 'histStatuteNoteArray', add it

				if (fullPattern.test(combinedText) && !histStatuteNoteArray.includes(combinedText)) {
					histStatuteNoteArray.push(combinedText);
				}
			}
		});
		// @fr Vérifie si l'URL cible la version d'un réglement '/version/rc' ou '/version/cr'
		// @en Check if the URL targets the version of a regulation  '/version/rc' or '/version/cr'
		if (url.includes('/version/rc') || url.includes('/version/cr')) {
			// @fr Extrait le dernier élément de 'histRegNote' et l'assigne à 'historicalNote'.
			// @en Extracts the last element from 'histRegNote' and assigns it to 'historicalNote'.
			historicalNote = histRegNote.slice(-1);
		}
		// @fr Sinon, vérifie si l'URL cible la version d'une loi '/version/lc' ou '/version/cs'
		// @en Else, check if the URL targets the version of a statute  '/version/lc' or '/version/cs'
		else if (url.includes('/version/lc') || url.includes('/version/cs')) {
			// @fr Extrait le dernier élément de 'histStatuteNoteArray' et l'assigne à 'historicalNote'.
			// @en Extracts the last element from 'histStatuteNoteArray' and assigns it to 'historicalNote'.
			historicalNote = histStatuteNoteArray.slice(-1);
		}
		
		// @fr Ajoute 'historicalNote' au tableau 'historicalNotesArray'.
		// @en Adds 'historicalNote' to the 'historicalNotesArray'.
		historicalNotesArray.push(historicalNote);
	});
	
	// @fr Définit des variables en vue de construire l'url du document parent
	// @en Defines variables to build the url of the parent document
	var versionPartsUrl = url.split('?code');
	var histUrlPart = url.split(/historique=|history=/)[0];
	var parentUrl = versionPartsUrl[0].replace('version', 'document');

	/* @fr Lance une requête asynchrone pour obtenir le document à l'URL spécifiée dans 'parentUrl'
		et stocke le résultat dans 'parentDoc'. */
	/* @en Performs an asynchronous request to retrieve the document from the specified URL in 'parentUrl'
		and stores the result in 'parentDoc'.*/
	var parentDoc = await requestDocument(parentUrl);

	// @fr Appel de la fonction scrapeCommon
	// @en Call the function scrapeCommon
	var newItem = await scrapeCommon(parentDoc, parentUrl);
	
	// @fr Trouver la langue du document parent @en Find the parent document language
	var metaLanguage = doc.querySelector('meta[name="dc.language"]');
	var language = metaLanguage ? metaLanguage.getAttribute('content') : '';
	
	// @fr Création de la balise html pour le titre de la note historique
	// @en Creating the html markup for the historical note title
	articleTitle = "<h1>" + articleTitle + "</h1>";

	if (language === 'fre') { // @Si la langue est française @en If language is french
		// @fr Démarrer le tableau HTML @en Start the HTML table
		var htmlTable = "<table><tr><th>Notes historiques</th><th>Date(s) d'entrée en vigueur</th></tr>";
	}
	else { // @fr Si la language est autre @en If language is other
		// @fr Démarrer le tableau HTML @en Start the HTML table
		htmlTable = "<table><tr><th>Historical note </th><th>In force date(s)</th></tr>";
	}
	
	// @fr Pour chaque note historique du tableau ... @en For every historical note of the array...
	for (let i = 0; i < historicalNotesArray.length; i++) {
		// @fr Commence une nouvelle ligne dans le tableau HTML
		// @en Start a new row in the HTML table
		htmlTable += "<tr>";
		// @fr Ajoute une cellule de tableau avec la note historique
		// @en Add a table cell with the historical note
		htmlTable += "<td>" + historicalNotesArray[i] + "</td>"; // Column 1
		// @fr Ajoute une autre cellule de tableau avec un lien. Le lien est construit en utilisant histUrlPart et inForceDate
		// @en Add another table cell with a link. The link is constructed using histUrlPart and inForceDate
		htmlTable += `<td><a href="${histUrlPart}${inForceDate[i].replace(/-/g, '')}#${inForceDate[i].replace(/-/g, '')}">${inForceDate[i]}</a></td>`; // Column 2
		// @fr Termine la ligne @en End the row
		htmlTable += "</tr>";
	}

	// @fr Fermer la table @en Close the table
	htmlTable += "</table>";
	
	// @fr Récupère l'élément avec l'ID 'expandAllVersion' du document
	// @en Retrieve the element with the ID 'expandAllVersion' from the document
	var expandVersion = doc.getElementById('expandAllVersion');


	// @fr Simule un clic sur l'élément récupéré
	// @en Simulate a click on the retrieved element
	expandVersion.click();

	// @fr Ajouter la mise en garde selon la langue @en Add caveat according to language
	if (language === 'fre') {
		var caveat = `<p>Notez que les versions historiques des lois antérieures au 1er janvier 2010 n'ont aucune valeur officielle.</p>
		<p>Source : <a href="https://www.legisquebec.gouv.qc.ca/fr/content/mjqpol"> Légis Québec</a></p>`;
		
		/* @fr 	Suppression des balises HTML à l'aide d'une expression régulière (RegEx).
		Le texte est ensuite converti en minuscules.
		*/

		/* @en	Remove HTML tags using RegEx. The Regular Expression /<\/?[^>]+(>|$)/g  is used to match and
		remove HTML tags. Text is converted to lowercase.
		*/
		var snapShotName = articleTitle.replace(/<\/?[^>]+(>|$)/g, "").toLowerCase();
		// @fr Défini le titre de l'instantané @en Define the snapshot title e.g. article 2
		snapShotName = "Instantané - " + snapShotName;
		// @fr Ajout d'une pièce jointe au nouvel élément Zotero. @en Adding an attachment to the new Zotero item.
		newItem.attachments.push({
			title: snapShotName,
			mimeType: "text/html",
			document: doc
		});
	}
	else { // @fr Si la langue n'est pas le français @en if the language is not french
		// @fr IDEM mais en anglais @en IDEM as above but in english
		caveat = `<p>Note that historical versions of statutes before January 1 2010 have no official status.</p>
		<p>Source : <a href="https://www.legisquebec.gouv.qc.ca/en/content/mjqpol"> Légis Québec</a></p>`;
		snapShotName = articleTitle.replace(/<\/?[^>]+(>|$)/g, "").toLowerCase();
		snapShotName = "Snapshot - " + snapShotName;
		newItem.attachments.push({
			title: snapShotName,
			mimeType: "text/html",
			document: doc
		});
	}

	// @fr Ajouter une nouvelle note avec un titre, un tableau et la mise en garde
	// @en Add a new note with title, table and caveat
	newItem.notes.push({ note: articleTitle + htmlTable + caveat });
	
	// @fr Ajouter l'url du document parent @en Add url of the parent document
	newItem.url = parentUrl;

	// @fr Finalise et enregistre l'objet newItem dans la base de données Zotero.
	// @en Finalize and save the newItem object to the Zotero database.
	newItem.complete();
}

async function scrapeChapter(doc, url) {
	var metaLanguage = doc.querySelector('meta[name="dc.language"]');
	// @fr Trouver la langue du document
	// @en Find the document language
	var language = metaLanguage ? metaLanguage.getAttribute('content') : '';
	
	// @fr Appel de la fonction scrapeCommon
	// @en Call the function scrapeCommon
	var newItem = await scrapeCommon(doc, url);
	
	// @fr Trouver le lien de la table des matières @en Find the link to the table of content
	var tocLinkElement = doc.querySelector('div.pr-1 a');
	var tocUrl = tocLinkElement.href; // @en without encoding (encodeURI) @fr sans encodage (encodeURI)

	// @fr Demander au serveur la table des matières en vue de la création d'une note
	// @en Request to the server for the Table of contentes to create a note
	var tocDoc = await requestDocument(tocUrl);
	
	// @fr Trouver les composants pour construire la date de sanction de la loi
	// @en Find components to construct the assent date of the statute
	var histDate = doc.querySelectorAll('.Identification .Hidden');
	
	/* 	@fr Le champ "Promulgué le" de Zotero n'est pas adéquat pour une loi consolidée, il est valide seulement
		pour une loi annuelle. Au lieu de cela, nous indiquons dans une nouvelle note la date à laquelle la loi a
		été initialement sanctionnée.
		
		@en The "dateEnacted" Zotero field is not adequate for consolidated statute only valid for annual statute.
		Instead, we push the date the law was originally assented to in a new note.
	 */
	var date, dateDay, dateMonth, dateYear;
	date = histDate[1].textContent;
	dateMonth = histDate[2].textContent;
	dateYear = date.split(' ').pop();
	if (language === 'fre') {
		dateDay = date.split(' ')[0];
	}
	else {
		dateDay = date.split(' ')[1];
	}
	// @fr Construction de la date de sanction pour la création d'une note
	// @en Construction of assent date for the creation of a note
	var assentDate = dateYear + '-' + dateMonth + '-' + dateDay;
	
	/* @fr Trouver le texte indiquant la date à laquelle une loi ou un règlement a été mis à jour,
	remplacé ou abrogé en vue de la création d'une note */
	/* @en Find the text indicating the date on which a law or regulation was updated, replaced or
	repealed in order to create a note */
	var textStatus = ZU.xpathText(doc, '//div[contains(@class, "card-header")]//div[contains(@class, "text-end")][1]');
	
	// @fr Remplacer toutes les virgules et les caractères d'espacement avec un espace simple, puis supprime tous les espaces de début et de fin.
	// @en Replaces all commas and whitespace characters'textStatus' string with a single space, and then trims any leading or trailing whitespace.
	textStatus = textStatus.replace(/,|\s+/g, ' ').trim();
	
	/* @fr Trouver la valeur de dbType pour déterminer si le document (doc) est une loi ou un règlement, les valeurs
	attendues sont : "rc" et "cr" pour un règlement consolidé  et "lc" et "cs" pour une loi consolidée */
	/* @en Find the value of dbType to determine whether the doc is a statute or a regulation, the expected values
	are : "rc" et "cr" for a consolidated regulation and "lc" et "cs" for a consolidated statute, respectively in
	french and english */
	var dbTypeValue = doc.getElementById('dbType').value;
	
	/* @fr Si la langue est le français, on définit une expression régulière pour trouver le mot "jour"
	e.g "À jour au 25 octobre 2023".  */
	/* @en If the language is english, we define a regular expression to find the word "updated"
	e.g. "Updated to 25 October 2023" */
	if (language === 'fre') {
		var statusRegex = /jour/gi;
	}
	else if (language === 'eng') {
		statusRegex = /updated/gi;
	}
	
	if (dbTypeValue === 'rc' || dbTypeValue === 'cr') { // @fr S'il s'agit d'un règlement consolidé (rc) @en If conslidated regulation (cr)
		if (textStatus !== '') { // @fr Si la variable n'est pas vide @en If the variable is not empty
			newItem.notes.push({ note: textStatus });
		}
		// @fr Si la langue du document est le français et que le texte inclus le mot "jour"
		// @en If the language of the document is french and the text includes the word "jour" (day)
		if (language == 'fre' && textStatus.match(statusRegex)) { // @fr Si la langue du document est le français et que le texte comporte le mot "jour"
			/* @fr Définir une variable local qui combine la balise html <h1> pour le titre et le résultat de la fonction
			'extractRegsTOC' appliquée à 'tocDoc'.
			@en Define a local variable that combines the html <h1> tag for the title and the result of the 'extractRegsTOC'
			function applied to 'tocDoc'.*/
			let toc = '<h1>TABLE DES MATIÈRES</h1>' + extractRegsTOC(tocDoc);
			newItem.notes.push({ note: toc }); //@fr Ajouter la tables des matières aux notes @en Add TOC to notes
		}
		else if (language === 'eng' && textStatus.match(statusRegex)) {	// @fr IDEM si en anglais @en IDEM if in english
			let toc = '<h1>TABLE OF CONTENTS</h1>' + extractRegsTOC(tocDoc);
			newItem.notes.push({ note: toc });
		}
	}
	else if (dbTypeValue === 'cs' || dbTypeValue === 'lc') {	// @fr S'il s'agit d'une loi consolidée (lc)
		// @en If conslidated statute (cs)
		if (textStatus !== '') { // @fr Si textStatus n'est pas vide // @en If testStatus is not empty
			// @fr Ajoute un nouvel objet note avec le contenu de textStatus au tableau de notes de newItem
			// @en Add a new note object with the content of textStatus to the notes array of newItem
			newItem.notes.push({ note: textStatus });
		}
	
		// @fr Vérifie si la langue est le français et si textStatus correspond au motif regex
		// @en Check if the language is French and textStatus matches the regex pattern
		if (language == 'fre' && textStatus.match(statusRegex)) {
			// @fr Variable locale combinant le préfixe "Sanction: " et la date de sanction originale de la loi
			// @ en Local variable combining the prefix "Sanction: " and the original sanction date of the law
			let assentNote = "Sanction: " + assentDate;

			// @fr Construction de la table des matières en utilisant la fonction extractStatuteTOC
			// @en Construct the table of contents using the extractStatuteTOC function
			let toc = '<h1>TABLE DES MATIÈRES</h1>' + extractStatuteTOC(tocDoc);

			// @fr Ajoute la note de sanction au tableau de notes de newItem
			// @en Add the assent note to the notes array of newItem
			newItem.notes.push({ note: assentNote });

			// @fr Ajoute la table des matières au tableau de notes de newItem
			// @en Add the table of contents to the notes array of newItem
			newItem.notes.push({ note: toc });
		}
		else if (language == 'eng' && textStatus.match(statusRegex)) {
			// @fr IDEM si langue anglaise @en IDEM if english language
			let assentNote = "Assented to: " + assentDate;
			let toc = '<h1>TABLE OF CONTENTS</h1>' + extractStatuteTOC(tocDoc);
			newItem.notes.push({ note: assentNote }); //@fr Ajouter aux notes @en Add to notes
			newItem.notes.push({ note: toc });
		}
	}
	
	/* 	@fr 	Défini les liens de téléchargement pour PDF et EPUB en remplaçant le mot 'document' par 'pdf'
				ou 'epub' respectivement et, si l'url se termine par "/", on le supprime avant d'ajouter l'extension
				appropriée à la fin.
		@en 	Define the download links for PDF and EPUB by replacing the word 'document' with 'pdf' or
				'epub' respectively and, if the url ends with "/" it is removed before adding the appropriate extension
				at the end.
	*/
	if (url.endsWith("/")) {
		url = url.slice(0, -1);
	}
	var pdfUrl = url.replace("/document/", "/pdf/") + ".pdf";
	var epubUrl = url.replace("/document/", "/epub/") + ".epub";
	
	// @fr Crée un nom pour snapShot à partir des trois derniers mots de textStatus e.g. "À jour au =>23 octobre 2023<="
	// @en Create a name for snapShot using the last three words of textStatus e.g. "Updated to =>October 23 2023<="
	let snapShotName = textStatus.split(' ').splice(-3).join(' ');
	
	// @fr Crée un instantané selon que la langue du document est française ou anglaise
	// @en Creates a snapshot depending on whether the document language is English or French
	if (language === 'fre') {
		snapShotName = "Instantané du " + snapShotName;
		newItem.attachments.push({
			title: snapShotName,
			mimeType: "text/html",
			document: doc
		});
	}
	else if (language === 'eng') {
		snapShotName += " Snapshot";
		newItem.attachments.push({
			title: snapShotName,
			mimeType: "text/html",
			document: doc
		});
	}
	// @fr Ajout du PDF et de l'EPUB aux pièces jointes
	// @en Adding PDF and EPUB to attachments
	newItem.attachments.push({
		url: pdfUrl,
		title: "PDF Document",
		mimeType: "application/pdf",
		downloadable: true
	});
	newItem.attachments.push({
		url: epubUrl,
		title: "EPUB Document",
		mimeType: "application/epub+zip",
		downloadable: true
	});

	// @fr Ajout de l'url @en Adding url
	newItem.url = url;
	
	// @fr Finalise et enregistre l'objet newItem dans la base de données Zotero.
	// @en Finalize and save the newItem object to the Zotero database.
	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/fr/chapitres?corpus=lois",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/en/chapters?corpus=statutes",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/fr/chapitres?corpus=regs",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/en/chapters?corpus=regs",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/fr/document/lc/A-1",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Loi sur les abeilles",
				"creators": [],
				"code": "RLRQ c A-1",
				"language": "fr-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/fr/document/lc/A-1",
				"attachments": [
					{
						"title": "Instantané du 15 novembre 2000",
						"mimeType": "text/html"
					},
					{
						"title": "PDF Document",
						"mimeType": "application/pdf",
						"downloadable": true
					},
					{
						"title": "EPUB Document",
						"mimeType": "application/epub+zip",
						"downloadable": true
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "Abrogée le 15 novembre 2000"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/en/document/cs/A-1",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bees Act",
				"creators": [],
				"code": "CQLR c A-1",
				"language": "en-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/en/document/cs/A-1",
				"attachments": [
					{
						"title": "15 November 2000 Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PDF Document",
						"mimeType": "application/pdf",
						"downloadable": true
					},
					{
						"title": "EPUB Document",
						"mimeType": "application/epub+zip",
						"downloadable": true
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "Repealed on 15 November 2000"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Loi sur les permis d’alcool",
				"creators": [],
				"code": "RLRQ c P-9.1",
				"language": "fr-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1",
				"attachments": [
					{
						"title": "Instantané du 25 octobre 2023",
						"mimeType": "text/html"
					},
					{
						"title": "PDF Document",
						"mimeType": "application/pdf",
						"downloadable": true
					},
					{
						"title": "EPUB Document",
						"mimeType": "application/epub+zip",
						"downloadable": true
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "À jour au 25 octobre 2023"
					},
					{
						"note": "Sanction: 1979-12-21"
					},
					{
						"note": "<h1>TABLE DES MATIÈRES</h1><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_i-h1\">CHAPITRE I INTERPRÉTATION ET APPLICATION</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_ii-h1\">CHAPITRE II Abrogé, 1993, c. 39, a. 77.</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-h1\">CHAPITRE III PERMIS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_0_1-h1\">SECTION 0.1 DISPOSITION PRÉLIMINAIRE</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_i-h1\">SECTION I CATÉGORIES DE PERMIS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_i_1-h1\">SECTION I.1 OPTIONS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_i_2-h1\">SECTION I.2 LIVRAISON DE BOISSONS ALCOOLIQUES PAR UN TIERS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_ii-h1\">SECTION II DÉLIVRANCE DU PERMIS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_iii-h1\">SECTION III DURÉE DES PERMIS ET PAIEMENT DU DROIT ANNUEL</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_iv-h1\">SECTION IV CONDITIONS ATTACHÉES À UN PERMIS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_v-h1\">SECTION V EXPLOITATION TEMPORAIRE ET CHANGEMENT D’ENDROIT, DE PÉRIODE OU D’AMÉNAGEMENT</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iii-gb:l_vi-h1\">SECTION VI SANCTIONS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_iv-h1\">CHAPITRE IV PROCÉDURE ET PREUVE</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_v-h1\">CHAPITRE V ENQUÊTE ET INSPECTION</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_vi-h1\">CHAPITRE VI RÉGLEMENTATION</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_vii-h1\">CHAPITRE VII LOI SUR LES INFRACTIONS EN MATIÈRE DE BOISSONS ALCOOLIQUES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#ga:l_viii-h1\">CHAPITRE VIII DISPOSITIONS TRANSITOIRES ET FINALES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1?langCont=fr#sc-nb:1\">ANNEXES ABROGATIVES </a></p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Act respecting liquor permits",
				"creators": [],
				"code": "CQLR c P-9.1",
				"language": "en-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1",
				"attachments": [
					{
						"title": "25 October 2023 Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PDF Document",
						"mimeType": "application/pdf",
						"downloadable": true
					},
					{
						"title": "EPUB Document",
						"mimeType": "application/epub+zip",
						"downloadable": true
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "Updated to 25 October 2023"
					},
					{
						"note": "Assented to: 1979-12-21"
					},
					{
						"note": "<h1>TABLE OF CONTENTS</h1><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_i-h1\">CHAPTER I INTERPRETATION AND APPLICATION</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_ii-h1\">CHAPTER II Repealed, 1993, c. 39, s. 77.</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-h1\">CHAPTER III PERMITS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_0_1-h1\">DIVISION 0.1 PRELIMINARY PROVISION</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_i-h1\">DIVISION I CLASSES OF PERMITS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_i_1-h1\">DIVISION I.1 OPTIONS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_i_2-h1\">DIVISION I.2 DELIVERY OF ALCOHOLIC BEVERAGES BY A THIRD PERSON</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_ii-h1\">DIVISION II ISSUE OF PERMITS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_iii-h1\">DIVISION III DURATION OF PERMITS AND PAYMENT OF ANNUAL DUTIES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_iv-h1\">DIVISION IV CONDITIONS ATTACHED TO A PERMIT</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_v-h1\">DIVISION V TEMPORARY USE AND CHANGE OF PLACE, PERIOD OR FLOOR ARRANGEMENT</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iii-gb:l_vi-h1\">DIVISION VI PENALTIES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_iv-h1\">CHAPTER IV PROCEDURE AND PROOF</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_v-h1\">CHAPTER V INVESTIGATION AND INSPECTION</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_vi-h1\">CHAPTER VI REGULATIONS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_vii-h1\">CHAPTER VII ACT RESPECTING OFFENCES RELATING TO ALCOHOLIC BEVERAGES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#ga:l_viii-h1\">CHAPTER VIII TRANSITIONAL AND FINAL PROVISIONS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1?langCont=en#sc-nb:1\">REPEAL SCHEDULES </a></p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/fr/version/lc/P-9.1?code=se:1&historique=20231214#20231214",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Loi sur les permis d’alcool",
				"creators": [],
				"code": "RLRQ c P-9.1",
				"language": "fr-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-9.1",
				"attachments": [
					{
						"title": "Instantané - article 1",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "<h1>Article 1</h1><table><tr><th>Notes historiques</th><th>Date(s) d'entrée en vigueur</th></tr><tr><td>2021, c. 30, a. 53</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/fr/version/lc/P-9.1?code=se:1&20220901#20220901\">2022-09-01</a></td></tr><tr><td>2018, c. 20, a. 1</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/fr/version/lc/P-9.1?code=se:1&20210805#20210805\">2021-08-05</a></td></tr><tr><td>1996, c. 34, a. 18</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/fr/version/lc/P-9.1?code=se:1&19960705#19960705\">1996-07-05</a></td></tr><tr><td>1979, c. 71, a. 1</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/fr/version/lc/P-9.1?code=se:1&19801015#19801015\">1980-10-15</a></td></tr></table><p>Notez que les versions historiques des lois antérieures au 1er janvier 2010 n'ont aucune valeur officielle.</p>\n\t\t<p>Source : <a href=\"https://www.legisquebec.gouv.qc.ca/fr/content/mjqpol\"> Légis Québec</a></p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/en/version/cs/P-9.1?code=se:1&history=20231214",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Act respecting liquor permits",
				"creators": [],
				"code": "CQLR c P-9.1",
				"language": "en-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/en/document/cs/P-9.1",
				"attachments": [
					{
						"title": "Snapshot - section 1",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "<h1>Section 1</h1><table><tr><th>Historical note </th><th>In force date(s)</th></tr><tr><td>2021, c. 30, s. 53</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/en/version/cs/P-9.1?code=se:1&20220901#20220901\">2022-09-01</a></td></tr><tr><td>2018, c. 20, s. 1</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/en/version/cs/P-9.1?code=se:1&20210805#20210805\">2021-08-05</a></td></tr><tr><td>1996, c. 34, s. 18</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/en/version/cs/P-9.1?code=se:1&19960705#19960705\">1996-07-05</a></td></tr><tr><td>1979, c. 71, s. 1</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/en/version/cs/P-9.1?code=se:1&19801015#19801015\">1980-10-15</a></td></tr></table><p>Note that historical versions of statutes before January 1 2010 have no official status.</p>\n\t\t<p>Source : <a href=\"https://www.legisquebec.gouv.qc.ca/en/content/mjqpol\"> Légis Québec</a></p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1,%20r.%206%20",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Règlement sur la promotion, la publicité et les programmes éducatifs en matière de boissons alcooliques",
				"creators": [],
				"code": "RLRQ c P-9.1, r. 6",
				"language": "fr-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1,%20r.%206%20",
				"attachments": [
					{
						"title": "Instantané du 1er septembre 2023",
						"mimeType": "text/html"
					},
					{
						"title": "PDF Document",
						"mimeType": "application/pdf",
						"downloadable": true
					},
					{
						"title": "EPUB Document",
						"mimeType": "application/epub+zip",
						"downloadable": true
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "À jour au 1er septembre 2023"
					},
					{
						"note": "<h1>TABLE DES MATIÈRES</h1><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1, r. 6?langCont=fr#ga:l_i-h1\">SECTION I DÉFINITIONS</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1, r. 6?langCont=fr#ga:l_ii-h1\">SECTION II PUBLICITÉ DES BOISSONS ALCOOLIQUES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1, r. 6?langCont=fr#ga:l_iii-h1\">SECTION III PRATIQUES PROMOTIONNELLES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1, r. 6?langCont=fr#ga:l_iv-h1\">SECTION IV PROGRAMMES ÉDUCATIFS EN MATIÈRE DE BOISSONS ALCOOLIQUES</a></p><p><a href=\"https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1, r. 6?langCont=fr#ga:l_v-h1\">SECTION V PROCÉDURE D’APPROBATION DE LA PROMOTION, DE LA PUBLICITÉ ET DES PROGRAMMES ÉDUCATIFS EN MATIÈRE DE BOISSONS ALCOOLIQUES</a></p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legisquebec.gouv.qc.ca/fr/version/rc/P-9.1,%20r.%206%20?code=se:1&historique=20231214#20231214",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Règlement sur la promotion, la publicité et les programmes éducatifs en matière de boissons alcooliques",
				"creators": [],
				"code": "RLRQ c P-9.1, r. 6",
				"language": "fr-CA",
				"rights": "© Éditeur officiel du Québec",
				"url": "https://www.legisquebec.gouv.qc.ca/fr/document/rc/P-9.1,%20r.%206%20",
				"attachments": [
					{
						"title": "Instantané - article 1",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "🏛"
					}
				],
				"notes": [
					{
						"note": "<h1>Article 1</h1><table><tr><th>Notes historiques</th><th>Date(s) d'entrée en vigueur</th></tr><tr><td>D. 469-2001, a. 1.</td><td><a href=\"https://www.legisquebec.gouv.qc.ca/fr/version/rc/P-9.1,%20r.%206%20?code=se:1&20120901#20120901\">2012-09-01</a></td></tr></table><p>Notez que les versions historiques des lois antérieures au 1er janvier 2010 n'ont aucune valeur officielle.</p>\n\t\t<p>Source : <a href=\"https://www.legisquebec.gouv.qc.ca/fr/content/mjqpol\"> Légis Québec</a></p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
