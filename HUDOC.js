{
	"translatorID": "d541622d-09c3-4e20-b010-c506b2d01151",
	"label": "HUDOC",
	"creator": "Jonas Skorzak",
	"target": "https?:\\/\\/hudoc\\.echr\\.coe\\.int.*",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-03-16 11:58:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 JONAS SKORZAK
	
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

/* 

TODO:
- Handle friendly settlements (the addition to the case name)
- Handle more than judgments or decisions (summaries, translations, search results)
- Handle reports
- Handle resolutions and advisory opinions properly (esp. title)
- Handle different types of documents via the API.
- Use keywords for tags
- Use references to create "related" entries if they exist
- Put in short titles

=> All relate to one thing: This translator is currently unable to access the API
to query it for the taxonomies/thesauruses used for decision type ("typedescription"),
decision-making body ("originatingbody"), keywords ("kpthesaurus"), ...
Check compiled.js on the HUDOC website in order to learn how to query these aspects.
Search for "// ###..//sites/echr/echr.js ###"" in compiled.js to find most API fields. 

*/

function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}
function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}

//Scrapes some metadata from the document
//TODO: integrate function into scrape
function scrapeMetaData(doc, detail) { //Only scrapes the header of the main page
	switch (detail) {
		case "appno": return text(doc, "span.column01");
		case "typedescription": return text(doc, "span.column02");
		case "originatingbody": return text(doc, "span.column03");
		case "judgementdate": return text(doc, "span.column04");
		default: return null;
	}
}

//Gets the itemid of the document
function getItemID(url) {
	var url_regex = /%22itemid%22:\[%22([\d-]*)%22]|\?i=([\d-]*)/i;
	var id = url.match(url_regex);
	Zotero.debug(id);
	return id[1];
}

//Adds the type of judgment at the end of the name
function getTypeBit(doc, url) { //TODO: Switch to 'url' once we use the API instead
	var description = scrapeMetaData(doc, "typedescription");

	if (description.includes("Judgment")) {
		if (description.includes("Just Satisfaction") && !description.includes("Merits")) {
			return " (just satisfaction)";
		} else
		if (description.includes("Objection") || description.includes("Jurisdiction")) {
			return " (preliminary objections)";
		} else
		if (description.includes("Struck out")) {
			return " (striking out)";
			//var conclusion = ""/*queryMetaData(url, "conclusion")*/; //FIXME
			//if (conclusion.includes("friendly settlement")) {
			//	return " (friendly settlement)";
			//} else {
			//	return " (striking out)";
			//}
		} else
		if (description.includes("Interpretation")) {
			return " (interpretation)";
		} else
		if (description.includes("Revision")) {
			return " (revision)";
		} else {
			return "";
		}
	} else
	if (description.includes("Decision")) {
		return " (dec.)";
	} else
	if (description.includes("Communicated")) {
		return " (communicated)"; //TODO: Check if correct
	} else
	//if (description.includes("Report")) {
	//	return ""; //Currently only in here because it is one of the document types. But reports are a different Zotero type
	//} else
	if (description.includes("Revision")) {
		return " (dec. on revision)"; //TODO: Check if correct
	} else
	if (description.includes("Res-")) {
		return " (resolution)"; //TODO: Check if correct, maybe different Zotero type?
	} else {
		return "";
	}
}

//Downloads the legal summary in HUDOC
function getLegalSummary(item, appno) {
	//A bit hacky. Should probably query kpdate and then convert it
	var kpdate = item.dateDecided.replace(/(..).(..).(....)/, "$3-$2-$1");
	
	var appno_string = appno.join(" AND appno:");
	
	//Save the French version if user visited the French version of the judgment
	if (item["language"] == "fre") {
		var doctype_string = "doctype:CLINF";
	} else {
		var doctype_string = "doctype:CLIN";
	}
	
	var summary_url = "https://hudoc.echr.coe.int/app/query/results?query=contentsitename=ECHR "
						+ appno_string + " AND "
						+ doctype_string + " AND "
						+ "(kpdate=\"" + kpdate + "\")"
						+ "&select=itemid"
						+ "&sort=&start=0&length=500";
	
	Zotero.debug("Getting id of legal summary at: " + summary_url);
	
	//Request id of legal summary
	ZU.doGet(summary_url, function(json) {
		json = JSON.parse(json);
		
		if (json["resultcount"] == 1) {
			text_url = "https://hudoc.echr.coe.int/app/conversion/docx/html/body?library=ECHR&id="
						+ json["results"][0]["columns"]["itemid"];
			
			Zotero.debug("Getting text of legal summary at: " + text_url);
			
			//Request text of legal summary
			ZU.doGet(text_url, function(text) {
				text = text.replace(/<style>[\s\S]*<\/style>/, "");

				item.notes.push({
					title: "HUDOC Legal Summary",
					note: "<h1> HUDOC Legal Summary </h1> </br>" + text
				});
				
				item.complete();
			}); 
			
		} else {
			item.complete();	
		}
	});
}

function detectWeb(doc, url) {
	// TODO: adjust the logic here
	/*if (!(url.includes('?=i') || url.includes('itemid'))) {
	return "multiple";
	}*/
	
	Zotero.monitorDOMChanges(doc.querySelector("#notification div"), {attributes: true, attributeFiler: ["style"]});

	var doc_type = scrapeMetaData(doc, "typedescription");

	if ((doc_type.includes("Judgment") 
	|| doc_type.includes("Decision") 
	|| doc_type.includes("Advisory Opinion")
	|| doc_type.includes("Res-")
	|| doc_type.includes("Communicated")) 
	&& !text(doc, "title").toLowerCase().includes("translation]")) { //Exclude translations. toLowerCase() is added because "translation" is sometimes capitalized
		return "case";
	}
	
	return false;
	
	/*
	if (url.includes('/article/')) {
	return "newspaperArticle";
	} else
	if (getSearchResults(doc, true)) {
	return "multiple";
	}
	return false; */
}

/*function getSearchResults(doc, checkOnly) {
  var items = {};
  var found = false;
  // TODO: adjust the CSS selector
  var rows = doc.querySelectorAll('h2>a.title[href*="/article/"]');
  for (let row of rows) {
	// TODO: check and maybe adjust
	let href = row.href;
	// TODO: check and maybe adjust
	let title = ZU.trimInternal(row.textContent);
	if (!href || !title) continue;
	if (checkOnly) return true;
	found = true;
	items[href] = title;
  }
  return found ? items : false;
} */

function doWeb(doc, url) {
  /*if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, false), function (items) {
	  if (items) ZU.processDocuments(Object.keys(items), scrape);
	});
  } else
  {
	scrape(doc, url);
  }*/
  if (detectWeb(doc, url) == "case") {
  	scrapeDecision(doc, url);
  }
}

