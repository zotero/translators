{
	"translatorID": "22dd8e35-02da-4968-b306-6efe0779a48d",
	"label": "newspapers.com",
	"creator": "Peter Binkley",
	"target": "^https?://[^/]+\\.newspapers\\.com/(clip|article)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-05 15:26:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2019 Peter Binkley

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

function detectWeb(_doc, _url) {
	return "newspaperArticle";
}

function doWeb(doc, url) {
	if (url.includes('/clip/')) {
		scrapeClip(doc, url);
	}
	else {
		scrapeArticle(doc, url);
	}
}

function scrapeClip(doc, url) {
	var newItem = new Zotero.Item("newspaperArticle");

	var metaArr = {};
	var metaTags = doc.getElementsByTagName("meta");
	for (let metaTag of metaTags) {
		if (metaTag.getAttribute("property")) {
			metaArr[metaTag.getAttribute("property")] = metaTag.getAttribute("content");
		}
	}
	newItem.title = text(doc, '#mainContent h1') || text(doc, '[itemprop="about"]');
	// remove the unnecessary xid param
	newItem.url = attr(doc, 'link[rel="canonical"]', 'href');
	
	/*
		The user can append the author to the title with a forward slash
		e.g. "My Day / Eleanor Roosevelt"
	*/
	if (newItem.title.includes('/')) {
		var tokens = newItem.title.split("/");
		var authorString = tokens[1];
		newItem.title = tokens[0].trim();
		// multiple authors are separated with semicolons
		var authors = authorString.split("; ");
		for (let author of authors) {
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));
		}
	}
	
	newItem.publicationTitle = text(doc, '[itemprop="name"]');
	// details["source"]["title"] gives a string like
	// "Newspapers.com - The Akron Beacon Journal - 1939-10-30 - Page Page 15"
	newItem.pages = text(doc, '[itemprop="position"]').replace(/Page/g, '');
	newItem.date = ZU.strToISO(text(doc, '[itemprop="dateCreated"]'));
	newItem.place = text(doc, '[itemprop="locationCreated"]');

	newItem.attachments.push(makeImageAttachment(url));
	newItem.attachments.push(makePDFAttachment(url));
	
	// handle empty title
	if (newItem.title === "") {
		newItem.title = "Article clipped from <i>" + newItem.publicationTitle + "</i>";
	}
	newItem.complete();
}

function scrapeArticle(doc, url) {
	let item = new Zotero.Item('newspaperArticle');
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));

	item.publicationTitle = json.publisher && ZU.unescapeHTML(json.publisher.legalName);
	item.title = ZU.trimInternal(ZU.unescapeHTML(json.about))
		|| 'Article clipped from <i>' + item.publicationTitle + '</i>';
	item.abstractNote = ZU.unescapeHTML(json.text);
	item.place = ZU.unescapeHTML(json.locationCreated);
	item.date = json.datePublished;
	item.pages = json.pageStart && ZU.unescapeHTML(json.pageStart.replace('Page', ''));
	item.url = attr(doc, 'link[rel="canonical"]', 'href');
	item.attachments.push(makeImageAttachment(url));
	item.attachments.push(makePDFAttachment(url));

	item.complete();
}

function getID(url) {
	return url.match(/\/(\d+)/)[1];
}

function makePDFAttachment(url) {
	return {
		title: 'Full Text PDF',
		mimeType: 'application/pdf',
		url: 'https://www.newspapers.com/clippings/download/?id=' + getID(url)
	};
}

