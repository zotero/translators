/*
 * This translator is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This translator is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

{
	"translatorID": "7ae64474-9f23-4d2c-9995-dfe8c5010c4b",
	"label": "ChateauVersailles",
	"creator": "OpenAI / Alexandre MENISSEZ",
	"target": "^https://collections\\.chateauversailles\\.fr/\\#/query/.*",
	"minVersion": "3.0",
	"maxVersion": "6.999",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-01 19:45:00"
}

function detectWeb(_doc, _url) {
	return "artwork";
}

function doWeb(doc, url) {
	let item = new Zotero.Item("artwork");

	// Titre strict depuis .pagetitle.ng-scope
	let titleNode = doc.querySelector("div.pagetitle.ng-scope");
	item.title = titleNode ? titleNode.textContent.trim().replace(/\s+/g, " ") : "Œuvre sans titre";

	// Bloc de métadonnées
	let block = doc.querySelector("#caracteristiques");

	function extract(html, label) {
		let match = html.match(new RegExp("<b>" + label + ".*?</b>\\s*:?\\s*(.*?)<br>", "i"));
		return match ? match[1].replace(/<.*?>/g, "").replace(/\u00a0:|:|&nbsp;:&nbsp;/g, "").trim() : "";
	}

	if (block) {
		let html = block.innerHTML;

		item.artworkMedium = extract(html, "Matière et technique");
		item.artworkSize = extract(html, "Dimensions");

		let rawDate = extract(html, "Date de création");
		let yearMatch = rawDate.match(/\d{4}/);
		if (yearMatch) item.date = yearMatch[0];

		item.archiveLocation = extract(html, "Emplacement");
		item.callNumber = extract(html, "N° d'inventaire");

		let type = extract(html, "Désignation");
		if (type) item.type = type;

		let represented = extract(html, "Personne représentée");
		if (represented) item.extra = "Personne représentée: " + represented;

		// Auteur
		let authorMatch = html.match(/<b>Auteur.*?:.*?<span.*?>(.*?)<\/span>/i);
		if (authorMatch) {
			item.creators.push({
				lastName: authorMatch[1].trim(),
				creatorType: "artist",
				fieldMode: 1
			});
		}
	}

	// Résumé : commentaire + historique fusionnés
	let abstractParts = [];
	let commentaireNode = doc.querySelector("div.commentaire-chef-doeuvre") || [...doc.querySelectorAll("div")].find(el => el.textContent.includes("Commentaire"));
	if (commentaireNode) {
		let texte = commentaireNode.textContent.trim().replace(/\s+/g, " ");
		// Nettoyer les bouts parasites
		texte = texte.split("Historique")[0];
		abstractParts.push("Commentaire : " + texte);
	}

	let historiqueNode = [...doc.querySelectorAll("div")].find(el => el.textContent.includes("Historique"));
	if (historiqueNode) {
		let texte = historiqueNode.textContent.trim().replace(/\s+/g, " ");
		abstractParts.push("Historique : " + texte);
	}
	item.abstractNote = abstractParts.join("\n\n");

	// Droits
	let scripts = Array.from(doc.querySelectorAll("script")).map(s => s.innerText);
	let rightsMatch = scripts.find(t => t.includes("©") && t.includes("Fouin"));
	if (rightsMatch) {
		let r = rightsMatch.match(/©.*?Fouin/);
		if (r) item.rights = r[0];
	}

	// Image
	let img = doc.querySelector('img[src*="cc/imageproxy.aspx"]');
	if (img) {
		item.attachments.push({
			title: "Image de l'œuvre",
			mimeType: "image/jpeg",
			url: new URL(img.getAttribute("src"), url).href,
			snapshot: false
		});
	}

	item.libraryCatalog = "Château de Versailles Collections";
	item.language = "fr";
	item.publisher = "Château de Versailles";
	item.url = url;

	item.complete();
}
