{
	"translatorID": "56854750-868a-4de0-bfe5-fe075344a121",
	"label": "PRC History Review",
	"creator": "Bo An",
	"target": "^https?://(www\\.)?prchistory\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-30 18:33:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Bo An

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
	const articles = getArticles(doc, url);
	if (!articles) {
		return false;
	}
	else {
		return 'multiple';
	}
}

function doWeb(doc, url) {
	const articles = getArticles(doc, url);
	if (articles) {
		Zotero.selectItems(articles, (items) => {
			if (!items) {
				return true;
			}
			for (const i in items) {
				let isIssue = false;
				let isSingleArticle = false;
				let isHomePage = isHomePageUrl(url);
				// if it's the homepage, treat links as individual journal articles without a dedicated child page, otherwise as issue articles.
				if (!isHomePage) {
					// if it's not homepage, further check if it is single article issue, or multiple article issue.
					isSingleArticle = Object.keys(articles).length === 1;
					// when there is only one article on a child page. This usually is the case with a single research paper with its own page. Note this is NOT how many items are selected by the user to add to Zotero.
					isIssue = !isSingleArticle;
				}
				// pass issue information to scraper
				scrape(doc, i, isIssue, isSingleArticle);
			}
			return true;
		});
	}
}

function getArticles(doc, url) {
	let items = {};
	let found = false;

	// since PRC history review provides downlodable links on both the home page and its children issue pages, we need to:
	if (isHomePageUrl(url)) {
		const pdfLinkEls = doc.querySelectorAll('a');
		pdfLinkEls.forEach((link) => {
			const href = link.href;
			const hasPDF = isPdfUrl(href);
			if (hasPDF) {
				items[href] = link.textContent;
				if (found === false) {
					found = true;
				}
			}
		});
	}
	else {
		const bookLinkEls = doc.querySelectorAll('p, h5');
		bookLinkEls.forEach((bookLinkEl) => {
			const link = bookLinkEl.querySelectorAll('a')[0];
			if (link) {
				const href = link.href;
				const hasPDF = isPdfUrl(href);
				if (hasPDF) {
					const title = link.textContent;

					if (!title.toLowerCase().includes('here') && title.length > 6) {
						items[href] = title;
						if (found === false) {
							found = true;
						}
					}
				}
			}
		});
	}
	return found ? items : false;
}


// since PRC history review often directly link to pdf, the url here, unlike press journal articles, is often an PDF link.
function scrape(doc, url, isIssue, isSingleArticle) {
	let articleLinkEls;

	if (isIssue) {
		articleLinkEls = doc.querySelectorAll('p, h5');
	}
	else {
		articleLinkEls = doc.querySelectorAll('h5, h6');
	}

	// in order to decouple scraping from detection, the same process of finding a journal article link is repeated to access the text info associated with that link. That way, detecting functions do not need to provide any other info than the url.
	articleLinkEls.forEach((articleDivEl, index) => {
		const linkEl = articleDivEl.querySelectorAll("a")[0];
		if (!linkEl) {
			return;
		}
		const href = linkEl.href;
		if (href === url) {
			const hasPDF = isPdfUrl(href);
			if (hasPDF) {
				const newItem = new Zotero.Item('journalArticle');

				newItem.publicationTitle = "The PRC History Review";

				// add title
				if (isIssue) {
					newItem.title = linkEl.textContent;
				}
				else if (isSingleArticle) {
					const rawTitle = linkEl.textContent;
					const rawTitleParts = rawTitle.split(',');
					rawTitleParts.shift();
					newItem.title = rawTitleParts.join(",").replace(/[”“]/g, '');
				}
				else {
					// if it is homepage link, parse the one-link raw title into title and other info.
					const rawTitle = linkEl.textContent;
					const rawTitleParts = rawTitle.split(':');
					const firstPart = rawTitleParts[0];

					const hasSeriesInfo = firstPart && firstPart.toLowerCase().endsWith('series');
					if (hasSeriesInfo) {
						newItem.seriesTitle = firstPart;
						// remove series title, leaving the rest as title;
						rawTitleParts.shift();
						newItem.title = rawTitleParts.join(":");
					}
					else {
						newItem.title = rawTitle;
					}
				}

				// add issue info
				if (isIssue) {
					const issueInfoEl = doc.querySelectorAll('h5')[0];
					if (issueInfoEl) {
						const issueInfoArray = issueInfoEl.textContent.split('★');
						if (issueInfoArray.length === 3) {
							const volume = issueInfoArray[0];
							newItem.volume = volume.toLowerCase().replace('volume', '').trim();
							const issue = issueInfoArray[1];
							newItem.issue = issue.toLowerCase().replace('number', '').trim();
							const date = issueInfoArray[2];
							newItem.date = ZU.strToISO(date);
						}
					}
				}
				else if (isSingleArticle) {
					// if it's single article page, the issue info is two divs above the link div.
					const issueInfoElIndex = index - 2;
					if (issueInfoElIndex >= 0) {
						const issueInfoEl = doc.querySelectorAll('h5')[issueInfoElIndex];
						if (issueInfoEl) {
							const issueInfoArray = issueInfoEl.textContent.split('★');
							if (issueInfoArray.length === 3) {
								const volume = issueInfoArray[0];
								newItem.volume = volume.toLowerCase().replace('volume', '').trim();
								const issue = issueInfoArray[1];
								newItem.issue = issue.toLowerCase().replace('number', '').trim();
								const date = issueInfoArray[2];
								newItem.date = ZU.strToISO(date);
							}
						}
					}
				}
				else {
					// if it's homepage article, the issue info is in the previous div.
					const lastIndex = index - 1;
					if (lastIndex >= 0) {
						const issueInfoEl = articleLinkEls[lastIndex];
						const issueInfoArray = issueInfoEl.textContent.split('★');
						if (issueInfoArray.length === 2) {
							const issue = issueInfoArray[0];
							newItem.issue = issue.toLowerCase().replace('number', '').trim();
							const date = issueInfoArray[1];
							newItem.date = ZU.strToISO(date);
						}
					}
				}

				// add author
				// for issue authors
				if (isIssue) {
					const authorEl = articleLinkEls[index + 1];
					if (authorEl) {
						// in case there are multiple authors
						const authorTexts = authorEl.textContent.trim().split(' and ');
						authorTexts.forEach((authorText) => {
							const authorName = authorText.split(',')[0];
							if (authorName) {
								newItem.creators.push(ZU.cleanAuthor(authorName, 'author', false));
							}
						});
					}
				}
				// for single article issue's author information
				if (isSingleArticle) {
					const rawAuthorText = linkEl.textContent.split(',')[0];
					if (rawAuthorText) {
						const authorTexts = rawAuthorText.trim().split(' and ');
						authorTexts.forEach((authorText) => {
							const authorName = authorText.split(',')[0];
							if (authorName) {
								newItem.creators.push(ZU.cleanAuthor(authorName, 'author', false));
							}
						});
					}
				}

				// Download pdf
				const pdfUrl = url;
				if (pdfUrl && isPdfUrl) {
					newItem.attachments.push({
						url: pdfUrl,
						mimeType: "application/pdf",
					});
				}
				newItem.complete();
			}
		}
	});
}

// helper functions.
function isPdfUrl(url) {
	return url.toLowerCase().endsWith('.pdf');
}

function isHomePageUrl(url) {
	return url.endsWith('the-prc-history-review/');
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://prchistory.org/review-october-2021/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://prchistory.org/the-prc-history-review-5-2/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://prchistory.org/review-october-2017/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://prchistory.org/review-april-2017/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://prchistory.org/issue_6_3/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
