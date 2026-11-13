{
	"translatorID": "3f1c2b7e-6a0d-4c9e-9b52-7d2f4e8a1c55",
	"label": "Bibliothèque des Facultés Loyola Paris (Orphée NX)",
	"creator": "Facultés Loyola Paris",
	"target": "^https?://bibliotheque\\.loyolaparis\\.fr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-14 10:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Traducteur Zotero pour le catalogue de la bibliothèque des Facultés Loyola Paris
	(portail Orphée NX, C3rb). Version 1.0, 14 octobre 2026, validée sur les pages réelles du catalogue.
	Copyright © 2026 Facultés Loyola Paris

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	***** END LICENSE BLOCK *****
*/

/*
	Principe. Le traducteur lit la notice telle qu'elle s'affiche (lignes « Titre(s) »,
	« Auteur(s) », « Éditeur(s) », « Date d'édition », « Collection », « Langue(s) »),
	sans dépendre du balisage exact de la page : il cherche les libellés et prend la
	valeur qui les suit. Il ne fait aucune requête en dehors du site du catalogue,
	n'exécute aucun code extérieur et n'enregistre ni capture de page ni résumé.
	Les champs sont mis au format attendu par le Vade-mecum des Facultés Loyola Paris
	(éditeur sous forme simple, sous-titre après un point, titre abrégé rempli).
*/

var NOTICE_RE = /\/detail-dune-notice\/notice\/(\d+)/;

var LABELS = {
	title: /^Titre\(s\)?\s*:?$/i,
	authors: /^Auteur\(s\)?\s*:?$/i,
	publisher: /^[ÉE]diteur\(s\)?\s*:?$/i,
	date: /^Date d['’][ée]dition\s*:?$/i,
	language: /^Langue\(s\)?\s*:?$/i,
	series: /^Collection\s*:?$/i,
	isbn: /^ISBN\s*:?$/i,
	pages: /^(Description|Collation|Importance mat[ée]rielle)\s*:?$/i,
	edition: /^(Mention d['’][ée]dition|[ÉE]dition)\s*:?$/i,
	docType: /^(Type de document|Support)\s*:?$/i
};

// Rôles Unimarc tels que le portail les affiche, vers les rôles de Zotero
var ROLES = [
	[/directeur|direction|dir\.|[ée]diteur scientifique|[ée]d\. scientifique|responsable scientifique/i, "editor"],
	[/traducteur|traduction|trad\./i, "translator"],
	[/^auteur$|auteur du texte|auteur pr[ée]sum[ée]|auteur adapt/i, "author"],
	[/pr[ée]facier|postfacier|pr[ée]face|postface|illustrateur|photographe|collaborateur|annotateur|commentateur|compilateur|r[ée]dacteur|contributeur|auteur du commentaire|auteur de l['’]introduction/i, "contributor"]
];

var PARTICLES = /^(de|d'|d’|du|des|della|delle|dello|di|da|van|von|van der|van den|von der|le|la|les|du|af|zu|zur)$/i;
var INSTITUTION_RE = /\b(conseil|commission|congr[ée]gation|[ée]glise|concile|universit[ée]|institut|centre|soci[ée]t[ée]|association|acad[ée]mie|facult[ée]s?|minist[èe]re|comit[ée]|synode|compagnie|dicast[èe]re|secr[ée]tariat|office|groupe|[ée]cole|biblioth[èe]que|fondation|f[ée]d[ée]ration|ordre|abbaye|monast[èe]re|communaut[ée])\b/i;

var LANGUAGES = {
	"français": "fr", "francais": "fr", "anglais": "en", "allemand": "de", "italien": "it", "espagnol": "es",
	"latin": "la", "grec ancien": "grc", "grec": "el", "portugais": "pt", "néerlandais": "nl", "hébreu": "he", "polonais": "pl"
};

function detectWeb(doc, url) {
	if (NOTICE_RE.test(url) && labelValue(doc, LABELS.title)) {
		return detectType(doc);
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function detectType(doc) {
	var type = labelValue(doc, LABELS.docType) || badgeText(doc) || metaType(doc);
	if (/article|d[ée]pouillement/i.test(type)) return "journalArticle";
	if (/th[èe]se|m[ée]moire/i.test(type)) return "thesis";
	if (/p[ée]riodique|revue/i.test(type)) return "book";
	return "book";
}

function metaType(doc) {
	var m = doc.querySelector('meta[name="DC.type"], meta[property="og:type"]');
	return m ? (m.getAttribute("content") || "") : "";
}

// Petit badge « Livre », « Article »… affiché sous la vignette (classe badge-support du gabarit, sinon texte)
function badgeText(doc) {
	var badge = doc.querySelector(".badge-support");
	if (badge && trim(badge.textContent)) return trim(badge.textContent);
	var els = doc.querySelectorAll("span, div, a, p");
	for (var i = 0; i < els.length; i++) {
		var t = trim(els[i].textContent);
		if (/^(Livre|Article|P[ée]riodique|Revue|Th[èe]se|M[ée]moire|Document [ée]lectronique|Livre num[ée]rique)$/i.test(t)
			&& els[i].children.length === 0) {
			return t;
		}
	}
	return "";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var links = doc.querySelectorAll("a[href]");
	for (var i = 0; i < links.length; i++) {
		var href = links[i].href;
		if (!NOTICE_RE.test(href)) continue;
		var title = trim(links[i].textContent);
		if (!title || title.length < 3 || /^(Retour|Voir|D[ée]tail|Lire la suite|\+)$/i.test(title)) continue;
		href = href.replace(/[?#].*$/, "");
		if (checkOnly) return true;
		found = true;
		if (!items[href]) items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (var noticeUrl of Object.keys(items)) {
			await scrape(await requestDocument(noticeUrl), noticeUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	var item = new Zotero.Item(detectType(doc));
	item.libraryCatalog = "Bibliothèque des Facultés Loyola Paris";
	item.url = url;

	// Auteurs d'abord : la mention de responsabilité du titre ISBD s'identifie grâce à eux
	var creators = parseCreators(labelValue(doc, LABELS.authors));
	item.creators = creators;

	var titleInfo = parseTitle(labelValue(doc, LABELS.title), creators);
	item.title = titleInfo.title;
	if (titleInfo.shortTitle) item.shortTitle = titleInfo.shortTitle;

	var pub = parsePublisher(labelValue(doc, LABELS.publisher));
	if (pub.place) item.place = pub.place;
	if (pub.publisher) item.publisher = pub.publisher;

	var date = labelValue(doc, LABELS.date);
	var year = date.match(/\b(1[5-9]\d\d|20\d\d)\b/);
	if (year) item.date = year[1];

	var seriesInfo = parseSeries(labelValue(doc, LABELS.series), doc);
	if (seriesInfo.series) item.series = seriesInfo.series;
	if (seriesInfo.number) item.seriesNumber = seriesInfo.number;

	var edition = labelValue(doc, LABELS.edition);
	if (edition) {
		var ed = edition.match(/^(\d+)/);
		item.edition = ed ? ed[1] : edition;
	}

	var pages = labelValue(doc, LABELS.pages);
	var np = pages.match(/(\d+)\s*p\b/);
	if (np) item.numPages = np[1];

	var lang = labelValue(doc, LABELS.language).toLowerCase().split(/[;,]/)[0].trim();
	if (lang) item.language = LANGUAGES[lang] || lang;

	var isbn = labelValue(doc, LABELS.isbn) || metaISBN(doc);
	if (isbn) {
		var cleanISBN = ZU.cleanISBN(isbn);
		if (cleanISBN) item.ISBN = (ZU.toISBN13 && ZU.toISBN13(cleanISBN)) || cleanISBN;
	}

	// Ni résumé (la page n'en expose pas de propre à la notice), ni capture de page
	item.complete();
}

/* ---------- Lecture de la notice ---------- */

// Valeur affichée à droite d'un libellé : élément suivant, ou texte du parent sans le libellé
function labelValue(doc, labelRe) {
	// Gabarit Orphée NX (vérifié le 14 octobre 2026) : <div class="det__ntc-item__label">Titre(s) :</div><div class="det__ntc-item__data">…</div>
	var labels = doc.querySelectorAll(".det__ntc-item__label");
	for (var j = 0; j < labels.length; j++) {
		if (labelRe.test(trim(labels[j].textContent))) {
			var data = labels[j].parentElement && labels[j].parentElement.querySelector(".det__ntc-item__data");
			if (data) return cleanValue(data.textContent);
		}
	}
	// Repli indépendant du balisage : un libellé court, puis l'élément qui le suit
	var candidates = doc.querySelectorAll("dt, th, td, strong, b, span, label, div, p, li");
	for (var i = 0; i < candidates.length; i++) {
		var el = candidates[i];
		if (el.children.length > 1) continue;
		var own = trim(el.textContent);
		if (!own || own.length > 40 || !labelRe.test(own)) continue;
		var next = el.nextElementSibling;
		if (next && trim(next.textContent)) {
			return cleanValue(next.textContent);
		}
		var parent = el.parentElement;
		if (parent) {
			var full = trim(parent.textContent);
			if (full.length > own.length) {
				return cleanValue(full.substring(full.indexOf(own) + own.length));
			}
		}
	}
	return "";
}

function cleanValue(s) {
	return trim(s).replace(/^[:\s]+/, "").replace(/[\s;,]+$/, "");
}

function trim(s) {
	return ZU.trimInternal(String(s || ""));
}

function metaISBN(doc) {
	var metas = doc.querySelectorAll("meta[content]");
	for (var i = 0; i < metas.length; i++) {
		var name = (metas[i].getAttribute("name") || metas[i].getAttribute("property") || "").toLowerCase();
		var content = metas[i].getAttribute("content") || "";
		if (/isbn/.test(name) && ZU.cleanISBN(content)) return content;
	}
	for (var j = 0; j < metas.length; j++) {
		var c = metas[j].getAttribute("content") || "";
		if (/^(97[89][\d-]{10,14}|[\d-]{9,12}[\dX])$/.test(c.trim()) && ZU.cleanISBN(c)) return c;
	}
	return "";
}

/* ---------- Auteurs ---------- */

// « Emmanuel Durand (1972-....) (Auteur); Vincent Holzer (1963-...) (Préfacier, etc.) »
function parseCreators(text) {
	var creators = [];
	if (!text) return creators;
	var parts = text.split(/\s*;\s*/);
	for (var i = 0; i < parts.length; i++) {
		var part = trim(parts[i]);
		if (!part) continue;
		var role = "";
		var parens = part.match(/\(([^()]*)\)/g) || [];
		for (var k = 0; k < parens.length; k++) {
			var inner = parens[k].slice(1, -1);
			if (!/\d{3,4}/.test(inner)) role = inner; // les dates de vie ne sont pas un rôle
		}
		var name = trim(part.replace(/\([^()]*\)/g, "").replace(/\[[^\]]*\]/g, ""));
		name = name.replace(/[,;:\s]+$/, "");
		if (!name) continue;
		var creatorType = roleToType(role);
		if (!creatorType) continue; // rôle explicitement hors citation (par exemple « Ancien possesseur »)
		creators.push(makeCreator(name, creatorType, role));
	}
	// Sans aucun auteur mais avec des directeurs, la fiche reste citable sous leur nom (le style ajoute « dir. »)
	return creators;
}

function roleToType(role) {
	if (!role) return "author";
	if (/ancien possesseur|d[ée]dicataire|imprimeur|relieur|destinataire/i.test(role)) return null;
	for (var i = 0; i < ROLES.length; i++) {
		if (ROLES[i][0].test(role)) return ROLES[i][1];
	}
	return "contributor";
}

function makeCreator(name, creatorType, role) {
	if (/collectivit[ée]|organisme|institution/i.test(role) || INSTITUTION_RE.test(name) && !/,/.test(name)) {
		return { lastName: name, creatorType: creatorType, fieldMode: 1 };
	}
	if (name.indexOf(",") !== -1) {
		var c = ZU.cleanAuthor(name, creatorType, true);
		return c;
	}
	// Ordre direct « Prénom Nom », en gardant la particule avec le nom : « Henri de Lubac » -> de Lubac, Henri
	var tokens = name.split(/\s+/);
	if (tokens.length === 1) {
		return { lastName: name, creatorType: creatorType, fieldMode: 1 };
	}
	var split = tokens.length - 1;
	for (var i = 1; i < tokens.length - 1; i++) {
		var t = tokens[i];
		var nextCap = /^\p{Lu}/u.test(tokens[i + 1]);
		if (PARTICLES.test(t) && nextCap) { split = i; break; }
		if (/^(De|Du|Des|Van|Von|Da|Di|Le|La|Della)$/.test(t) && nextCap) { split = i; break; }
	}
	return {
		firstName: tokens.slice(0, split).join(" "),
		lastName: tokens.slice(split).join(" "),
		creatorType: creatorType
	};
}

/* ---------- Titre ---------- */

// « La périchorèse des personnes divines / immanence mutuelle ; réciprocité et communion »
// -> titre « La périchorèse des personnes divines. Immanence mutuelle. Réciprocité et communion »,
//    titre abrégé « La périchorèse des personnes divines »
function parseTitle(text, creators) {
	var t = trim(text).replace(/\s*\[[^\]]*\]\s*/g, " "); // [Texte imprimé]
	t = t.split(/\s=\s/)[0]; // titre parallèle
	var surnames = creators.map(function (c) { return (c.lastName || "").toLowerCase(); }).filter(Boolean);
	var head = t, tail = "";
	var slash = t.indexOf(" / ");
	if (slash !== -1) {
		head = t.substring(0, slash);
		tail = t.substring(slash + 3);
		// Mention de responsabilité (contient un nom d'auteur) : on l'écarte ; sinon c'est un complément du titre
		var lowerTail = tail.toLowerCase();
		var isResponsibility = surnames.some(function (s) { return s.length > 2 && lowerTail.indexOf(s) !== -1; });
		if (isResponsibility) tail = "";
	}
	var subtitles = [];
	var colon = head.split(/\s:\s/);
	var proper = trim(colon[0]);
	for (var i = 1; i < colon.length; i++) subtitles.push(colon[i]);
	if (tail) subtitles = subtitles.concat(tail.split(/\s;\s/));
	subtitles = subtitles.map(function (s) {
		s = trim(s).replace(/[\s.;:,]+$/, "");
		return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
	}).filter(Boolean);
	proper = proper.replace(/[\s.;:,]+$/, "");
	var title = subtitles.length ? proper + ". " + subtitles.join(". ") : proper;
	return { title: title, shortTitle: subtitles.length ? proper : "" };
}

/* ---------- Éditeur ---------- */

// « Paris, Ed. du Cerf » -> lieu « Paris », éditeur « Cerf » ; « Turnhout, Brepols » ; « Paris, Seuil ; Montréal, Fides »
function parsePublisher(text) {
	var out = { place: "", publisher: "" };
	if (!text) return out;
	var first = trim(text.split(/\s*;\s*/)[0]).replace(/\s*\[[^\]]*\]\s*/g, " ");
	var comma = first.indexOf(",");
	var place = comma !== -1 ? first.substring(0, comma) : "";
	var publisher = comma !== -1 ? first.substring(comma + 1) : first;
	// Deux-points à la mode ISBD : « Paris : Cerf »
	if (comma === -1 && / : /.test(first)) {
		var p = first.split(/\s:\s/);
		place = p[0]; publisher = p[1];
	}
	out.place = trim(place).replace(/[\s,.]+$/, "");
	out.publisher = normalizePublisher(trim(publisher));
	return out;
}

// Forme simple du Vade-mecum (§ 3.5.c) : « Cerf », « Seuil », « Gallimard », mais « Éditions ouvrières »
function normalizePublisher(p) {
	p = p.replace(/[\s,.]+$/, "").replace(/^[\s,]+/, "");
	p = p.replace(/^(Les\s+|L['’])?([ÉE]d\.|[ÉE]ditions?|[ée]d\.|[ée]ditions?)\s+(?:(?:du|de\s+la|de\s+l['’]|des|de|d['’])\s*)?(?=\p{Lu})/u, "");
	p = p.replace(/\s*\(.*\)\s*$/, "");
	return trim(p);
}

/* ---------- Collection ---------- */

function parseSeries(text, doc) {
	var out = { series: "", number: "" };
	var s = trim(text);
	if (s) {
		var m = s.match(/^(.*?)\s*[;,]?\s*(?:n[°º]|no\.?|vol\.?|v\.|t\.)?\s*(\d+)\s*$/);
		if (m && m[1]) { out.series = m[1]; out.number = m[2]; }
		else out.series = s;
		out.series = out.series.replace(/[\s;,.]+$/, "");
	}
	if (!out.number) {
		// Le portail expose parfois le numéro dans une balise d'en-tête, sous la forme « v.243 »
		var metas = doc.querySelectorAll("meta[content]");
		for (var i = 0; i < metas.length; i++) {
			var c = trim(metas[i].getAttribute("content"));
			var v = c.match(/^v(?:ol)?\.?\s*(\d+)$/i);
			if (v) { out.number = v[1]; break; }
		}
	}
	return out;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://bibliotheque.loyolaparis.fr/detail-dune-notice/notice/470659962",
		"items": [
			{
				"itemType": "book",
				"title": "La périchorèse des personnes divines. Immanence mutuelle. Réciprocité et communion",
				"shortTitle": "La périchorèse des personnes divines",
				"creators": [
					{ "firstName": "Emmanuel", "lastName": "Durand", "creatorType": "author" },
					{ "firstName": "Vincent", "lastName": "Holzer", "creatorType": "contributor" }
				],
				"date": "2005",
				"place": "Paris",
				"publisher": "Cerf",
				"series": "Cogitatio fidei",
				"seriesNumber": "243",
				"ISBN": "9782204077330",
				"language": "fr",
				"libraryCatalog": "Bibliothèque des Facultés Loyola Paris",
				"url": "https://bibliotheque.loyolaparis.fr/detail-dune-notice/notice/470659962",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bibliotheque.loyolaparis.fr/detail-dune-notice/notice/1316203558",
		"items": [
			{
				"itemType": "book",
				"title": "Connaitre Dieu. Métamorphoses de la théologie comme science dans les religions monothéistes",
				"shortTitle": "Connaitre Dieu",
				"creators": [
					{ "firstName": "Olivier", "lastName": "Boulnois", "creatorType": "editor" },
					{ "firstName": "Sylvio Hermann", "lastName": "de Franceschi", "creatorType": "editor" },
					{ "firstName": "Philippe", "lastName": "Hoffmann", "creatorType": "editor" }
				],
				"date": "2024",
				"place": "Turnhout",
				"publisher": "Brepols",
				"series": "Bibliotheque de l'Ecole des Hautes Etudes. Sciences religieuses",
				"seriesNumber": "205",
				"ISBN": "9782503611983",
				"language": "fr",
				"libraryCatalog": "Bibliothèque des Facultés Loyola Paris",
				"url": "https://bibliotheque.loyolaparis.fr/detail-dune-notice/notice/1316203558",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bibliotheque.loyolaparis.fr/recherche-simple/simple/Mots/0/durand+emmanuel",
		"items": "multiple"
	}
];
/** END TEST CASES **/
