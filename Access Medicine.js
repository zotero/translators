{
	"translatorID": "60e55b65-08cb-4a8f-8a61-c36338ec8754",
	"label": "Access Medicine",
	"creator": "Jaret M. Karnuta",
	"target": "^https?://(0-)?accessmedicine\\.mhmedical\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-12-26 19:52:12"
}

function detectWeb(doc, url){
	var citation = doc.getElementById("hfGetCitation");
	if(citation){
		return "bookSection";
	}
}

function doWeb(doc, url){
	var contentType = detectWeb(doc, url);
	if (contentType != "bookSection"){return;}

	//only book section from now on
	var href = doc.location.href.split("/content")[0];
	var sectionId = doc.location.href.split("sectionid=")[1];
	var link = href + "/downloadCitation.aspx?format=ris&sectionid=" + sectionId;

	var chapterSpan = doc.getElementById('pageContent_lblChapterTitle1');
	Zotero.Utilities.doGet(link, function(risText){
		//set RIS import translator
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(risText);
		translator.setHandler("itemDone", function(obj, item) {
			if (chapterSpan) {
				//remove 'chapter' text if present
				var chapterText = chapterSpan.innerHTML.toLowerCase().replace("chapter",'').trim();
				item.notes.push('Chapter: '+chapterText);
			}
			item.attachments.push({
				title: "Snapshot",
				document: doc
			});
			item.complete();
		})
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://accessmedicine.mhmedical.com.ccmain.ohionet.org/content.aspx?bookid=1568&sectionid=95701373",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Sympathomimetics",
				"creators": [
					{
						"lastName": "Trevor",
						"firstName": "Anthony J.",
						"creatorType": "author"
					},
					{
						"lastName": "Katzung",
						"firstName": "Bertram G.",
						"creatorType": "author"
					},
					{
						"lastName": "Kruidering-Hall",
						"firstName": "Marieke",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"abstractNote": "The  sympathomimetics  constitute  a  very  important  group  of  drugs  used  for  cardiovascular,  respiratory,  and  other  conditions.  They  are  readily  divided  into  subgroups  on  the  basis  of  their  spectrum  of  action  (α-,  β-,  or  dopamine-receptor  affinity)  or  mode  of  action  (direct  or  indirect).",
				"bookTitle": "Katzung & Trevor's Pharmacology: Examination & Board Review, 11e",
				"libraryCatalog": "Access Medicine",
				"numberOfVolumes": "Book, Section",
				"place": "New York, NY",
				"publisher": "McGraw-Hill Education",
				"url": "http://mhmedical.com/content.aspx?aid=1123459749",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [
					"Chapter: 9"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://accessmedicine.mhmedical.com.ccmain.ohionet.org/content.aspx?bookid=1130&sectionid=63651344",
		"items": [
			{
				"itemType": "bookSection",
				"title": "The Practice of Medicine",
				"creators": [
					{
						"lastName": "The Editors",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Kasper",
						"firstName": "Dennis",
						"creatorType": "editor"
					},
					{
						"lastName": "Fauci",
						"firstName": "Anthony",
						"creatorType": "editor"
					},
					{
						"lastName": "Hauser",
						"firstName": "Stephen",
						"creatorType": "editor"
					},
					{
						"lastName": "Longo",
						"firstName": "Dan",
						"creatorType": "editor"
					},
					{
						"lastName": "Jameson",
						"firstName": "J. Larry",
						"creatorType": "editor"
					},
					{
						"lastName": "Loscalzo",
						"firstName": "Joseph",
						"creatorType": "editor"
					}
				],
				"date": "2015",
				"bookTitle": "Harrison's Principles of Internal Medicine, 19e",
				"libraryCatalog": "Access Medicine",
				"numberOfVolumes": "Book, Section",
				"place": "New York, NY",
				"publisher": "McGraw-Hill Education",
				"url": "http://mhmedical.com/content.aspx?aid=1120785046",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [
					"Chapter: 1"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://accessmedicine.mhmedical.com.ccmain.ohionet.org/content.aspx?bookid=980&sectionid=59610885",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Orthopedic Surgery",
				"creators": [
					{
						"lastName": "Thomas",
						"firstName": "Bert J.",
						"creatorType": "author"
					},
					{
						"lastName": "Fu",
						"firstName": "Freddie H.",
						"creatorType": "author"
					},
					{
						"lastName": "Muller",
						"firstName": "Bart",
						"creatorType": "author"
					},
					{
						"lastName": "Vyas",
						"firstName": "Dharmesh",
						"creatorType": "author"
					},
					{
						"lastName": "Niesen",
						"firstName": "Matt",
						"creatorType": "author"
					},
					{
						"lastName": "Pribaz",
						"firstName": "Jonathan",
						"creatorType": "author"
					},
					{
						"lastName": "Draenert",
						"firstName": "Klaus",
						"creatorType": "author"
					},
					{
						"lastName": "Brunicardi",
						"firstName": "F. Charles",
						"creatorType": "editor"
					},
					{
						"lastName": "Andersen",
						"firstName": "Dana K.",
						"creatorType": "editor"
					},
					{
						"lastName": "Billiar",
						"firstName": "Timothy R.",
						"creatorType": "editor"
					},
					{
						"lastName": "Dunn",
						"firstName": "David L.",
						"creatorType": "editor"
					},
					{
						"lastName": "Hunter",
						"firstName": "John G.",
						"creatorType": "editor"
					},
					{
						"lastName": "Matthews",
						"firstName": "Jeffrey B.",
						"creatorType": "editor"
					},
					{
						"lastName": "Pollock",
						"firstName": "Raphael E.",
						"creatorType": "editor"
					}
				],
				"date": "2014",
				"abstractNote": "The  main  principle  of  internal  fixation  for  fracture  care  (most  commonly  intramedullary  nails  or  plate  and  screw  fixation)  is  to  create  a  stable  construct  that  will  allow  the  fracture  to  heal  in  proper  alignment.Often,  in  open  fractures,  definitive  treatment  of  the  fracture  is  delayed  until  the  wound  is  sufficiently  cleaned  and  healthy  soft  tissue  is  available  to  cover  the  fracture.When  compartment  syndrome  is  suspected,  emergent  fasciotomy  must  be  performed  in  which  the  overlying  tight  fascia  is  released  through  long  incisions.  These  must  be  done  as  soon  as  possible  because  the  damage  to  muscles  and  nerves  will  result  in  irreversible  necrosis  and  contractures  causing  severe  loss  of  function.Fractures  of  the  scapula  often  result  from  significant  trauma  and  can  be  associated  with  injuries  to  the  head,  lungs,  ribs,  and  spine.The  shoulder  is  one  of  the  most  commonly  dislocated  joints  and  most  dislocations  are  anterior.  Posterior  dislocations  are  associated  with  seizures  or  electric  shock.Humeral  shaft  fractures  occur  from  direct  trauma  to  the  arm  or  from  a  fall  on  an  outstretched  arm,  especially  in  elderly  patients.  The  radial  nerve  spirals  around  the  humeral  shaft  and  is  at  risk  for  injury,  therefore  a  careful  neurovascular  exam  is  important.Hemorrhage  from  pelvic  trauma  can  be  life  threatening.  An  important  first  line  treatment  in  the  emergency  room  is  the  application  of  a  pelvic  binder  or  sheet  that  is  wrapped  tightly  around  the  pelvis  to  control  bleeding.In  spinal  injury  spinal  stability  must  be  assessed,  and  the  patient  immobilized  until  his  spine  is  cleared.  CT  scan  is  more  reliable  in  assessing  spine  injury  than  plain  radiographs.Spinal  cord  injuries  should  be  triaged  to  trauma  centers  since  trauma  center  care  is  associated  with  reduced  paralysis.According  to  the  CDC  and  the  National  Health  Interview  Survey  approximately  50  million  adults  (22%  of  the  US  population)  have  been  diagnosed  with  some  form  of  arthritis.  This  number  is  projected  to  grow  to  an  astounding  67  million  adults  by  2030  (or  25%  of  the  U.S.  population).Weight  loss  of  as  little  as  11  pounds  has  been  shown  to  decrease  the  risk  of  developing  knee  osteoarthritis  in  women  by  50%.  Similarly,  patients  who  engage  in  regular  physical  activity  have  been  found  to  have  lower  incidence  of  arthritis.Smaller  incisions  come  with  the  disadvantage  of  decreased  visualization  intra-operatively  and  associated  risks  of  component  malposition,  intraoperative  fracture  and  nerve  or  vascular  injury.  The  only  documented  benefit  of  minimally  invasive  techniques  appears  to  be  improved  cosmesis.",
				"bookTitle": "Schwartz's Principles of Surgery, 10e",
				"libraryCatalog": "Access Medicine",
				"numberOfVolumes": "Book, Section",
				"place": "New York, NY",
				"publisher": "McGraw-Hill Education",
				"url": "http://mhmedical.com/content.aspx?aid=1117754305",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [
					"Chapter: 43"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
