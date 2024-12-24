{
	"translatorID": "22dd8e35-02da-4968-b306-6efe0779a48d",
	"label": "newspapers.com",
	"creator": "Peter Binkley",
	"target": "^https?://[^/]+\\.newspapers\\.com/(article|image)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-10-29 15:14:42"
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

function detectWeb(doc, url) {
	if (url.includes('/article/')) {
		return 'newspaperArticle';
	}
	else if (url.includes('/image/')) {
		if (new URL(url).searchParams.has('clipping_id')) {
			return 'newspaperArticle';
		}
		else {
			return 'multiple';
		}
	}
	return false;
}

async function getClippings(url) {
	let id = url.match(/\/image\/(\d+)/)[1];
	let json = await requestJSON(`/api/clipping/page?page_id=${id}&start=0&count=25`);
	let clippings = {};
	for (let clipping of json.clippings) {
		clippings[clipping.url] = clipping.title || '[Untitled]';
	}
	return clippings;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(await getClippings(url));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(await requestDocument(url));
		}
	}
	else if (url.includes('/image/')) {
		let clippingID = new URL(url).searchParams.get('clipping_id');
		scrape(await requestDocument('/article/' + clippingID));
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('newspaperArticle');
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));

	item.publicationTitle = json.publisher && ZU.unescapeHTML(json.publisher.legalName);
	item.title = ZU.trimInternal(ZU.unescapeHTML(json.about || ''));
	item.abstractNote = ZU.unescapeHTML(json.articleBody || json.text || '');
	item.place = ZU.unescapeHTML(json.locationCreated);
	item.date = json.datePublished;
	item.pages = json.pageStart && ZU.unescapeHTML(json.pageStart.replace('Page', ''));
	item.url = attr(doc, 'link[rel="canonical"]', 'href');
	item.attachments.push(makeImageAttachment(url));
	item.attachments.push(makePDFAttachment(url));

	/*
		The user can append the author to the title with a forward slash
		e.g. "My Day / Eleanor Roosevelt"
	*/
	if (doc.querySelector('div[class^="ClippingOwner_"]') && item.title.includes('/')) {
		var tokens = item.title.split("/");
		var authorString = tokens[1];
		item.title = tokens[0].trim();
		// multiple authors are separated with semicolons
		var authors = authorString.split('; ');
		for (let author of authors) {
			item.creators.push(Zotero.Utilities.cleanAuthor(author, 'author'));
		}
	}

	if (!item.title) {
		item.title = 'Article clipped from <i>' + item.publicationTitle + '</i>';
	}

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
		"url": "https://www.newspapers.com/article/the-akron-beacon-journal-my-day-eleano/7960447/",
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
				"abstractNote": "My Day -\"1 T - i! Mrs. Roosevelt BIRMINGHAM, Ala., Sunday Limited space prevented my telling you about several interest-lnc things which I did-in Youngstown, O., last jpnaay. loaay a sn&amp;u try to tell you a little more about this city, which seems to exist primarily for the production of steel. There is a certain majesty to this Industry which catches one's imagination. We came out from a street to find ourselves looking down over what seemed to be an almost limitless array of factory buildings and chimneys. The driver of our car said: \"That is the U. S. Steel Co. and it covers six miles. Think of. an investment renresented and of the stake which the people working here have in the success or failure of that business, not to mention the innumerable people who own a part of the invested capital. It takes your breath away Just to think that any human beings are responsible for anything so vast and far reaching. Visits Newspaper Indexing Project . , I saw two WPA projects during the morning. One. a visual education project in a school, was turning out extremely good material such a posters, pictures of birds, v samples of grass, trees, bugs, etc, for use in schools throughout the district. The other, an Ohio state project being carried on in several big cities, I have never happened to come across anywhere else, though .it is doubtless being done in many places. Newspapers in the various cities are being indexed and microfilms of the pages are being made. These films can be stored and lent with ease, and the Indexing material will make available information on ths news for the By Eleanor Roosevelt years which these projects cover. It takes several weeks to train a man for work on these projects which requires Intelligence and accuracy. I was interested to see that men and women of various ages and nationalities, including two colored men, were working on it. After lunch at one of the clubs in the city. I had an opportunity to talk with a number of WPA and NYA groups. In Industrial centers there is a pick-up in employment which is felt on both WPA and NYA projects, but this is not, the case as yet in small towns or rural areas. Beys Start Symphony Youngstown has a symphony orchestra which is entirely self-supporting and which was started by two young Italian boys. Many workers in the steel mill play in it, for among our American citizens of foreign nationalities we are more apt to find artistic ability one of their contributions for which we should be grateful. I visited a slum clearance project in the after noon which covers a large area and which they tell me replaces some long condemned buildings, which had been a blot on the city and a danger to the health of the people. I also had a glimpse of the park, which la one of the most .beautiful natural parKs I nave ever seen. We left Youngstown immediately after my lec- ture, spent a few hours in cohimous, u yesterday and found ourselves engulfed in a football crowd. We were tempted to stay over to see the Cornell-Ohio State game so as to be able to cheer our own state college. : . Now, after part of a day and another night on the train, we are in Birmingham, Ala. This country Is a big country when you start to criss-cross Itl",
				"libraryCatalog": "newspapers.com",
				"pages": "15",
				"place": "Akron, Ohio",
				"publicationTitle": "The Akron Beacon Journal",
				"url": "https://www.newspapers.com/article/the-akron-beacon-journal-my-day-eleano/7960447/",
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
		"url": "https://www.newspapers.com/article/the-sunday-leader/18535448/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Article clipped from <i>The Sunday Leader</i>",
				"creators": [],
				"date": "1887-07-17",
				"abstractNote": "breakfast, enjoying illustrated resident of this city. A BOLD BURGLARY. Peter McManus's Saloon Robbed This Morning, One of the most daring burglaries and robberies that has been committed in this city for many years was perpetrated between the hours of one and three o'clock Thursday morning. in the very midst of the business centre, at a point rendered as bright day by surrounding electric lights, and on a street that is supposed to be constantly patroled at all times by vigilant policemen. Between the hours named the saloon and restaurant of Peter McManus, next door to Lohmann's on East Market street, was entered by burglars, and robbed of all its most valuable contents, Mr. McManus did not close his place until nearly midnight, and then going to the Exchange Hotel, chatted pleasantly on the porch with some friends before retiring. He securely locked and bolted the doors both front and rear, before leaving, and found them this morning in the same condition aS he had left them. What Was his surprise, however, on going behind his bar, to find the money drawer turned bottom upward on the floor, and further investigation showed that all of the most valuable goods in the store had been stolen, including about $300 worth of ten cent cigars, his entire supply of that grade, $150 worth of five cent cigars, 8 quantity of the best whisky, and everything that the robbers could conveniently carry. The drawer had been prled open with an ice pick which they had taken from the refrigerator, having previously broken both blades of a large pair of shears in the attempt. Mr. McManus does not know the exact amount of money he had left in the drawer, but thinks there were about seventeen dollars, mostly in silver. His entire loss will reach very close to $500, and Mr. McManus being by no means a rich man will no doubt feel it severely. The only possible way that the burglars could affect an entrance was through the transom over the front door, which had been left partly open. To reach this a ladder must have been brought into requisition, and the goods must have been handed out through the same aperture. How it was possible that all this could be accomplished without detection is one of mysterious features of the affair. Surely the policemen must have been elsewhere at that time. There is no positive clue to the burglars as yet. Though certain parties are suspected and are being shadowed, no evidence that would warrant an arrest has thus far been obtained. QUINN COMMITTED. He is Held in Default $700 Bail to Answer the Charge of Robbery. Thomas Quinn was arrested at Kingston last night for the robbery of Peter McManus's restaurant in this city, the particulars of which were given in Thursday's LEADER. Quinn has a record, and it is not altogether an enviable one. He has been in a number of scrapes. He was once arrested for threatening to kill his father, and then he was one of the fellows who robbed Bock &amp; Glover's jewelry store at Hazleton last winter. He turned state's evidence, it will be remembered and received a sentence to the county jail, while his companion in the crime, Shepherd, was sent to the penitentiary. When he left here for Philadelphia Shepherd said he would not be surprised to see Quinn at the penitentiary before he got out. He is very likely to see him there. Quinn had a hearing before the Mayor this morning and was committed to jail in default of $700 tail. When arraigned he pleaded not guilty, but the evidence seemed dead against him. McManus testified that he was in his place three times on the day before the robbery -the last time between 11 and 12 o'clock at night- and had stood him off for drinks. He also identified a 25 cent shinplaster, found in Quinn's possession when arrested, as one which had been in his money drawer for nine or ten months or possibly a year. A pair of scissors, which belonged to McManus, were found under the bar in his restaurant on the morning after the robbery, broken, and the piece that was broken off was found in Quinn's pocket after his arrest. The scissors had been used to pry open the money drawer. The finding of these things in Quinn's possession was evidence that he either committed the robbery himself or knew who did it, and he had no explanation to make as to how the articles came in his possession, When asked by the Mayor how long he had been out of jail he answered, \"'That's my business.\" He was quite impudent and denied having been in McManus's restaurant on Wednesday evening, as McManus said he was. He was released from jail, after serving his sentence for the Hazleton robbery, on June 30th.",
				"libraryCatalog": "newspapers.com",
				"pages": "5",
				"place": "Wilkes-Barre, Pennsylvania",
				"publicationTitle": "The Sunday Leader",
				"url": "https://www.newspapers.com/article/the-sunday-leader/18535448/",
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
		"url": "https://www.newspapers.com/article/rushville-republican-driven-from-governo/31333699/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Driven from Governor's Office, Ohio Relief Seekers Occupy a Church Today; Remain Defiant",
				"creators": [],
				"date": "1937-04-10",
				"abstractNote": "DRIVEN FROM GOVERNOR'S OFFICE, OHIO RELIEF SEEKERS OCCUPY A CHURCH TODAY: REMAIN DEFIANT G. M. C. Plant Will Reopen; Police Ready # Trouble Is Expected at StrikeBound General Motors Factory Near Toronto, Canada. Oshawa, Ont., April 10 (AP) Canadian Press - Sixty men and women workers of the strikeclosed General Motors of Canada plant walked out without melestation through a picket line today and went back to work in the parts department. Thus : a situation which the CIO-Affiliated Automobile Workunion the company and government officials all had feared might break into open trouble passed peacefully - with no more incident that the prolonged jeers of the 160 pickets. The main plant, from which 3,700 union workers have struck, remained closed. The parts department was reopened for motor car and truck repair purposes and not for actual production. Oshawa, Ont., April 10 (Canad- ian Press) -Provincial authorities massed police reserves in nearby Toronto, ready for instant action, today as General Motors of Canada prepared to resume partial operation of its strike-bound Oshawa plant. Premier Mitchell Hepburn of Ontario Province, opponent of the committee for industrial organization in its Oshawa activity, declared government protection would be provided if necessary when the factory's parts department reopens. The extra police will not be sent, however, unless \"trouble develops and gets beyond the control of the municipality,\" he said. Representatives of the 3,700 strikers, called out by the United Automobile Workers of America, said any worker who wishes may enter the Oshawa plant but any worker who does \"is a strike breaker whether he thinks so or not.\" Hugh Thompson, CIO organizer, withdrew a statement he made at the same time saying the union \"will not be responsible for any accident that happens\" after such workers leave the plant, stating: \"I wish to retract the suggestion regarding the possibility •of accident to strikebreakers Force Is Used to Eject Group from State House at' Columbus, Ohio. SEVERAL INJURED BY THE OFFICERS Protesters Demanding Appropriation of $50,000,000 for the Needy. By GORDON C. NIXON Columbus, O., April 10 (AP)-A defiant group of 100 relief seekers occupied a church today as a haven from the office of Gov. Martin L. Davey from which they were dragged and carried by sheriff's deputies. Six of their organizers were in jail for investigation, cut off from all but attorneys. A committee of the Ohio Workers Alliance took over the leadership and declared they would stay in the state capital until their demands were met. Many nursed bruises made by officers' maces; nearly all went without food for nearly 12 hours from the time the National Guard stopped feeding them until they could take up a collection for supplies. \"The demonstration will continue,\" was the final declaration in a statement issued by temporary leaders. They declined to say if they would attempt to re-enter the governor's office which they held from late Wednesday until yesterday evening. Screaming, kicking and cursing, the marchers, mostly from the Toledo area, struggled for several minutes before ejection was completed. One was taken to a hospital for treatment. Another had severe bruises. Governor Davey, who had ordered them fed until yesterday noon, said, \"we tried to be very courteous to them, fed them, and tried to make them comfortable. of curse, there is a limit to all things.\" The climax of more than two months of Ohio relief crises still was ahead. The legislature appropriated in two installments a total of $6,- 000,000 for relief and flood aid from Jan. 1 to April 15 and deadlocked on proposals t make the counties contribute to a permanent relief program. Governor Davey urged matching of state funds. The house passed a bill providing $15,000,- 000 for a two-year relief porgram but turned down enabling acts (Turn to Page Three)",
				"libraryCatalog": "newspapers.com",
				"pages": "1",
				"place": "Rushville, Indiana",
				"publicationTitle": "Rushville Republican",
				"url": "https://www.newspapers.com/article/rushville-republican-driven-from-governo/31333699/",
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
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Telegraphed to the New Orleans Picayune. Latest from Charleston. Fort Sumter Returns Fire",
				"creators": [],
				"date": "1861-04-13",
				"abstractNote": "Telegraphed to the New Orleans Picayune. LATEST FROM CHARLESTON. FORT SUMTER RETURNS FIRE. SULLIVANIMAND MORRIS ISLAND BATTERIES AT WORK. BREACH MADE IN FORT SUMTER. War Vessels Reported Outside. [By the Southwestern Line.) CHARLESTON, April 12.-The batteries of Sullivan's Island, Morris Island and other points opened fire on Fort Samter at half-past four o'clock this morning. Fort Samter returned the fire. A briek cannonading is being kept up. There is no information from the seaboard. The military are under arms. The whole population is on the streets, and the harbor is filled with anxious spectators. [SECOND DISPATCH.] The floating battery is doing good service. Up to eleven o clock there has been no loss on our side. Fort Sumter replied at 7 o'clock this morning, and has kept up an astonishing fire ever since. Stevens's battery is slightly injured. Three shells are fired per minute. Four hundred, in all, have fallen. A breach is expected to be made in Fort Sumter to-morrow. Major Anderson's fire is principally directed against the floating battery. War vessels are reported outeide the harbor. Only two soldiers are wounded on Sallivan's Island. The range is more perfect from the land batteries. tells. It is thought from Major Anderson's a fire that he has more men than was supposed. Fort Sumter will anceumb by to- morrow. It is raiving at Charleston, but there is no ceseation of the batteries. A contianous steady fire on both eides is being kept up. The cutter Harriet Lave, and the steam gun boat Crusader, are reported off the bar, but have not entered the harbor. The War Department have as yet no ollicial dispatches. Gen. Beauregard was at the batteries all day. The Government expects Fort Samter to succumb to- morrow. [THIRD DISPATCH.] The firing continued all day. Two of Fort Sumter's guns are silenced, and it is reported a breach has been made through the southeast wall. No casualty has yet happened to any of the forces. Only seven of the nineteen batteries have opened fire on Fort Sumter. The remainder are held ready for the expected fleet. Two thousand men reached the city this morning and immediately embarked for Morris Ieland. FOURTH DISPATCH. CHARLESTON, April 12, 11 P. M.- -The bombardment of Fort Sumter is going on every twenty minutes from the mortare. It is supposed Major Anderson is resting his men for the night. Three vessels of war are reported outside the bar. They cannot get in on account of the roughness of the 888. No one has as yet received any injary. The floating battery works admirably well. Every inlet to the harbor is well guarded. Our forces are having a lively time of it. |",
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
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Article clipped from <i>Daily News</i>",
				"creators": [],
				"date": "1965-02-26",
				"abstractNote": "Bonavena 8-5 Choice; Can He Kayo Folley? By Jim McCullev I bookies, Professional evidently vena to flatten Zora the Garden. Otherwise, young thumper from an 8-5 favorite over No. 5 heavyweight from Arizona? Only two fighters 13-year career have him--England's Henry London, and big Ernie New York. Five stopped Zora, however. IT DOESN'T SEEM Bonavena, with only fights under his belt, a decision over tonight's old opponent. Oscar seven of his eight however, and, of have a powerful punishing punch in The fight mob is over this fight. Some well versed in fisticuffs derstand how the can make 22-year-old such a big favorite. fans are expected to themselves and put 000 into the current vival. \"I KNOW FOLLEY times,\" said a former weight contender, want to be named now an official with commission. \"But real novice compared seems to me Folley big favorite, but does have a punch game. It's possible he Folley and knock him The price, for Folley is most enticing. \"I CAN'T RESIST said a knowledgeable who has been known bob now and then ures are right. \"Know I think it will be pick 'em before they ring.\" One thing is certain. can't lose another York at this time, or as a top contender. for a payday on the he can go the distance and there is a chance stop the young man, nobody has done that RIGHT NOW. beaten in his last six losing to Terrell here In that span he George Chuvalo, easily, recorded a draw with champion Karl Germany. Zora's stands 68-7-4, for 79 fights, and includes 38 some proof that he well as box. Only opponent to (10 rounds) with Dick Wipperman, last here. Oscar came Garden a month later out Billy Stephan in six. American still is unranked the big boys, but a will put him up there can start hollering. heavyweights do quicker than the lighter Oscar may even. be young fighter. y oddsmakers, otherwise referred to as are counting on Oscar (Ringo) BonaFolley in 10 rounds or less tonight at why would they continue to list the Argentina® the contender ringwise This Day in Sports 8 1965 World by Rights News Reserved Syndicate Co. Inc. in Folley's outpointed in GOT WE'VE Cooper, Terrell, in THINK CONTROL! I DON'T men have THEY'LL EVER possible COME eight pro DOWN! could win • COULD. J 32-year- BE A LONG has opponents, stopped • REIGN ! G course, does body and a either mitt. really puzzled of those can't unodds-bodkins Bonavena Some 10,000 come see for another $40,- boxing re- dogs it at heavywho did not because he is the boxing Bonavena is a to Zora. It should be a then the kid and he is can reach out.\" backers, the price,\" fight man to wager a when the figsomething, down close to get into the Folley fight in New he is through He is going gamble that with Oscar; he might too, though yet. FOLLEY is unbouts since July 27, '63. has whipped and has European Maldenberger in overall record professional knockouts, can punch as go the route Bonavena was Nov. 13 back to the and knocked The South among win tonight where he History shows mature a lot men, and an unusual FEB. 26,1958 THE BOSTON CELTICS WON THEIR SECOND STRAIGHT N.B.A. EASTERN CROWN BY DOWNING DETROIT, I06-99, AS BILL RUSSELL CONTROLLED THE BOARDS. BOB COUSY AND BILL SHARMAN EACH SCORED 18 POINTS. Lincoln Downs Results 1ST- 4-up: 5 1.: off 1:33. Ravenala Prince (Garry) -5.60 3.40 2.80 Mission Bound (Parker)- 6.40 3.80 Favorite Act (Bradley) 6.80 T-1:02 %. Also- Lord Culpeper. Your Reporter., Deacon Fearless Shrine, Leader, Prairie Marys Rose. Gift, Soft Glance. 2D Clmg.: 4-up; 7 1.: off 2:00. . Threats 29.20 4.00 2.80 Grey Whirl (Giovanni) _ 3.40 3.00 Good Effort (Maeda). - . Inquisi- 9.20 T-1:32 % Also- Greek Page. tion, Frozen North, Fast Bid. Foxy Sway. (Daily Double, 8-1, Paid $35.60) 3D f:off 2:29 ½ Dogwood Patch (Masia) 7.60 5.00 4.20 LL Abie K. (Bradley) _ 13.80 9.60 Peaceful T. (Donahue) 9.00 T-1:03 ⅕ - Also- Doe Lark. Alltrix. Pilot. Sum Bomb, Fast Bell. Greek Action, Win Joe, Dont Blame Babe. 4TH- 4-up; 7 1.: off 2:56. Irish Dotty, (Bradley) 4.40 3.20 2.80 Sibling (Allan) 9.80 6.20 Brimstone Road (Row an) 6.00 T.-1:35 % Also- Stahlstown. Emerson Hill. Patti Dowd. On The Lawn. Steve H., Game Start. Set. 5TH- 3-up: 5 f.: off 3:25 ½. Queen (Lamonte) _4.80 3.00 2.40 Whindilly (Mercier) _ 3.20 2.80 Lady, T-1:02 Mink (Bradley) Also - Mandolas. Lady 2.80 Rhody, 0. K. Debbie. Jury Verdict. Swift Salonga, Mix n Match. La Calvados. 3-4 yrs: 5 f: off 3:52. Jessie, Tansor (Davern) -12.60 5.60 5.00 Line (Myers) 4.80 5.40 Captain Bronze (Allan) 10.80 T.-1:02 % Alyso- Rosie Angel, Longbridge Star Status. Toute Ma Vie. Tompkins' County. 7TH- 3-4-vos.: fur. off 4:20. Lories Honey (Hole). = -24.20 6.20 3.80 Radoon (Clinch). 2.40 2.40 Presta Sun (Gamb'della) 5.00 T.-1:03%. Also- -Green Toga. Anthony Scarfo. Prince 0 Morn. Captain Lockitup. Caronia. 8TH- 4-up: 1 m.: off 4:48. Catcount (Alberts) .13.60 5.80 4.20 Peak (Rodriguez) 5.60 3.60 Kilda (Ledezma). 3.40 T-1:48 Also- Hug or Spank, Carbangel, Whitey, Wild Desire. 9TH-Clmg: 41up: 1 m: off 5:16. Sportscaster (Allan) - 20.80 8.80 7.20 Waste Of Time (Miller) 49.20 26.20 FromDallas (G's'do) 20.40 T.-1:51⅕. Also - - Symboleer. Dandy Randy, Sea Tread. My Buyer, Cosmic Rule, Busted Budget, Another Take, Presented. (Twin Double 8-1-8-3 Pald $3,514.20) Att. 4,744. Handle $364,968.",
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
	},
	{
		"type": "web",
		"url": "https://bklyn.newspapers.com/article/the-brooklyn-union-john-applegate-releas/157734583/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "John Applegate released from draft due to physical disability",
				"creators": [],
				"date": "1865-03-13",
				"abstractNote": "defence-was M' II 13 1 It A F T. Work ett the Froyoet-Marshala Offices. iuibd Din-raujT. Cok Kowlerie office presents the nanal bneg tola morning, end tk loo gnene ef epplloanu for exemption honors does not norm to lone In length or la toe heterogeneonaaeea of It el omen to. About 00 min ere bow required lor the Third Dtotrirt. Home very amusing scenes occur it tb office, aad tho change ol faore which occur with too majority ol recruits before rod alter their entrance Into tho doer which admit them into the awful presence of the examining board are remarks -Me. Ae a general thing every man In tbe line profome to think that be will aorely be exempted ea eooo hie story I told. Thoogh mnch witticism prevail, there t on moat face an Ill-concealed look of anxiety . which belie tbe assertions of their poaneeaore aa to tketr eertaldty of retting elf. Each tnne face le econned oa he eomee ant with a look of eager curiosity by those who have not been examined, end there ere few who have ooch command of their tarn a to eoneeel the toot of their eucce. or failure. The man who has been let off makes hi exit with a polite bow to the eeeembled draft official tnd a Jennty elr. He casts a look of mingled benevolence end pity on those outside, end If be bee a friend In tbe crowd eltp him oo tb back, tell him of hi good fortune, tnd take him If he be any message to convey, or whether ha dont feel peckish or feint from long etandlng, or whether ha would not Ilka to try B little eometblng for bit ttomtch'e sake. Yonr Jolly exempt man to lor the time tbe picture .of benerolenoe and benignity, tnd If the rale or the office permitted would be glad to take Colonel Fowler and hie toff ont to refreshment. He pet by tb ornamental broker who lounge around the front of tbe building with at mnch of a teowl aa hie good humor will permit, for be to e man thongh be be exempt, end be cannot forget that if be hadnt been exempted theee merry gentlemen would have the handling of e larger amount of hie money tnn he cere to spare. He take a parting look at tbe building in which be ha spent tome anxtone end unpleasant boar, and trot off home to ell his wife, mother, sweetheart, listers, tnd friends tnd relatives generally that Code Samuel doesnt want klm Just yot. ' 1 be reverse to this picture In that of tbe exceedingly robnet and healthy kind of gentleman whom Unde Samuel dellghU to honor, but who think that the little rheumatism he sometimes baa would eerioualy Impair hln efficiency In a military point of vtow-au opinion In which the draft authorities do net at all coincide, foe after a few questions he to pronounced eligtnle for service, end the word held entered opposite bis name. All into before he he bad e ebnnco to tell tbe offlctolsabouthls occasional lameness, and according to his temperament he either come out of the office with e seowUe sickly smile, or en anxious hoe. or the fin bat gone torth, end been re- eortefi, ewff-'kv-wrent, -ae sporting men say, ploy or pa y- play soldier or pay for a substitute; He Is generally found out hy the writing ones ontalde, who relieve their own misery and uncertainty by. va-rleus Inquiries ue whether hed seen hie uncle, ue lotto health, why he looks no pale, and other sue!! question ae their humor may suggest, Ue meets hie tormentors with more or less philosophy, end to seen soon after In consultation with n broker. The following la the list ol cases examined since onr Itet report : . , Utld.-c. Berk, W. Mosey, I-Veupel, Joe. Lock, Jr,, v ifrhmd EL R. Btylee. H. Wbecjer, He Hiller ? homes, E. Shane, . Spaulding, H. Walks, L.Htein-bern, C. Demerger, J. Schuyler. H. Mdler, C. Harper, W. faster, W. Knapp, A. Mayer, J. Ray, C. Flnehant. , Ao-Aerioit-J. Connor, IHS.fth. i fumithtd SubtlUuta m but Drqfl. A. Saunders, J. Mott, W. Phelps, G. Hartshorne. , f-alol Cfirnmnlorios. It. Fleet. , Until it abie Agk-4. Hhnrdlow, Jr., 8. Botto, M. Kee- rirCdiePrtg.r ton in ; j!Byrne, 7 fioum Beventh: A. Geiek M Grand. uhabmtv J . Wegener, Jo. Wilkinson, H. Baldwin. J. McKay, J. Lawrence, 8. Merrlt, 0. baton, L. Uartleon, J. haven, K. Bmtth, K. Roach, E. Heme, C. HeidengAb, H. Scnultn, O. Griffith, A. Young, M. Bonavirn, 8. Mills, T . Fhelan, C. Gregory. tiirnitked Subtiiiuttt. d-Wicker, J. freed, fl. Track J Hergeant, 8 McKenzie, H. Wheeler, I. Lo-mas J. WebbTB. Clark. D. McCnrley, J Cereoe, 8. Eenrney, W . D. Hart. G. Hawkehurat, J. AMinun, Q. Tyler, K Sumner, and B. Van Buran. THH 6E00SD DISTRICT. The following to the record of Saturday's work at tba headquarters of this district. No. S8 Grand street : Htid to Stnia. Thos. Coyne, Orlando Pearsall, Helb B ColT John B. Smlthl John Ilickey, Jam.; Borne, and bietnck HorBcnpiug, all of the Tenth Ward; Geo -Grafing, Ai jV-eS1fner d gar V. Lawrence, ill (rf Ae Nlnlh WAid, Phtical Dituiiiiiy John Applegate, John 'V. BrnM?m. D. Camp, Francia Hu,Co wm \" iin' bonne? Mark Allen, fiylvauus Whlte.Wm. In. Pslriek Hamlin, Micbael Fahey, Atox. 8. B fiorith, Leopold Voelhe, Theo. Ferguson, Joseph McGawey, A. hLWaldler, George C. White, Adam Bnvder, Jo-eon Beeihe . Edmund Decon, Joseph White, L. K. Wen- Charivs Kode, Thompson Odlen, Benj. P. Coffin i kepiaB dark Hirttn R Dwimrwt, Wo, KwUor, Ohael Frann, liorrisOOonnor, JosephVletory, Dani L.Calkina, fcaacF. Holmea, Goufred Sptudle, John Bjfln Joseph Talbot, Chris. McDonald, Wm. H. Smith Owvn Lynch James Ooodove Ph A Dolman, Wm Grail, and Thos. Muidoom all of tho IfOARrrideriee. Samuel Latorge and Daniel Rem- tk Seme. Lawrence Jtoblnsan, L. Bowers, and BubttUuU 1b Adiwnoft Go. H. Stolner, A. W.Burtls, Wui. Melvin, H. J. Brooks, Charles O. Heary T. Parson, 8. H. wtS?FnIok BHowSid. Thomas E. MarshThso. A Hottf John J. Price. Edeo SproeL Owen Manrijk, Charles Do herty, George R. Stone, a,?e? John Demmarls, bharies Louts, James Walsb, Joeepk , an on the of of the year et",
				"libraryCatalog": "newspapers.com",
				"pages": "1",
				"place": "Brooklyn, New York",
				"publicationTitle": "The Brooklyn Union",
				"url": "https://www.newspapers.com/article/the-brooklyn-union-john-applegate-releas/157734583/",
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
		"url": "https://www.newspapers.com/image/53697455",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.newspapers.com/image/53697455/?clipping_id=138120775",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Lorenzo POW Release",
				"creators": [],
				"date": "1945-05-31",
				"abstractNote": "attended Army St. by IT art son 76th Mrs. 47 LOCAL 61s I FREED FROM JAP AND NAZI CAMPS Washington. May 31 The War Department has made public the names of 1.211 soldiers liberated from German and Japanese prison camps. The following 47 Brooklyn, Queens and Long Island men are Included: A1ELLO. Staff Sgt. Loul T.. son of Mrs. Christina Aiello, 118-01 19th St., St. Albans. BAILEY. Pvt. John J . son of Wil- I liaor N. Bailey, 869 St, John's place. BARANII K, Capt. Jerry M son of Mrs. Marv L. Baranluk, S3 Haw- ley St., Babylon. BAl'ER, Pfc. Harold C. Jr., husband of Mrs. Mary A. Bauer, 89 India tCer St.. Greentiolnt. I, BERMAN, Pfc. Martin, son of Mrs. Anne Berman, 609 Logan Si. Hospital BE8SER, Pvt. Louis L., brother of .Sunday Harold Besser. 3070 66th St. M1CELI, Mrs. 1115 ROCCO, of BLASS, Pfc. Louis, son of Mrs. Jennie Blass, 271 Oakley, Ave., H-mont. BOAS, Pfc. Ross P., son of Mrs. Doris P. Boas, 101 Rugby Road. DIPPOLD, Sgt. Christian, son of Mrs. Edna J. Bent, 8829 Fort Hamilton Parkway. GRAY, Staff Sgt. John A., son of John T. Gray, 22-17 19th St., Astoria. HARRIS, Tech. Sgt. Morton G.. son of Mrs. Sylvia R. Harris, 650 Ocean Ave. HOLLAND, Tech. Sgt. Dennis A husband of Mrs. Virginia Holland, 158-10 Sanford Ave., Flushing. HYMAN, Staff Sgt. Milton, son of Mrs. Gussie Hyman. 381 Jericho Turnpike, Floral Park. KAMINETSKY, Pfc. Sol, son of Sam Kaminetsky, 238 Dumonti Avenue. I KEANE. Pfc. Francis L., son of Mrs. Delia Keane, 319 Lincoln Place. KILL. AN, Tech. Sgt. William R..! son of Mrs. Mary E. Killlan, 503 J 6th St. LANE, Sgt. Charles C. husband of, Mrs. Marie Lane, 167 Bushwick j Avenue. i LA ROCCO, Staff Sgt. Guy W.. son of Mrs. Fanny La Rocco, 801 Sheridan Boulevard. Inwood. I LORENZO, Ptc. William E., son! of Mrs. Jennie Lorenzo, 178 j Jackson St. PAPPAS, Pfc. Demetrios. son of. George Pappas, 1357 43d St. !",
				"libraryCatalog": "newspapers.com",
				"pages": "7",
				"place": "Brooklyn, New York",
				"publicationTitle": "Brooklyn Eagle",
				"url": "https://www.newspapers.com/article/brooklyn-eagle-lorenzo-pow-release/138120775/",
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
		"url": "https://bklyn.newspapers.com/image/541712415/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
