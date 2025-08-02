{
  "translatorID": "7ae64474-9f23-4d2c-9995-dfe8c5010c4b",
  "label": "Château de Versailles",
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

function detectWeb(doc, url) {
  return "artwork";
}

function doWeb(doc, url) {
  let item = new Zotero.Item("artwork");

  // Titre strict depuis .pagetitle.ng-scope
  let titleNode = doc.querySelector("div.pagetitle.ng-scope");
  item.title = titleNode ? titleNode.textContent.trim().replace(/\s+/g, " ") : "Œuvre sans titre";

  // Bloc de métadonnées
  let block = doc.querySelector("#caracteristiques");
  if (block) {
    let html = block.innerHTML;

    function extract(label) {
      let match = html.match(new RegExp("<b>" + label + ".*?</b>\s*:?\s*(.*?)<br>", "i"));
      return match ? match[1].replace(/<.*?>/g, "").replace(/\u00a0:|:|&nbsp;:&nbsp;/g, "").trim() : "";
    }

    item.artworkMedium = extract("Matière et technique");
    item.artworkSize = extract("Dimensions");

    let rawDate = extract("Date de création");
    let yearMatch = rawDate.match(/\d{4}/);
    if (yearMatch) item.date = yearMatch[0];

    item.archiveLocation = extract("Emplacement");
    item.callNumber = extract("N° d'inventaire");

    let type = extract("Désignation");
    if (type) item.type = type;

    let represented = extract("Personne représentée");
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
