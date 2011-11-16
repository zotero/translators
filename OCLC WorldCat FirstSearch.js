{
	"translatorID": "838d8849-4ffb-9f44-3d0d-aa8a0a079afe",
	"label": "OCLC WorldCat FirstSearch",
	"creator": "Simon Kornblith",
	"target": "https?://[^/]*firstsearch\\.oclc\\.org[^/]*/WebZ/",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-10 13:42:28"
}

function detectWeb(doc, url) {
	var detailRe = /FirstSearch: [\w ]+ Detailed Record/;
	var searchRe = /FirstSearch: [\w ]+ List of Records/;
	
	if(detailRe.test(doc.title)) {
		return "book";
	} else if(searchRe.test(doc.title)) {
		return "multiple";
	}
}

function processURLs(urls) {
	if(!urls.length) {	// last url
		Zotero.done();
		return;
	}
	
	var newUrl = urls.shift();
	
	Zotero.Utilities.HTTP.doPost(newUrl,
	'exportselect=record&exporttype=plaintext', function(text) {
		var lineRegexp = new RegExp();
		lineRegexp.compile("^([\\w() ]+): *(.*)$");
		
		var newItem = new Zotero.Item("book");
		newItem.extra = "";
		
		var lines = text.split('\n');
		for(var i=0;i<lines.length;i++) {
			var testMatch = lineRegexp.exec(lines[i]);
			if(testMatch) {
				var match = newMatch;
				var newMatch = testMatch
			} else {
				var match = false;
			}
			
			if(match) {
				// is a useful match
				if(match[1] == 'Title') {
					var title = match[2];
					if(!lineRegexp.test(lines[i+1])) {
						i++;
						title += ' '+lines[i];
					}
					if(title.substring(title.length-2) == " /") {
						title = title.substring(0, title.length-2);
					}
					newItem.title = Zotero.Utilities.capitalizeTitle(title);
				} else if(match[1] == "Series") {
					newItem.series = match[2];
				} else if(match[1] == "Description") {
					var pageMatch = /([0-9]+) p\.?/
					var m = pageMatch.exec(match[2]);
					if(m) {
						newItem.pages = m[1];
					}
				} else if(match[1] == 'Author(s)' || match[1] == "Corp Author(s)") {
					var yearRegexp = /[0-9]{4}-([0-9]{4})?/;
					
					var authors = match[2].split(';');
					if(authors) {
						newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[0], "author", true));
						for(var j=1; j<authors.length; j+=2) {
							if(authors[j-1].substring(0, 1) != '(' && !yearRegexp.test(authors[j])) {
								// ignore places where there are parentheses		
								newItem.creators.push({lastName:authors[j], creatorType:"author", fieldMode:true});
							}
						}
					} else {
						newItem.creators.push(Zotero.Utilities.trimInternal(match[2]));
					}
				} else if(match[1] == 'Publication') {
					match[2] = Zotero.Utilities.trimInternal(match[2]);
					if(match[2].substring(match[2].length-1) == ',') {
						match[2] = match[2].substring(0, match[2].length-1);
					}
					
					// most, but not all, WorldCat publisher/places are
					// colon delimited
					var parts = match[2].split(/ ?: ?/);
					if(parts.length == 2) {
						newItem.place = parts[0];
						newItem.publisher = parts[1];
					} else {
						newItem.publisher = match[2];
					}
				} else if(match[1] == 'Institution') {
					newItem.publisher = match[2];
				} else if(match[1] == 'Standard No') {
					var ISBNRe = /ISBN:\s*([0-9X]+)/
					var m = ISBNRe.exec(match[2]);
					if(m) newItem.ISBN = m[1];
				} else if(match[1] == 'Year') {
					newItem.date = match[2];
				} else if(match[1] == "Descriptor") {
					if(match[2][match[2].length-1] == ".") {
						match[2] = match[2].substr(0, match[2].length-1);
					}
					
					var tags = match[2].split("--");
					for(var j in tags) {
						newItem.tags.push(Zotero.Utilities.trimInternal(tags[j]));
					}
				} else if(match[1] == "Accession No") {
					newItem.accessionNumber = Zotero.Utilities.superCleanString(match[2]);
				} else if(match[1] == "Degree") {
					newItem.itemType = "thesis";
					newItem.thesisType = match[2];
				} else if(match[1] == "DOI") {
					newItem.DOI = match[2];
				} else if(match[1] == "Database") {
					if(match[2].substr(0, 8) != "WorldCat") {
						newItem.itemType = "journalArticle";
					}
				} else if(match[1] != "Availability" &&
						  match[1] != "Find Items About" &&
						  match[1] != "Document Type") {
					newItem.extra += match[1]+": "+match[2]+"\n";
				}
			} else {
				if(lines[i] != "" && lines[i] != "SUBJECT(S)") {
					newMatch[2] += " "+lines[i];
				}
			}
		}
		
		if(newItem.extra) {
			newItem.extra = newItem.extra.substr(0, newItem.extra.length-1);
		}
		
		newItem.complete();
		processURLs(urls);
	}, false, 'iso-8859-1');
}

