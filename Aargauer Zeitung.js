{
    "translatorID": "8e2f4a7c-d519-4b3e-9f6a-1c8d7e2b5a09",
    "label": "Aargauer Zeitung",
    "creator": "MTR",
    "target": "^https?://(www\\.)?aargauerzeitung\\.ch/",
    "minVersion": "5.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsv",
    "lastUpdated": "2026-01-28 19:45:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 MTR

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

function detectWeb(doc, url) {
    // Single article pages have -ld.NNNNNN pattern in URL
    if (/-ld\.\d+/.test(url)) {
        return 'newspaperArticle';
    }
    // Overview pages with multiple article links
    if (getSearchResults(doc, true)) {
        return 'multiple';
    }
    return false;
}

function getSearchResults(doc, checkOnly) {
    var items = {};
    var found = false;
    // Teaser links on overview pages
    var rows = doc.querySelectorAll('a[href*="-ld."]');
    for (let row of rows) {
        var href = row.href;
        var title = ZU.trimInternal(row.textContent);
        if (!href || !title) continue;
        if (checkOnly) return true;
        found = true;
        items[href] = title;
    }
    return found ? items : false;
}

// Helper function to extract formatted text with bold and italic styling
// Recognizes:
// - Bold: <b>, <strong>, .font-semibold, .font-bold, .font-extrabold, .font-black
// - Italic: <i>, <em>, .italic
// Note: .font-medium is NOT bold (it's normal weight 500 in Tailwind)
function getFormattedText(element) {
    var html = '';
    for (var node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            html += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            var tag = node.tagName.toLowerCase();
            var text = getFormattedText(node);

            // Check for bold: b, strong, or font-weight classes
            // Note: font-medium (weight 500) is NOT bold, only semibold (600) and above
            var isBold = tag === 'b' || tag === 'strong' ||
                node.classList.contains('font-semibold') ||
                node.classList.contains('font-bold') ||
                node.classList.contains('font-extrabold') ||
                node.classList.contains('font-black');

            // Check for italic: i, em, or italic class
            var isItalic = tag === 'i' || tag === 'em' ||
                node.classList.contains('italic');

            if (isBold && isItalic) {
                html += '<b><i>' + text + '</i></b>';
            } else if (isBold) {
                html += '<b>' + text + '</b>';
            } else if (isItalic) {
                html += '<i>' + text + '</i>';
            } else {
                html += text;
            }
        }
    }
    return ZU.trimInternal(html);
}

async function doWeb(doc, url) {
    if (detectWeb(doc, url) == 'multiple') {
        var items = await Zotero.selectItems(getSearchResults(doc, false));
        if (!items) return;
        for (var itemUrl of Object.keys(items)) {
            await scrape(await requestDocument(itemUrl));
        }
    } else {
        await scrape(doc, url);
    }
}