function makeImageAttachment(url) {
	return {
		title: 'Image',
		mimeType: 'image/jpeg',
		url: 'https://img.newspapers.com/img/img?clippingId=' + getID(url)
	};
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.newspapers.com/clip/7960447/my-day-eleanor-roosevelt/",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "My Day",
				"creators": [
					{
						"firstName": "Eleanor",
						"lastName": "Roosevelt",
						"creatorType": "author"
					}
				],
				"date": "1939-10-30",
				"libraryCatalog": "newspapers.com",
				"pages": "15",
				"place": "Akron, Ohio",
				"publicationTitle": "The Akron Beacon Journal",
				"url": "https://www.newspapers.com/clip/7960447/my-day-eleanor-roosevelt/",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.newspapers.com/clip/18535448/the-sunday-leader/",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Article clipped from <i>The Sunday Leader</i>",
				"creators": [],
				"date": "1887-07-17",
				"libraryCatalog": "newspapers.com",
				"pages": "5",
				"place": "Wilkes-Barre, Pennsylvania",
				"publicationTitle": "The Sunday Leader",
				"url": "https://www.newspapers.com/clip/18535448/the-sunday-leader/",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.newspapers.com/clip/31333699/driven-from-governors-office-ohio/",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Driven from Governor's Office, Ohio Relief Seekers Occupy a Church Today; Remain Defiant",
				"creators": [],
				"date": "1937-04-10",
				"libraryCatalog": "newspapers.com",
				"pages": "1",
				"place": "Rushville, Indiana",
				"publicationTitle": "Rushville Republican",
				"url": "https://www.newspapers.com/clip/31333699/driven-from-governors-office-ohio/",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.newspapers.com/article/the-times-picayune-telegraphed-to-the-ne/120087578/",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Telegraphed to the New Orleans Picayune. Latest from Charleston. Fort Sumter Returns Fire",
				"creators": [],
				"date": "1861-04-13",
				"abstractNote": "Telegraphed to the New Orleans Picayune. LATEST FROM CHARLESTON. FORT SUMTER RETflUS FIRE. SULLI VAN12AND MORRIS ISLAND BATTERIES AT WORK. BREACH MADE IN FORT SUMTER. War Vessels Reported Outside. By the Southwestern Line. Charleston, April 12. The batteries of Sullivan's Island, Morris Island and other points opened fire on Fort Sumter at half - past four o'clock this morning. Fort Sumter returned the fire. A brisk cannonading is being kept up. There is no infoimation from the seaboard. The military are under arms. The whole population is on the streets, and the harbor is filled with anxious spectators. SECONB DISPATCH. The Moating battery is doing good service. Up to eleven o clock there has been no loea on our side. Fort Sumter replied at 7 o'clock this morning, and has kept up an astonishing fire ever since. Stevens's battery is slightly injured. Three sbejls are fired per minute. Four hundred, in all, have fallen. A breach is expected to be made in Fort Sumter to - morrow. Major Anderson's fire is principally directed I against the floating battery. j War vessels are reported outside the harbor. Only two soldiers are wounded on Salli - ! van's Island. The range is more perfect from the land batteries. Every shot tells. It ia thought from Mnjor Anderson's fire thai he haa more men than was supposed. Fort Sumter will succumb by to - morrow. It is raining at Charleston, but there - is no cessation of the batteries. A continuous steady fire on both sides is beinc kept up. The cutter Harriet Lane, and the steam gnu boat Crntader, are reported olf the bar, but have not entered the harbor. The War Department have as yet no official diepatches. (Jen. Beauregard was at the batteries all day. , The Government expects Fort Sumter to succumb to - morrow. third dispatch The firing continued all day. Two of Fort Sumter's guns are silenced, and it is reported a breach has been made through the southeast wall. No casualty has yet happened to any of the forces. Only seven of the nineteen batteries have opened fire on Fort Sumter. The remainder are held ready for the expected fleet. Two thousand men reached the city this morning and immediately embarked for Morris Island. FOURTH DI fAT H. Charleston, April 10, 11 P. M. Tne bombardment of Fort Saniter is going on every twenty minutes from the mortars It is supposed Major Anderson is resting his men for the night. Three vessels of war are reported outside tho bar. They cannot get in on account of the roughness of the sea. No one has as yet received any injury. The floating battery works admirably well. Every inlet to the harbor is well guarded. Our forces are having a lively time of it.",
				"libraryCatalog": "newspapers.com",
				"pages": "4",
				"place": "New Orleans, Louisiana",
				"publicationTitle": "The Times-Picayune",
				"url": "https://www.newspapers.com/article/the-times-picayune-telegraphed-to-the-ne/120087578/",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://nydailynews.newspapers.com/article/daily-news/121098969/",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Article clipped from <i>Daily News</i>",
				"creators": [],
				"date": "1965-02-26",
				"abstractNote": "Donavena 8-5 Choice; Can He Kayo Folley? By Jim McCulIey Professional oddsmakers, otherwise referred to as bookies, evidently are counting on Oscar (Ringo) Bona- vena to flatten Zora Folley the Garden. Otherwise, why young thumper from Argentina an 8-5 favorite over the ringwise No. 5 heavyweight contender from Arizona? Only two fighters in Folley's 13-year career have outpointed him England's Henry Cooper, in London, and big Ernie Terrell, in New York. Five men have stopped Zora, however. IT DOESN'T SEEM possible Bonavena, with only eight pro fights under his belt, could win a decision over tonight's 32-year-old opponent. Oscar has stopped seven of his eight opponents, however, and, of course, does have a powerful body and a punishing punch in either mitt. The fight mob is really puzzled over this fight. Some of those well versed in fisticuffs can't understand how the odds-bodkins can make 22-year-old Bonavena such a big favorite. Some 10,000 fans are expected to come see for themselves and put another $40,- 000 into the current boxing revival. \"I KNOW FOLLEY dogs it at times,\" said a former heavyweight contender, who did not want to be named because he is now an official with the boxing commission. ''But Bonavena is a real novice compared to Zora. It seems to me Folley should be a big favorite, but then the kid does have a punch and he is game. It's possible he can reach Folley and knock him out.\" The price, for Folley backers, Is most enticing. \"I CAN'T RESIST the price,\" said a knowledgeable fight man who has been known to wager a bob now and then when the figures are right. \"Know something, 1 think it will be down close to pick 'em before they get into the ring.\" One thing is certain. Folley can't lose another fight in New York at this time, or he is through as a top contender. He is going for a payday on the gamble that he can go the distance with Oscar; and there is a chance he might stop the young man, too, though nobody has done that yet. RIGHT NOW, FOLLEY is unbeaten in hi3 last six bouts since losing to Terrell here July 27, '63. In that span he has whipped George Chuvalo, easily, and has recorded a draw with European champion Karl Maldenbfrger in Germany. Zora's overall record stands 68-7-4, for 79 professional fights, and includes 38 knockouts, some proof that he can punch as well as box. Only opponent to go the route (10 rounds) with Bonavena was Dick Wipperman, last Nov. 13 here. Oscar came back to the Garden a month later and knocked out Billy Stephan in six. The South American still is unranked among the big boys, but a win tonight will put him up there where he can start hollering. History shows heavyweights do mature a lot quicker than the lighter men, and Oscar may ev.en. be an unusual young fighter, v . . ( . r in 10 rounds or less tonight at would they continue to list the - Vlsic lliv ;.. Vnn-t ST!rt -. lM. FEB. 26, 1958 ZDhe BOSTON CELTICS WOM THEIR SECOMt STRAIGHT N.&amp;.A. EASTERN CROWN BY DOWNING DETROIT, 106-99, AS &amp;1LL RUSSELL COUTftOLU&amp;THE BOARDS. BOBCOUSYAN&amp; BILL SHAfeMAH EACH SCORED 18 POIWTS. Lincoln Downs Results 1ST Clmp.: 4-np: 5 f.: off 1:33. Ravenala Prince (Garry)5.ti0 4i 2 SO Mission Bound (Parker) 6.10 .'i.8'1 Favorite Act (Bradley) K.MI T-l:02, Also Lord Culpeper. Your Reporter, Deacon Shnne. Prmrie Rose. Rinsr Shut, Fearless Leader, ilaryg Gilt. Soft Glance. 2D Clmg-.; 4-np: 7 f.: off 2:00. Idle Threats (Allan) 4 no 2 SO Grey Whirl (Giovanni) 3.40 3.00 Good Effort (Maeda) B.20 T-1:32t4. Also Greek Paire. Inquisition. Frozen North, Fast Bid. Foxy Sway. (Daily Double. 8-1, Paid :!.\". liOl 3D Clm?:3yrs:mdns:5 f :off 2 :2!) . Dogrwood Pateh(MaRia)7.ai) o.no 4.20 I.L Abie K. t Bradley) 13. NO U.KO Peaceful T. (Donahue) H.uO T.-l:t)3. Also Doe I.ark. AlHnx. Miss Pilot. Sum Bomb. Fast Bell. Greek Action, Win Joe. Dont Btatne Babe. 4TH Clmar.: 4-up; 7 t.: off 2:58. Irish Dotty (Bradley) 4.4D 3.20 2. SO Sibling- (Allan) 9.80 6.20 Brimstone Road (Row an 6. Of) T.-l :35 . Also Stahlstown. Emerson Hill. Patti Dowd. Ou The Lawn. Sieve H.. Game Start. Set. 5TH Clma:.: 3-up: 8 t.; off 3:254. Ancient Queen (Lamonte)-4.80 3. no 2.40 Wlwndilly (Merrier) 3 20 2 .So Lady Mink (Bradley) 2.80 T-l:02. Alio Mandolas. Lady Rhody. O. K. Debbie. Jury Verdict. Swift Salonga. Mix n Match. La Calvados. 6TH Clm?: 3-4 yrs; 5 f: off 3:52. Tessie Tansor(Davern)12.60 o.BO 5.00 French Line (Myers) 4.80 5 40 Captain Bronze (Allan) 10. hi) T.-l:02 9i. Alyso Rosie Anirel. Lony-bridge Lu Lu. Star Status, Toute Ma Vie. Tompkins County. 7TH Alw.: 3-4-yos.: 5 fur. off 4:20. Lories Honey (Hole) 24.20 20 3.8\" Rndoon (Clinch) 2.40 2.40 Presta Sun (Gamb'della) 5.00 T.-l:03. Also Green Toea. Anthony Scarfo. Prince O Morn. Captain Lockitup. Caronia. 8TH Clmr.: 4-up: 1 m.: off 4:48. ratcount (Alberts) 13.HO 5 HO 4.20 Lone Peak (Rodriguez) 5.60 3 flu Kilda (Ledezma) 3.40 T-l:48Si. Also Hue or Spank. Carb-anrel, Whitey. Wild Desire. 9TH Clmg-: 41iip: 1 m: off 5:16. Oportscaster (Allan) 20.80 8.KO 7.20 Waste Of Time(Miller) 49.20 2B.20 Da.vFromDallas(G's'do) 20.40 T.-1:5H4. Also Symboleer, Dandy Randy. Sea Tread. My Buyer. Cosmic Rule. Busted Budeet. Another Take, Presented. (Twin Double 8-1 8-3 Paid $3.51 1.20) , Att, 4,744. Handle $364,968. ' r think ( ConraoLf) THEY'LL 7t1-fT EVER SvSXv. ' C COME J uAV' BE A LOHG JfeTV",
				"libraryCatalog": "newspapers.com",
				"pages": "60",
				"place": "New York, New York",
				"publicationTitle": "Daily News",
				"url": "https://www.newspapers.com/article/daily-news/121098969/",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
