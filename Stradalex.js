
{
    "translatorID": "4d6937a2-1319-4650-af13-869912344e16",
    "label": "Stradalex",
    "creator": "Denzel Vingerhoed",
    "target": "^https?://(?:(?:www-stradalex-com\\.kuleuven\\.e-bronnen\\.be)|(?:www\\.)?stradalex\\.com|(?:www\\.)?stardalex\\.com)/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2026-01-18"
}

function detectWeb(doc, url) {
    // Journal issues / articles (may contain case law)
    if (url.includes("/sl_rev_utu/toc/")) {
        if (isCaseLaw(doc)) return "case";
        return "journalArticle";
    }

    // Monographs (live and archive) -> treat as book chapters (bookSection)
    if (url.includes("/sl_mono/toc/") || url.includes("/sl_mono_archive/")) {
        return "bookSection";
    }

    // Search / editor views
    if (
        url.includes("sl_mono_editor") ||
        url.includes("sl_rev_utu_editor") ||
        url.includes("search")
    ) {
        return "multiple";
    }

    // Conservative fallback if a content title is present
    if (doc.querySelector("h1.title")) {
        return "bookSection";
    }

    return false;
}

function doWeb(doc, url) {
    let type = detectWeb(doc, url);

    if (type === "multiple") {
        let items = getSearchResults(doc);
        if (!items) return;

        Zotero.selectItems(items, function (selectedItems) {
            if (!selectedItems) return;
            ZU.processDocuments(Object.keys(selectedItems), scrape);
        });
    } else {
        scrape(doc, url);
    }
}

function getSearchResults(doc) {
    let items = {};
    let links = doc.querySelectorAll(
        'a[href*="/sl_mono/toc/"], a[href*="/sl_mono_archive/"], a[href*="/sl_rev_utu/toc/"]'
    );

    for (let link of links) {
        let title = ZU.trimInternal(link.textContent);
        let href = link.href;
        if (href && title) {
            items[href] = title;
        }
    }

    return Object.keys(items).length ? items : false;
}

/* ======================
   Helpers
   ====================== */

function isCaseLaw(doc) {
    if (doc.querySelector(".meta_ecli")) return true;
    if (doc.querySelector(".meta_numrole")) return true;
    if (doc.querySelector(".meta_date_pro")) return true; // datum van de uitspraak
    return false;
}

/** Remove periods from journal abbreviations: "R.W." -> "RW", "J.T." -> "JT" */
function stripDots(abbrev) {
    if (!abbrev) return abbrev;
    return abbrev.replace(/\./g, "").trim();
}

/** Extract "p. 1696-1711" → ["1696","1711"] */
function extractPagesFromText(txt) {
    if (!txt) return null;
    let m = txt.match(/p{1,2}\.\s*(\d+)\s*[-–—]\s*(\d+)/i);
    if (m) return [m[1], m[2]];
    return null;
}

/** Journal title from <i>…</i> in the reference; without dots */
function extractJournalFromRefNode(refNode) {
    if (!refNode) return null;

    let it = refNode.querySelector("i");
    if (it) {
        return stripDots(ZU.trimInternal(it.textContent));
    }

    let txt = refNode.textContent || "";
    let m = txt.match(/\b([A-Z]\.A-Z?)\b/);
    if (m) {
        return stripDots(m[1]);
    }
    return null;
}

