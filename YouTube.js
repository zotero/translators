{
	"translatorID": "d3b1d34c-f8a1-43bb-9dd6-27aa6403b217",
	"label": "YouTube",
	"creator": "Sean Takats, Michael Berkowitz, Matt Burton and Rintze Zelle",
	"target": "https?://[^/]*youtube\\.com\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2014-10-19 03:31:27"
}

function detectWeb(doc, url) {
	if (getVideoId(url)) {
		return "videoRecording";
	}
	
	//Search results
	if ( getSearchResults(doc, true) ) {	
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var container = doc.getElementById('results') || doc.getElementById('browse-items-primary');
	if (!container) return false;
	
	var links = container.getElementsByClassName('yt-uix-tile-link');

	var items = {}, found = false;
	for (var i=0, n=links.length; i<n; i++) {
		var title = ZU.trimInternal(links[i].textContent);
		var id = getVideoId(links[i].href);
		if (!title || !id) continue;
		
		if (checkOnly) return true;
		
		found = true
		items[id] = title;
	}
	
	return found ? items : false;
}

function getVideoId(url) {
	var id = url.match(/\/watch\?(?:.*)\bv=([0-9a-zA-Z_-]+)/);
	if (id) return id[1];
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) != 'multiple') {
		getData([getVideoId(url)]);
	} else {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) return true;

			var ids = [];
			for (var i in items) {
				ids.push(i);
			}
			getData(ids);
		});
	}
}

