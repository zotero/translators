{
	"translatorID": "78c29166-3326-4660-92e7-eb1fb1aacda0",
	"label": "SAILDART",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?saildart\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-26 17:34:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


let taglineRe = /perm filename ([^[]+)\[([^,]+),([^\]]+)\](\d*).+filedate ([^\s]+)/;

function detectWeb(doc, _url) {
	let viewFrame = doc.querySelector('frame[name="view"]');
	if (viewFrame) {
		doc = viewFrame.contentWindow.document;
	}
	
	if (taglineRe.test(text(doc, 'div#tagline'))) {
		return "computerProgram";
	}
	
	return false;
}

function doWeb(doc, url) {
	let viewFrame = doc.querySelector('frame[name="view"]');
	if (viewFrame) {
		doc = viewFrame.contentWindow.document;
	}
	
	let item = new Zotero.Item('computerProgram');
	let meta = text(doc, 'div#tagline').match(taglineRe);
	
	let [, title, project, owner, rev, date] = meta;
	item.title = title;
	item.seriesTitle = project;
	item.creators.push(mapUsername(owner));
	item.versionNumber = rev;
	item.date = date; // already in ISO form
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	item.url = url;
	item.company = 'Stanford Artificial Intelligence Laboratory';
	item.archive = 'SAILDART';
	
	item.complete();
}

function mapUsername(username) {
	let mapping = {
		LCS: "Leland Smith",
		JMC: "John McCarthy",
		RWW: "Richard Weyhrauch",
		CLT: "Carolyn Talcott",
		DEK: "Don Knuth",
		LCW: "Curt Widdoes",
		LES: "Les Earnest",
		JAM: "Andy Moorer",
		TVR: "Tovar",
		ZM: "Zohar Manna",
		RFN: "Rosemary F. Napier",
		HPM: "Hans Moravec",
		REM: "Robert Maas",
		FWH: "Friedrich VonHenke",
		RPG: "Richard P. Gabriel",
		JMG: "John Grey",
		TOB: "Tom Binford",
		MUS: "John M. Chowning",
		ME: "Martin Frost",
		GFS: "George Schnurle",
		PN: "Peter Nye",
		SEK: "Scott Kim",
		ALS: "Arthur Samuel",
		ARK: "Arthur Keller",
		AVB: "Andy Bechtolsheim",
		REF: "Bob Filman",
		BGB: "Bruce Baumgart",
		TW: "Terry Winograd",
		MSM: "Shahid Mujtaba",
		KRD: "Randy Davis",
		PAM: "Paul Martin",
		PW: "Paul Wieneke",
		DEW: "David E. Wilkins",
		GHB: "Garrett Bowles",
		DCO: "Derek Oppen",
		EJG: "Erik Gilbert",
		ROD: "Rodney A. Brooks",
		TED: "Ted Panofsky",
		BLF: "Bill Faught",
		DGL: "Garreth Loy",
		MMM: "Mike McNabb",
		YM: "Yonatan Malachi",
		DRB: "David Barstow",
		JK: "Jussi Ketonen",
		REG: "Ralph Gorin",
		RDG: "Russell Greiner",
		WP: "Wolfgang Polak",
		JBR: "Jeff Rubin",
		JLS: "Juan Ludlow",
		BPM: "Brian McCune",
		PMF: "Mike Farmwald",
		PHY: "Phyllis Winkler",
		MUZ: "Loren Rush",
		CG: "Chris Goad",
		JP: "Jorge Phillips",
		JJ: "Jerrold Ginsparg",
		JOS: "Julius Smith",
		DAV: "Dave Smith",
		DCL: "David Luckham",
		DPB: "Denny Brown",
		ARG: "Ron Goldman",
		RBA: "Rosemary Brock",
		LYN: "Lynne Toribara",
		JJC: "John J. Craig",
		SUZ: "Nori Suzuki",
		JJW: "Joe Weening",
		AJT: "Arthur Thomas",
		HHB: "Harlyn Baker",
		JRA: "John Allen",
		JED: "Jim Davidson",
		DBL: "Doug Lenat",
		SMG: "Steven German",
		BH: "Brian Harvey",
		KMC: "Ken Colby",
		DLO: "David Lowe",
		MJC: "Mike Clancy",
		PDQ: "Lynn Quam",
		RHT: "Russ Taylor",
		RKN: "Ram Nevatia",
		JB: "Juan Bulnes-Rozas",
		JJM: "Jorge Morales",
		RCB: "Bob Bolles",
		WD: "Whit Diffie",
		DON: "Don Woods",
		MJH: "Jo Hannah",
		BIS: "Barry Soroka",
		DWP: "Dave Poole",
		TAG: "Tom Gafford",
		FC: "Frederick Chow",
		DBG: "Don Gennery",
		ND: "Nachum Dershowitz",
		BRG: "John Berger",
		BES: "Bruce Shimano",
		RDA: "Dave Arnold",
		ROB: "Robert Poor",
		HYS: "Yung Shen",
		FML: "Frank Liang",
		EK: "Elaine Kant",
		MFB: "Martin Brooks",
		HJS: "Hanan Samet",
		RAK: "Dick Karp",
		MRC: "Mark Crispin",
		NWD: "David Siegel",
		DES: "David Shaw",
		AH: "Annette Herskovits",
		KIC: "Kicha Ganapathy",
		MLM: "Mitch Model",
		JJK: "Jonathan King",
		RV: "Richard Vistnes",
		H: "Jack Holloway",
		EHS: "Bridge Stuart",
		GIO: "Gio Wiederhold",
		PB: "Peter Blicher",
		RF: "Raphael Finkel",
		DBA: "Bruce Anderson",
		JWG: "John Gordon",
		JRL: "Jim Low",
		JC: "John Chowning",
		NJM: "Neil Miller",
		BLB: "Bruce Bullock",
		GLB: "Gianluigi Bellin",
		DRF: "David Fuchs",
		AAM: "Allan A Miller",
		RSF: "Ross Finlayson",
		OK: "Oussama Khatib",
		SJF: "Shel Finkelstein",
		RWG: "Bill Gosper",
		RPH: "Dick Helliwell",
		SL: "Sidney Liebes",
		KIP: "Kip Sheeline",
		ML: "Michael R. Lowry",
		WLS: "Bill Scherlis",
		LIS: "Louis Steinberg",
		JKS: "Ken Salisbury",
		ROZ: "Martin Morf",
		SGK: "Stan Kugell",
		SJG: "Matthew Ginsberg",
		SJW: "Stephen Westfold",
		BIL: "Bill Schottstaedt",
		JFS: "Joachim Schreiber",
		JRD: "Jacques Desarmenie",
		STT: "Steve Tappel",
		BO: "Bo Eross",
		DCS: "Dan Swinehart",
		TM: "Tom McWilliams",
		LTP: "Luis Trabb-Pardo",
		HWC: "Hon Wah Chin",
		DML: "David Levy",
		PMP: "Phil Petit",
		RCP: "Roger Parkison",
		CJR: "Charles Rieger",
		JMS: "John Strawn",
		KS: "Ken Shoemake",
		JDH: "John Hobby",
		RXM: "Rick McWilliams",
		UW: "Bill Menkin",
		LEE: "Dan Lee",
		JOE: "Joe Zingheim",
		YYY: "Yoram Yakimovsky",
		PAT: "Patte Wood",
		TJW: "Todd Wagner",
		RWF: "Robert W. Floyd",
		CGN: "Greg Nelson",
		RSC: "Corky Cartwright",
		PAW: "Patte Wood",
		MWK: "Mark Kahrs",
		MA: "Martin Abadi",
		PTZ: "Polle Zellweger",
		HJL: "Howard Larsen",
		MAS: "Marianne Siroker",
		MLB: "Marc Lebrun",
		VDS: "Vic Scheinman",
		JEG: "Johannes Goebel",
		JRM: "Jan Mattox",
		IAZ: "Ignacio Zabala-Salelles",
		LOU: "Lou Paul",
		AB: "Avron Barr",
		ELM: "Ed McGuire",
		LGC: "Lewis Creary",
		REP: "Richard Pattis",
		NMG: "Neil Goldman",
		CCG: "Cordell Green",
		MFP: "Michael Plass",
		CJS: "Connie Stanley",
		RP: "Robert Poor",
		JRG: "John C. Gilbert",
		FRM: "Dick Moore",
		BRP: "Bruce Pennycook",
		GFF: "Geoff Goodfellow",
		YOM: "Yoram O. Moses",
		LMM: "Larry Masinter",
		BG: "Bill Glassmire",
		MAL: "Malcolm Newey",
		KKP: "Karl Pingle",
		RLD: "Robert Drysdale",
		YAW: "Yorick Wilks",
		DMC: "David M. Chelberg",
		RJB: "Richard Beigel",
		SM: "Scott McGregor"
	};
	
	let fullName = mapping[username];
	if (fullName) {
		return ZU.cleanAuthor(fullName, 'programmer');
	}
	else {
		return {
			lastName: username,
			creatorType: 'programmer',
			fieldMode: 1
		};
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.saildart.org/ERRATA.TEX[TEX,DEK]33",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "ERRATA.TEX",
				"creators": [
					{
						"firstName": "Don",
						"lastName": "Knuth",
						"creatorType": "programmer"
					}
				],
				"date": "1985-04-17",
				"archive": "SAILDART",
				"company": "Stanford Artificial Intelligence Laboratory",
				"libraryCatalog": "SAILDART",
				"seriesTitle": "TEX",
				"url": "https://www.saildart.org/ERRATA.TEX[TEX,DEK]33",
				"versionNumber": "33",
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
	},
	{
		"type": "web",
		"url": "https://www.saildart.org/CRAMM.SAI[PAT,LMM]",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "CRAMM.SAI",
				"creators": [
					{
						"firstName": "Larry",
						"lastName": "Masinter",
						"creatorType": "programmer"
					}
				],
				"date": "1973-09-03",
				"archive": "SAILDART",
				"company": "Stanford Artificial Intelligence Laboratory",
				"libraryCatalog": "SAILDART",
				"seriesTitle": "PAT",
				"url": "https://www.saildart.org/CRAMM.SAI[PAT,LMM]",
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
