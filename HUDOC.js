{
	"translatorID": "d541622d-09c3-4e20-b010-c506b2d01151",
	"label": "HUDOC",
	"creator": "Jonas Skorzak",
	"target": "^https?://hudoc\\.echr\\.coe\\.int",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-19 21:19:21"
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
	Key guides for citation:
	- French: https://www.echr.coe.int/documents/note_citation_fra.pdf
	- English: https://www.echr.coe.int/documents/note_citation_eng.pdf
	- OSCOLA: https://www.law.ox.ac.uk/sites/files/oxlaw/oscola_4th_edn_hart_2012.pdf#page=37&zoom=auto,-270,529
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

// After removing text(), eslint complains
/* eslint-disable no-undef */

// Scrapes some metadata from the document
// TODO: integrate function into scrape
function scrapeMetaData(doc, detail) { // Only scrapes the header of the main page
	switch (detail) {
		case "appno": return text(doc, "span.column01");
		case "typedescription": return text(doc, "span.column02");
		case "originatingbody": return text(doc, "span.column03");
		case "judgementdate": return text(doc, "span.column04");
		default: return null;
	}
}

// Gets the itemid of the document
function getItemID(url) {
	var urlRegex = /%22itemid%22:\[%22([\d-]*)%22]|\?i=([\d-]*)/i;
	var id = url.match(urlRegex);
	return id[1];
}

// Adds the type of judgment at the end of the name
function getTypeBit(doc, url) { // TODO: Switch to 'url' once we use the API instead
	var description = scrapeMetaData(doc, "typedescription");

	// The logic assumes the user wants French descriptors if they use the French website
	if (url.includes("hudoc.echr.coe.int/fre#")) {
		if (description.includes("Arrêt")) {
			if (description.includes("satisfaction équitable") && !description.includes("au principal")) {
				return " (satisfaction équitable)"; // Some papers use "(arrêt satisfaction équitable)"
			}
			if (description.includes("exception préliminaire") || description.includes("incompétence")) {
				return " (exception préliminaire)";
			}

			if (description.includes("radiation du rôle")) return " (radiation)";
			if (description.includes("interprétation"))	return " (interprétation)";
			if (description.includes("révision")) return " (révision)";
		}

		if (description.includes("Décision")) return " (déc.)";
		if (description.includes("Affaire Communiquée")) return " (communiquée)"; // TODO: Rather use abbreviation?
		if (description.includes("Révision")) return " (déc. de révision)"; // TODO: Rather use abbreviation?
	
		return "";

		// return " (" + description.split("(")[0].toLowerCase() + ")";
	}

	if (description.includes("Judgment")) {
		if (description.includes("Just Satisfaction") && !description.includes("Merits")) {
			return " (just satisfaction)";
		}
		if (description.includes("Objection") || description.includes("Jurisdiction")) {
			return " (preliminary objections)";
		}
		// TODO: Distinguish " (friendly settlement)" and " (striking out)"
		// 				Requires a queryMetaData function
		if (description.includes("Struck out")) return " (striking out)";
		if (description.includes("Interpretation"))	return " (interpretation)";
		if (description.includes("Revision")) return " (revision)";

		return "";
	}

	if (description.includes("Decision")) return " (dec.)";
	if (description.includes("Communicated")) return " (communicated)"; // TODO: Rather use abbreviation?
	if (description.includes("Revision")) return " (dec. on revision)"; // TODO: Rather use abbreviation?

	return "";
}

// Downloads the legal summary in HUDOC
function getLegalSummary(item, appno) {
	var appnoString = appno.join(" AND appno:");

	// Save the French version if user visited the French version of the judgment
	var doctypeString = "";
	if (item.language == "fre") {
		doctypeString = "doctype:CLINF";
	}
	else {
		doctypeString = "doctype:CLIN";
	}

	var summaryUrl = "https://hudoc.echr.coe.int/app/query/results?query=contentsitename=ECHR "
						+ appnoString + " AND "
						+ doctypeString + " AND "
						+ "(kpdate=\"" + item.dateDecided + "\")"
						+ "&select=itemid"
						+ "&sort=&start=0&length=500";

	// Request id of legal summary
	ZU.doGet(summaryUrl, function (json) {
		json = JSON.parse(json);

		if (json.resultcount >= 1) {
			var textUrl = "https://hudoc.echr.coe.int/app/conversion/docx/html/body?library=ECHR&id="
						+ json.results[0].columns.itemid;

			Zotero.debug("Getting text of legal summary at: " + textUrl);

			// Request text of legal summary
			ZU.doGet(textUrl, function (text) {
				// Remove styles and span tags
				text = text
					.replace(/<style>[\s\S]*<\/style>/g, "")
					.replace(/<\/?span[^>]*>/g, "")
					.replace(/class='s\S+'/g, "");

				item.notes.push({
					note: "<h1> HUDOC Legal Summary </h1> <br/>" + text // H1 necessary, otherwise title is lost
				});

				item.complete();
			});
		}
		else {
			item.complete();
		}
	});
}

// eslint-disable-next-line no-unused-vars: "url  "
function detectWeb(doc, url) {
	// We're waiting until the loading symbol is gone
	Zotero.monitorDOMChanges(doc.querySelector("#notification div"), { attributes: true, attributeFilter: ["style"] });

	var docType = scrapeMetaData(doc, "typedescription");

	if (url.includes("hudoc.echr.coe.int/fre#")) {
		// French website
		if ((docType.includes("Arrêt")
			|| docType.includes("Décision")
			|| docType.includes("Avis consultatif")
			// || docType.includes("Res-") // Removed support for resolutions (not a case and requires info scraped from the text)
			|| docType.includes("Affaire Communiquée"))
		// Exclude translations and press releases.
		&& !(text(doc, "title").toLowerCase().includes("translation]") // toLowerCase() is added because "translati o n" is sometimes capitalized
			|| docType.includes("Communiqué de presse")
			|| text(doc, "title").toLowerCase().includes("résumé juridique"))) {
			return "case";
		}
	}
	else if (url.includes("hudoc.echr.coe.int/eng#")) {
		// English website (so won't work for Spanish or German)
		if ((docType.includes("Judgment")
			|| docType.includes("Decision")
			|| docType.includes("Advisory Opinion")
			// || docType.includes("Res-") // Removed support for resolutions (not a case and requires info scraped from the text)
			|| docType.includes("Communicated"))
		// Exclude translations and press releases.
		&& !(text(doc, "title").toLowerCase().includes("translation]") // toLow er Case() is added because "translation" is sometimes capitalized
			|| docType.includes("Press Release")
			|| text(doc, "title").toLowerCase().includes("legal summary"))) {
			return "case";
		}
	}


	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "case") {
		scrapeDecision(doc, url);
	}
}