async function scrape(doc, url = doc.location.href) {
    var item = new Zotero.Item('newspaperArticle');

    // Check if this is a ticker article (live news feed)
    // Ticker articles have timestamped entries: div with <time> followed by div with heading
    var tickerEntries = doc.querySelectorAll('article div:has(> time) + div:has(h2,h3,h4)');
    var isTicker = tickerEntries.length > 0;

    // Title from h1 or h2 in article
    var title = text(doc, 'article h1') ||
        text(doc, 'article h2') ||
        text(doc, '#article-header h1') ||
        text(doc, '#article-header h2') ||
        attr(doc, 'meta[property="og:title"]', 'content') ||
        doc.title;

    // Short title from first h1 in main (often a shorter version of the full title)
    var shortTitle = text(doc, 'main h1:first-of-type');

    // For ticker articles, use shortTitle + (Ticker) as main title
    if (isTicker && shortTitle) {
        title = shortTitle + ' (Ticker)';
    }

    item.title = title;

    if (shortTitle && shortTitle !== title) {
        item.shortTitle = shortTitle;
    }

    // Publication name
    item.publicationTitle = 'Aargauer Zeitung';

    // Abstract/lead text from article header
    // Excludes paywall badge paragraphs (identified by svg with role="img" and title element)
    var leadParagraphs = doc.querySelectorAll('#article-header p:not(:has(svg[role="img"] title))');
    var leadTexts = [];
    for (var p of leadParagraphs) {
        var txt = ZU.trimInternal(p.textContent);
        // Skip paywall text
        if (txt && !txt.match(/^Paid article\.?/i) && !txt.includes('Exklusiv für Abonnenten')) {
            leadTexts.push(txt);
        }
    }
    if (leadTexts.length > 0) {
        item.abstractNote = leadTexts.join('\n\n');
    } else {
        item.abstractNote = attr(doc, 'meta[property="og:description"]', 'content');
    }

    // Extract full article text - preserve paragraph and heading structure as HTML
    // Exclude elements that should not appear in the note:
    // - .print:hidden: elements hidden in print view
    // - figure, figcaption: images and captions
    // - svg: vector graphics and their text content
    // - aside, nav, button: navigation and interactive elements
    // - script, style, noscript, iframe: non-content elements
    // - [aria-hidden], [hidden]: accessibility-hidden elements
    // - section:has(> h2 + ul + button): reader comment sections (structure: h2 "Kommentare" + ul + button "Alle Kommentare anzeigen")
    // - #article-header: lead text already added separately
    var excludeSelector = '.print\\:hidden, .print\\:hidden *, figure *, figcaption, svg *, aside *, nav *, button *, script *, style *, noscript *, iframe *, [aria-hidden="true"] *, [hidden] *, section:has(> h2:first-child + ul + button:last-child) *, #article-header, #article-header *';
    var articleElements = doc.querySelectorAll('article p:not(:is(' + excludeSelector + ')), article h3:not(:is(' + excludeSelector + ')), article h4:not(:is(' + excludeSelector + ')), article h5:not(:is(' + excludeSelector + ')), article h6:not(:is(' + excludeSelector + '))');
    var paywallParagraphs = doc.querySelectorAll('p:has(svg[role="img"] title)');
    var paywallSet = new Set(paywallParagraphs);
    var fullTextHtml = [];

    // Add lead text first
    if (leadTexts.length > 0) {
        for (var lead of leadTexts) {
            fullTextHtml.push('<p><strong>' + lead + '</strong></p>');
        }
    }

    // Check if this is a ticker article
    if (tickerEntries.length > 0) {
        // TICKER ARTICLE PROCESSING
        // Ticker articles have a different structure with timestamped entries

        // Check for "Das Wichtigste in Kürze" summary box before first ticker entry
        // Structure: div containing ul, directly before first time element
        var summaryBox = doc.querySelector('div[class]:has(div > ul):has(+ div time)');
        if (summaryBox) {
            var summaryHeading = summaryBox.querySelector('p');
            var summaryList = summaryBox.querySelector('ul');
            if (summaryHeading && summaryList) {
                fullTextHtml.push('<h2>' + ZU.trimInternal(summaryHeading.textContent) + '</h2>');
                fullTextHtml.push('<ul>');
                var listItems = summaryList.querySelectorAll('li');
                for (var li of listItems) {
                    var liText = ZU.trimInternal(li.textContent);
                    if (liText) {
                        fullTextHtml.push('<li>' + liText + '</li>');
                    }
                }
                fullTextHtml.push('</ul>');
            }
        }

        // Extract ticker entries with timestamps
        // Each entry consists of a time container (div with <time> and <span> for date)
        // followed by a content div with heading and paragraphs
        var timeContainers = doc.querySelectorAll('article div:has(> time)');
        var tickerArray = Array.from(tickerEntries);
        var timeArray = Array.from(timeContainers);

        for (var i = 0; i < tickerArray.length; i++) {
            var entry = tickerArray[i];
            var timeContainer = timeArray[i];

            // Get date and time
            var time = timeContainer ? .querySelector('time') ? .textContent ? .trim() || '';
            var date = timeContainer ? .querySelector('span') ? .textContent ? .trim() || '';
            var timestamp = date && time ? date + ' – ' + time : time;

            // Get heading
            var heading = entry.querySelector('h2, h3, h4');
            var headingText = heading ? ZU.trimInternal(heading.textContent) : '';

            if (headingText) {
                fullTextHtml.push('<h2>' + headingText + '</h2>');
                if (timestamp) {
                    fullTextHtml.push('<p><i>' + timestamp + '</i></p>');
                }
            }

            // Get paragraphs
            var entryParagraphs = entry.querySelectorAll('p');
            for (var ep of entryParagraphs) {
                if (paywallSet.has(ep)) continue;
                var epTxt = getFormattedText(ep);
                if (epTxt) {
                    fullTextHtml.push('<p>' + epTxt + '</p>');
                }
            }
        }
    } else {
        // REGULAR ARTICLE PROCESSING
        // Heading levels are promoted: h3->h2, h4->h3, etc. (since h1 is the article title)
        var headingMap = { h3: 'h2', h4: 'h3', h5: 'h4', h6: 'h5' };
        for (var el of articleElements) {
            if (paywallSet.has(el)) continue;
            var tag = el.tagName.toLowerCase();
            if (headingMap[tag]) {
                var elHeadingText = ZU.trimInternal(el.textContent);
                if (elHeadingText) {
                    var newTag = headingMap[tag];
                    fullTextHtml.push('<' + newTag + '>' + elHeadingText + '</' + newTag + '>');
                }
            } else {
                var elTxt = getFormattedText(el);
                if (txt) {
                    // Check if the paragraph itself has bold/italic styling
                    // Note: font-medium (weight 500) is NOT bold, only semibold (600) and above
                    var isBold = el.classList.contains('font-semibold') ||
                        el.classList.contains('font-bold') ||
                        el.classList.contains('font-extrabold') ||
                        el.classList.contains('font-black');
                    var isItalic = el.classList.contains('italic');

                    if (isBold && isItalic) {
                        fullTextHtml.push('<p><b><i>' + txt + '</i></b></p>');
                    } else if (isBold) {
                        fullTextHtml.push('<p><b>' + txt + '</b></p>');
                    } else if (isItalic) {
                        fullTextHtml.push('<p><i>' + txt + '</i></p>');
                    } else {
                        fullTextHtml.push('<p>' + txt + '</p>');
                    }
                }
            }
        }
    }

    // Save extracted article text as note
    if (fullTextHtml.length > 0) {
        item.notes.push({
            note: '<h1>' + title + '</h1>\n' + fullTextHtml.join('\n')
        });
    }

    // Date
    var dateStr = attr(doc, 'meta[name="date"]', 'content');
    if (dateStr) {
        item.date = ZU.strToISO(dateStr);
    }

    // Author
    var author = attr(doc, 'meta[name="author"]', 'content');
    if (author) {
        item.creators.push(ZU.cleanAuthor(author, 'author'));
    }

    // Section/category from breadcrumb navigation
    // Primary selector: navigation with h1, find link after home link
    // Fallback: span in article header (may contain "Paid article." prefix which gets stripped)
    var section = text(doc, 'ul[role="navigation"]:has(h1:first-of-type) :has(a[href="/"]) + * a') ||
        text(doc, '#article-header span span');
    if (section) {
        // Remove paywall prefix
        section = section.replace(/^Paid article\.?/i, '').trim();
        if (section) {
            item.section = section;
        }
    }

    // URL
    item.url = url;

    // Language
    item.language = 'de-CH';

    // Rights/Copyright
    var copyright = attr(doc, 'meta[name="copyright"]', 'content');
    if (copyright) {
        item.rights = copyright;
    }

    // Tags from keywords
    var keywords = attr(doc, 'meta[name="news_keywords"]', 'content');
    if (keywords) {
        var tags = keywords.split(',').map(t => t.trim()).filter(t => t);
        for (var tag of tags) {
            item.tags.push(tag);
        }
    }

    // Save snapshot of the page
    item.attachments.push({
        document: doc,
        title: 'Snapshot'
    });

    item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [{
    "type": "web",
    "url": "https://www.aargauerzeitung.ch/kultur/groenland-diese-schweizer-museen-zeigen-die-brisanz-ld.4108892",
    "items": [{
        "itemType": "newspaperArticle",
        "title": "«Alles wird anders!» – diese Schweizer Museen zeigen die Brisanz von Grönland",
        "shortTitle": "Grönland: Diese Schweizer Museen zeigen die Brisanz",
        "creators": [{
            "firstName": "Daniele",
            "lastName": "Muscionico",
            "creatorType": "author"
        }],
        "date": "2026-01-23",
        "abstractNote": "contains:Grönland",
        "publicationTitle": "Aargauer Zeitung",
        "section": "Kultur",
        "language": "de-CH",
        "url": "https://www.aargauerzeitung.ch/kultur/groenland-diese-schweizer-museen-zeigen-die-brisanz-ld.4108892"
    }]
},
    {
        "type": "web",
        "url": "https://www.aargauerzeitung.ch/aargau/zofingen/blockhuette-in-der-wildnis-handwerker-endlosschlaufe-ld.4108278",
        "items": [{
            "itemType": "newspaperArticle",
            "title": "In der Handwerker-Endlosschlaufe",
            "shortTitle": "Blockhütte in der Wildnis: Handwerker-Endlosschlaufe",
            "creators": [{
                "firstName": "Oliver",
                "lastName": "Schweizer",
                "creatorType": "author"
            }],
            "publicationTitle": "Aargauer Zeitung",
            "section": "Aargau",
            "language": "de-CH",
            "url": "https://www.aargauerzeitung.ch/aargau/zofingen/blockhuette-in-der-wildnis-handwerker-endlosschlaufe-ld.4108278"
        }]
    },
    {
        "type": "web",
        "url": "https://www.aargauerzeitung.ch/wirtschaft/ploetzlich-alles-ein-spiegel-bestseller-das-steckt-dahinter-ld.4105450",
        "items": [{
            "itemType": "newspaperArticle",
            "title": "«Spiegel-Bestseller», «Nr.1-Autorin»:  Warum solche Kleber überall sind – sogar auf fragwürdigen Büchern",
            "shortTitle": "Plötzlich alles ein «Spiegel»-Bestseller? Das steckt dahinter",
            "creators": [{
                "firstName": "Pascal",
                "lastName": "Michel",
                "creatorType": "author"
            }],
            "publicationTitle": "Aargauer Zeitung",
            "section": "Wirtschaft",
            "language": "de-CH",
            "url": "https://www.aargauerzeitung.ch/wirtschaft/ploetzlich-alles-ein-spiegel-bestseller-das-steckt-dahinter-ld.4105450"
        }]
    },
    {
        "type": "web",
        "url": "https://www.aargauerzeitung.ch/international/usa-trump-news-und-reaktionen-ld.4004716",
        "items": [{
            "itemType": "newspaperArticle",
            "title": "USA & Trump: News und Reaktionen (Ticker)",
            "shortTitle": "USA & Trump: News und Reaktionen",
            "creators": [],
            "publicationTitle": "Aargauer Zeitung",
            "section": "International",
            "language": "de-CH",
            "url": "https://www.aargauerzeitung.ch/international/usa-trump-news-und-reaktionen-ld.4004716"
        }]
    }
]
/** END TEST CASES **/