function doWeb(doc, url) {
	var sessionRegexp = /(?:\?|\:)sessionid=([^?:]+)(?:\?|\:|$)/;
	var numberRegexp = /(?:\?|\:)recno=([^?:]+)(?:\?|\:|$)/;
	var resultsetRegexp = /(?:\?|\:)resultset=([^?:]+)(?:\?|\:|$)/;
	var hostRegexp = new RegExp("^(https?://[^/]+)/");
		
	var sMatch = sessionRegexp.exec(url);
	var sessionid = sMatch[1];
	
	var hMatch = hostRegexp.exec(url);
	var host = hMatch[1];
	
	var newUri, exportselect;
	
	var detailRe = /FirstSearch: [\w ]+ Detailed Record/;
	if(detailRe.test(doc.title)) {
		var publisherRegexp = /^(.*), (.*?),?$/;
		
		var nMatch = numberRegexp.exec(url);
		if(nMatch) {
			var number = nMatch[1];
		} else {
			number = 1;
		}
		
		var rMatch = resultsetRegexp.exec(url);
		if(rMatch) {
			var resultset = rMatch[1];
		} else {
			// It's in an XPCNativeWrapper, so we have to do this black magic
			resultset = doc.forms.namedItem('main').elements.namedItem('resultset').value;
		}
		
		urls = [host+'/WebZ/DirectExport?numrecs=10:smartpage=directexport:entityexportnumrecs=10:entityexportresultset=' + resultset + ':entityexportrecno=' + number + ':sessionid=' + sessionid + ':entitypagenum=35:0'];
	} else {
		var items = Zotero.Utilities.getItemArray(doc, doc, '/WebZ/FSFETCH\\?fetchtype=fullrecord', '^(See more details for locating this item|Detailed Record)$');
		items = Zotero.selectItems(items);
		
		if(!items) {
			return true;
		}
		
		var urls = new Array();
		
		for(var i in items) {
			var nMatch = numberRegexp.exec(i);
			var rMatch = resultsetRegexp.exec(i);
			if(rMatch && nMatch) {
				var number = nMatch[1];
				var resultset = rMatch[1];
				urls.push(host+'/WebZ/DirectExport?numrecs=10:smartpage=directexport:entityexportnumrecs=10:entityexportresultset=' + resultset + ':entityexportrecno=' + number + ':sessionid=' + sessionid + ':entitypagenum=35:0');
			}
		}
	}
	
	processURLs(urls);
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://newfirstsearch.oclc.org/WebZ/FSFETCH?fetchtype=fullrecord:sessionid=fsapp1-37665-guu7ot6z-6iuxyc:entitypagenum=4:0:recno=2:resultset=2:format=FI:next=html/record.html:bad=error/badfetch.html:entitytoprecno=2:entitycurrecno=2:numrecs=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Harmon",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"American poetry. Humorous poetry, American. Poésie américaine. Poésie humoristique américaine. Anthologie. Lyrik. Humor"
				],
				"seeAlso": [],
				"attachments": [],
				"extra": "External Resources: Cite This Item Search for versions with same title and author | Advanced options ...\nLanguage: English\nContents: Contents -- Anonymous / Yankee Doodle -- Francis Hopkinson / The Battle of the Kegs -- St. George Tucker / The Cynic -- The Discontented Student -- The Judge with the Sore Rump -- Joel Barlow / The Hasty Pudding (from \"Canto I, Canto III\") -- Royall Tyler / Anacreontic to Flip -- The Widower -- Original Epitaph on a Drunkard -- Samuel Low / To a Segar -- John Quincy Adams / The Wants of Man -- To Sally -- Clement Moore / A Visit from St. Nicholas -- Francis Scott Key / To My Cousin Mary, for Mending My Tobacco Pouch -- Written at the White Sulphur Springs -- Fitz-Greene Halleck / Fanny (Stanzas xlvi-lxviii) -- Song -- Lydia Huntley Sigourney / God Save the Plough -- George Moses Horton / New Fashions -- Snaps for Dinner, Snaps for Breakfast, and Snaps for Supper -- Ralph Waldo Emerson / Fable -- The Test -- Solution -- Prudence -- Nathaniel Parker Willis / The Lady Jane: A Humorous Novel in Rhyme (Canto I, Stanzas xix-xxii and xci) -- To the Lady in the Chemisette with Black Buttons -- The Declaration -- To Helen in a Huff -- Henry Wadsworth Longfellow / The Village Blacksmith -- The Children's Hour -- Paul Revere's Ride -- John Greenleaf Whittier / The Haschish -- Barbara Frietchie -- The Barefoot Boy -- Skipper Ireson's Ride -- Thomas Holley Chivers / Lily Adair -- The Moon of Mobile -- Oliver Wendell Holmes / The Height of the Ridiculous -- Æstivation -- The Deacon's Masterpiece -- Ode for a Social Meeting -- A Sea Dialogue -- Edgar Allan Poe / The Bells -- James Thomas Fields / The Owl Critic -- Jupiter and Ten -- James Russell Lowell / In an Album -- A Misconception -- The Boss -- from \"The Biglow Papers\" The Courtin' -- Rev. Homer Wilbur's \"Festina Lente\" -- Herman Melville / In a Garret -- The Bench of Boors -- The Attic Landscape -- The Lover and the Syringa-Bush -- The New Ancient of Days -- Walt Whitman / A Boston Ballad -- Charles Godfrey Leland / Hans Breitmann's Party -- Breitmann in Politics -- Phoebe Cary / Samuel Brown -- The Day is Done -- Jacob -- William Allen Butler / Nothing To Wear -- Bayard Taylor / The Ballad of Hiram Hover -- Palabras Grandiosas -- Nauvoo -- Stephen Collins Foster / Gwine To Run All Night; or, De Camptown Races -- Oh! Susanna. Anonymous / The Little Brown Jug -- Sweet Betsey from Pike -- Clementine -- Starving to Death on a Government Claim -- The Factory Girl's Come-All-Ye -- An Ode on Gas -- John Townsend Trowbridge / Darius Greene and His Flying-Machine -- Recollections of \"Lalla Rookh\" -- Filling an Order -- Septimus Winner / Ten Little Injuns -- The Coolie Chinee -- Lilliputian's Beer Song -- Emily Dickinson / A bird came down the walk -- I like to see it lap the miles -- His Mansion in the Pool -- Mary Mapes Dodge / The Zealless Xylographer -- Edmund Clarence Stedman / The Ballad of Lager Bier -- George Arnold / Beer -- Charles H. Webb (\"John Paul\")/ Autumn Leaves -- At the Ball! -- Samuel Langhorne Clemens (\"Mark Twain\") / The Aged Pilot Man (from \"Roughing It\") -- Imitation of Julia A. Moore (from \"Following the Equator\") -- Emmeline Grangerford's \"Ode to Stephen Dowling Bots, Dec'd\" (from \"Huckleberry Finn\") -- Thomas Bailey Aldrich / Fannie -- At a Reading -- Anonymous / The Young Woman from Aenos -- Bret Harte / Colenso Rhymes for Orthodox Children -- Schemmelfenning -- Plain Language from Truthful James -- The Society upon the Stanislaus -- R.H. Newell (\"Orpheus C. Kerr\") / The Rejected \"National Hymns\" -- The American Traveller -- Columbia's Agony -- The Editor's Wooing -- The Neutral British Gentleman -- Tuscalossa Sam -- Dear Father, Look Up -- When Your Cheap Divorce Is Granted -- O, Be Not Too Hasty, My Dearest -- Innes Randolph / The Rebel -- Anonymous / Two Appeals to John Harralson, Agent, Nitre and Mining Bureau, C.S.A. -- John Hay / The Pledge at Spunky Point -- Good and Bad Luck -- Charles E. Carryl / A Nautical Ballad -- Charles Heber Clark (\"Max Adeler\") / Mr. Slimmer's Funeral Verses for the Morning Argus -- Alexander McGlue -- Willie -- Johnny Smith -- Hanner -- Mrs. McFadden -- Alexander -- Charles Follen Adams / To Bary Jade -- Repartée -- John Barley-Corn, My Foe -- Misplaced Sympathy -- My Infundibuliform Hat -- Ambrose Bierce / from \"The Devil's Dictionary\" -- Body-Snatcher -- Corporal -- Egotist -- Elegy -- Lead -- Nose -- Orthography -- Prospect -- Safety-Clutch -- Anonymous / Willie the Weeper -- No More Booze -- The Drunkard and the Pig -- Robert Jones Burdette / Orphan Born -- \"Soldier, Rest!\" -- John B. Tabb / Foot-Soldiers -- Bicycles! Tricycles! -- Close Quarters -- A Rub -- The Tryst -- Julia A. Moore / Grand Rapids -- Ashtabula Disaster -- Little Libbie -- Sketch of Lord Byron's Life -- James Whitcomb Riley / Craqueodoom -- A Rose in October -- When the Frost Is on the Punkin -- Little Orphant Annie -- The Diners in the Kitchen -- Ruth Mcenery Stuart / The Endless Song -- Fred Emerson Brooks / Foreigners at the Fair -- Barnyard Melodies -- Eugene Field / The Little Peach -- Wynken, Blynken, and Nod -- Little Boy Blue -- The Duel -- Samuel C. Bushnell / Boston -- Samuel Minturn Peck / A Kiss in the Rain -- John Philip Sousa / The Feast of the Monkeys -- Have You Seen the Lady? -- H.C. Bunner / Poetry and the Poet -- \"Home, Sweet Home\", with Variations -- Ben King / If I Should Die -- The Mermaid -- The Hair-Tonic Bottle -- The Cultured Girl Again -- The Pessimist. Anonymous / Kentucky Moonshiner -- Roy Bean -- Sam Walter Foss / Husband and Heathen -- A Philosopher -- Nixon Waterman / Cheer for the Consumer -- If We Didn't Have to Eat -- Hamlin Garland / Horses Chawin' Hay -- Goin' Back T'morrer -- Bliss Carman / A More Ancient Mariner -- Oliver Brook Herford / The Fall of J.W. Beane -- Eve -- Ernest lawrence Thayer / Casey at the Bat -- Richard Hovey / Eleazar Wheelock -- Barney McGee -- J. Gordon Coogler / Alas! Carolina! -- Alas! for the South! -- To Amy -- Byron -- In Memorial -- A Mustacheless Bard -- A Pretty Girl -- George Ade / Il Janitoro -- The Microbe's Serenade -- R-E-M-O-R-S-E (from \"The Sultan of Sulu\") -- Gelett Burgess / The Purple Cow -- Cinq Ans Aprés -- Tom Masson / Enough -- My Poker Girl -- A Tragedy -- He Took Her -- Bert Leston Taylor (\"B.L.T.\") / Doxology -- Those Flapjacks of Brown's -- Upon Julia's Arctics -- Aprilly -- Edgar Lee Masters / Jonathan Swift Somers -- The Spooniad -- Edwin Arlington Robinson / Variations of Greek Themes (II, III, IV) -- Carolyn Wells / Diversions of the Re-Echo Club -- John Palmer / The Band Played On -- Stephen Crane / A man said to the universe -- Tell me not in joyous numbers -- Anonymous / The Big Rock Candy Mountains -- The Four Nights' Drunk -- The Frozen Logger -- T.A. Daly / Pennsylvania Places -- Arthur Guiterman / Song of Hate for Eels -- Heredity -- Brief Essay on Man -- Everything in Its Place -- Ben Harney / You've Been a Good Old Wagon, But You've Done Broke Down -- Mister Johnson -- Guy Wetmore Carryl / How a Girl Was Too Reckless of Grammar / The Domineering Eagle and the Inventive Bratling -- Robert Frost / Departmental -- The Hardship of Accounting -- A Considerable speck -- For Travelers Going Sidereal-- Pride of Ancestry -- The Rose Family -- Russell Hillard Loines / On a Magazine Sonnet -- Amy Lowell / The Painted Ceiling -- Epitaph on a Young Poet Who Died Before Having Achieved Success -- Gertrude Stein / Sacred Emily -- Andrew B. Sterling / Under the Anheuser Bush -- What You Goin' To Do When the Rent Comes 'Round? -- Meet Me in St. Louis, Louis -- Anonymous / Mademoiselle from Armentières -- Wallace Irwin / The Constant Cannibal Maiden -- Hughie Cannon / Bill Bailey, Won't You Please Come Home? Anthony Euwer / The True Facts of the Case -- The Face -- Don Marquis / certain maxims of archy -- archy at the zoo -- Carl Sandburg / from \"The People, Yes\" -- Section 32 -- Section 41 -- Section 42 -- On a Flimmering Floom You Shall Ride -- One Modern Poet -- Vachel Lindsay / The Little Turtle -- Two Old Crows -- Jack Norworth / Take Me Out to the Ballgame -- Wallace Stevens / Depression Before Spring -- The Pleasures of Merely Circulating -- Franklin P. Adams (\"F.P.A.\") / Composed in the Composing Room -- Lines Where Beauty Lingers -- The Double Standard -- The Rich Man -- If- -- Witter Bynner / To a President -- Edgar A. Guest / Home -- Lemon Pie -- Sausage -- Joseph W. Stilwell / Lyric to Spring -- William Carlos Williams / To a Poor Old Woman -- Proletarian Portrait -- To -- To Greet a Letter-Carrier -- These Purists -- Ballad of Faith -- Après le Bain -- The Intelligent Sheepman and the New Cars -- Keith Preston / Lapsus Linguae -- Effervescence and Evanescence -- Ring Lardner / Parodies of cole Porter's \"Night and Day\" -- Hardly a man is now alive -- Hail to thee, blithe owl -- Quiescent, a person sits heart and soul -- Abner Silver's \"Pu-leeze! Mr. Hemingway! -- Ezra Pound / An Immorality -- Meditatio -- Tame Cat -- Ancient Music -- Cantico del Sole -- Louis Untermeyer / Song Tournament: New Style -- Edgar A. Guest -- Elinor Wylie / Simon Gerty -- Marianne Moore / I May, I Might, I Must -- Hometown Piece for Messers. Alston and Reese -- W.S. Landor -- T.S. Eliot / Aunt Helen -- Cousin Nancy -- Lines to Ralph Hodgson, Esqre. -- Lines for Cuscuscaraway and Mirza Murad Ali Beg -- Newman Levy / Tannhauser -- Rigoletto -- John Crowe Ransom / Amphibious Crocodile -- Philomela -- Her Eyes -- Our Two Worthies -- Dog -- Survey of Literature -- Conrad Aiken / Obituary in Bitcherel -- There once was a wicked young minister -- Animula vagula blandula -- Sighed a dear little shipboard divinity -- Stoddard King / Hearth and Home -- Breakfast Song in Time of Diet -- The Difference -- Samuel Hoffenstein / Love-Songs, At Once Tender and Informative (I-XXIII) -- Christopher Morley / Elegy Written in a Country Coal-Bin -- Forever Ambrosia -- Archibald MacLeish / Mother Goose's Garland -- Corporate Entity -- The End of the World -- Critical Observations -- Edna St. Vincent Millay / From a Very Little Sphinx (I-VII). Morris Bishop / Gas and Hot Air -- Bishop Orders His Tomb in St. Praxed's -- How To Treat Elves -- Who'd Be a Hero (Fictional)? -- Maxwell Bodenheim / Upper Family -- Dorothy Parker / Comment -- Résumé -- News Item -- One Perfect Rose -- Partial Comfort -- Cole Porter / Anything Goes -- Let's Do It -- My Heart Belongs to Daddy -- You're the Top -- Well, Did You Evah? -- Brush Up Your Shakespeare -- E.E. Cummings / the Cambridge ladies who live in furnished souls -- twentyseven bums give a prostitute the once -- Poem, or Beauty Hurts Mr. Vinal -- slightly before the middle of Congressman Pudd -- my sweet old etcetera -- Q:dwo -- flotsam and jetsam -- a politician is an arse upon -- meet mr universe (who clean ... -- Bessie Smith / Empy Bed Blues -- Oscar Hammerstein II / Kansas City -- Money Isn't Everything! -- There Is Nothin' Like a Dame -- Lorenz Hart / Manhattan -- Mountain Greenery -- The Blue Room -- The Lady Is a Tramp -- The Most Beautiful Girl in the World -- Robert Hillyer / Moo! -- Edmund Wilson / Drafts for a Quatrain -- Something for My Russian Friends -- Ira Gershwin / It Ain't Necessarily So -- Blah, Blah, Blah -- Kenneth Burke / Nursery Rhyme -- Frigate Jones, the Pussyfooter -- Civil Defense -- Know Thyself -- David McCord / The Axolotl -- Gloss -- To a Certain Most Certainly Certain Critic -- Mantis -- Baccalaureate -- History of Education -- Epitaph on a Waiter -- Anonymous / The heavyweight champ of Seattle -- Stephen Vincent Benét / American Names -- Hymn in Columbus Circle -- A Nonsense Song -- Ernest Hemingway / The Ernest Liberal's Lament -- Neo-Thomist Poem -- Valentine -- Vladimir Nabokov / A Literary Dinner -- Ode to a Model -- Billy Rose / Barney Google -- Does the Spearmint Lose Its Flavor on the Bedpost Overnight? -- E.B. White / Marble-Top -- Window Ledge in the Atom Age -- Langston Hughes / Bad Morning -- Wake -- What? -- Little Lyric -- Ennui -- Situation -- Be-Bop Boys -- Hope -- Ogden Nash / Invocation -- Song of the Open Road -- Lines to a World-Famous Poet Who Failed To Complete a World-Famous Poem; or, Come Clean, Mr. Guest! -- The Turtle -- The Panther -- The Rhinoceros -- Genealogical Reflection -- They Don't Speak English in Paris -- Adventures of Isabel -- The Ant -- Reflection on Ice-Breaking -- Countee Cullen / For a Lady I Know -- For a Mouthy Woman. Richard Eberhart / I Went To See Irving Babbitt -- Stanley Kunitz / The Summing-up -- Phyllis McGinley / Publisher's Party -- About Children -- Evening Musicale -- Kenneth Rexroth / Fact -- A Bestiary -- Observations in a Cornish Teashop -- Robert Penn Warren / Man in the Street -- Helen Bevington / Mr. Rockefeller's Hat -- Penguins in the Home -- Mrs. Trollope in America -- W.H. Suden / The Asethetic Point of View -- Henry Adams -- T.S. Eliot -- Theodore Roethke / Academic -- Dinky -- The Cow -- The Sloth -- The Kitty-Cat Bird -- A Rouse for Stevens -- Johnny Mercer / I'm an Old Cowhand -- Jubilation T. Cornpone -- The Glow-worm -- Elder Olson / Childe Roland, etc. -- Peter Devries / Beth Appleyard's Verses -- Loveliest of Pies -- Bacchanal -- Psychiatrist -- Frank Loesser / Guys and Dolls -- J.V. Cunningham / from \"Doctor Drink\" (3 and 4) -- Uncollected Poems and Epigrams -- Richard Harter Fogle / A Hawthorne Garland -- Anonymous / The Virtues of Carnation Milk -- JOhn Berryman / Dream Song #4 -- American Lights, Seen from Off Abroad -- George Hitchock / Three Found Poems -- Randall Jarrell / The Blind Sheep -- William Stafford / Religion Back Home -- Tennessee Williams / Carrousel Time -- Sugar in the Cane -- Kitchen Door Blues -- Gold Tooth Blues -- Reuel Denney / Fixer of Midnight -- John Ciardi / Ballad of the Icondic -- Goodnight -- Dawn of the Space Age -- To a Reviewer Who Admired My Book -- On Evolution -- Peter Viereck / 1912-1952, Full Cycle -- William Jay Smith / Dachshunds -- Random Generation of English Sentences; or, The Revenge of the Poets -- William Cole / Marriage Couplet -- Mutual Problem -- Poor Kid -- Mysterious East -- What a Friend We Have in Chesses! -- Lawrence Ferlinghetti / Underwear -- Max Shulman / Honest Abe Lincoln- -- Howard Nemerov / Epigrams -- Howard Moss / Cats and Dogs -- Alan Dugan / On a Seven-Day Diary -- Anthony Hecht / The Dover Bitch -- Improvisations on Aesop -- Firmness -- From the Grove Press -- Vice -- Norman Mailer / Devils -- Louis Simpson / New Lines for Cuscuscaraway and Mirza Murad Ali Beg -- On the Lawn at the Villa -- Edward Gorey / There was young woman named Plunnery -- Some Harvard men, stalwart and hairy -- The babe, with a cry brief and dismal -- A lady who signs herself \"Vexed\" -- From the bathing machine came a din -- Carolyn Kizer / One to Nothing -- Kenneth Koch / A Poem of the Forty-eight States -- A.R. Ammons / First Carolina Said-Song -- Second Carolina Said-Song -- Auto Mobile -- Chasm -- Needs -- Cleavage -- Coward. Robert Creeley / She Went to Stay -- Ballad of the Despairing Husband -- The Man -- Allen Ginsberg / Bop Lyrics -- Frank O'Hara / To the Film Industry in Crisis -- James Merrill / Tomorrows -- James Wright / Love in a Warm Room in Winter -- Donald Hall / To a Waterfowl -- Professor Gratt -- Breasts -- John Hollander / To the Lady Protrayed by Margaret Dumont -- Heliogabalus -- Last Words -- Appearance and Reality -- Historical Reflections -- No Foundation -- X.J. Kennedy / In a Prominent Bar in Secaucus One Day -- Japanese Beetles -- Last Lines -- Jonathan Williams / The Hermit Cackleberry Brown, on Human Vanity -- Uncle Iv Surveys His Domain from His Rocker of a Sunday Afternoon as Aunt Dory Starts to Chop Kindling -- Mrs. Sadie Grindstaff, Weaver and Factotum, Explains the Work-Principle to the Modern World -- Three Sayings from Highlands, North Carolina -- The Anthropophagites See a Sign on NC Highway 177 That Looks Like Heaven -- John Barth / The Minister's Last Lay (from \"Anonymiad\") -- Gregory Corso / Marriage -- Stephen Sondheim / Gee, Officer Krupke -- George Starbuck / On First Looking in on Blodgett's Keat's \"Chapman's Homer\" -- High Renaissance -- Chip -- Sonnet with a Different Letter at the End of Every Line -- Said (J. Alfred Prufrock) -- Said (Agatha Christie) -- Monarch of the Sea -- John Updike / The Amish -- I Missed His Book, But I Read His Name -- Recital -- Robert Sward American Heritage -- Michael Benedikt / Fate in Incognito -- William Harmon / Bureaucratic Limerick -- Charles Simic / Watermelons -- Roy Blount, Jr. / Against Broccoli -- For the Record -- Gryll's State -- Nikki Giovanni / Master Charge Blues -- Poem for Unwed Mothers -- James Tate / My Great Great Etc. Uncle Patrick Henry -- The President Slumming -- Conjuring Roethke -- Kathleen Norris / Stomach -- Memorandum/The Accountant's Notebook.\nAbstract: A collection of humorous poetry written by Longfellow, Whittier, Holmes, Lowell, Melville, Dickinson, Harte, Field, Frost, Sandburg, Lindsay, Aiken, MacLeish, Nash, and other well-known and lesser-known Americans.\nTime: Geschichte 1700-1975 Geschichte 1750-1977\nGeographic: USA.\nNote(s): Includes index.\nClass Descriptors: LC: PS586; Dewey: 811/.07\nResponsibility: chosen and edited by William Harmon.\nVendor Info: Baker & Taylor Baker and Taylor YBP Library Services (BKTY BTCP YANK) 39.95 Status:             active\nEntry: 19780814\nUpdate: 20110730\nProvider: OCLC",
				"title": "The Oxford book of American light verse",
				"place": "New York",
				"publisher": "Oxford University Press",
				"date": "1979",
				"pages": "540",
				"ISBN": "0195025091",
				"accessionNumber": "OCLC:               4195130",
				"libraryCatalog": "OCLC WorldCat FirstSearch"
			}
		]
	},
	{
		"type": "web",
		"url": "http://newfirstsearch.oclc.org/WebZ/FSFETCH?fetchtype=searchresults:next=html/records.html:bad=error/badfetch.html:resultset=2:format=BI:recno=2:numrecs=10:entitylibrarycount=2874:sessionid=fsapp1-37665-guu7ot6z-6iuxyc:entitypagenum=5:0:sessionid=fsapp1-37665-guu7ot6z-6iuxyc:entitypagenum=5:0",
		"items": "multiple"
	}
]
/** END TEST CASES **/