function scrapeDecision(doc, url) { // Works for both Court judgments and decisions
	// Item type: case
	var item = new Zotero.Item("case");

	// Title
	// FIXME: Abbreviations in the form of A.B.C. or N.A.T.O are capitalized like A.b.c or N.a.t.o. That is a problem in capitalizeText()
	
	var capTitle = ZU.capitalizeTitle(text(doc, "title").toLowerCase(), true);

	var splitTitle = capTitle.split(/\(/);

	// If title already contains the type, remove it.
	// Exclude non-split titles and advisory opinions
	if (!(splitTitle.length == 1)
			&&	!(scrapeMetaData(doc, "typedescription").includes("Advisory Opinion")
				|| scrapeMetaData(doc, "typedescription").includes("Avis consultatif"))) {
		// Find right cut-off point: Either the part that contains the v./c. or the part that contains the number of the case
		let titleVersusMatch = splitTitle.findIndex(function (elem) {
			if (elem.includes("V.") || elem.includes("C.")) {
				return true;
			}
			return false;
		});

		let titleNumMatch = splitTitle.findIndex(function (elem) {
			if (/^((No\.|N°)|(II|III|IV|V|VI|VII|VIII|IX|X)\))/i.test(elem)) {
				return true;
			}
			return false;
		});

		let titleIndex = Math.max(titleVersusMatch, titleNumMatch);
		capTitle = splitTitle.slice(0, titleIndex + 1).join("(");
	}

	// Zotero capitalizes the "v."/"c.", so we need to correct that for English and French cases
	if (capTitle.includes(" V. ")) {
		capTitle = capTitle.replace(" V. ", " v. ");
	}
	else if (capTitle.includes(" C. ")) {
		capTitle = capTitle.replace(" C. ", " c. ");
	}
	item.caseName = capTitle + getTypeBit(doc, url);

	// Court
	var court = scrapeMetaData(doc, "originatingbody");

	if (url.includes("hudoc.echr.coe.int/fre#")) {
		if (text(doc, "title").includes("Avis consultatif")) {
			item.court = "ECtHR [GC]";
		}
		else if (court.includes("Grande Chambre")) {
			item.court = "ECtHR [GC]";
		}
		else if (court.includes("Commission")) {
			item.court = "EComHR"; // TODO: Since the Commission is defunct, should the full title maybe be used instead?
		}
		else if (court == "Comité des Ministres") { // For resolutions (which are currently not supported)
			item.court = "Comité des Ministres";
		}
		else {
			item.court = "ECtHR";
		}
	}
	/* eslint-disable no-lonely-if */
	else {
		if (text(doc, "title").includes("Advisory Opinion")) {
			item.court = "ECtHR [GC]";
		}
		else if (court.includes("Grand Chamber")) {
			item.court = "ECtHR [GC]";
		}
		else if (court.includes("Commission")) {
			item.court = "EComHR"; // TODO: Since the Commission is defunct, should the full title maybe be used instead?
		}
		else if (court == "Committee of Ministers") { // For resolutions (which are currently not supported)
			item.court = "Committee of Ministers";
		}
		else {
			item.court = "ECtHR";
		}
	/* eslint-enable no-lonely-if */
	}

	// Date of decision
	// convert to simple ISO: yyyy-mm-dd dd.mm.yyyy.
	item.dateDecided = scrapeMetaData(doc, "judgementdate").split("/")
		.reverse()
		.join('-');

	// URL
	if (url.includes("hudoc.echr.coe.int/fre#")) {
		item.url = "https://hudoc.echr.coe.int/fre?i=" + getItemID(url);
	}
	else {
		item.url = "https://hudoc.echr.coe.int/eng?i=" + getItemID(url);
	}
	

	// Query remaining metadata from API
	var queryUrl = "https://hudoc.echr.coe.int/app/query/results?query=(contentsitename=ECHR) AND "
					+ getItemID(url)
					+ "&select=appno,conclusion,docname,languageisocode" // Adapt based on what is needed
					+ "&sort=&start=0&length=1";

	ZU.doGet(queryUrl, function (json) {
		json = JSON.parse(json).results[0].columns;

		Zotero.debug("Queried HUDOC API at: " + queryUrl);

		// Docket number

		// NOTE: This translator doesn't add "app. no.". (See commit history for alternative)
		// Some styles add "no." (Chicago), while other styles don't add anything (OSCOLA, APA)
		// However, most citation style guides require adding the numbering system to the docket number ("app. no."/"no."),
		// so users may need to correct their fields, depending on the style used.
		
		// TODO: For advisory opinions, scrape the number from the text

		var appno = json.appno.split(";");
		item.docketNumber = appno.join(", ");

		// Abstract
		item.abstractNote = json.conclusion.replace(/;/g, "; ");

		// Language
		item.language = json.languageisocode.toLowerCase();

		// Download PDF
		var docname = json.docname;

		var pdfurl = "https://hudoc.echr.coe.int/app/conversion/docx/pdf?library=ECHR&id="
					+ getItemID(url) + "&filename=" + encodeURIComponent(docname) + ".pdf";

		// pdfurl = encodeURI(pdfurl); // the "docname" may contain chars not part of the URI schema

		Zotero.debug("Getting PDF at: " + pdfurl);

		item.attachments.push({
			title: "HUDOC Full Text PDF",
			mimeType: "application/pdf",
			url: pdfurl
		});

		// Download Legal Summary
		if (appno.length !== 0) { // without app. nos. we can't find a legal summary
			getLegalSummary(item, appno);
		}
		else {
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
				"creators": [],
				"dateDecided": "2009-09-18",
				"abstractNote": "Preliminary objections dismissed (substantially the same, disappearance of object of proceedings, ratione temporis, six month period); Violation of Art. 2 (procedural aspect); Violation of Art. 3 (substantive aspect); Violation of Art. 5; No violation of Art. 5; Non-pecuniary damage - award",
				"court": "ECtHR [GC]",
				"docketNumber": "16064/90, 16065/90, 16066/90, 16068/90, 16069/90, 16070/90, 16071/90, 16072/90, 16073/90",
				"language": "eng",
				"url": "https://hudoc.echr.coe.int/eng?i=001-94162",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1> HUDOC Legal Summary </h1> <br/>\r\n<div><p >Information Note on the Court’s case-law No. 122</p><p >August-September 2009</p><p >Varnava and Others v. Turkey [GC] - 16064/90, 16065/90, 16066/90 et al.</p><p >Judgment 18.9.2009 [GC]</p><p >Article 2</p><p >Positive obligations</p><p >Article 2-1</p><p >Effective investigation</p><p >Failure to conduct effective investigation into fate of Greek Cypriots missing since Turkish military operations in northern Cyprus in 1974: violation</p><p >&#xa0;</p><p >Article 3</p><p >Inhuman treatment</p><p >Silence of authorities in face of real concerns about the fate of Greek Cypriots missing since Turkish military operations in northern Cyprus in 1974: violation</p><p >&#xa0;</p><p >Article 5</p><p >Article 5-1</p><p >Liberty of person</p><p >Failure to conduct effective investigation into arguable claim that missing Greek Cypriots may have been detained during Turkish military operations in northern Cyprus in 1974: violation</p><p >&#xa0;</p><p >Article 35</p><p >Article 35-1</p><p >Six month period</p><p >Application in disappearance case lodged more than six months after the respondent State’s ratification of the right of individual petition: preliminary objection dismissed</p><p >&#xa0;</p><p >Article 35-2</p><p >Same as matter already examined</p><p >Court’s jurisdiction where it had already examined case concerning substantially same facts in an inter-State case: preliminary objection dismissed</p><p >&#xa0;</p><p >Article 35-3</p><p >Ratione temporis</p><p s temporal jurisdiction in respect of disappearances that had occurred some thirteen years before the respondent State recognised the right of individual petition: preliminary objection dismissed</p><p >&#xa0;</p><p >Facts – The applicants were relatives of nine Cypriot nationals who disappeared during Turkish military operations in northern Cyprus in July and August 1974. The facts were disputed. Eight of the missing men were members of the Greek-Cypriot forces and it is alleged by the applicants that they disappeared after being captured and detained by Turkish military forces. Witnesses had testified to seeing them in Turkish prisons in 1974 and some of the men were identified by their families from photographs of Greek-Cypriot prisoners of war that were published in the Greek press. The Turkish Government denied that the men had been taken into captivity by Turkish forces and maintained that they had died in action during the conflict. The ninth missing man, Mr&#xa0;Hadjipanteli, was a bank employee. The applicants alleged that he was one of a group of people taken by Turkish forces for questioning in August 1974 and who had been missing ever since. His body was discovered in 2007 in the context of the activity of the United Nations Committee of Missing Persons in Cyprus (CMP). The CMP was set up in 1981 with the task of drawing up comprehensive lists of missing persons on both sides and specifying whether they were alive or dead. It has no power to attribute responsibility or to make findings as to the cause of death. Mr&#xa0;Hadjipanteli’s remains were exhumed from a mass grave near a Turkish-Cypriot village. A medical certificate indicated that he had received bullet wounds to the skull and right arm and a wound to the right thigh. The Turkish Government denied he had been taken prisoner, noting that his name was not on the list of Greek Cypriots held in the alleged place of detention, which had been visited by the International Red Cross.</p><p >In a judgment of 10&#xa0;January 2008 (see Information Note no.&#xa0;104) a Chamber of the Court held that there had been continuing procedural violations of Articles&#xa0;2 and&#xa0;5, and a violation of Article&#xa0;3. It found no substantive violation of Article&#xa0;5.</p><p >Law</p><p >(a)&#xa0;&#xa0;Preliminary objections – The respondent Government challenged the Court’s jurisdiction to examine the case on several counts. Firstly, they submitted that there was no legal interest in determining the applications as the Court had already decided the question of the disappearances of all missing Greek Cypriots in the fourth inter-State case (Cyprus v.&#xa0;Turkey [GC], no.&#xa0;25781/94, 10&#xa0;May 2001, Information Note no.&#xa0;30). Secondly, the applications fell outside the Court’s temporal jurisdiction as the missing men had to be presumed to have died long before Turkey’s acceptance of the right of individual petition on 28&#xa0;January 1987 and there could be no freestanding procedural obligation, divorced from the factual origin of the complaints. In any event, the procedural obligation under Articles&#xa0;2 and&#xa0;3 was a recent jurisprudential development and could not be regarded as binding the States beforehand. Lastly, the applications had been lodged on 25&#xa0;January 1990, more than six months after Turkey’s acceptance of the right to individual petition, and so were out of time.</p><p >(i)&#xa0;&#xa0;Legal interest: For the purposes of Article 35 §&#xa0;2&#xa0;(b) of the Convention, an application was only “substantially the same” as another which had already been examined if it concerned substantially not only the same facts and complaints but was introduced by the same persons. An inter-State application did not, therefore, deprive individual applicants of the possibility of introducing, or pursuing, their own claims. As to the question whether the applications should be struck from the Court’s list under Article 37 §&#xa0;1&#xa0;(c), the findings in the fourth inter-State case had not specified in respect of which individual missing persons they were made. Moreover, in individual applications, the Court had the competence to issue just satisfaction awards to individual applicants and to indicate measures under Article&#xa0;46. A legal interest therefore remained in pursuing the examination of the applications.</p><p >Conclusion: preliminary objection dismissed (sixteen votes to one).</p><p >(ii)&#xa0;&#xa0;Temporal jurisdiction: The procedural obligation to carry out an investigation into deaths under Article 2 had evolved into a separate and autonomous duty and could be considered a “detachable obligation” capable of binding the State even when the death took place before the entry into force of the Convention (see Šilih v.&#xa0;Slovenia [GC], no.&#xa0;71463/01, 9&#xa0;April 2009, Information Note no.&#xa0;118). It was immaterial that that procedural obligation had only developed in the Court’s case-law after Turkey’s acceptance of the right of individual petition as case-law was a means of clarifying pre-existing texts to which the principle of non-retroactivity did not apply in the same manner as to legislative enactments.</p><p >As to the argument that the missing men had to be presumed dead long before any temporal jurisdiction had arisen in 1987, the Court distinguished between the making of a factual presumption and the legal consequences that flowed from it. The procedural obligation to investigate disappearances in life-threatening circumstances could hardly come to an end on discovery of the body or the presumption of death as an obligation to account for the disappearance and death, and to identify and prosecute any perpetrator of unlawful acts, would generally remain. Accordingly, even though a lapse of over thirty-four years without any news could provide strong circumstantial evidence of intervening death, this did not remove the procedural obligation to investigate.</p><p >Further, there was an important distinction to be drawn between the obligation to investigate a suspicious death and the obligation to investigate a suspicious disappearance. A disappearance was a distinct phenomenon, characterised by an ongoing situation of uncertainty and unaccountability in which there was a lack of information or even a deliberate concealment and obfuscation of what had occurred. It was not an “instantaneous” act or event; the additional distinctive element of subsequent failure to account for the whereabouts and fate of the missing person gave rise to a continuing situation, with the procedural obligation potentially persisting as long as the fate of the missing person was unaccounted for, even where death was presumed. In that connection, the requirement for proximity of the death and investigative steps to the date of entry into force of the Convention (see Šilih) applied only in the context of killings or suspicious deaths.</p><p >Conclusion: preliminary objection dismissed (sixteen votes to one).</p><p >(iii)&#xa0;&#xa0;Six-month rule: Applicants in disappearance cases had to make proof of a certain amount of diligence and initiative and introduce their complaints without undue delay. While the standard of expedition expected of relatives should not be too rigorous in view of the serious nature of disappearance offences, applications could be rejected where there had been excessive or unexplained delay by applicants who were, or should have been, aware that no investigation had been instigated or that it had lapsed into inaction or become ineffective and that there was no immediate, realistic prospect of an effective investigation in the future. When that stage was reached depended on the circumstances of the particular case.</p><p >In the exceptional circumstances of the instant case, which involved an international conflict with no normal investigative procedures available, it had been reasonable for the applicants to await the outcome of the Government and United Nations initiatives, as these could have resulted in steps being taken to investigate known sites of mass graves and provided the basis for further measures. While it must have been apparent by the end of 1990 that those processes no longer offered any realistic hope of progress in either finding bodies or accounting for the fate of their relatives in the near future, the applicants had applied to the Court in January of that year. Accordingly, they had, in the special circumstances of the case, acted with reasonable expedition.</p><p >Conclusion: preliminary objection dismissed (fifteen votes to two).</p><p >(b)&#xa0;&#xa0;Merits</p><p >Article 2: The Court was satisfied that there was an at least arguable case that the missing men had last been seen in an area under, or about to come under, the control of the Turkish armed forces. Whether they had died or been taken prisoner, those men still had to be accounted for. Article 2 had to be interpreted in so far as possible in the light of the general principles of international law, including the rules of international humanitarian law, which played an indispensable and universally-accepted role in mitigating the savagery and inhumanity of armed conflict. In a zone of international conflict Contracting States were under obligation to protect the lives of those not, or no longer, engaged in hostilities. That obligation also extended to the provision of medical assistance to the wounded, the proper disposal of remains and the provision of information on the identity and fate of those concerned. The respondent Government had not produced any evidence or convincing explanation to counter the applicants’ claims that the missing men had disappeared in areas under the former’s exclusive control. As the disappearances had occurred in life-threatening circumstances where the conduct of military operations was accompanied by widespread arrests and killings, Article&#xa0;2 imposed a continuing obligation on the respondent Government to account for the missing men’s whereabouts and fate.</p><p >On the question of compliance with that obligation, the Court fully acknowledged the importance of the CMP’s ongoing exhumations and identifications of remains and gave full credit to the work being done in providing information and returning remains to relatives. It noted, however, that while the CMP’s work was an important first step in the investigative process, it was not sufficient to meet the Government’s obligation under Article&#xa0;2 to carry out effective investigations. From the materials provided in respect of one of the missing men, Mr Hadjipanteli, it appeared that the procedure on identification of remains was to issue a medical certificate of death, briefly indicating the fatal injuries. There was, however, no report analysing the circumstances or even the dating of death and no investigative measures to locate or question witnesses. Thus, even though the location of the body had been established it could not be said that any clear light had been shed on how the victim had met his fate.</p><p >While recognising the considerable difficulty in assembling evidence and mounting a case so long after the events, the Court reiterated that to be effective an investigation had to be capable of leading to a determination of whether the death was caused unlawfully and, if so, to the identification and punishment of those responsible. There was no indication that the CMP had gone beyond its limited terms of reference and no other body or authority had taken on the role of determining the facts or collecting and assessing evidence with a view to a prosecution. While an investigation might prove inconclusive, such an outcome was not inevitable and the respondent Government could not be absolved from making the requisite efforts. The fact that both sides in the conflict may have preferred a “politically-sensitive” approach and that the CMP with its limited remit was the only solution which could be agreed under the brokerage of the UN could have no bearing on the application of the Convention. There had thus been a continuing failure to effectively investigate the fate of the nine missing men.</p><p >Conclusion: continuing procedural violation (sixteen votes to one).</p><p >Article 3: The Court found no reason to differ from its finding in the fourth inter-State case that the Turkish authorities’ silence in the face of the real concerns of the applicants over the fate of their missing relatives could only be categorised as inhuman treatment.</p><p >Conclusion: continuing violation (sixteen votes to one).</p><p >Article 5: There was an arguable case that two of the missing men, both of whom had been included on International Red Cross lists as detainees, had last been seen in circumstances falling within the control of the Turkish or Turkish-Cypriot forces. However, the Turkish authorities had not acknowledged their detention, nor had they provided any documentary evidence giving official trace of their movements. While there had been no evidence that any of the missing persons had been in detention in the period under the Court’s consideration, the Turkish Government had to show that they had carried out an effective investigation into the arguable claim that the two missing men had been taken into custody and had not been seen subsequently. The Court’s findings above in relation to Article&#xa0;2 left no doubt that the authorities had also failed to conduct the necessary investigation in that regard.</p><p >Conclusion: continuing violation in respect of two of the missing men (sixteen votes to one).</p><p >Article 41: EUR 12,000 in respect of non-pecuniary damage to each of the applicants, in view of the grievous nature of the case and decades of uncertainty the applicants had endured. The Court explained that it did not apply specific scales of damages to awards in disappearance cases, but was guided by equity, which involved flexibility and an objective consideration of what was just, fair and reasonable in all the circumstances.</p><p >&#xa0;</p><p >© Council of Europe/European Court of Human Rights<br />This summary by the Registry does not bind the Court.</p><p >Click here for the <a href=\"http://www.echr.coe.int/ECHR/EN/Header/Case-Law/Case-law+analysis/Information+notes/\">Case-Law Information Notes</a></p><p >&#xa0;</p></div>"
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
				"creators": [],
				"dateDecided": "1995-03-23",
				"abstractNote": "Question of procedure rejected (locus standi of the applicant Government); Preliminary objection rejected (abuse of process); Preliminary objection rejected (ratione loci); Preliminary objection joined to merits (ratione temporis)",
				"court": "ECtHR [GC]",
				"docketNumber": "15318/89",
				"language": "eng",
				"url": "https://hudoc.echr.coe.int/eng?i=001-57920",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1> HUDOC Legal Summary </h1> <br/>\r\n<div><p >Information Note on the Court’s case-law No.</p><p >March 1995</p><p >Loizidou v. Turkey (preliminary objections) - 15318/89</p><p >Judgment 23.3.1995 [GC]</p><p >Article 1</p><p >Jurisdiction of states</p><p >Jurisdiction of Turkey in case concerning access to property in northern Cyprus</p><p >Article 35</p><p >Article 35-3</p><p >Ratione temporis</p><p >Restrictions ratione temporis des déclarations turques relatives à la Convention: preliminary objection joined to the merits</p><p >[This summary is extracted from the Court’s official reports (Series A or Reports of Judgments and Decisions). Its formatting and structure may therefore differ from the Case-Law Information Note summaries.]</p><p >I.STANDING OF THE APPLICANT GOVERNMENT</p><p >The applicant Government have been recognised by the international community as the Government of the Republic of Cyprus.  </p><p >Conclusion: their locus standi as the Government of a High Contracting Party not in doubt.</p><p >II.ALLEGED ABUSE OF PROCESS</p><p >Since objection not raised before the Commission the Turkish Government is estopped from raising it before the Court in so far as it applies to the applicant.</p><p >In so far as objection is directed to the applicant Government, the Court notes that this Government have referred the case to the Court inter alia because of concern for the rights of the applicant and other citizens in the same situation.  Such motivation not an abuse of Court's procedures.</p><p >Conclusion: objection rejected (unanimously).</p><p >III.THE TURKISH GOVERNMENT'S ROLE IN THE PROCEEDINGS</p><p >Not within the discretion of a Contracting Party to characterise its standing in the proceedings before the Court in the manner it sees fit.  Case originates in a petition made under Article&#xa0;25 against Turkey in her capacity as a High Contracting Party and has been referred to the Court under Article&#xa0;48&#xa0;(b) by another High Contracting Party.</p><p >Conclusion: Turkey is the respondent party in this case.</p><p >IV.SCOPE OF THE CASE</p><p >The applicant Government have confined themselves to seeking a ruling on the complaints under Article 1 of Protocol No. 1 and Article 8, in so far as they have been declared admissible by the Commission, concerning access to the applicant's property.</p><p >Not necessary to give a general ruling on the question whether it is permissible to limit a referral to the Court to some of the issues on which the Commission has stated its opinion.</p><p >Conclusion: only the above complaints are before the Court.  </p><p >V.OBJECTIONS RATIONE LOCI</p><p >A.Whether the facts alleged by the applicant are capable of falling within the jurisdiction of Turkey under Article 1 of the Convention</p><p >Court is not called upon at the preliminary objections stage to examine whether Turkey is actually responsible.  This falls to be determined at the merits phase. Its enquiry is limited to determining whether the matters complained of are capable of falling within the \"jurisdiction\" of Turkey even though they occur outside her national territory.</p><p >The concept of \"jurisdiction\" under Article&#xa0;1 is not restricted to the national territory of the High Contracting Parties.  Responsibility may also arise when as a consequence of military action, whether lawful or unlawful, a Contracting Party exercises effective control of an area outside its national territory.</p><p >Not disputed that the applicant was prevented by Turkish troops from gaining access to her property. </p><p >Conclusion: facts alleged by the applicant are capable of falling within Turkish \"jurisdiction\" within the meaning of Article 1 (sixteen votes to two).  </p><p >B.Validity of the territorial restrictions attached to Turkey's Article 25 and 46 declarations</p><p >Court has regard to the special character of the Convention as a treaty for the collective enforcement of human rights; the fact that it is a living instrument to be interpreted in the light of present-day conditions.  In addition, its provisions are to be interpreted and applied so as to make its safeguards effective.</p><p >Court seeks to ascertain the ordinary meaning given to Articles 25 and 46 in their context and in the light of their object and purpose.  Regard also had to subsequent practice in the application of the treaty. </p><p >If Articles 25 and 46 were to be interpreted as permitting restrictions (other than of a temporal nature) States would be enabled to qualify their consent under the optional clauses.  This would severely weaken the role of the Commission and Court and diminish the effectiveness of the Convention as a constitutional instrument of European public order.  The consequences for the enforcement of the Convention would be so far-reaching that a power should have been expressly provided for.  No such provision in either Article 25 or 46.</p><p >The subsequent practice of Contracting Parties of not attaching restrictions ratione loci or ratione materiae confirms the view that these are not permitted. </p><p >Not contested that Article 46 of the Convention was modelled on Article 36 of the Statute of the International Court of Justice.  However, the fundamental difference in the role and purpose of the respective tribunals, coupled with the existence of a practice of unconditional acceptance, provides a compelling basis for distinguishing Convention practice from that of the International Court.</p><p >Finally, the application of Article 63 § 4, by analogy, does not provide support for the claim that a territorial restriction is permissible.</p><p >C.Validity of the Turkish declarations under Articles&#xa0;25 and 46</p><p >Court does not consider that the issue of the severability of the invalid parts of Turkey's declarations can be decided by reference to the statements of her representatives expressed subsequent to the filing of the declarations.  Turkey must have been aware, in view of the consistent practice of Contracting Parties, that the impugned clauses were of questionable validity.  </p><p >Court finds that the impugned restrictions can be separated from the remainder of the text, leaving intact the acceptance of the optional clauses.</p><p >Conclusion: the territorial restrictions are invalid but the declarations under Articles 25 and 46 contain valid acceptances of the competence of the Commission and Court (sixteen votes to two).</p><p >VI.OBJECTION RATIONE TEMPORIS</p><p >The correct interpretation and application of the restrictions ratione temporis, in the Turkish declarations under Articles 25 and 46, and the notion of continuing violations of the Convention, raise difficult legal and factual questions.  On the present state of the file, Court does not have sufficient elements enabling it to decide these questions.</p><p >Conclusion: objection joined to the merits of the case (unanimously).</p><p >&#xa0;</p><p >© Council of Europe/European Court of Human Rights<br />This summary by the Registry does not bind the Court.</p><p >Click here for the <a href=\"http://www.echr.coe.int/ECHR/EN/Header/Case-Law/Case-law+analysis/Information+notes/\">Case-Law Information Notes</a></p><p >&#xa0;</p></div>"
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
				"creators": [],
				"dateDecided": "2010-01-22",
				"court": "ECtHR [GC]",
				"language": "eng",
				"url": "https://hudoc.echr.coe.int/eng?i=003-3004688-3312583",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
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
		"url": "https://hudoc.echr.coe.int/eng#{%22itemid%22:[%22001-194320%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Romeo Castaño c. Belgique",
				"creators": [],
				"dateDecided": "2019-07-09",
				"abstractNote": "Violation de l'article 2 - Droit à la vie (Article 2-1 - Enquête effective) (Volet procédural); Préjudice moral - réparation (Article 41 - Préjudice moral; Satisfaction équitable)",
				"court": "ECtHR",
				"docketNumber": "8351/17",
				"language": "fre",
				"url": "https://hudoc.echr.coe.int/eng?i=001-194320",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1> HUDOC Legal Summary </h1> <br/>\r\n<div><p >Note d’information sur la jurisprudence de la Cour 231</p><p >Juillet 2019</p><p >Romeo Castaño c. Belgique - 8351/17</p><p >Arrêt 9.7.2019 [Section II]</p><p >Article 1</p><p >Juridiction des États</p><p >Juridiction de la Belgique née du refus d’exécuter un mandat d’arrêt européen, empêchant une enquête sur un meurtre en Espagne</p><p >Article 2</p><p >Article 2-1</p><p >Enquête effective</p><p >Refus d’exécuter un mandat d’arrêt européen, empêchant une enquête sur un meurtre en Espagne, au motif insuffisamment étayé du risque de mauvaises conditions de détention&#xa0;: violation</p><p >En fait – En 1981, le père des requérants fut assassiné par un commando appartenant à l’organisation terroriste ETA. En 2007, tous les membres du commando furent condamnés par la justice espagnole, hormis N.J.E., qui s’est réfugiée en Belgique. </p><p >Des mandats d’arrêt européens (ci-après «&#xa0;MAE&#xa0;») ont été décernés par un juge d’instruction espagnol en 2004, 2005 et 2015 à l’encontre de N.J.E. aux fins de poursuites pénales. Mais en 2013 et 2016, la chambre des mises en accusation belge refusa toutefois l’exécution des MAE estimant qu’il y avait de sérieux motifs de croire que l’exécution du MAE porterait atteinte aux droits fondamentaux de N.J.E. Le parquet fédéral belge se pourvut en cassation contre ces arrêts. Mais la Cour de cassation rejeta les pourvois en 2013 et 2016.</p><p >Les requérants se plaignent que l’Espagne ait été empêchée de poursuivre N.J.E. par le refus des autorités belges d’exécuter les MAE, système mis en place au sein de l’Union européenne (UE).</p><p >En droit</p><p >Article 1 (compétence ratione loci)&#xa0;: Le grief que les requérants tirent de l’article&#xa0;2 de la Convention à l’égard de la Belgique concerne le manquement allégué des autorités belges à coopérer avec les autorités espagnoles en prenant les mesures nécessaires pour permettre que l’auteure présumée de l’assassinat de leur père, réfugiée en Belgique, soit jugée en Espagne. Il ne repose donc pas sur l’affirmation d’un manquement de la Belgique à une éventuelle obligation procédurale d’enquêter elle-même sur cet assassinat.</p><p >Dans le cadre de l’existence d’engagements de coopération en matière pénale liant les deux États concernés par le biais du MAE, les autorités belges ont été informées de l’intention des autorités espagnoles de poursuivre N.J.E., et sollicitées de procéder à son arrestation et à sa remise.</p><p >Ces circonstances suffisent à considérer qu’un lien juridictionnel existe entre les requérants et la Belgique au sens de l’article&#xa0;1 concernant le grief soulevé par les requérants sous l’angle du volet procédural de l’article&#xa0;2.</p><p >Conclusion&#xa0;: exception préliminaire rejetée (unanimité).</p><p >Article 2 (volet procédural)&#xa0;: Dans le cadre de l’exécution d’un MAE par un État membre de l’UE, il convient de ne pas appliquer le mécanisme de reconnaissance mutuelle de manière automatique et mécanique, au détriment des droits fondamentaux. Compte tenu de la présomption de respect par l’État d’émission des droits fondamentaux qui prévaut dans la logique de la confiance mutuelle entre États membres de l’UE, le refus de remise doit être justifié par des éléments circonstanciés indiquant un danger manifeste pour les droits fondamentaux de l’intéressé de nature à renverser ladite présomption. En l’espèce, les juridictions belges ont justifié leur décision de refus d’exécuter les MAE émis par le juge d’instruction espagnol en raison du risque, en cas de remise à l’Espagne, que N.J.E. y subisse une détention dans des conditions contraires à l’article&#xa0;3 de la Convention. Cette justification peut constituer un motif légitime pour refuser l’exécution du MAE, et donc pour refuser la coopération avec l’Espagne. Encore faut-il, vu la présence de droits de tiers, que le constat d’un tel risque repose sur des bases factuelles suffisantes.</p><p >La chambre des mises en accusation s’est fondée essentiellement sur des rapports internationaux en date de 2011 à 2014 ainsi que sur le contexte de «&#xa0;l’histoire politique contemporaine de l’Espagne&#xa0;». Elle n’a pas procédé à un examen actualisé et circonstancié de la situation qui prévalait en 2016 et n’a pas cherché à identifier un risque réel et individualisable de violation des droits de la Convention dans le cas de N.J.E. ni des défaillances structurelles quant aux conditions de détention en Espagne.</p><p >De nombreux MAE ont été émis et exécutés précédemment à l’égard de membres présumés de l’ETA sans que les pays d’exécution des MAE, dont la Belgique, y aient vu des risques de violation des droits fondamentaux des personnes faisant l’objet de la remise.</p><p >Les circonstances de l’espèce et les intérêts en cause auraient dû amener les autorités belges, en faisant usage de la possibilité que la loi nationale leur donnait, à demander des informations complémentaires quant à l’application du régime de détention dans le cas de N.J.E., plus particulièrement quant à l’endroit et aux conditions de détention, afin de vérifier l’existence d’un risque concret et réel de violation de la Convention en cas de remise.</p><p >Ainsi, l’examen effectué par les juridictions belges lors des procédures de remise n’a pas été assez complet pour considérer le motif invoqué par elles pour refuser la remise de N.J.E. au détriment des droits des requérants comme reposant sur une base factuelle suffisante. La Belgique a donc manqué à l’obligation de coopérer qui découlait pour elle du volet procédural de l’article&#xa0;2 et il y a eu violation de cette disposition.</p><p >Ce constat n’implique pas nécessairement que la Belgique ait l’obligation de remettre N.J.E. aux autorités espagnoles. C’est l’insuffisance de la base factuelle du motif pour refuser la remise qui a conduit la Cour à constater une violation de l’article&#xa0;2. Cela n’enlève rien à l’obligation des autorités belges de s’assurer qu’en cas de remise aux autorités espagnoles N.J.E. ne courra pas de risque de traitement contraire à l’article&#xa0;3. Plus généralement, le présent arrêt ne saurait être interprété comme réduisant l’obligation des États de ne pas extrader une personne vers un pays qui demande son extradition lorsqu’il y a des motifs sérieux de croire que l’intéressé, si on l’extrade vers ce pays, y courra un risque réel d’être soumis à un traitement contraire à l’article&#xa0;3, et donc de s’assurer qu’un tel risque n’existe pas.</p><p >Conclusion&#xa0;: violation (unanimité).</p><p >Article 41&#xa0;: 5&#xa0;000 EUR à chacun des requérants pour préjudice moral.</p><p >(Voir aussi Soering c. Royaume-Uni, <a  href=\"http://hudoc.echr.coe.int/fre?i=001-62176\">14038/88</a>, 7&#xa0;juillet 1989&#xa0;; Mamatkoulov et Askarov c.&#xa0;Turquie [GC], 46827/99 et 46951/99, 4&#xa0;février 2005, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-4001\">Note d’information&#xa0;72</a>&#xa0;; Rantsev c.&#xa0;Chypre et Russie, 25965/04, 7&#xa0;janvier 2010, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-1143\">Note d’information 126</a>&#xa0;; Trabelsi c.&#xa0;Belgique, 140/10, 4&#xa0;septembre 2014, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-10080\">Note d’information 177</a>&#xa0;; Avotiņš c.&#xa0;Lettonie [GC], 17502/07, 23&#xa0;mai 2016, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-11062\">Note d’information 196</a>&#xa0;; Pirozzi c.&#xa0;Belgique, <a  href=\"http://hudoc.echr.coe.int/fre?i=001-182231\">21055/11</a>, 17&#xa0;avril 2018&#xa0;; et Güzelyurtlu et autres c.&#xa0;Chypre et Turquie [GC], 36925/07, 29&#xa0;janvier 2019, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-12316\">Note d’information 225</a>&#xa0;; ainsi que la fiche thématique <a  href=\"https://www.echr.coe.int/Documents/FS_European_Union_FRA.pdf\">Jurisprudence relative à l’Union européenne</a>)</p><p >&#xa0;</p><p >© Conseil de l’Europe/Cour européenne des droits de l’homme<br />Rédigé par le greffe, ce résumé ne lie pas la Cour.</p><p >Cliquez ici pour accéder aux <a  href=\"http://www.echr.coe.int/NoteInformation/fr\">Notes d'information sur la jurisprudence</a></p></div>"
					}
				],
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
				"creators": [],
				"dateDecided": "2016-09-02",
				"abstractNote": "Communicated",
				"court": "ECtHR",
				"docketNumber": "4871/16",
				"language": "eng",
				"url": "https://hudoc.echr.coe.int/eng?i=001-166884",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
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
		"url": "https://hudoc.echr.coe.int/fre#{%22itemid%22:[%22001-207757%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Georgia v. Russia (ii)",
				"creators": [],
				"dateDecided": "2021-01-21",
				"abstractNote": "Preliminary objections dismissed (Art. 35) Admissibility criteria; (Art. 35-1) Exhaustion of domestic remedies; Remainder inadmissible (Art. 35) Admissibility criteria; (Art. 35-3-a) Ratione loci; Violation of Article 2 - Right to life (Article 2-1 - Life; Article 2-2 - Use of force) (Substantive aspect); Violation of Article 3 - Prohibition of torture (Article 3 - Degrading treatment; Inhuman treatment) (Substantive aspect); Violation of Article 8 - Right to respect for private and family life (Article 8-1 - Respect for home); Violation of Article 1 of Protocol No. 1 - Protection of property (Article 1 para. 1 of Protocol No. 1 - Peaceful enjoyment of possessions); Violation of Article 3 - Prohibition of torture (Article 3 - Degrading treatment; Inhuman treatment) (Substantive aspect); Violation of Article 5 - Right to liberty and security (Article 5-1 - Liberty of person); Violation of Article 3 - Prohibition of torture (Article 3 - Torture) (Substantive aspect); Violation of Article 2 of Protocol No. 4 - Freedom of movement-{general}; No violation of Article 2 of Protocol No. 1 - Right to education-{general} (Article 2 of Protocol No. 1 - Right to education); Violation of Article 2 - Right to life (Article 2-1 - Effective investigation) (Procedural aspect); Violation of Article 38 - Examination of the case-{general} (Article 38 - Obligation to furnish all necessary facilities); Just satisfaction reserved (Article 41 - Just satisfaction)",
				"court": "ECtHR [GC]",
				"docketNumber": "38263/08",
				"language": "eng",
				"url": "https://hudoc.echr.coe.int/fre?i=001-207757",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1> HUDOC Legal Summary </h1> <br/>\r\n<div><p >Information Note on the Court’s case-law 247</p><p >January 2021</p><p >Georgia v. Russia (II) [GC] - 38263/08</p><p >Judgment 21.1.2021 [GC]</p><p >Article 1</p><p >Jurisdiction of States</p><p >Jurisdiction of Russia over Abkhazia and South Ossetia during the active phase of hostilities and after their cessation</p><p >Article 2</p><p >Article 2-1</p><p >Effective investigation</p><p >Russia’s failure to comply with procedural obligation to investigate effectively the events that occurred both during the active phase of the hostilities and after their cessation: violation</p><p >Article 2 of Protocol No. 4</p><p >Article 2 para. 1 of Protocol No. 4</p><p >Freedom of movement</p><p >Administrative practice as regards the inability of Georgian nationals to return to their respective homes in Abkhazia and South Ossetia: violation</p><p >Facts – As in the case of Georgia v. Russia (I), the application was lodged in the context of the armed conflict between Georgia and the Russian Federation in August 2008 following an extended period of ever-mounting tensions, provocations and incidents that opposed the two countries.</p><p >The applicant Government submitted that, in the course of indiscriminate and disproportionate attacks by Russian forces and/or by the separatist forces under their control, hundreds of civilians were injured, killed, detained or went missing, thousands of civilians had their property and homes destroyed, and over 300,000 people were forced to leave Abkhazia and South Ossetia. In their submission, these consequences and the subsequent lack of any investigation engaged Russia’s responsibility under Articles 2, 3, 5, 8 and 13 of the Convention, Articles 1 and 2 of Protocol No. 1 and Article 2 of Protocol No. 4.</p><p >Law</p><p >Article 1- Jurisdiction</p><p >The Court made a distinction between the military operations carried out during the active phase of hostilities and the other events which require examining in the context of the present international armed conflict, including those that occurred during the “occupation” phase after the active phase of hostilities had ceased, and the detention and treatment of civilians and prisoners of war, freedom of movement of displaced persons, the right to education and the obligation to investigate.</p><p >Active phase of hostilities during the five-day war (from 8 to 12 August 2008) </p><p >The present case marked the first time since the decision in Banković and Others (concerning the NATO bombing of the Radio‑Television Serbia headquarters in Belgrade) that the Court had been required to examine the question of jurisdiction in relation to military operations (armed attacks, bombing, shelling) in the context of an international armed conflict. However, the Court’s case-law on the concept of extraterritorial jurisdiction had evolved since that decision, in that the Court had, inter alia, established a number of criteria for the exercise of extraterritorial jurisdiction by a State, which had to remain exceptional, the two main criteria being that of “effective control” by the State over an area (spatial concept of jurisdiction) and that of “State agent authority and control” over individuals (personal concept of jurisdiction). Subsequently, in Medvedyev and Others the Court had explicitly reiterated, with reference to the Banković and Others decision, that a State’s responsibility could not be engaged in respect of “an instantaneous extraterritorial act, as the provisions of Article 1 did not admit a ‘cause and effect’ notion of ‘jurisdiction’” (see also also <a  href=\"http://hudoc.echr.coe.int/eng?i=001-202468\">M.N. and Others v. Belgium</a> (dec.) [GC]).</p><p >In that connection it could be considered from the outset that, in the event of military operations – including, for example, armed attacks, bombing or shelling – carried out during an international armed conflict, one could not generally speak of “effective control” over an area. The very reality of armed confrontation and fighting between enemy military forces seeking to establish control over an area in a context of chaos meant that there was no control over an area. It also excluded any form of “State agent authority and control” over individuals. This was also true in the present case, given that the majority of the fighting had taken place in areas that had previously been under Georgian control. This conclusion was confirmed by the practice of the High Contracting Parties in not derogating under Article 15 of the Convention in situations where they had engaged in an international armed conflict outside their own territory. In the Court’s view, this might be interpreted as the High Contracting Parties considering that, in such situations, they did not exercise jurisdiction within the meaning of Article 1.</p><p >However, having regard in particular to the large number of alleged victims and contested incidents, the magnitude of the evidence produced, the difficulty in establishing the relevant circumstances and the fact that such situations were predominantly regulated by legal norms other than those of the Convention (specifically, international humanitarian law or the law of armed conflict), the Court was not in a position to develop its case-law beyond the understanding of the notion of “jurisdiction” as established to date. If, as in the present case, the Court was to be entrusted with the task of assessing acts of war and active hostilities in the context of an international armed conflict outside the territory of a respondent State, it had to be for the Contracting Parties to provide the necessary legal basis for such a task. This did not mean that States could act outside any legal framework; they were obliged to comply with the very detailed rules of international humanitarian law in such a context.</p><p >Conclusion: The events that had occurred during the active phase of the hostilities did not fall within the jurisdiction of the Russian Federation for the purposes of Article 1; inadmissible (eleven votes to six).</p><p >Occupation phase after the cessation of hostilities (ceasefire agreement of 12 August 2008)</p><p >In their observations the respondent Government had acknowledged a substantial Russian military presence after hostilities had ceased, and provided numerous indications showing the extent of the economic and financial support that the Russian Federation had provided and continued to provide to South Ossetia and to Abkhazia. The EU’s Fact-Finding Mission had also pointed to the relationship of dependency not only in economic and financial terms, but also in military and political ones; the information provided by it was also revealing as to the pre-existing relationship of subordination between the separatist entities and the Russian Federation, which had lasted throughout the active phase of the hostilities and after their cessation. &#xa0;In its report, the EU Fact-Finding Mission had referred to “creeping annexation” of South Ossetia and Abkhazia by the Russian Federation.</p><p >The Russian Federation had therefore exercised “effective control”, within the meaning of the Court’s case-law, over South Ossetia, Abkhazia and the “buffer zone” from 12 August to 10 October 2008, the date of the official withdrawal of the Russian troops. Even after that period, the strong Russian presence and the South Ossetian and Abkhazian authorities’ dependency on the Russian Federation, on whom their survival depended, as was shown particularly by the cooperation and assistance agreements signed with the latter, indicated that there had been continued “effective control” over South Ossetia and Abkhazia.</p><p >Conclusion: The events that had occurred after the cessation of hostilities fell within the jurisdiction of the Russian Federation for the purposes of Article 1 (sixteen votes to one).</p><p >Interrelation between the provisions of the Convention and the rules of international humanitarian law (IHL)</p><p >The Court examined the interrelation between the two legal regimes with regard to each aspect of the case and each Convention Article alleged to have been breached. In doing so, it ascertained each time whether there was a conflict between the two legal regimes.</p><p >Definition of the concept of “administrative practice”</p><p >While the criteria set out in <a  href=\"http://hudoc.echr.coe.int/eng?i=001-145546\">Georgia v. Russia (I)</a> [GC] defined a general framework, they did not indicate the number of incidents required to establish the existence of an administrative practice: that was a question left for the Court to assess having regard to the particular circumstances of each case.</p><p >Articles 2, 3 and 8 of the Convention and Article 1 of Protocol No. 1</p><p >Generally speaking, IHL applied in a situation of “occupation”. In the Court’s view, the concept of “occupation” for the purposes of IHL included a requirement of “effective control”. If there was “occupation” for the purposes of IHL there would also be “effective control” within the meaning of the Court’s case-law, although the term “effective control” was broader and covered situations that did not necessarily amount to a situation of “occupation” for the purposes of IHL. Having regard to the complaints raised in the present case, there was no conflict between Articles 2, 3 and 8 of the Convention and Article 1 of Protocol No. 1 and the rules of IHL applicable in a situation of occupation.</p><p >From the time when the Russian Federation had exercised “effective control” over the territories of South Ossetia and the “buffer zone” after the active conduct of hostilities had ceased, it was also responsible for the actions of the South Ossetian forces, including an array of irregular militias, in those territories, without it being necessary to provide proof of “detailed control” of each of those actions. The Court had sufficient evidence in its possession to enable it to conclude beyond reasonable doubt that there had been an administrative practice contrary to Articles 2 and 8 of the Convention and Article 1 of Protocol No. 1 as regards the killing of civilians and the torching and looting of houses in Georgian villages in South Ossetia and in the “buffer zone”. Having regard to the seriousness of the abuses committed, which could be classified as “inhuman and degrading treatment” owing to the feelings of anguish and distress suffered by the victims, who, furthermore, had been targeted as an ethnic group, this administrative practice was also contrary to Article 3.</p><p >Conclusion: violation (sixteen votes to one).</p><p >Articles 3 and 5 (treatment of civilian detainees and lawfulness of their detention)</p><p >There was no conflict between Article 3 and the provisions of IHL, which provided in a general way that detainees were to be treated humanely and detained in decent conditions. As for Article 5, there might be such a conflict (see <a  href=\"http://hudoc.echr.coe.int/eng?i=001-146501\">Hassan v. the United Kingdom</a> [GC], §§ 97-98); however, there was none in the present case since the justification for detaining civilians put forward by the respondent Government was not permitted under either set of rules.</p><p >Some 160 Georgian civilians detained by the South Ossetian forces in the basement of the “Ministry of Internal Affairs of South Ossetia” in Tskhinvali between approximately 10 and 27 August 2008 fell within the jurisdiction of the Russian Federation for the purposes of Article 1. There had been an administrative practice contrary to Article 3 as regards their conditions of detention and the humiliating acts to which they had been exposed, which had to be regarded as inhuman and degrading treatment. There had also been an administrative practice contrary to Article 5 as regards their arbitrary detention.</p><p >Conclusion: violation (unanimously).</p><p >Article 3 (treatment of prisoners of war)</p><p >There was no conflict between Article 3 and the provisions of IHL, which provided that prisoners of war had to be treated humanely and held in decent conditions.</p><p >The Georgian prisoners of war who had been detained in Tskhinvali between 8 and 17 August 2008 by the South Ossetian forces fell within the jurisdiction of the Russian Federation for the purposes of Article 1. There had been an administrative practice contrary to Article 3 as regards the acts of torture of which they had been victims.</p><p >Conclusion: violation (sixteen votes to one).</p><p >Article 2 of Protocol No. 4 (freedom of movement of displaced persons)</p><p >There was no conflict between Article 2 of Protocol No. 4 and the relevant provisions of IHL concerning a situation of occupation.</p><p >A large number of Georgian nationals who had fled the conflict no longer resided in South Ossetia, but in undisputed Georgian territory. However, in the Court’s view, the fact that their respective homes, to which they had been prevented from returning, were situated in areas under the “effective control” of the Russian Federation, and the fact that the Russian Federation exercised “effective control” over the administrative borders, were sufficient to establish a jurisdictional link for the purposes of Article 1 between the Russian Federation and the Georgian nationals in question. There had been an administrative practice contrary to Article 2 of Protocol No. 4 as regards the inability of Georgian nationals to return to their respective homes.</p><p >Conclusion: violation (sixteen votes to one).</p><p >Article 2 of Protocol No. 1 (alleged looting and destruction of public schools and libraries and intimidation of ethnic Georgian pupils and teachers)</p><p >There was no conflict between Article 2 of Protocol No. 1 and the relevant provisions of IHL concerning a situation of occupation.</p><p >The Court did not have sufficient evidence in its possession to conclude beyond reasonable doubt that there had been incidents contrary to Article 2 of Protocol No. 1.</p><p >Conclusion: violation (unanimously).</p><p >Article 2 (obligation to investigate)</p><p >In general, the obligation to carry out an effective investigation under Article 2 was broader than the corresponding obligation in IHL. Otherwise, there was no conflict between the applicable standards in this regard under Article 2 and the relevant provisions of IHL.</p><p >In the present case, in view of the allegations that it had committed war crimes during the active phase of the hostilities, the Russian Federation had an obligation to investigate the events in issue, in accordance with the relevant rules of IHL and domestic law. Indeed, the prosecuting authorities of the Russian Federation had taken steps to investigate those allegations. Furthermore, although the events that had occurred during the active phase of the hostilities did not fall within the jurisdiction of the Russian Federation, it had established “effective control” over the territories in question shortly afterwards. Lastly, given that all the potential suspects among the Russian service personnel were located either in the Russian Federation or in territories under the control of the Russian Federation, Georgia had been prevented from carrying out an adequate and effective investigation into the allegations. Accordingly, having regard to the “special features” of the case, the Russian Federation’s jurisdiction within the meaning of Article 1 was established in respect of this complaint (see, mutatis mutandis, Güzelyurtlu and Others [GC]). </p><p >The Russian Federation had therefore a procedural obligation under Article 2 to carry out an adequate and effective investigation not only into the events that occurred after the cessation of hostilities but also into the events that occurred during the active phase of the hostilities. Having regard to the seriousness of the crimes allegedly committed during the active phase of the hostilities, and the scale and nature of the violations found during the period of occupation, the investigations carried out by the Russian authorities had been neither prompt nor effective nor independent, and accordingly had not satisfied the requirements of Article 2.</p><p >Conclusion: violation (sixteen votes to one).</p><p >Article 38 </p><p >The respondent Government had refused to submit the “combat reports”, on the grounds that the documents in question constituted a “State secret”, despite the practical arrangements proposed by the Court to submit non-confidential extracts. Nor had they submitted any practical proposals of their own to the Court that would have allowed them to satisfy their obligation to cooperate while preserving the secret nature of certain items of information.</p><p >Conclusion: violation (sixteen votes to one).</p><p >The Court also held, unanimously, that there was no need to examine separately the applicant Government’s complaint under Article 13 in conjunction with Articles 3, 5 and 8 and with Articles 1 and 2 of Protocol No. 1 and Article 2 of Protocol No. 4.</p><p >Article 41: reserved. </p><p >(See also <a  href=\"http://hudoc.echr.coe.int/eng?i=001-145546\">Georgia v. Russia (I)</a> [GC], no. 13255/07, ECHR 2014 (extracts), <a  href=\"http://hudoc.echr.coe.int/eng?i=002-9584\">Legal summary</a>; <a  href=\"http://hudoc.echr.coe.int/eng?i=001-146501\">Hassan v. the United Kingdom</a> [GC], no. 29750/09, ECHR 2014, <a  href=\"http://hudoc.echr.coe.int/eng?i=002-10082\">Legal summary</a>; Güzelyurtlu and Others v. Cyprus and Turkey [GC], no. 36925/07, 29 January 2019, <a  href=\"http://hudoc.echr.coe.int/eng?i=002-12315\">Legal summary</a>;  Medvedyev and Others v. France [GC], no. 3394/03, ECHR 2010, Legal summary; Banković and Others (dec), no. 52207/99, 12 December 2001, <a  href=\"https://echr.coe.int/Documents/Reports_Recueil_2001-XII.pdf\">Legal summary</a>;  <a  href=\"http://hudoc.echr.coe.int/eng?i=001-202468\">M.N. and Others v. Belgium</a> (dec.) [GC], no. 3599/18, 5 May 2020, <a  href=\"http://hudoc.echr.coe.int/eng?i=002-12810\">Legal summary</a>)</p><p >&#xa0;</p><p >© Council of Europe/European Court of Human Rights<br />This summary by the Registry does not bind the Court.</p><p >Click here for the <a  href=\"http://www.echr.coe.int/NoteInformation/en\">Case-Law Information Notes</a></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hudoc.echr.coe.int/eng#{%22fulltext%22:[%22r%C3%A9vision%22],%22importance%22:[%221%22],%22documentcollectionid2%22:[%22JUDGMENTS%22],%22itemid%22:[%22001-175647%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Moreira Ferreira c. Portugal (n° 2)",
				"creators": [],
				"dateDecided": "2017-07-11",
				"abstractNote": "Exception préliminaire rejetée (Article 35-3-a - Ratione materiae); Partiellement irrecevable (Article 35-3-a - Ratione materiae); Non-violation de l'article 6 - Droit à un procès équitable (Article 6 - Procédure pénale; Article 6-1 - Accès à un tribunal; Accusation en matière pénale; Procès équitable)",
				"court": "ECtHR [GC]",
				"docketNumber": "19867/12",
				"language": "fre",
				"url": "https://hudoc.echr.coe.int/eng?i=001-175647",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1> HUDOC Legal Summary </h1> <br/>\r\n<div><p >Note d’information sur la jurisprudence de la Cour 209</p><p >Juillet 2017</p><p >Moreira Ferreira c. Portugal (n° 2) [GC] - 19867/12</p><p >Arrêt 11.7.2017 [GC]</p><p >Article 6</p><p >Procédure pénale</p><p >Article 6-1</p><p >Accès à un tribunal</p><p >Accusation en matière pénale</p><p >Procès équitable</p><p >Plainte concernant le refus par une juridiction nationale de rouvrir une procédure pénale suite au constat d’une violation de l’article 6 par la Cour européenne&#xa0;: recevable</p><p >Rejet par la Cour suprême d’une demande de révision d’un jugement pénal suite à un arrêt de la Cour européenne concluant à  violation de l’article 6&#xa0;: non-violation</p><p >En fait – Un arrêt de la Cour suprême du 21&#xa0;mars&#xa0;2012 a rejeté la demande de révision d’un jugement pénal qui avait été présentée par la requérante suite à un arrêt rendu par la Cour européenne des droits de l’homme («&#xa0;la Cour&#xa0;») concluant à une violation de l’article&#xa0;6 §&#xa0;1 (Moreira Ferreira c.&#xa0;Portugal, <a  href=\"http://hudoc.echr.coe.int/fre?i=001-105519\">19808/08</a>, 5&#xa0;juillet&#xa0;2011). Au regard de l’article&#xa0;41, la Cour concluait qu’un nouveau procès ou une réouverture de la procédure à la demande de l’intéressé représenterait en principe un moyen approprié de redresser la violation constatée. À cet égard, elle notait que l’article&#xa0;449 du code de procédure pénale portugais permet la révision d’un procès sur le plan interne lorsque la Cour a constaté la violation des droits et libertés fondamentaux de l’intéressé.</p><p >La Cour suprême a considéré que l’arrêt de la Cour n’était pas inconciliable avec la condamnation qui avait été prononcée à l’encontre de la requérante et ne soulevait pas de doutes graves sur son bien-fondé comme l’exige l’article&#xa0;449 §&#xa0;1&#xa0;g) du code de procédure pénale.</p><p >La requérante se plaint d’une mauvaise interprétation faite par la Cour suprême de l’arrêt de la Cour, emportant une violation des articles 6 §&#xa0;1 et 46 §&#xa0;1 de la Convention. </p><p >En droit – Article&#xa0;6 §&#xa0;1</p><p >a)&#xa0;&#xa0;Recevabilité</p><p >i.&#xa0;&#xa0;L’article&#xa0;46 de la Convention fait-il obstacle à l’examen par la Cour du grief tiré de l’article&#xa0;6 de la Convention&#xa0;? – Le manque d’équité allégué de la procédure conduite dans le cadre de la demande de révision, et plus précisément les erreurs qui, selon la requérante, ont entaché le raisonnement de la Cour suprême, constituent des éléments nouveaux par rapport au précédent arrêt de la Cour.</p><p >Par ailleurs, la procédure de surveillance de l’exécution de l’arrêt, à ce jour pendante devant le Comité des Ministres, n’empêche pas la Cour d’examiner une nouvelle requête dès lors que celle-ci renferme des éléments nouveaux non tranchés dans l’arrêt initial.</p><p >Partant, l’article&#xa0;46 de la Convention ne fait pas obstacle à l’examen par la Cour du grief nouveau tiré de l’article&#xa0;6 de la Convention.</p><p >ii.&#xa0;&#xa0;Le nouveau grief de la requérante est-il compatible ratione materiae avec l’article&#xa0;6 §&#xa0;1 de la Convention&#xa0;? – La Cour suprême doit confronter la condamnation en question aux motifs retenus par la Cour pour conclure à la violation de la Convention. Aussi appelée à statuer sur la demande d’autorisation de révision, la Cour suprême a fait un réexamen sur le fond d’un certain nombre d’éléments de la question litigieuse de la non-comparution de la requérante en appel et des conséquences de cette absence sur le bien-fondé de sa condamnation et de l’établissement de sa peine. Au vu de la portée du contrôle opéré par la haute juridiction, celui-ci doit être considéré comme un prolongement de la procédure close par l’arrêt du 19&#xa0;décembre&#xa0;2007 confirmant la condamnation de la requérante. Ce contrôle a donc une nouvelle fois porté sur le bien-fondé, au sens de l’article&#xa0;6 §&#xa0;1 de la Convention, de l’accusation pénale dirigée contre la requérante. Dès lors, les garanties de l’article&#xa0;6 §&#xa0;1 s’appliquaient à la procédure devant la Cour suprême.</p><p >L’exception du Gouvernement tirée d’une incompétence ratione materiae de la Cour pour connaître du fond du grief soulevé par la requérante sous l’angle de l’article&#xa0;6 de la Convention doit, par conséquence, être rejetée.</p><p >Conclusion&#xa0;: recevable (majorité).</p><p >b)&#xa0;&#xa0;Fond – Selon l’interprétation donnée par la Cour suprême à l’article&#xa0;449 §&#xa0;1&#xa0;g) du code de procédure pénale, les irrégularités procédurales du type de celle constatée en l’espèce n’entraînent pas de plein droit la réouverture de la procédure. </p><p >Cette interprétation, qui a pour conséquence de limiter les cas de réouverture des procédures pénales définitivement closes ou au moins de les assujettir à des critères soumis à l’appréciation des juridictions internes, n’apparaît pas arbitraire et elle est en outre confortée par la jurisprudence constante de la Cour selon laquelle la Convention ne garantit pas le droit à la réouverture d’une procédure ou à d’autres formes de recours permettant d’annuler ou de réviser des décisions de justice définitive et par l’absence d’approche uniforme parmi les États membres quant aux modalités de fonctionnement des mécanismes de réouverture existants. Par ailleurs, un constat de violation de l’article&#xa0;6 de la Convention ne crée pas généralement une situation continue et ne met pas à la charge de l’État défendeur une obligation procédurale continue.</p><p >La chambre, dans son arrêt du 5&#xa0;juillet&#xa0;2011, avait dit qu’un nouveau procès ou une réouverture de la procédure à la demande de l’intéressé représentait «&#xa0;en principe un moyen approprié de redresser la violation constatée&#xa0;». Un nouveau procès ou une réouverture de la procédure étaient ainsi qualifiés de moyens appropriés mais non pas nécessaires ou uniques. De plus, l’emploi de l’expression «&#xa0;en principe&#xa0;» relativise la portée de la recommandation, laissant supposer que dans certaines situations, un nouveau procès ou la réouverture de la procédure n’apparaîtront pas comme des moyens appropriés. Ainsi la Cour s’est abstenue de donner des indications contraignantes quant aux modalités d’exécution de son arrêt et a choisi de laisser à l’État une marge de manœuvre étendue dans ce domaine. En outre, la Cour ne saurait préjuger de l’issue de l’examen par les juridictions internes de la question de l’opportunité d’autoriser, compte tenu des circonstances particulières de l’affaire, le réexamen ou la réouverture.</p><p >Dès lors, la révision du procès n’apparaissait pas comme la seule façon d’exécuter l’arrêt de la Cour du 5&#xa0;juillet&#xa0;2011&#xa0;; elle constituait tout au plus l’option la plus souhaitable dont l’opportunité en l’espèce devait être examinée par les juridictions internes au regard du droit national et des circonstances particulières de l’affaire.</p><p >La Cour suprême, dans la motivation de son arrêt du 21&#xa0;mars&#xa0;2012, a analysé le contenu de l’arrêt de la Cour du 5&#xa0;juillet&#xa0;2011 et en a donné sa propre interprétation. Compte tenu de la marge d’appréciation dont jouissent les autorités internes dans l’interprétation des arrêts de la Cour, à la lumière des principes relatifs à l’exécution, celle-ci estime qu’il n’est pas nécessaire de se prononcer sur la validité de cette interprétation. En effet, il lui suffit de s’assurer que l’arrêt du 21&#xa0;mars&#xa0;2012 n’est pas entaché d’arbitraire, en ce qu’il y aurait eu une déformation ou une dénaturation par les juges de la Cour suprême de l’arrêt rendu par la Cour.</p><p >La Cour ne saurait conclure que la lecture par la Cour suprême de l’arrêt rendu par la Cour en&#xa0;2011, était, dans son ensemble, le résultat d’une erreur de fait ou de droit manifeste aboutissant à un «&#xa0;déni de justice&#xa0;». Eu égard au principe de subsidiarité et aux formules employées par la Cour dans l’arrêt de&#xa0;2011, le refus par la Cour suprême d’octroyer à la requérante la réouverture de la procédure n’a pas été arbitraire. L’arrêt rendu par cette juridiction indique de manière suffisante les motifs sur lesquels il se fonde. Ces motifs relèvent de la marge d’appréciation des autorités nationales et n’ont pas dénaturé les constats de l’arrêt de la Cour.</p><p >Les considérations ci-dessus n’ont pas pour but de nier l’importance qu’il y a à garantir la mise en place de procédures internes permettant le réexamen d’une affaire à la lumière d’un constat de violation de l’article&#xa0;6 de la Convention. Au contraire, de telles procédures peuvent être considérées comme un aspect important de l’exécution de ses arrêts et leur existence démontre l’engagement d’un État contractant de respecter la Convention et la jurisprudence de la Cour.</p><p >Conclusion&#xa0;: non-violation (neuf voix contre huit).</p><p >(Voir aussi Meftah et autres c.&#xa0;France [GC], 32911/96 et al., 26&#xa0;juillet&#xa0;2002, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-5259\">Note d’information&#xa0;44</a>&#xa0;; Lenskaïa c.&#xa0;Russie, 28730/03, 29&#xa0;janvier&#xa0;2009, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-1727\">Note d’information&#xa0;115</a>&#xa0;; Verein gegen Tierfabriken Schweiz (VgT) c.&#xa0;Suisse (no 2) [GC], 32772/02, 30&#xa0;juin&#xa0;2009, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-1482\">Note d’information&#xa0;120</a>&#xa0;; Egmez c.&#xa0;Chypre (déc.), 12214/07, 18&#xa0;septembre&#xa0;2012, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-6465\">Note d’information&#xa0;155</a>&#xa0;; Bochan c.&#xa0;Ukraine (no&#xa0;2) [GC], 22251/08, 5&#xa0;février&#xa0;2015, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-10507\">Note d’information&#xa0;182</a>&#xa0;; et Yaremenko c.&#xa0;Ukraine (no&#xa0;2), <a  href=\"http://hudoc.echr.coe.int/fre?i=001-154306\">66338/09</a>, 30&#xa0;avril&#xa0;2015)</p><p >&#xa0;</p><p >© Conseil de l’Europe/Cour européenne des droits de l’homme<br />Rédigé par le greffe, ce résumé ne lie pas la Cour.</p><p >Cliquez ici pour accéder aux <a  href=\"http://www.echr.coe.int/NoteInformation/fr\">Notes d'information sur la jurisprudence</a></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hudoc.echr.coe.int/fre#{%22tabview%22:[%22document%22],%22itemid%22:[%22001-211069%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Sa Casino, Guichard-Perrachon Et Sas A.m.c. c. France (communiquée)",
				"creators": [],
				"dateDecided": "2021-06-15",
				"abstractNote": "Affaire communiquée",
				"court": "ECtHR",
				"docketNumber": "59031/19",
				"language": "fre",
				"url": "https://hudoc.echr.coe.int/fre?i=001-211069",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
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
		"url": "https://hudoc.echr.coe.int/fre#{%22tabview%22:[%22document%22],%22languageisocode%22:[%22FRE%22],%22documentcollectionid2%22:[%22ADVISORYOPINIONS%22],%22itemid%22:[%22003-6380431-8364345%22]}",
		"defer": true,
		"items": [
			{
				"itemType": "case",
				"caseName": "Avis Consultatif Relatif À La Reconnaissance En Droit Interne D’un Lien De Filiation Entre Un Enfant Né D’une Gestation Pour Autrui Pratiquée À L’étranger Et La Mère D’intention",
				"creators": [],
				"dateDecided": "2019-04-10",
				"court": "ECtHR [GC]",
				"language": "fre",
				"url": "https://hudoc.echr.coe.int/fre?i=003-6380431-8364345",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
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