function scrapeDecision(doc, url) { //Works for both Court judgments and decisions
	var item = new Zotero.Item("case");
	
	//Title
	var cap_title = ZU.capitalizeTitle(text(doc, "title").toLowerCase(), true)
	
	//If title already contains the type, remove it. Adv. opinions contain number in brackets though
	if (!scrapeMetaData(doc, "typedescription").includes("Advisory Opinion")) {
		cap_title = cap_title.split("(")[0]; 
	}
					
	//Zotero capitalizes the "v."/"c.", so we need to correct that for English and French cases
	if (cap_title.includes(" V. ")) {
		cap_title = cap_title.replace(" V. ", " v. ");
	} else
	if (cap_title.includes(" C. ")) {
		cap_title = cap_title.replace(" C. ", " c. ");
	}
	item.caseName = cap_title + getTypeBit(doc, url);
	
	//Court and Author
	//FIXME: Unsure if author should be listed like this or rather get removed 
	var court = scrapeMetaData(doc, "originatingbody");
	
	if (court != null) { //Advisory opinions have no "originatingbody" listed
		item.creators.push({lastName:court.replace("Court", "ECtHR"), creatorType:"author"});
	
		if (court.includes("Grand Chamber")) {
			item.court = "ECtHR [GC]";
		} 
		if (court.includes("Commission")) {
			item.court = "Commission";
		}
		if (court == "Committee of Ministers") {
			item.court = "Committee of Ministers";
		} else {
			item.court = "ECtHR";
		}
	} else { //All Advisory Opinions (so far) are decided by the GC
		item.creators.push({lastName:"ECtHR (Grand Chamber)", creatorType:"author"});
		item.court = "ECtHR [GC]";
	}
	
	//Date of decision
	//Ensure dd.mm.yyyy. Unsure if Zotero interprets a date with slashes differently in US locals.
	item.dateDecided = scrapeMetaData(doc, "judgementdate").replace(/\//g, ".");
	
	item.url = "http://hudoc.echr.coe.int/eng?i=" + getItemID(url);
	
	//Query remaining metadata from API
	var query_url =  "https://hudoc.echr.coe.int/app/query/results?query=(contentsitename=ECHR) AND " 
					+ getItemID(url) 
					+ "&select=appno,conclusion,docname,languageisocode" //Adapt based on what is needed
					+ "&sort=&start=0&length=1";
	
	ZU.doGet(query_url, function(json) {
		json = JSON.parse(json)["results"][0]["columns"];
		
		Zotero.debug("Queried HUDOC API at: " + query_url + "\n\n Result:\n");
		Zotero.debug(json);
		
		//Application numbers
		//FIXME: Decide whether to prepend "app. no.". Some styles automatically add "no." (Chicago)
		//while most others do not (OSCOLA, APA).
		var appno = json["appno"].split(";");
		if (appno.toString().length !== 0) { //Only if not empty
			if (appno.length > 1) {
				var length = appno.length;
				var comma_part = appno.slice(0, length-1);
				var appnos = comma_part.join(", ") + " and " + appno[length-1].toString();
				
				item.docketNumber = "app. nos. " + appnos;
			} else {
				item.docketNumber = "app. no. " + appno;
			}
		}
		
		//Abstract
		item.abstractNote = json["conclusion"].replace(/;/g, "; ");
		
		//Language 
		item["language"] = json["languageisocode"].toLowerCase();
		
		//Download PDF
		var docname = json["docname"];

		var pdfurl = "https://hudoc.echr.coe.int/app/conversion/docx/pdf?library=ECHR&id=" 
					+ getItemID(url) + "&filename=" + docname + ".pdf";
		
		pdfurl = encodeURI(pdfurl); //the "docname" may contain chars not part of the URI schema
		
		Zotero.debug("Getting PDF at: " + pdfurl);
				
		item.attachments.push({
			title: item.caseName + " PDF",
			mimeType: "application/pdf",
			url: pdfurl
		});
		
		//Download Legal Summary
		if (appno.length !== 0) { //without app. nos. we can't find a legal summary
			getLegalSummary(item, appno);
		} else {
			item.complete();
		}
	});
	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://hudoc.echr.coe.int/eng#{%22fulltext%22:[%22varnava%22],%22itemid%22:[%22001-94162%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Varnava and Others v. Turkey",
				"creators": [
					{
						"lastName": "ECtHR (Grand Chamber)",
						"creatorType": "author"
					}
				],
				"dateDecided": "18.09.2009",
				"abstractNote": "Preliminary objections dismissed (substantially the same, disappearance of object of proceedings, ratione temporis, six month period); Violation of Art. 2 (procedural aspect); Violation of Art. 3 (substantive aspect); Violation of Art. 5; No violation of Art. 5; Non-pecuniary damage - award",
				"court": "ECtHR",
				"docketNumber": "app. nos. 16064/90, 16065/90, 16066/90, 16068/90, 16069/90, 16070/90, 16071/90, 16072/90 and 16073/90",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-94162",
				"attachments": [
					{
						"title": "Varnava and Others v. Turkey PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p class='s50C0B1C7'><span class='s3AEEAB2'>Information Note on the Court’s case-law No. 122</span></p><p class='s68AFA200'><span class='sFBBFEE58'>August-September 2009</span></p><p class='s6E50BD9A'><span class='s38C10080'>Varnava and Others v. Turkey [GC]</span><span class='s7D2086B4'> - 16064/90, 16065/90, 16066/90 et al.</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Judgment 18.9.2009 [GC]</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 2</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Positive obligations</span></p><p class='s41684895'><span class='sDFC50A6A'>Article 2-1</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Effective investigation</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Failure to conduct effective investigation into fate of Greek Cypriots missing since Turkish military operations in northern Cyprus in 1974: </span><span class='s1A844BC0'>violation</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 3</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Inhuman treatment</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Silence of authorities in face of real concerns about the fate of Greek Cypriots missing since Turkish military operations in northern Cyprus in 1974: </span><span class='s1A844BC0'>violation</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 5</span></p><p class='s41684895'><span class='sDFC50A6A'>Article 5-1</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Liberty of person</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Failure to conduct effective investigation into arguable claim that missing Greek Cypriots may have been detained during Turkish military operations in northern Cyprus in 1974: </span><span class='s1A844BC0'>violation</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 35</span></p><p class='s41684895'><span class='sDFC50A6A'>Article 35-1</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Six month period</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Application in disappearance case lodged more than six months after the respondent State’s ratification of the right of individual petition: </span><span class='s1A844BC0'>preliminary objection dismissed</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s41684895'><span class='sDFC50A6A'>Article 35-2</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Same as matter already examined</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Court’s jurisdiction where it had already examined case concerning substantially same facts in an inter-State case: </span><span class='s1A844BC0'>preliminary objection dismissed</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s41684895'><span class='sDFC50A6A'>Article 35-3</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Ratione temporis</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Court's temporal jurisdiction in respect of disappearances that had occurred some thirteen years before the respondent State recognised the right of individual petition: </span><span class='s1A844BC0'>preliminary objection dismissed</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s6C429373'><span class='s1A844BC0'>Facts</span><span class='sFBBFEE58'> – The applicants were relatives of nine Cypriot nationals who disappeared during Turkish military operations in northern Cyprus in July and August 1974. The facts were disputed. Eight of the missing men were members of the Greek-Cypriot forces and it is alleged by the applicants that they disappeared after being captured and detained by Turkish military forces. Witnesses had testified to seeing them in Turkish prisons in 1974 and some of the men were identified by their families from photographs of Greek-Cypriot prisoners of war that were published in the Greek press. The Turkish Government denied that the men had been taken into captivity by Turkish forces and maintained that they had died in action during the conflict. The ninth missing man, Mr Hadjipanteli, was a bank employee. The applicants alleged that he was one of a group of people taken by Turkish forces for questioning in August 1974 and who had been missing ever since. His body was discovered in 2007 in the context of the activity of the United Nations Committee of Missing Persons in Cyprus (CMP). The CMP was set up in 1981 with the task of drawing up comprehensive lists of missing persons on both sides and specifying whether they were alive or dead. It has no power to attribute responsibility or to make findings as to the cause of death. Mr Hadjipanteli’s remains were exhumed from a mass grave near a Turkish-Cypriot village. A medical certificate indicated that he had received bullet wounds to the skull and right arm and a wound to the right thigh. The Turkish Government denied he had been taken prisoner, noting that his name was not on the list of Greek Cypriots held in the alleged place of detention, which had been visited by the International Red Cross.</span></p><p class='s6C429373'><span class='sFBBFEE58'>In a judgment of 10 January 2008 (see Information Note no. 104) a Chamber of the Court held that there had been continuing procedural violations of Articles 2 and 5, and a violation of Article 3. It found no substantive violation of Article 5.</span></p><p class='s6C429373'><span class='s1A844BC0'>Law</span></p><p class='s6C429373'><span class='sFBBFEE58'>(a)  </span><span class='s1A844BC0'>Preliminary objections</span><span class='sFBBFEE58'> – The respondent Government challenged the Court’s jurisdiction to examine the case on several counts. Firstly, they submitted that there was no legal interest in determining the applications as the Court had already decided the question of the disappearances of all missing Greek Cypriots in the fourth inter-State case (</span><span class='s1A844BC0'>Cyprus v. Turkey</span><span class='sFBBFEE58'> [GC], no. 25781/94, 10 May 2001, Information Note no. 30). Secondly, the applications fell outside the Court’s temporal jurisdiction as the missing men had to be presumed to have died long before Turkey’s acceptance of the right of individual petition on 28 January 1987 and there could be no freestanding procedural obligation, divorced from the factual origin of the complaints. In any event, the procedural obligation under Articles 2 and 3 was a recent jurisprudential development and could not be regarded as binding the States beforehand. Lastly, the applications had been lodged on 25 January 1990, more than six months after Turkey’s acceptance of the right to individual petition, and so were out of time.</span></p><p class='s6C429373'><span class='sFBBFEE58'>(i)  </span><span class='s1A844BC0'>Legal interest</span><span class='sFBBFEE58'>: For the purposes of Article 35 § 2 (b) of the Convention, an application was only “substantially the same” as another which had already been examined if it concerned substantially not only the same facts and complaints but was introduced by the same persons. An inter-State application did not, therefore, deprive individual applicants of the possibility of introducing, or pursuing, their own claims. As to the question whether the applications should be struck from the Court’s list under Article 37 § 1 (c), the findings in the fourth inter-State case had not specified in respect of which individual missing persons they were made. Moreover, in individual applications, the Court had the competence to issue just satisfaction awards to individual applicants and to indicate measures under Article 46. A legal interest therefore remained in pursuing the examination of the applications.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: preliminary objection dismissed (sixteen votes to one).</span></p><p class='s6C429373'><span class='sFBBFEE58'>(ii)  </span><span class='s1A844BC0'>Temporal jurisdiction</span><span class='sFBBFEE58'>: The procedural obligation to carry out an investigation into deaths under Article 2 had evolved into a separate and autonomous duty and could be considered a “detachable obligation” capable of binding the State even when the death took place before the entry into force of the Convention (see </span><span class='s1A844BC0'>Šilih v. Slovenia</span><span class='sFBBFEE58'> [GC], no. 71463/01, 9 April 2009, Information Note no. 118). It was immaterial that that procedural obligation had only developed in the Court’s case-law after Turkey’s acceptance of the right of individual petition as case-law was a means of clarifying pre-existing texts to which the principle of non-retroactivity did not apply in the same manner as to legislative enactments.</span></p><p class='s6C429373'><span class='sFBBFEE58'>As to the argument that the missing men had to be presumed dead long before any temporal jurisdiction had arisen in 1987, the Court distinguished between the making of a factual presumption and the legal consequences that flowed from it. The procedural obligation to investigate disappearances in life-threatening circumstances could hardly come to an end on discovery of the body or the presumption of death as an obligation to account for the disappearance and death, and to identify and prosecute any perpetrator of unlawful acts, would generally remain. Accordingly, even though a lapse of over thirty-four years without any news could provide strong circumstantial evidence of intervening death, this did not remove the procedural obligation to investigate.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Further, there was an important distinction to be drawn between the obligation to investigate a suspicious death and the obligation to investigate a suspicious disappearance. A disappearance was a distinct phenomenon, characterised by an ongoing situation of uncertainty and unaccountability in which there was a lack of information or even a deliberate concealment and obfuscation of what had occurred. It was not an “instantaneous” act or event; the additional distinctive element of subsequent failure to account for the whereabouts and fate of the missing person gave rise to a continuing situation, with the procedural obligation potentially persisting as long as the fate of the missing person was unaccounted for, even where death was presumed. In that connection, the requirement for proximity of the death and investigative steps to the date of entry into force of the Convention (see </span><span class='s1A844BC0'>Šilih</span><span class='sFBBFEE58'>) applied only in the context of killings or suspicious deaths.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: preliminary objection dismissed (sixteen votes to one).</span></p><p class='s6C429373'><span class='sFBBFEE58'>(iii)  </span><span class='s1A844BC0'>Six-month rule</span><span class='sFBBFEE58'>: Applicants in disappearance cases had to make proof of a certain amount of diligence and initiative and introduce their complaints without undue delay. While the standard of expedition expected of relatives should not be too rigorous in view of the serious nature of disappearance offences, applications could be rejected where there had been excessive or unexplained delay by applicants who were, or should have been, aware that no investigation had been instigated or that it had lapsed into inaction or become ineffective and that there was no immediate, realistic prospect of an effective investigation in the future. When that stage was reached depended on the circumstances of the particular case.</span></p><p class='s6C429373'><span class='sFBBFEE58'>In the exceptional circumstances of the instant case, which involved an international conflict with no normal investigative procedures available, it had been reasonable for the applicants to await the outcome of the Government and United Nations initiatives, as these could have resulted in steps being taken to investigate known sites of mass graves and provided the basis for further measures. While it must have been apparent by the end of 1990 that those processes no longer offered any realistic hope of progress in either finding bodies or accounting for the fate of their relatives in the near future, the applicants had applied to the Court in January of that year. Accordingly, they had, in the special circumstances of the case, acted with reasonable expedition.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: preliminary objection dismissed (fifteen votes to two).</span></p><p class='s6C429373'><span class='sFBBFEE58'>(b)  </span><span class='s1A844BC0'>Merits</span></p><p class='s6C429373'><span class='sFBBFEE58'>Article 2: The Court was satisfied that there was an at least arguable case that the missing men had last been seen in an area under, or about to come under, the control of the Turkish armed forces. Whether they had died or been taken prisoner, those men still had to be accounted for. Article 2 had to be interpreted in so far as possible in the light of the general principles of international law, including the rules of international humanitarian law, which played an indispensable and universally-accepted role in mitigating the savagery and inhumanity of armed conflict. In a zone of international conflict Contracting States were under obligation to protect the lives of those not, or no longer, engaged in hostilities. That obligation also extended to the provision of medical assistance to the wounded, the proper disposal of remains and the provision of information on the identity and fate of those concerned. The respondent Government had not produced any evidence or convincing explanation to counter the applicants’ claims that the missing men had disappeared in areas under the former’s exclusive control. As the disappearances had occurred in life-threatening circumstances where the conduct of military operations was accompanied by widespread arrests and killings, Article 2 imposed a continuing obligation on the respondent Government to account for the missing men’s whereabouts and fate.</span></p><p class='s6C429373'><span class='sFBBFEE58'>On the question of compliance with that obligation, the Court fully acknowledged the importance of the CMP’s ongoing exhumations and identifications of remains and gave full credit to the work being done in providing information and returning remains to relatives. It noted, however, that while the CMP’s work was an important first step in the investigative process, it was not sufficient to meet the Government’s obligation under Article 2 to carry out effective investigations. From the materials provided in respect of one of the missing men, Mr Hadjipanteli, it appeared that the procedure on identification of remains was to issue a medical certificate of death, briefly indicating the fatal injuries. There was, however, no report analysing the circumstances or even the dating of death and no investigative measures to locate or question witnesses. Thus, even though the location of the body had been established it could not be said that any clear light had been shed on how the victim had met his fate.</span></p><p class='s6C429373'><span class='sFBBFEE58'>While recognising the considerable difficulty in assembling evidence and mounting a case so long after the events, the Court reiterated that to be effective an investigation had to be capable of leading to a determination of whether the death was caused unlawfully and, if so, to the identification and punishment of those responsible. There was no indication that the CMP had gone beyond its limited terms of reference and no other body or authority had taken on the role of determining the facts or collecting and assessing evidence with a view to a prosecution. While an investigation might prove inconclusive, such an outcome was not inevitable and the respondent Government could not be absolved from making the requisite efforts. The fact that both sides in the conflict may have preferred a “politically-sensitive” approach and that the CMP with its limited remit was the only solution which could be agreed under the brokerage of the UN could have no bearing on the application of the Convention. There had thus been a continuing failure to effectively investigate the fate of the nine missing men.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: continuing procedural violation (sixteen votes to one).</span></p><p class='s6C429373'><span class='sFBBFEE58'>Article 3: The Court found no reason to differ from its finding in the fourth inter-State case that the Turkish authorities’ silence in the face of the real concerns of the applicants over the fate of their missing relatives could only be categorised as inhuman treatment.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: continuing violation (sixteen votes to one).</span></p><p class='s6C429373'><span class='sFBBFEE58'>Article 5: There was an arguable case that two of the missing men, both of whom had been included on International Red Cross lists as detainees, had last been seen in circumstances falling within the control of the Turkish or Turkish-Cypriot forces. However, the Turkish authorities had not acknowledged their detention, nor had they provided any documentary evidence giving official trace of their movements. While there had been no evidence that any of the missing persons had been in detention in the period under the Court’s consideration, the Turkish Government had to show that they had carried out an effective investigation into the arguable claim that the two missing men had been taken into custody and had not been seen subsequently. The Court’s findings above in relation to Article 2 left no doubt that the authorities had also failed to conduct the necessary investigation in that regard.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: continuing violation in respect of two of the missing men (sixteen votes to one).</span></p><p class='s6C429373'><span class='sFBBFEE58'>Article 41: EUR 12,000 in respect of non-pecuniary damage to each of the applicants, in view of the grievous nature of the case and decades of uncertainty the applicants had endured. The Court explained that it did not apply specific scales of damages to awards in disappearance cases, but was guided by equity, which involved flexibility and an objective consideration of what was just, fair and reasonable in all the circumstances.</span></p><p class='s9B5FF181'><span class='sFBBFEE58'>&#xa0;</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>© Council of Europe/European Court of Human Rights</span><br /><span class='sFBBFEE58'>This summary by the Registry does not bind the Court.</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>Click here for the </span><a href=\"http://www.echr.coe.int/ECHR/EN/Header/Case-Law/Case-law+analysis/Information+notes/\"><span class='s54939A00'>Case-Law Information Notes</span></a></p><p class='s6090DB7C'><span class='sFBBFEE58'>&#xa0;</span></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hudoc.echr.coe.int/eng#{%22fulltext%22:[%22loizidou%22],%22itemid%22:[%22001-57920%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Loizidou v. Turkey  (preliminary objections)",
				"creators": [
					{
						"lastName": "ECtHR (Grand Chamber)",
						"creatorType": "author"
					}
				],
				"dateDecided": "23.03.1995",
				"abstractNote": "Question of procedure rejected (locus standi of the applicant Government); Preliminary objection rejected (abuse of process); Preliminary objection rejected (ratione loci); Preliminary objection joined to merits (ratione temporis)",
				"court": "ECtHR",
				"docketNumber": "app. no. 15318/89",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-57920",
				"attachments": [
					{
						"title": "Loizidou v. Turkey  (preliminary objections) PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p class='s7D81CFEF'><span class='sFBBFEE58'>Information Note on the Court’s case-law No.</span></p><p class='s68AFA200'><span class='sFBBFEE58'>March 1995</span></p><p class='s6E50BD9A'><span class='s38C10080'>Loizidou v. Turkey (preliminary objections)</span><span class='s7D2086B4'> - 15318/89</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Judgment 23.3.1995</span><span class='sFBBFEE58'> [GC]</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 1</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Jurisdiction of states</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Jurisdiction of Turkey in case concerning access to property in northern Cyprus</span></p><p class='s440D9021'><span class='s7D2086B4'>Article</span><span class='s7D2086B4'> 35</span></p><p class='s41684895'><span class='sDFC50A6A'>Article 35-3</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Ratione temporis</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Restrictions </span><span class='s1A844BC0'>ratione temporis</span><span class='sFBBFEE58'> des déclarations turques relatives à la Convention: </span><span class='s1A844BC0'>preliminary objection joined to the merits</span></p><p class='s6C429373'><span class='sFBBFEE58'>[This summary is extracted from the Court’s official reports (Series A or Reports of Judgments an</span><span class='sFBBFEE58'>d Decisions). Its formatting and structure may therefore differ from the Case-Law Information Note summaries.]</span></p><p class='s6C429373'><span class='sDFC50A6A'>I.</span><span class='s1DD7F6F8'></span><span class='sDFC50A6A'>STANDING OF THE APPLICANT GOVERNMENT</span></p><p class='s6C429373'><span class='sFBBFEE58'>The applicant Government have been recognised by the international community as the Government of the Rep</span><span class='sFBBFEE58'>ublic of Cyprus.  </span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: their </span><span class='s1A844BC0'>locus standi</span><span class='sFBBFEE58'> as the Government of a High Contracting Party not in doubt.</span></p><p class='s6C429373'><span class='sDFC50A6A'>II.</span><span class='sE295097F'></span><span class='sDFC50A6A'>ALLEGED ABUSE OF PROCESS</span></p><p class='s6C429373'><span class='sFBBFEE58'>Since objection not raised before the Commission the Turkish Government is estopped from raising it before the Court </span><span class='sFBBFEE58'>in so far as it applies to the applicant.</span></p><p class='s6C429373'><span class='sFBBFEE58'>In so far as objection is directed to the applicant Government, the Court notes that this Government have referred the case to the Court </span><span class='s1A844BC0'>inter alia</span><span class='sFBBFEE58'> because of concern for the rights of the applicant and other citiz</span><span class='sFBBFEE58'>ens in the same situation.  Such motivation not an abuse of Court's procedures.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: objection rejected (unanimously).</span></p><p class='s6C429373'><span class='sDFC50A6A'>III.</span><span class='s387644B4'></span><span class='sDFC50A6A'>THE TURKISH GOVERNMENT'S ROLE IN THE PROCEEDINGS</span></p><p class='s6C429373'><span class='sFBBFEE58'>Not within the discretion of a Contracting Party to characterise its standin</span><span class='sFBBFEE58'>g in the proceedings before the Court in the manner it sees fit.  Case originates in a petition made under Article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>25 against Turkey in her capacity as a High Contracting Party and has been referred to the Court under Article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>48</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>(b) by another High Contrac</span><span class='sFBBFEE58'>ting Party.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: Turkey is the respondent party in this case.</span></p><p class='s6C429373'><span class='sDFC50A6A'>IV.</span><span class='sA77BBFA2'></span><span class='sDFC50A6A'>SCOPE OF THE CASE</span></p><p class='s6C429373'><span class='sFBBFEE58'>The applicant Government have confined themselves to seeking a ruling on the complaints under Article 1 of Protocol No. 1 and Article 8, in so far as they have been </span><span class='sFBBFEE58'>declared admissible by the Commission, concerning access to the applicant's property.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Not necessary to give a general ruling on the question whether it is permissible to limit a referral to the Court to some of the issues on which the Commission has stated</span><span class='sFBBFEE58'> its opinion.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: only the above complaints are before the Court.  </span></p><p class='s6C429373'><span class='sDFC50A6A'>V.</span><span class='s31941557'></span><span class='sDFC50A6A'>OBJECTIONS </span><span class='s50CFE236'>RATIONE LOCI</span></p><p class='s6C429373'><span class='sDFC50A6A'>A.</span><span class='s8F0F3DD'></span><span class='sDFC50A6A'>Whether the facts alleged by the applicant are capable of falling within the jurisdiction of Turkey under Article 1 of the Convention</span></p><p class='s6C429373'><span class='sFBBFEE58'>Court is not called upon at the preliminary objections stage to examine whether Turkey is actually responsible.  This falls to be determined at the merits phase. Its enquiry is limited to determining whether the matters complained of are capable of falling</span><span class='sFBBFEE58'> within the \"jurisdiction\" of Turkey even though they occur outside her national territory.</span></p><p class='s6C429373'><span class='sFBBFEE58'>The concept of \"jurisdiction\" under Article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>1 is not restricted to the national territory of the High Contracting Parties.  Responsibility may also arise when as a </span><span class='sFBBFEE58'>consequence of military action, whether lawful or unlawful, a Contracting Party exercises effective control of an area outside its national territory.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Not disputed that the applicant was prevented by Turkish troops from gaining access to her property. </span></p><p class='s6C429373'><span class='s1A844BC0'>Con</span><span class='s1A844BC0'>clusion</span><span class='sFBBFEE58'>: facts alleged by the applicant are capable of falling within Turkish \"jurisdiction\" within the meaning of Article 1 (sixteen votes to two).  </span></p><p class='s6C429373'><span class='sDFC50A6A'>B.</span><span class='s8F0F3DD'></span><span class='sDFC50A6A'>Validity of the territorial restrictions attached to Turkey's Article 25 and 46 declarations</span></p><p class='s6C429373'><span class='sFBBFEE58'>Court has</span><span class='sFBBFEE58'> regard to the special character of the Convention as a treaty for the collective enforcement of human rights; the fact that it is a living instrument to be interpreted in the light of present-day conditions.  In addition, its provisions are to be interpre</span><span class='sFBBFEE58'>ted and applied so as to make its safeguards effective.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Court seeks to ascertain the ordinary meaning given to Articles 25 and 46 in their context and in the light of their object and purpose.  Regard also had to subsequent practice in the application of t</span><span class='sFBBFEE58'>he treaty. </span></p><p class='s6C429373'><span class='sFBBFEE58'>If Articles 25 and 46 were to be interpreted as permitting restrictions (other than of a temporal nature) States would be enabled to qualify their consent under the optional clauses.  This would severely weaken the role of the Commission and Co</span><span class='sFBBFEE58'>urt and diminish the effectiveness of the Convention as a constitutional instrument of European public order.  The consequences for the enforcement of the Convention would be so far-reaching that a power should have been expressly provided for.  No such pr</span><span class='sFBBFEE58'>ovision in either Article 25 or 46.</span></p><p class='s6C429373'><span class='sFBBFEE58'>The subsequent practice of Contracting Parties of not attaching restrictions </span><span class='s1A844BC0'>ratione loci</span><span class='sFBBFEE58'> or </span><span class='s1A844BC0'>ratione materiae</span><span class='sFBBFEE58'> confirms the view that these are not permitted. </span></p><p class='s6C429373'><span class='sFBBFEE58'>Not contested that Article 46 of the Convention was modelled on Article 36 of the Statute of the International Court of Justice.  However, the fundamental difference in the role and purpose of the respective tribunals, coupled with the existence of a pract</span><span class='sFBBFEE58'>ice of unconditional acceptance, provides a compelling basis for distinguishing Convention practice from that of the International Court.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Finally, the application of Article 63 § 4, by analogy, does not provide support for the claim that a territorial rest</span><span class='sFBBFEE58'>riction is permissible.</span></p><p class='s6C429373'><span class='sDFC50A6A'>C.</span><span class='s8F0F3DD'></span><span class='sDFC50A6A'>Validity of the Turkish declarations under Articles</span><span class='sDFC50A6A'>&#xa0;</span><span class='sDFC50A6A'>25 and 46</span></p><p class='s6C429373'><span class='sFBBFEE58'>Court does not consider that the issue of the severability of the invalid parts of Turkey's declarations can be decided by reference to the statements of her represent</span><span class='sFBBFEE58'>atives expressed subsequent to the filing of the declarations.  Turkey must have been aware, in view of the consistent practice of Contracting Parties, that the impugned clauses were of questionable validity.  </span></p><p class='s6C429373'><span class='sFBBFEE58'>Court finds that the impugned restrictions ca</span><span class='sFBBFEE58'>n be separated from the remainder of the text, leaving intact the acceptance of the optional clauses.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: the territorial restrictions are invalid but the declarations under Articles 25 and 46 contain valid acceptances of the competence of the Comm</span><span class='sFBBFEE58'>ission and Court (sixteen votes to two).</span></p><p class='s6C429373'><span class='sDFC50A6A'>VI.</span><span class='sA77BBFA2'></span><span class='sDFC50A6A'>OBJECTION </span><span class='s50CFE236'>RATIONE TEMPORIS</span></p><p class='s6C429373'><span class='sFBBFEE58'>The correct interpretation and application of the restrictions </span><span class='s1A844BC0'>ratione temporis</span><span class='sFBBFEE58'>, in the Turkish declarations under Articles 25 and 46, and the notion of continuing violations of the Co</span><span class='sFBBFEE58'>nvention, raise difficult legal and factual questions.  On the present state of the file, Court does not have sufficient elements enabling it to decide these questions.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>: objection joined to the merits of the case (unanimously).</span></p><p class='sBE3830CA'><span class='sFBBFEE58'>&#xa0;</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>© Council of Eur</span><span class='sFBBFEE58'>ope/European Court of Human Rights</span><br /><span class='sFBBFEE58'>This summary by the Registry does not bind the Court.</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>Click here for the </span><a href=\"http://www.echr.coe.int/ECHR/EN/Header/Case-Law/Case-law+analysis/Information+notes/\"><span class='s54939A00'>Case-Law Information Notes</span></a></p><p class='s6090DB7C'><span class='sFBBFEE58'>&#xa0;</span></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hudoc.echr.coe.int/eng#{%22typedescription%22:[%2224%22],%22itemid%22:[%22003-3004688-3312583%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Advisory Opinion (no. 2) 22.01.2010",
				"creators": [
					{
						"lastName": "ECtHR (Grand Chamber)",
						"creatorType": "author"
					}
				],
				"dateDecided": "22.01.2010",
				"court": "ECtHR [GC]",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=003-3004688-3312583",
				"attachments": [
					{
						"title": "Advisory Opinion (no. 2) 22.01.2010 PDF",
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
		"url": "https://hudoc.echr.coe.int/eng#{%22itemid%22:[%22001-93398%22]}",
		"items": [
			{
				"itemType": "case",
				"caseName": "Al-Saadoon and Mufdhi v. the United Kingdom (dec.)",
				"creators": [
					{
						"lastName": "ECtHR (Fourth Section)",
						"creatorType": "author"
					}
				],
				"dateDecided": "30.06.2009",
				"abstractNote": "Partly admissible; Partly inadmissible",
				"court": "ECtHR",
				"docketNumber": "app. no. 61498/08",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-93398",
				"attachments": [
					{
						"title": "Al-Saadoon and Mufdhi v. the United Kingdom (dec.) PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p class='s50C0B1C7'><span class='s3AEEAB2'>Information Note on the Court’s case-law No. 120</span></p><p class='s68AFA200'><span class='sFBBFEE58'>June 2009</span></p><p class='s6E50BD9A'><span class='s38C10080'>Al-Saadoon and Mufdhi v. the United Kingdom (dec.)</span><span class='s7D2086B4'> - 61498/08</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Decision 30.6.2009 [Section IV]</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 1</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Responsibility of states</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Territorial jurisdiction in relation to detention of Iraqi nationals by British Armed Forces in Iraq: </span><span class='s1A844BC0'>admissible</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 2</span></p><p class='s41684895'><span class='sDFC50A6A'>Article 2-1</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Death penalty</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Life</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Transfer of suspects under control of British Armed Forces in Iraq into custody of Iraqi authorities on charges carrying death penalty: </span><span class='s1A844BC0'>admissible</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 34</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Hinder the exercise of the right of petition</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Alleged failure to comply with indication by Court not to transfer applicants to authorities of another State where they faced the death penalty: </span><span class='s1A844BC0'>admissible</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 1 of Protocol No. 13</span></p><p class='s50C0B1C7'><span class='sDFC50A6A'>Abolition of the death penalty in all circumstances</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Transfer of suspects under control of British Armed Forces in Iraq into custody of Iraqi authorities on charges carrying death penalty: </span><span class='s1A844BC0'>admissible</span></p><p class='s6E50BD9A'><span class='s1A844BC0'>&#xa0;</span></p><p class='s6C429373'><span class='sFBBFEE58'>This case concerns a complaint by two Iraqi nationals that the British authorities in Iraq had transferred them to Iraqi custody in breach of an interim measure indicated by the European Court under Rule 39, so putting them at real risk of an unfair trial followed by execution by hanging. </span></p><p class='s6C429373'><span class='sFBBFEE58'>(a) </span><span class='s1A844BC0'>Background</span><span class='sFBBFEE58'>: On 20 March 2003 a coalition of Armed Forces (the Multi-National Force – MNF) commenced the invasion of Iraq. After major combat operations had ceased, the Coalition Provisional Authority (CPA) was created as a caretaker administration until an Iraqi government could be established. In July 2003 the Governing Council of Iraq was formed and the CPA assumed a consultative role. On 27 June 2004 the CPA issued a memorandum providing that criminal detainees were to be handed over to the Iraqi authorities as soon as reasonably practicable and an order (CPA Order No 17 (revised)) that stipulated that for the duration of the order MNF premises on Iraqi territory were to remain inviolable and subject to the exclusive control and authority of the MNF. The occupation came to an end the following day and authority was transferred from the CPA to the interim Government. Thereafter the MNF, including the British contingent, remained in Iraq pursuant to requests by the Iraqi Government and authorisations from the United Nations Security Council. The United Kingdom and Iraqi authorities subsequently entered into a Memorandum of Understanding that stipulated that the interim Iraqi Government had legal authority over all criminal suspects in the physical custody of the British contingent. The MNF’s UN Mandate to remain in Iraq expired on 31 December 2008. </span></p><p class='s6C429373'><span class='sFBBFEE58'>(b) </span><span class='s1A844BC0'>Applicants’ case</span><span class='sFBBFEE58'>: The applicants were arrested by British forces following the invasion of Iraq. They were initially detained in British-run detention facilities as “security detainees” on suspicion of being senior members of the Ba’ath Party under the former regime and of orchestrating violence against the coalition forces. In October 2004 the British military police, which had been investigating the deaths of two British soldiers who had been ambushed and murdered in southern Iraq on 23 March 2003, concluded that there was evidence that the applicants had been involved. In December 2005 the British authorities formally referred the murder case against the applicants to the Iraqi criminal courts. In May 2006 an arrest warrant was issued against them under the Iraqi Penal Code and an order made authorising their continued detention by the British Army in Basra. The UK authorities reclassified the applicants’ status from “security detainees” to “criminal detainees”. The cases were then transferred to Basra Criminal Court, which decided that the allegations against the applicants constituted war crimes triable by the Iraqi High Tribunal (IHT), which had power to impose the death penalty. The IHT made repeated requests for the applicants’ transfer into its custody. The applicants sought judicial review in the English courts of the legality of the proposed transfer. The Divisional Court declared it lawful on 19 December 2008 and its decision was upheld by the Court of Appeal on 30 December 2008. While accepting that there was a real risk that the applicants would be executed, the Court of Appeal found that, even prior to the expiry of the UN Mandate on 31 December 2008, the United Kingdom had not been exercising in relation to the applicants autonomous power as a sovereign State, but had acted as an agent for the Iraqi court. It had no discretionary power of its own to hold, release or return the applicants. In essence it was detaining them only at the request and to the order of the IHT and was obliged to return them to the custody of the IHT in accordance with the arrangements between the United Kingdom and Iraq. That was </span><span class='s1A844BC0'>a fortiori</span><span class='sFBBFEE58'> so with the expiry of the Mandate, as after that date the British forces would enjoy no legal power to detain any Iraqi. In any event, even if the United Kingdom was exercising jurisdiction, it nevertheless had an international-law obligation to transfer the applicants to the custody of the IHT and that obligation had to be respected unless it would expose the applicants to a crime against humanity or torture. The death penalty by hanging did not fit into either of those categories. The Court of Appeal therefore dismissed the appeal.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Later the same day (30 December 2008) the applicants obtained an interim measure from the European Court under Rule 39 indicating to the UK Government that they should not to remove or transfer the applicants from their custody until further notice. However, the Government replied the following day that, since the UN Mandate was due to expire at midnight, exceptionally they could not comply with the measure and had transferred the applicants to Iraqi custody earlier in the day. The applicants were subsequently refused leave to appeal against the Court of Appeal’s decision by the House of Lords. Their trial before the IHT commenced on 11 May 2009. </span></p><p class='s6C429373'><span class='s1A844BC0'>Admissible under Articles 2, 3 and 6 and Article 1 of Protocol No. 13</span><span class='sFBBFEE58'>: With regard to the preliminary issue of jurisdiction, the United Kingdom authorities had had total and exclusive control, first through the exercise of military force and then by law, over the detention facilities in which the applicants were held. During the first months of the applicants’ detention, the United Kingdom was an occupying power in Iraq. The two British-run detention facilities in which the applicants were held had been established on Iraqi territory through the exercise of military force. The United Kingdom had exercised control and authority over the individuals detained in them initially solely as a result of the use or threat of military force. Subsequently, its </span><span class='s1A844BC0'>de facto</span><span class='sFBBFEE58'> control over those premises had been reflected in law. In particular, on 24 June 2004, CPA Order No. 17 (Revised) had provided that all premises used by the MNF should be inviolable and subject to the exclusive control and authority of the MNF. That provision had remained in force until midnight on 31 December 2008. Given the total and exclusive </span><span class='s1A844BC0'>de facto</span><span class='sFBBFEE58'>, and subsequently also </span><span class='s1A844BC0'>de jure</span><span class='sFBBFEE58'>, control exercised by the United Kingdom authorities over the premises in question, the applicants were within the United Kingdom’s jurisdiction and had remained so until their physical transfer to the custody of the Iraqi authorities on 31 December 2008. The questions whether the United Kingdom was under a legal obligation to transfer the applicants to Iraqi custody and whether, if there was such an obligation, it modified or displaced any obligation owed to the applicants under the Convention, were not material to the preliminary issue of jurisdiction and had instead to be considered in relation to the merits of the applicants’ complaints.</span></p><p class='s6C429373'><span class='sFBBFEE58'>The issue of the admissibility of the applicants’ complaints under Articles 13 and 34 was joined to the merits. Their complaints concerning conditions of detention and the risk of ill-treatment or extrajudicial killing in Iraqi custody were declared inadmissible for failure to exhaust UK domestic remedies.</span></p><p class='s6C429373'><span class='sFBBFEE58'>See also, two recently communicated cases: </span><span class='s1A844BC0'>Al Skeini and Others v. the United Kingdom</span><span class='sFBBFEE58'>, no. 55721/07, Information Note no. 114; and </span><span class='s1A844BC0'>Al-Jeddav. the United Kingdom</span><span class='sFBBFEE58'>, no. 27021/08, Information Note no. 116.</span></p><p class='s9B5FF181'><span class='sFBBFEE58'>&#xa0;</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>© Council of Europe/European Court of Human Rights</span><br /><span class='sFBBFEE58'>This summary by the Registry does not bind the Court.</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>Click here for the </span><a href=\"http://www.echr.coe.int/ECHR/EN/Header/Case-Law/Case-law+analysis/Information+notes/\"><span class='s54939A00'>Case-Law Information Notes</span></a></p><p class='s6090DB7C'><span class='sFBBFEE58'>&#xa0;</span></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hudoc.echr.coe.int/eng#{%22itemid%22:[%22001-194320%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Romeo Castaño c. Belgique",
				"creators": [
					{
						"lastName": "ECtHR (Second Section)",
						"creatorType": "author"
					}
				],
				"dateDecided": "09.07.2019",
				"abstractNote": "Violation de l'article 2 - Droit à la vie (Article 2-1 - Enquête effective) (Volet procédural); Préjudice moral - réparation (Article 41 - Préjudice moral; Satisfaction équitable)",
				"court": "ECtHR",
				"docketNumber": "app. no. 8351/17",
				"language": "fre",
				"url": "http://hudoc.echr.coe.int/eng?i=001-194320",
				"attachments": [
					{
						"title": "Romeo Castaño c. Belgique PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p class='s7D81CFEF'><span class='sFBBFEE58'>Note d’information sur la jurisprudence de la Cour 231</span></p><p class='s68AFA200'><span class='sFBBFEE58'>Juillet 2019</span></p><p class='s6E50BD9A'><span class='s38C10080'>Romeo Castaño c. Belgique</span><span class='s7D2086B4'> - 8351/17</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Arrêt 9.7.2019</span><span class='sFBBFEE58'> [Section II]</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 1</span></p><p class='s36748CAC'><span class='sDFC50A6A'>Juridiction des </span><span class='sDFC50A6A'>États</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Juridiction de la Belgique née du refus d’exécuter un mandat d’arrêt européen, empêchant une enquête sur un meurtre en Espagne</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 2</span></p><p class='s91EDA339'><span class='sDFC50A6A'>Article 2-1</span></p><p class='s36748CAC'><span class='sDFC50A6A'>Enquête effective</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Refus d’exécuter un mandat d’arrêt européen, empêchant une enquête sur un meurtre e</span><span class='sFBBFEE58'>n Espagne, au motif insuffisamment étayé du risque de mauvaises conditions de détention</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>: </span><span class='s1A844BC0'>violation</span></p><p class='s6C429373'><span class='s1A844BC0'>En fait</span><span class='sFBBFEE58'> – En 1981, le père des requérants fut assassiné par un commando appartenant à l’organisation terroriste ETA. En 2007, tous les membres du commando f</span><span class='sFBBFEE58'>urent condamnés par la justice espagnole, hormis N.J.E., qui s’est réfugiée en Belgique. </span></p><p class='s6C429373'><span class='sFBBFEE58'>Des mandats d’arrêt européens (ci-après «</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>MAE</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>») ont été décernés par un juge d’instruction espagnol en 2004, 2005 et 2015 à l’encontre de N.J.E. aux fins de poursuit</span><span class='sFBBFEE58'>es pénales. Mais en 2013 et 2016, la chambre des mises en accusation belge refusa toutefois l’exécution des MAE estimant qu’il y avait de sérieux motifs de croire que l’exécution du MAE porterait atteinte aux droits fondamentaux de N.J.E. Le parquet fédéra</span><span class='sFBBFEE58'>l belge se pourvut en cassation contre ces arrêts. Mais la Cour de cassation rejeta les pourvois en 2013 et 2016.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Les requérants se plaignent que l’Espagne ait été empêchée de poursuivre N.J.E. par le refus des autorités belges d’exécuter les MAE, système mis en place au sein de l’Union européenne (UE).</span></p><p class='s6C429373'><span class='s1A844BC0'>En droit</span></p><p class='s6C429373'><span class='sFBBFEE58'>Article 1 (</span><span class='s1A844BC0'>compétence </span><span class='sFBBFEE58'>ratione loci)</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>: Le grief que les r</span><span class='sFBBFEE58'>equérants tirent de l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>2 de la Convention à l’égard de la Belgique concerne le manquement allégué des autorités belges à coopérer avec les autorités espagnoles en prenant les mesures nécessaires pour permettre que l’auteure présumée de l’assassinat </span><span class='sFBBFEE58'>de leur père, réfugiée en Belgique, soit jugée en Espagne. Il ne repose donc pas sur l’affirmation d’un manquement de la Belgique à une éventuelle obligation procédurale d’enquêter elle-même sur cet assassinat.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Dans le cadre de l’existence d’engagements de</span><span class='sFBBFEE58'> coopération en matière pénale liant les deux États concernés par le biais du MAE, les autorités belges ont été informées de l’intention des autorités espagnoles de poursuivre N.J.E., et sollicitées de procéder à son arrestation et à sa remise.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Ces circons</span><span class='sFBBFEE58'>tances suffisent à considérer qu’un lien juridictionnel existe entre les requérants et la Belgique au sens de l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>1 concernant le grief soulevé par les requérants sous l’angle du volet procédural de l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>2.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>: exception préliminaire re</span><span class='sFBBFEE58'>jetée (unanimité).</span></p><p class='s6C429373'><span class='sFBBFEE58'>Article 2 (</span><span class='s1A844BC0'>volet procédural</span><span class='sFBBFEE58'>)</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>: Dans le cadre de l’exécution d’un MAE par un État membre de l’UE, il convient de ne pas appliquer le mécanisme de reconnaissance mutuelle de manière automatique et mécanique, au détriment des droits fondamentaux. Compte tenu de la présomption de respec</span><span class='sFBBFEE58'>t par l’État d’émission des droits fondamentaux qui prévaut dans la logique de la confiance mutuelle entre États membres de l’UE, le refus de remise doit être justifié par des éléments circonstanciés indiquant un danger manifeste pour les droits fondamenta</span><span class='sFBBFEE58'>ux de l’intéressé de nature à renverser ladite présomption. En l’espèce, les juridictions belges ont justifié leur décision de refus d’exécuter les MAE émis par le juge d’instruction espagnol en raison du risque, en cas de remise à l’Espagne, que N.J.E. y </span><span class='sFBBFEE58'>subisse une détention dans des conditions contraires à l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>3 de la Convention. Cette justification peut constituer un motif légitime pour refuser l’exécution du MAE, et donc pour refuser la coopération avec l’Espagne. Encore faut-il, vu la présence d</span><span class='sFBBFEE58'>e droits de tiers, que le constat d’un tel risque repose sur des bases factuelles suffisantes.</span></p><p class='s6C429373'><span class='sFBBFEE58'>La chambre des mises en accusation s’est fondée essentiellement sur des rapports internationaux en date de 2011 à 2014 ainsi que sur le contexte de «</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>l’histoire </span><span class='sFBBFEE58'>politique contemporaine de l’Espagne</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>». Elle n’a pas procédé à un examen actualisé et circonstancié de la situation qui prévalait en 2016 et n’a pas cherché à identifier un risque réel et individualisable de violation des droits de la Convention dans le ca</span><span class='sFBBFEE58'>s de N.J.E. ni des défaillances structurelles quant aux conditions de détention en Espagne.</span></p><p class='s6C429373'><span class='sFBBFEE58'>De nombreux MAE ont été émis et exécutés précédemment à l’égard de membres présumés de l’ETA sans que les pays d’exécution des MAE, dont la Belgique, y aient vu des</span><span class='sFBBFEE58'> risques de violation des droits fondamentaux des personnes faisant l’objet de la remise.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Les circonstances de l’espèce et les intérêts en cause auraient dû amener les autorités belges, en faisant usage de la possibilité que la loi nationale leur donnait, </span><span class='sFBBFEE58'>à demander des informations complémentaires quant à l’application du régime de détention dans le cas de N.J.E., plus particulièrement quant à l’endroit et aux conditions de détention, afin de vérifier l’existence d’un risque concret et réel de violation de</span><span class='sFBBFEE58'> la Convention en cas de remise.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Ainsi, l’examen effectué par les juridictions belges lors des procédures de remise n’a pas été assez complet pour considérer le motif invoqué par elles pour refuser la remise de N.J.E. au détriment des droits des requérants</span><span class='sFBBFEE58'> comme reposant sur une base factuelle suffisante. La Belgique a donc manqué à l’obligation de coopérer qui découlait pour elle du volet procédural de l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>2 et il y a eu violation de cette disposition.</span></p><p class='s6C429373'><span class='sFBBFEE58'>Ce constat n’implique pas nécessairement que la </span><span class='sFBBFEE58'>Belgique ait l’obligation de remettre N.J.E. aux autorités espagnoles. C’est l’insuffisance de la base factuelle du motif pour refuser la remise qui a conduit la Cour à constater une violation de l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>2. Cela n’enlève rien à l’obligation des autorités</span><span class='sFBBFEE58'> belges de s’assurer qu’en cas de remise aux autorités espagnoles N.J.E. ne courra pas de risque de traitement contraire à l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>3. Plus généralement, le présent arrêt ne saurait être interprété comme réduisant l’obligation des États de ne pas extrader</span><span class='sFBBFEE58'> une personne vers un pays qui demande son extradition lorsqu’il y a des motifs sérieux de croire que l’intéressé, si on l’extrade vers ce pays, y courra un risque réel d’être soumis à un traitement contraire à l’article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>3, et donc de s’assurer qu’un tel r</span><span class='sFBBFEE58'>isque n’existe pas.</span></p><p class='s6C429373'><span class='s1A844BC0'>Conclusion</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>: violation (unanimité).</span></p><p class='s6C429373'><span class='sFBBFEE58'>Article 41</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>: 5</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>000 EUR à chacun des requérants pour préjudice moral.</span></p><p class='s6C429373'><span class='sFBBFEE58'>(Voir aussi </span><span class='s1A844BC0'>Soering c. Royaume-Uni</span><span class='sFBBFEE58'>, </span><a class='s37BD6B97' href=\"http://hudoc.echr.coe.int/fre?i=001-62176\"><span class='s3CA6E50F'>14038/88</span></a><span class='sFBBFEE58'>, 7</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>juillet 1989</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>; </span><span class='s1A844BC0'>Mamatkoulo</span><span class='s1A844BC0'>v et Askarov c.</span><span class='s1A844BC0'>&#xa0;</span><span class='s1A844BC0'>Turquie</span><span class='sFBBFEE58'> [GC], 46827/99 et 46951/99, 4</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>février 2005, </span><a class='s37BD6B97' href=\"http://hudoc.echr.coe.int/fre?i=002-4001\"><span class='s3CA6E50F'>Note d’information</span><span class='s3CA6E50F'>&#xa0;</span><span class='s3CA6E50F'>72</span></a><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>; </span><span class='s1A844BC0'>Rantsev c.</span><span class='s1A844BC0'>&#xa0;</span><span class='s1A844BC0'>Chypre et Russie</span><span class='sFBBFEE58'>, 25965/04, 7</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>janvier 2010, </span><a class='s37BD6B97' href=\"http://hudoc.echr.coe.int/fre?i=002-1143\"><span class='s3CA6E50F'>Note d’information 126</span></a><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>; </span><span class='s1A844BC0'>Trabelsi c.</span><span class='s1A844BC0'>&#xa0;</span><span class='s1A844BC0'>Belgique</span><span class='sFBBFEE58'>, 140/10, 4</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>septembre 2014, </span><a class='s37BD6B97' href=\"http://hudoc.echr.coe.int/fre?i=002-10080\"><span class='s3CA6E50F'>Note d’information 177</span></a><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>; </span><span class='s1A844BC0'>Avotiņš c.</span><span class='s1A844BC0'>&#xa0;</span><span class='s1A844BC0'>Lettonie</span><span class='sFBBFEE58'> [GC], 17502/07, 23</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>mai 2016, </span><a class='s37BD6B97' href=\"http://hudoc.echr.coe.int/fre?i=002-11062\"><span class='s3CA6E50F'>Note d’information 196</span></a><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>; </span><span class='s1A844BC0'>Pirozzi c.</span><span class='s1A844BC0'>&#xa0;</span><span class='s1A844BC0'>Belgique</span><span class='sFBBFEE58'>, </span><a class='s37BD6B97' href=\"http://hudoc.echr.coe.int/fre?i=001-182231\"><span class='s3CA6E50F'>21055/11</span></a><span class='sFBBFEE58'>, 17</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>avril 2018</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>; et </span><span class='s1A844BC0'>Güzelyurtlu et autres c.</span><span class='s1A844BC0'>&#xa0;</span><span class='s1A844BC0'>Chypre et Turquie </span><span class='sFBBFEE58'>[GC], 36925/07, 29</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>janvier 2019, </span><a class='s37BD6B97' href=\"http://hudoc.echr.coe.int/fre?i=002-12316\"><span class='s3CA6E50F'>Note d’information 225</span></a><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>; ainsi que la fiche thématique </span><a class='s37BD6B97' href=\"https://www.echr.coe.int/Documents/FS_European_Union_FRA.pdf\"><span class='s3CA6E50F'>Jurisprudence relative à l’Union européenne</span></a><span class='sFBBFEE58'>)</span></p><p class='sBE3830CA'><span class='sFBBFEE58'>&#xa0;</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>© Conseil de l’Europe/Cour européenne des droits de l’</span><span class='sFBBFEE58'>homme</span><br /><span class='sFBBFEE58'>Rédigé par le greffe, ce résumé ne lie pas la Cour.</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>Cliquez ici pour accéder aux </span><a class='s37BD6B97' href=\"http://www.echr.coe.int/NoteInformation/fr\"><span class='s3CA6E50F'>Notes d'information sur la jurisprudence</span></a></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hudoc.echr.coe.int/eng#{%22typedescription%22:[%221%22],%22itemid%22:[%22001-148410%22]}",
		"items": [
			{
				"itemType": "case",
				"caseName": "Cases of Kayriakovi and Yonkov Against Bulgaria (resolution)",
				"creators": [
					{
						"lastName": "Committee of Ministers",
						"creatorType": "author"
					}
				],
				"dateDecided": "12.11.2014",
				"abstractNote": "Information given by the government concerning measures taken to prevent new violations. Payment of the sums provided for in the judgment",
				"court": "Committee of Ministers",
				"docketNumber": "app. nos. 30945/04 and 17241/06",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-148410",
				"attachments": [
					{
						"title": "Cases of Kayriakovi and Yonkov Against Bulgaria (resolution) PDF",
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
		"url": "https://hudoc.echr.coe.int/eng#{%22fulltext%22:[%22hanan%22],%22typedescription%22:[%2223%22],%22itemid%22:[%22001-166884%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Hanan v. Germany (communicated)",
				"creators": [
					{
						"lastName": "ECtHR (Grand Chamber)",
						"creatorType": "author"
					}
				],
				"dateDecided": "02.09.2016",
				"abstractNote": "Communicated; Communicated",
				"court": "ECtHR [GC]",
				"docketNumber": "app. no. 4871/16",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-166884",
				"attachments": [
					{
						"title": "Hanan v. Germany (communicated) PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p class='s7D81CFEF'><span class='sFBBFEE58'>Information Note on the Court’s case-law 232</span></p><p class='s68AFA200'><span class='sFBBFEE58'>August-September 2019</span></p><p class='s6E50BD9A'><span class='s38C10080'>Hanan v. Germany (relinquishment)</span><span class='s7D2086B4'> - 4871/16</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>&#xa0;</span></p><p class='s440D9021'><span class='s7D2086B4'>Article 1</span></p><p class='s36748CAC'><span class='sDFC50A6A'>Jurisdiction of States</span></p><p class='s36748CAC'><span class='sDFC50A6A'>Responsibility </span><span class='sDFC50A6A'>of States</span></p><p class='s6E50BD9A'><span class='sFBBFEE58'>Jurisdiction as regards the death of civilians in Afghanistan following airstrike under NATO operational command: </span><span class='s1A844BC0'>relinquishment in favour of the Grand Chamber </span></p><p class='s6C429373'><span class='sFBBFEE58'>Towards the end of 2001 the United Nations Security Council authorised the establishm</span><span class='sFBBFEE58'>ent of an International Security Assistance Force (ISAF) in Afghanistan. Germany authorised the deployment of German forces as part of ISAF, with NATO subsequently taking over command. Parallel to the command structure of ISAF, disciplinary and administrat</span><span class='sFBBFEE58'>ive command and control remained with the respective troop contributing nations. </span></p><p class='s6C429373'><span class='sFBBFEE58'>On 4 September 2009, following an attack by insurgents on two fuel tankers in the German military sector, a German Colonel ordered two United States Air Force airplanes to bo</span><span class='sFBBFEE58'>mb the two fuel tankers. During the airstrike, the applicant’s two sons aged eight and twelve were killed. The civilian victims numbered between fourteen and over a hundred, depending on the sources.</span></p><p class='s6C429373'><span class='sFBBFEE58'>In 2010 the German Federal Prosecutor General instigated</span><span class='sFBBFEE58'> a criminal investigation, but finally decided to take no further action on the complaint lodged by the applicant, an Afghan national living in Afghanistan, owing to insufficient incriminating evidence. The Prosecutor General concluded that there had been </span><span class='sFBBFEE58'>no intent to kill or harm civilians or to damage property to any degree disproportionate to the military benefit of the airstrike. The Colonel who had issued the order submitted, irrebuttably, that he had acted on the basis of the available information to </span><span class='sFBBFEE58'>the effect that the persons present at the fuel tankers were insurgents. The applicant’s appeals were dismissed.</span></p><p class='s6C429373'><span class='sFBBFEE58'>The applicant submits that the impugned act was imputable to Germany, and that in the context of the airstrike his sons were under German juris</span><span class='sFBBFEE58'>diction within the meaning of Article</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>1 of the Convention. Under Articles</span><span class='sFBBFEE58'>&#xa0;</span><span class='sFBBFEE58'>2 and 13 he complains of the lack of an effective investigation into the deaths of his two sons under those circumstances, and of the lack of an effective domestic remedy at his disp</span><span class='sFBBFEE58'>osal to challenge the decision to take no further action on his complaint. </span></p><p class='s6C429373'><span class='sFBBFEE58'>In September 2016 the application was communicated to the German Government. On 27 August 2019 the Chamber to which the case had been assigned declined jurisdiction in favour of th</span><span class='sFBBFEE58'>e Grand Chamber.</span></p><p class='sBE3830CA'><span class='sFBBFEE58'>&#xa0;</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>© Council of Europe/European Court of Human Rights</span><br /><span class='sFBBFEE58'>This summary by the Registry does not bind the Court.</span></p><p class='s6090DB7C'><span class='sFBBFEE58'>Click here for the </span><a class='s37BD6B97' href=\"http://www.echr.coe.int/NoteInformation/en\"><span class='s3CA6E50F'>Case-Law Information Notes</span></a></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
