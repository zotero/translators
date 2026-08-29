
{
    "translatorID": "8d101ed8-ebd3-4f7b-ad5a-e90c84bbb80c",
    "label": "Justel",
    "creator": "Denzel Vingerhoed",
    "target": "ejustice.just.fgov.be",
    "minVersion": "3.0",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2026-01-19 23:45:00"
}

function detectWeb(doc, url) {
    const text = (doc.body.textContent || "").replace(/\s+/g, " ");

    // ── Case-law detectie (Grondwettelijk Hof / Cour constitutionnelle / Verfassungsgerichtshof)
    const courtHeader = (ZU.xpathText(doc, '//h1[contains(@class,"page__title")]//span') || "").trim();
    const isConstitutionalCourtHeader = /^(Grondwettelijk\s+Hof|Cour\s+constitutionnelle|Verfassungsgerichtshof)$/i.test(courtHeader);

    const casePatterns =
        /(uittreksel\s+uit\s+arrest|arrest\s+nr\.?|arr[ée]t\s+n[°o]|erkenntnis|urteil\s+nr\.?)/i;

    if ((url.includes("cgi_wet") || url.includes("/eli/") || url.includes("/cgi/"))) {
        if (isConstitutionalCourtHeader || casePatterns.test(text)) {
            return "legalCase";
        }

        // Indexcijfer → document
        if (/INDEXCIJFER/i.test(text)) return "document";

        return "statute";
    }
    return false;
}

