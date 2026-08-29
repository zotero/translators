{
	"translatorID": "797eb77d-9596-450e-a589-1621dc34a057",
	"label": "LinkedIn",
	"creator": "Liz Lawley",
	"target": "^https://www\\.linkedin\\.com/posts/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-10-13 16:36:16"
}

// NOTE: This translator will only work if you are *not* logged into LinkedIn. Logged-in versions of the page do not include the necessary metadata. If you are logged into LinkedIn, you can open a private or incognito window to use the translator. //

function detectWeb(doc, url) {
	if (url.includes('/posts/')) {
		return "forumPost";
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("forumPost");
	
	// Extract and clean up the title (first 20 words of the description)
	var rawDescription = ZU.xpathText(doc, "//meta[@property='og:description']/@content");
	if (rawDescription) {
		var words = ZU.unescapeHTML(rawDescription).split(/\s+/);
		var title = words.slice(0, 20).join(' ');
		newItem.title = title + (words.length > 20 ? '...' : '');
	}
	
	newItem.url = url.replace(/[#?].*$/, '');
	
	// Extract author name from page title
	var pageTitle = ZU.xpathText(doc, "//title");
	if (pageTitle) {
		var titleParts = pageTitle.split(' on ');
		if (titleParts.length > 1) {
			var authorName = titleParts[0].trim();
			newItem.creators.push(ZU.cleanAuthor(authorName, "author"));
		}
	}
	
	// Extract date from JSON-LD
	var jsonLD = doc.querySelector('script[type="application/ld+json"]');
	if (jsonLD) {
		try {
			var data = JSON.parse(jsonLD.textContent);
			if (data.datePublished) {
				newItem.date = ZU.strToISO(data.datePublished);
			}
		}
		catch (e) {
			Zotero.debug("Failed to parse JSON-LD: " + e);
		}
	}
	
	newItem.forumTitle = "LinkedIn";
	newItem.postType = "LinkedIn Post";
	newItem.websiteType = "Social Media";
	
	newItem.attachments.push({
		title: "Snapshot",
		document: doc
	});
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.linkedin.com/posts/emollick_we-hope-that-such-tools-may-help-us-to-gain-activity-7249843496746979328-7tXt/?utm_source=share&utm_medium=member_desktop",
		"items": [
			{
				"itemType": "forumPost",
				"title": "\"We hope that such tools may help us to gain novel insight into the psychology of an understudied pool of...",
				"creators": [
					{
						"firstName": "Ethan",
						"lastName": "Mollick",
						"creatorType": "author"
					}
				],
				"date": "2024-10-09",
				"forumTitle": "LinkedIn",
				"postType": "LinkedIn Post",
				"url": "https://www.linkedin.com/posts/emollick_we-hope-that-such-tools-may-help-us-to-gain-activity-7249843496746979328-7tXt/?utm_source=share&utm_medium=member_desktop",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