/** Article title: h1.title, else « … », else " … " */
function extractArticleTitle(doc, refNode) {
    let h1 = doc.querySelector("h1.title");
    if (h1) {
        let t = ZU.trimInternal(h1.textContent);
        if (t) return t;
    }
    if (refNode) {
        let txt = refNode.textContent || "";
        let mG = txt.match(/«\s*([^»]+?)\s*»/);
        if (mG && mG[1]) return ZU.trimInternal(mG[1]);
        let mQ = txt.match(/["“]\s*([^"”]+?)\s*["”]/);
        if (mQ && mQ[1]) return ZU.trimInternal(mQ[1]);
    }
    return null;
}

/** Normalize and split a human name into first/last (handles "Last, First" and "First Last"). */
function parseNameString(name) {
    if (!name) return null;
    let s = (name + "")
        .replace(/[\u00A0\u2000-\u200D\u2060]+/g, " ") // NBSP & zero-width variants → space
        .replace(/^[“”"'\u2018\u2019\s]+|[“”"'\u2018\u2019\s]+$/g, "") // trim quotes/spaces
        .replace(/\s+/g, " ")
        .trim();

    if (!s) return null;

    // If "Last, First"
    if (s.includes(",")) {
        let parts = s.split(",");
        let last = parts[0].trim();
        let first = parts.slice(1).join(",").trim();
        if (last && first) return { firstName: first, lastName: last };
    }

    // Else assume "First ... Last"
    let tokens = s.split(" ");
    if (tokens.length === 1) {
        return { firstName: "", lastName: tokens[0] };
    } else {
        let lastName = tokens[tokens.length - 1];
        let firstName = tokens.slice(0, -1).join(" ");
        return { firstName, lastName };
    }
}

/** Authors list pattern: journals (small-caps last name + remaining first/initials) */
function parseAuthors_Journal(doc) {
    let creators = [];
    let lis = doc.querySelectorAll(".meta_authors ul.meta_auth_list li");
    for (let li of lis) {
        let lastNode = li.querySelector(".small-caps");
        let lastFromCaps = lastNode ? ZU.trimInternal(lastNode.textContent) : "";

        let liText = ZU.trimInternal(li.textContent || "");
        // Remove the small-caps last name (and optional comma) from the head of the text
        if (lastFromCaps) {
            let escapedLast = lastFromCaps.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            liText = liText.replace(new RegExp("^\\s*" + escapedLast + "\\s*,?\\s*", "i"), "");
        }
        let firstRaw = liText.replace(/\s+/g, " ").trim();

        let firstName = firstRaw || "";
        let lastName = lastFromCaps || "";

        // Fallback through parser if structure is odd
        if (!lastName || !firstName) {
            let combined = [firstRaw, lastFromCaps].filter(Boolean).join(" ");
            let parsed = parseNameString(combined);
            if (parsed) {
                firstName = parsed.firstName || firstName;
                lastName = parsed.lastName || lastName;
            }
        }

        if (firstName || lastName) {
            creators.push({
                firstName,
                lastName,
                creatorType: "author"
            });
        }
    }
    return creators;
}

/** Authors list pattern: monographs/chapters (plain li text in .meta_authors ul.meta_authors) */
function parseAuthors_Book(doc) {
    let creators = [];
    let lis = doc.querySelectorAll(".meta_authors ul.meta_authors li");
    for (let li of lis) {
        let name = ZU.trimInternal(li.textContent || "");
        if (!name) continue;
        let parsed = parseNameString(name);
        if (parsed) {
            creators.push({
                firstName: parsed.firstName || "",
                lastName: parsed.lastName || "",
                creatorType: "author"
            });
        }
    }
    return creators;
}

/** Editors list for monographs/chapters: .meta_directors ul.meta_directeur li (plain text) */
function parseEditors_Book(doc) {
    let editors = [];
    let lis = doc.querySelectorAll(".meta_directors ul.meta_directeur li");
    for (let li of lis) {
        let name = ZU.trimInternal(li.textContent || "");
        if (!name) continue;
        let parsed = parseNameString(name);
        if (parsed) {
            editors.push({
                firstName: parsed.firstName || "",
                lastName: parsed.lastName || "",
                creatorType: "editor"
            });
        }
    }
    return editors;
}

/** Gather authors robustly (tries journal-style first, then book-style, de-duplicates) */
function gatherAuthorsAny(doc) {
    let out = [];
    let seen = new Set();

    function addUnique(creators) {
        for (let c of creators) {
            let key = (c.creatorType || "author") + "|" +
                (c.firstName || "").toLowerCase().trim() + "|" +
                (c.lastName || "").toLowerCase().trim();
            if (!seen.has(key) && (c.firstName || c.lastName)) {
                seen.add(key);
                out.push(c);
            }
        }
    }

    // Try journal-style first
    addUnique(parseAuthors_Journal(doc));
    // Then book-style (some journal pages use the same structure as books)
    addUnique(parseAuthors_Book(doc));

    return out;
}

/** Parse year/issue like "2025-2026/20" → { date:"2025-2026", issue:"20" } */
function parseYearAndIssue(text) {
    let out = {};
    if (!text) return out;

    let m = text.match(/\b(\d{4}(?:-\d{4})?)\s*\/\s*(\d+)\b/);
    if (m) {
        out.date = m[1];
        out.issue = m[2];
    } else {
        let y = text.match(/\b(\d{4})\b/);
        if (y) out.date = y[1];
    }
    return out;
}

/** Extract dd/mm/yyyy or dd/mm/yy from text → ISO yyyy-mm-dd */
function extractISODate(text) {
    if (!text) return null;
    let m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    let dd = m[1].padStart(2, "0");
    let mm = m[2].padStart(2, "0");
    let yyyy = m[3].length === 2 ? ("20" + m[3]) : m[3];
    return `${yyyy}-${mm}-${dd}`;
}

/** Return index range of the first date occurrence in text, or null */
function findFirstDateSpan(text) {
    if (!text) return null;
    let re = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    let m = re.exec(text);
    return m ? { index: m.index, length: m[0].length } : null;
}

/**
 * Keep parentheses when tidying.
 * Also append a closing ')' if there's an unmatched '('.
 */
function balanceParens(s) {
    if (!s) return s;
    let opens = (s.match(/\(/g) || []).length;
    let closes = (s.match(/\)/g) || []).length;
    if (opens > closes) s = s + ")";
    return s;
}

/** Trim punctuation/space around court names (without stripping parentheses) */
function tidyCourt(s) {
    if (!s) return null;
    // Remove any date remnants just in case
    s = s.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ");
    // Remove trailing punctuation separators but DO NOT remove parentheses
    s = s.replace(/[ \t,;:–—-]+$/g, " ");
    // Strip leading/trailing quotes/brackets and spaces (keep parentheses)
    s = s.replace(/^[\s"“”'‚‘’\[\]]+|[\s"“”'‚‘’\[\]]+$/g, " ");
    // Collapse whitespace
    s = s.replace(/\s+/g, " ").trim();
    // Ensure balanced right parenthesis if there is an unmatched '('
    s = balanceParens(s);
    return s || null;
}

/**
 * Court extraction (date-excluding):
 * - Prefer the part BEFORE the first date in the reference line,
 * - Else before the first date in the title,
 * - Else before the first comma.
 * Then tidy (preserving parentheses).
 */
function extractCourt(refNode, doc) {
    let refText = ZU.trimInternal(refNode ? (refNode.textContent || "") : "");
    let titleNode = doc.querySelector("h1.title");
    let titleText = ZU.trimInternal(titleNode ? (titleNode.textContent || "") : "");

    // 1) From reference: substring before first date
    let refSpan = findFirstDateSpan(refText);
    if (refSpan) {
        let candidate = refText.slice(0, refSpan.index);
        let cleaned = tidyCourt(candidate);
        if (cleaned) return cleaned;
    }

    // 2) From title: substring before first date
    let titleSpan = findFirstDateSpan(titleText);
    if (titleSpan) {
        let candidate = titleText.slice(0, titleSpan.index);
        let cleaned = tidyCourt(candidate);
        if (cleaned) return cleaned;
    }

    // 3) Fallback: before the first comma in reference, then title
    let mRef = refText.match(/^([^,]+)/);
    if (mRef && mRef[1]) {
        let cleaned = tidyCourt(mRef[1]);
        if (cleaned) return cleaned;
    }
    let mTitle = titleText.match(/^([^,]+)/);
    if (mTitle && mTitle[1]) {
        let cleaned = tidyCourt(mTitle[1]);
        if (cleaned) return cleaned;
    }

    return null;
}

/** Decision date: prefer .meta_date_pro; else date in title; else in reference */
function extractDecisionDate(doc, refNode) {
    let proNode = doc.querySelector(".meta_date_pro");
    if (proNode) {
        let iso = extractISODate(proNode.textContent || "");
        if (iso) return iso;
    }
    let h1 = doc.querySelector("h1.title");
    let isoFromTitle = extractISODate(h1 ? h1.textContent : "");
    if (isoFromTitle) return isoFromTitle;

    let isoFromRef = extractISODate(refNode ? refNode.textContent : "");
    if (isoFromRef) return isoFromRef;

    return null;
}

/** Docket / Rolnummer */
function extractDocketNumber(doc) {
    let n = doc.querySelector(".meta_numrole");
    if (n) {
        let t = ZU.trimInternal(n.textContent || "");
        if (t) return t;
    }
    let h1 = doc.querySelector("h1.title");
    if (h1) {
        let txt = h1.textContent || "";
        let m = txt.match(/\bNr\.?\s*([A-Za-z0-9./_-]+)/i);
        if (m) return m[1];
    }
    return null;
}

/** Fallback: extract the last 4-digit year found in reference text */
function extractYearFromRefText(text) {
    if (!text) return null;
    // Pick the last 4-digit year (common in "... Publisher, 2018, p. ...")
    let years = text.match(/\b(1|2)\d{3}\b/g);
    if (years && years.length) {
        return years[years.length - 1];
    }
    return null;
}

function scrape(doc, url) {
    let detected = detectWeb(doc, url);
    let itemType = detected || "bookSection";
    let item = new Zotero.Item(itemType);

    /* ======================
       Shared fields
       ====================== */
    // Per requirement: never set item.url
    item.shortTitle = ""; // Always clear Short Title

    /* ======================
       Common nodes
       ====================== */
    let refNode = doc.querySelector(".document-more-infos .meta_ref_title, .meta_ref_title");
    let summaryNode = doc.querySelector(".meta_summary");

    /* ======================
       Authors (robust across layouts)
       ====================== */
    if (itemType === "journalArticle" || itemType === "case") {
        for (let c of gatherAuthorsAny(doc)) item.creators.push(c);
    } else if (itemType === "bookSection") {
        // Authors for chapters (book-style then fallback)
        let bookAuthors = parseAuthors_Book(doc);
        if (bookAuthors.length) {
            for (let c of bookAuthors) item.creators.push(c);
        } else {
            for (let c of gatherAuthorsAny(doc)) item.creators.push(c);
        }
        // Editors (book-style)
        for (let e of parseEditors_Book(doc)) item.creators.push(e);
    }

    /* ======================
       Abstract (meta_summary -> abstractNote)
       ====================== */
    if (summaryNode) {
        let abs = ZU.trimInternal(summaryNode.textContent || "");
        if (abs) item.abstractNote = abs;
    }

    /* ======================
       Branch: Case law inside journals
       ====================== */
    if (itemType === "case") {
        // Invisible placeholder so Zotero keeps type=Case but Word prints nothing for name
        item.caseName = "\u2060"; // WORD JOINER (zero-width, non-breaking)

        // Court (preserve parentheses, ensure closing ')')
        let court = extractCourt(refNode, doc);
        if (court) item.court = court;

        // Date decided
        let decided = extractDecisionDate(doc, refNode);
        if (decided) item.dateDecided = decided;

        // Docket / Rolnummer
        let docket = extractDocketNumber(doc);
        if (docket) item.docketNumber = docket;

        // ECLI -> Extra
        let ecliNode = doc.querySelector(".meta_ecli");
        if (ecliNode) {
            let ecli = ZU.trimInternal(ecliNode.textContent || "");
            if (ecli) {
                item.extra = (item.extra ? item.extra + "\n" : "") + `ECLI: ${ecli}`;
            }
        }

        // Reporter (journal), dots removed
        let reporter = extractJournalFromRefNode(refNode);
        if (reporter) item.reporter = reporter;

        // Volume (jaargang) + issue → combined in reporterVolume as "YYYY/NN"
        if (refNode) {
            let meta = parseYearAndIssue(refNode.textContent || "");
            if (meta.date && meta.issue) {
                item.reporterVolume = `${meta.date}/${meta.issue}`;
            } else if (meta.date) {
                item.reporterVolume = meta.date;
            } else if (meta.issue) {
                item.reporterVolume = meta.issue.toString();
            }
            // Do NOT set item.issue for cases (avoids "Issue: NN" in Extra)
        }

        // Pages + firstPage
        if (refNode) {
            let pe = extractPagesFromText(refNode.textContent || "");
            if (pe) {
                item.pages = `${pe[0]}-${pe[1]}`;
                item.firstPage = pe[0];
            }
        }

        item.complete();
        return;
    }

    /* ======================
       Branch: Book Section (monographs & archive)
       ====================== */
    if (itemType === "bookSection") {
        // Book title (container)
        let bookTitleNode = doc.querySelector(".toc-header-title");
        if (bookTitleNode) {
            item.bookTitle =
                bookTitleNode.getAttribute("title") ||
                ZU.trimInternal(bookTitleNode.textContent);
        }

        // Chapter title (keep "Hoofdstuk"/"Chapitre")
        let chapterTitleNode = doc.querySelector("h1.title");
        if (chapterTitleNode) {
            item.title = ZU.trimInternal(chapterTitleNode.textContent);
        }

        // Year (from header date)
        let dateNode = doc.querySelector(".toc-header-date");
        if (dateNode) {
            let match = dateNode.textContent.match(/\b(\d{4})\b/);
            if (match) {
                item.date = match[1];
            }
        }

        // Fallback year from reference block if header date missing
        if (!item.date && refNode) {
            let yearFallback = extractYearFromRefText(refNode.textContent || "");
            if (yearFallback) item.date = yearFallback;
        }

        // Publisher
        let publisherNode = doc.querySelector(".meta_publisher");
        if (publisherNode) {
            item.publisher = ZU.trimInternal(publisherNode.textContent);
        }

        // Pages (from reference if present)
        if (refNode) {
            let pe = extractPagesFromText(refNode.textContent || "");
            if (pe) item.pages = `${pe[0]}-${pe[1]}`;
        }

        item.complete();
        return;
    }

    /* ======================
       Branch: Journal Article
       ====================== */
    if (itemType === "journalArticle") {
        // Title
        let articleTitle = extractArticleTitle(doc, refNode);
        if (articleTitle) item.title = articleTitle;

        // Journal title (dots removed)
        let pub = extractJournalFromRefNode(refNode);
        if (pub) item.publicationTitle = pub;

        // Year/Issue + Pages
        if (refNode) {
            let meta = parseYearAndIssue(refNode.textContent || "");
            if (meta.date) item.date = meta.date;
            if (meta.issue) item.issue = meta.issue;

            let pe = extractPagesFromText(refNode.textContent || "");
            if (pe) item.pages = `${pe[0]}-${pe[1]}`;
        }

        item.complete();
        return;
    }

    // Fallback
    item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "web",
        "url": "https://stradalex.com/sl_mono/toc/IT0017069/doc",
        "items": [
            {
                "itemType": "bookSection",
                "creators": [
                    { "creatorType": "author", "firstName": "Céline", "lastName": "Declerlaye" },
                    { "creatorType": "editor", "firstName": "Stéphanie", "lastName": "Wattier" }
                ],
                "bookTitle": "Vermogensrecht in kort bestek (achtste editie)",
                "publisher": "Intersentia",
                "title": "Hoofdstuk 2 - Bijzondere kenmerken van zakelijke rechten",
                "pages": "13-17",
                "shortTitle": ""
            }
        ]
    },
    {
        // Book section with no header date; year is only in reference block "... 2018, p. ..."
        "type": "web",
        "url": "https://stradalex.com/sl_mono_archive/IT0099999/doc",
        "items": [
            {
                "itemType": "bookSection",
                "title": "Voorbeeld hoofdstuk uit archief",
                "date": "2018",
                "shortTitle": ""
            }
        ]
    },
    {
        "type": "web",
        "url": "http://stradalex.com/sl_rev_utu/toc/EXAMPLE_ARTICLE/doc",
        "items": [
            {
                "itemType": "journalArticle",
                "creators": [
                    { "creatorType": "author", "firstName": "T.", "lastName": "Verhofstede" }
                ],
                "publicationTitle": "RW",
                "issue": "42",
                "date": "2024-2025",
                "pages": "1696-1711",
                "shortTitle": ""
            }
        ]
    },
    {
        "type": "web",
        "url": "https://stradalex.com/sl_rev_utu/toc/EXAMPLE_CASE/doc",
        "items": [
            {
                "itemType": "case",
                "caseName": "\u2060",
                "court": "Vred. Mol-Geel (le Canton)",
                "dateDecided": "2025-01-24",
                "reporter": "RW",
                "reporterVolume": "2025-2026/20",
                "firstPage": "796",
                "pages": "796-800",
                "shortTitle": ""
            }
        ]
    }
];
/** END TEST CASES **/
``