function doWeb(doc, url) {
    const itemType = detectWeb(doc, url);
    if (!itemType) return;

    const newItem = new Zotero.Item(itemType);

    // Taaldetectie uit URL
    const lang = getLangFromURL(url); // 'nl' | 'fr' | 'de' | null

    // ────────────────────────────────────────────────────────
    // A) CASE LAW (arresten GwH/CC/VfGH)
    // ────────────────────────────────────────────────────────
    if (itemType === "legalCase") {
        // Court afkorting op basis van taal
        if (lang === "nl") newItem.court = "GwH";
        else if (lang === "fr") newItem.court = "CC";
        else if (lang === "de") newItem.court = "VfGH"; // pas aan indien andere conventie gewenst

        // Titel (intro-zin) + docket number + date decided
        const main = doc.querySelector("main.article-text, main.page__inner .article-text, main.page__inner-content") || doc;
        const pIntro = main ? main.querySelector("p") : null;
        let introText = "";
        if (pIntro) introText = normalizeWs(stripQuotes(pIntro.textContent || ""));

        // Fallback: volledige page body als nodig
        const searchText = introText || normalizeWs(stripQuotes(doc.body.textContent || ""));

        // Docket number
        //  - NL: "arrest nr. 150/2025"
        //  - FR: "arrêt n° 150/2025"
        //  - DE: "Urteil/Erkenntnis Nr. 150/2025"
        const docketMatch = searchText.match(/\b(?:nr\.?|n[°o]|Nr\.?)\s*([0-9]+\/[0-9]{4})\b/i);
        if (docketMatch) newItem.docketNumber = docketMatch[1];

        // Date decided
        //  - NL: "van 27 november 2025"
        //  - FR: "du 27 novembre 2025"
        //  - DE: "vom 27. November 2025"
        let dateMatch = searchText.match(/\b(?:van|du|vom)\s+(\d{1,2}\.?\s+[A-Za-zéèêàûäöüÉÈÊÀÛÄÖÜ]+(?:\s+\d{4}))\b/);
        if (dateMatch) {
            newItem.dateDecided = dateMatch[1].replace(/\s+/g, " ").trim();
        }

        // Titel: gebruik de intro-zin (zonder aanhalingstekens)
        if (introText) {
            newItem.title = introText;
        } else if (newItem.docketNumber && newItem.dateDecided) {
            // compacte fallbacktitel
            const label = (lang === "fr") ? "Arrêt" : (lang === "de") ? "Erkenntnis" : "Arrest";
            newItem.title = `${label} ${newItem.docketNumber} (${newItem.dateDecided})`;
        }

        // URL: neem ELI-link indien aanwezig, anders pagina-URL
        let eliURL = ZU.xpathText(doc, '//a[contains(@href, "/eli/")]/@href');
        if (eliURL && !eliURL.startsWith("http")) eliURL = "https://www.ejustice.just.fgov.be" + eliURL;
        newItem.url = eliURL || url;

        // Language + code
        applyLanguageAndCode(newItem, lang);

        newItem.complete();
        return;
    }

    // ────────────────────────────────────────────────────────
    // B) WETTEN VIA /cgi_wet/
    // ────────────────────────────────────────────────────────
    if (url.includes("/cgi_wet/")) {

        // Titel
        let title = null;
        const titleCandidates = doc.querySelectorAll("p, strong, h1, h2");
        for (let el of titleCandidates) {
            const text = (el.textContent || "").trim();
            if (text.length > 20 && !/(Nuttige links|Algemene informatie)/i.test(text)) {
                // Strip evt. datum aan het begin
                title = text.replace(/^\d{1,2}\s+[A-Z]+\s+\d{4}\.\s*[–-]?\s*/i, "");
                break;
            }
        }
        if (title) {
            newItem.title = title;
            if (itemType === "statute") newItem.nameOfAct = title;
            newItem.shortTitle = "";
        }

        // Publicatiedatum (oude Justel-methode)
        let pubDate = null;
        const dateCandidates = doc.querySelectorAll("span.item, p, strong");
        for (let el of dateCandidates) {
            const t = (el.textContent || "").trim();
            const m = t.match(/Publicatie van (\d{1,2}\s+[a-zéèêàû]+\s+\d{4})/i);
            if (m) { pubDate = m[1]; break; }
        }
        if (pubDate) newItem.dateEnacted = pubDate;

        // ROBUST: generieke Publicatie/Publication-parser (plain-text)
        if (!newItem.dateEnacted) {
            const pubFromPlain = extractPublicationFromPlainText(doc);
            if (pubFromPlain) newItem.dateEnacted = pubFromPlain;
        }

        // ELI (geef voorkeur aan Staatsblad-ELI)
        let eliURL = null;
        const eliLinks = Array.from(doc.querySelectorAll('a[href*="/eli/"]'));
        for (let a of eliLinks) {
            let href = a.getAttribute("href");
            if (href && href.includes("/staatsblad")) {
                eliURL = href.startsWith("http") ? href : "https://www.ejustice.just.fgov.be" + href;
                break;
            }
        }
        newItem.url = eliURL || url;

        applyLanguageAndCode(newItem, lang);
        newItem.complete();
        return;
    }

    // ────────────────────────────────────────────────────────
    // C) STAATSBLAAD VIA /cgi/article.pl (geen arrest)
    // ────────────────────────────────────────────────────────
    if (url.includes("/cgi/article.pl")) {

        // Datum uit links-box (NL/FR/DE)
        const linksBox = doc.querySelector(".links-box.no-print");
        if (linksBox) {
            const tx = linksBox.textContent || "";
            const m = tx.match(/\b(?:van|du|vom)\s+(\d{1,2}\.?\s+[a-zéèêàûäöü]+(?:\s+\d{4})?)/i);
            if (m) newItem.dateEnacted = m[1].replace(/[\u201C\u201D"]/g, "").replace(/\s+/g, " ").trim();
        }

        // Titel uit <p class="intro-text"> (strip leidende datum in NL/FR/DE)
        const intro = doc.querySelector("p.intro-text");
        if (intro) {
            const raw = (intro.textContent || "").trim();
            const cleaned = stripLeadingDate(raw);
            newItem.title = cleaned;
            newItem.nameOfAct = cleaned;
            newItem.shortTitle = "";
        }

        // ELI-link
        let eliURL = ZU.xpathText(doc, '//a[contains(@href, "/eli/")]/@href');
        if (eliURL && !eliURL.startsWith("http")) eliURL = "https://www.ejustice.just.fgov.be" + eliURL;
        newItem.url = eliURL || url;

        applyLanguageAndCode(newItem, lang);
        newItem.complete();
        return;
    }

    // ────────────────────────────────────────────────────────
    // D) FALLBACK
    // ────────────────────────────────────────────────────────
    let fbTitle = ZU.xpathText(doc, '//p[contains(@class,"list-item--title")]');
    if (fbTitle) {
        fbTitle = fbTitle.replace(/^\s*\d{1,2}\s+[A-Z]+\s+\d{4}\.\s*[–-]?\s*/i, "").trim();
        newItem.title = fbTitle.charAt(0).toUpperCase() + fbTitle.slice(1);
        newItem.nameOfAct = newItem.title;
        newItem.shortTitle = "";
    }

    // Oudere datum-patronen
    let oldPub = ZU.xpathText(doc, '//strong[contains(text(), "Publicatie")]/following-sibling::text()[1]');
    if (oldPub) newItem.dateEnacted = oldPub.trim().replace(/["“”]/g, "");
    let inForce = ZU.xpathText(doc, '//strong[contains(text(),"Inwerkingtreding") or contains(text(),"Entrée en vigueur") or contains(text(),"Inkrafttreten")]/following-sibling::text()[1]');
    if (inForce) newItem.dateEnacted = inForce.trim().replace(/["“”]/g, "");

    // Generieke Publicatie/Publication-parser
    if (!newItem.dateEnacted) {
        const pubFromPlain = extractPublicationFromPlainText(doc);
        if (pubFromPlain) newItem.dateEnacted = pubFromPlain;
    }

    // ELI fallback
    let eliURL2 = ZU.xpathText(doc, '//a[contains(@href, "/eli/")]/@href');
    if (eliURL2 && !eliURL2.startsWith("http")) eliURL2 = "https://www.ejustice.just.fgov.be" + eliURL2;
    newItem.url = eliURL2 || url;

    applyLanguageAndCode(newItem, lang);
    newItem.complete();
}

/* ───────────────────────── HELPERS ───────────────────────── */

function getLangFromURL(url) {
    const m = url.match(/[?&]language=(nl|fr|de)/i);
    return m ? m[1].toLowerCase() : null;
}

function applyLanguageAndCode(item, lang) {
    if (!lang) {
        item.language = "nl";
        item.code = "BS";
        return;
    }
    item.language = lang;
    item.code = (lang === "nl") ? "BS" : (lang === "fr") ? "M.B." : "BS";
}

// verwijder leidende datum "DD MAAND JJJJ. – " (NL/FR/DE) zoals in <p class="intro-text">
function stripLeadingDate(text) {
    if (!text) return text;
    const re = /^\s*\d{1,2}\.?[\s]+(JANUARI|JANVIER|JANUAR|FÉVRIER|FEVRIER|FEBRUARI|MÄRZ|MAART|MARS|AVRIL|APRIL|MEI|MAI|JUNI|JUIN|JULI|JUILLET|AUGUSTUS|AOÛT|AOUT|SEPTEMBER|SEPTEMBRE|OKTOBER|OCTOBRE|NOVEMBER|NOVEMBRE|DECEMBER|DÉCEMBRE|DECEMBRE)\s+\d{4}\.\s*[–-]?\s*/i;
    return text.replace(re, "");
}

// generiek: Haal Publicatie/Publication-datum uit <div class="plain-text">
function extractPublicationFromPlainText(doc) {
    const strongNodes = Array.from(doc.querySelectorAll("div.plain-text strong"));
    for (let st of strongNodes) {
        const label = (st.textContent || "").trim();
        if (!/^(Publicatie|Publication)\s*:?\s*$/i.test(label)) continue;

        const p = st.closest("p");
        let candidate = "";
        if (p) {
            candidate = stripQuotes((p.textContent || "").trim());
            candidate = candidate.replace(/^(Publicatie|Publication)\s*:\s*/i, "");
        } else {
            let node = st.nextSibling;
            while (node && node.nodeType === 3 && !node.textContent.trim()) node = node.nextSibling;
            if (node) candidate = stripQuotes((node.textContent || "").trim());
        }

        // Match datum in NL/FR/DE
        const dateRe = /\b(\d{1,2}\s+(?:januari|janvier|januar|février|fevrier|februari|märz|maart|mars|avril|april|mei|mai|juni|juin|juli|juillet|augustus|août|aout|september|septembre|oktober|octobre|november|novembre|december|décembre|decembre)\s+\d{4})\b/i;
        const m = candidate.match(dateRe);
        if (m) return m[1].replace(/\s+/g, " ").trim();
    }
    return null;
}

function stripQuotes(s) {
    return s.replace(/[\u201C\u201D"]/g, "");
}

function normalizeWs(s) {
    return (s || "").replace(/\s+/g, " ").trim();
}