function getData(ids){
	var uris = ids.map(function(id) { return "//gdata.youtube.com/feeds/videos/" + id; });
	
	ZU.doGet(uris, function(text) {	
		var ns = {"default":"http://www.w3.org/2005/Atom", "media":"http://search.yahoo.com/mrss/", "yt":"http://gdata.youtube.com/schemas/2007"};
		
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");

		var newItem = new Zotero.Item("videoRecording");
		
		var title;
		if ((title = ZU.xpathText(doc, '//media:group/media:title', ns))) {
			newItem.title = ZU.trimInternal(title);
		} else {
			newItem.title = " ";
		}
		var keywords;
		if ((keywords = ZU.xpathText(doc, '//media:group/media:keywords', ns))) {
			keywords = keywords.split(",");
			for each(var tag in keywords){
				newItem.tags.push(Zotero.Utilities.trimInternal(tag));
			}
		}
		var date;
		if ((date = ZU.xpathText(doc, '//default:published', ns))) {
			newItem.date = date.substr(0, 10);
		}
		var author;
		if ((author = ZU.xpathText(doc, '//default:author/default:name', ns))) {
			author = ZU.cleanAuthor(author, "contributor", true);
			if (!author.firstName) {
				author.fieldMode = 1;
			}
			newItem.creators.push(author);
		}
		var url;
		if ((url = ZU.xpathText(doc, '//media:group/media:player/@url', ns))) {
			newItem.url = url;
		}
		var runningTime;
		if ((runningTime = ZU.xpathText(doc, '//media:group/yt:duration/@seconds', ns))) {
			newItem.runningTime = runningTime + " seconds";
		}
		var description;
		if ((description = ZU.xpathText(doc, '//media:group/media:description', ns))) {
			newItem.abstractNote = description;
		}
		newItem.complete();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.youtube.com/results?search_query=zotero&oq=zotero&aq=f&aqi=g4&aql=&gs_sm=3&gs_upl=60204l61268l0l61445l6l5l0l0l0l0l247l617l1.2.1l4l0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.youtube.com/watch?v=pq94aBrc0pY",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Zotero Intro",
				"creators": [
					{
						"lastName": "Zoteron",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2007-01-01",
				"abstractNote": "Zotero is a free, easy-to-use research tool that helps you gather and organize resources (whether bibliography or the full text of articles), and then lets you to annotate, organize, and share the results of your research. It includes the best parts of older reference manager software (like EndNote)—the ability to store full reference information in author, title, and publication fields and to export that as formatted references—and the best parts of modern software such as del.icio.us or iTunes, like the ability to sort, tag, and search in advanced ways. Using its unique ability to sense when you are viewing a book, article, or other resource on the web, Zotero will—on many major research sites—find and automatically save the full reference information for you in the correct fields.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "YouTube",
				"runningTime": "173 seconds",
				"url": "http://www.youtube.com/watch?v=pq94aBrc0pY&feature=youtube_gdata_player",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.youtube.com/playlist?list=PL793CABDF042A9514",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.youtube.com/user/Zoteron",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.youtube.com/watch?v=9-cM5FLTGhU",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "HD Charlie Chaplin - The Great Dictator: Speech to Humanity | HD",
				"creators": [
					{
						"lastName": "EMS co",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2013-07-24",
				"abstractNote": "© United Artists, All Right Reserved.\n\nAudio Version with Music by Hans Zimmer: http://snd.sc/1dLCpZI\n\nThe final scene of \"The Great Dictator\" where Charlie Chaplin does his speech to humanity to a world at war. Relevant today as in the past.\n\nI'm sorry, but I don't want to be an Emperor, that's not my business.\nI don't want to rule or conquer anyone. I should like to help everyone if possible, Jew, gentile, black man and white.\nWe all want to help one another, human beings are like that. We all want to live by each other's happiness, not by each other's misery. We don't want to hate and despise one another.\nIn this world there is room for everyone and the earth is rich and can provide for everyone.\nThe way of life can be free and beautiful but we have lost the way.\nGreed has poisoned men's souls, has barricaded the world with hate, has goose-stepped us into misery and bloodshed. We have developed speed but we have shut ourselves in.\nMachinery that gives abundance has left us in want, our knowledge has made us cynical, our cleverness hard and unkind.\nWe think too much and feel too little\nMore than machinery we need humanity, more than cleverness we need kindness and gentleness; without these qualities, life will be violent and all will be lost.\nThe aeroplane and the radio have brought us closer together, the very nature of these inventions cries out for the goodness in men, cries out for universal brotherhood for the unity of us all. \nEven now my voice is reaching millions throughout the world; millions of despairing men, women and little children, victims of a system that makes men torture and imprison innocent people.\nTo those who can hear me I say \"Do not despair\".\nThe misery that is now upon us is but the passing of greed, the bitterness of men who fear the way of human progress.\nThe hate of men will pass and dictators die and the power they took from the people, will return to the people and so long as men die liberty will never perish.\nSoldiers! Don't give yourselves to brutes, men who despise you and enslave you, who regiment your lives, tell you what to do, what to think, what to feel!\nWho drill you, diet you, treat you like cattle, use you as cannon fodder!\nDon't give yourselves to these unnatural men!\nMachine men, with machine minds and machine hearts. You are not machines! You are not cattle! You are men!\nYou have the love of humanity in your hearts, you don't hate, only the unloved hate. The unloved and the unnatural.\nSoldiers, don't fight for slavery, fight for liberty!\nIn the seventeenth chapter of Saint Luke it is written: \"The kingdom of God is within man\". Not one man, nor a group of men, but in all men; in you!\nYou, the people have the power, the power to create machines, the power to create happiness. You, the people have the power to make this life free and beautiful, to make this life a wonderful adventure, then in the name of democracy let's use that power, let us all unite! \nLet us fight for a new world, a decent world that will give men a chance to work, that will give you the future and old age and security. By the promise of these things, brutes have risen to power, but they lie. They do not fulfil their promise, they never will.\nDictators free themselves but they enslave the people.\nNow let us fight to fulfill that promise, let us fight to free the world, to do away with national barriers, do away with greed, with hate and intolerance.\nLet us fight for a world of reason, a world where science and progress will lead to all men's happiness.\nSoldiers! In the name of democracy, let us all unite!\n\nThe Great Dictator is a 1940 American comedy-drama film starring, written, produced, scored, and directed by Charlie Chaplin, following the tradition of many of his other films. Having been the only Hollywood filmmaker to continue to make silent films well into the period of sound films, this was Chaplin's first true talking picture as well as his most commercially successful film. (Wikipedia)",
				"libraryCatalog": "YouTube",
				"runningTime": "423 seconds",
				"shortTitle": "HD Charlie Chaplin - The Great Dictator",
				"url": "https://www.youtube.com/watch?v=9-cM5FLTGhU&feature=youtube_gdata_player",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/