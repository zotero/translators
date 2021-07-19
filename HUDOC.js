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
	"lastUpdated": "2021-07-19 13:43:19"
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
	var language = scrapeMetaData(doc, "typedescription");

	//Simpler logic for French that just takes over the type (unless it's a judgment)
	// TODO: Add comprehensive logic like for English
	if (url.includes("hudoc.echr.coe.int/fre#")) {
		if (description.includes("Arrêt")) {
			return "";
		}
		else {
			return " (" + description.split("(")[0].toLowerCase() + ")";
		}
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
	if (description.includes("Communicated")) return " (communicated)"; // TODO: Check if correct
	if (description.includes("Revision")) return " (dec. on revision)"; // TODO: Check if correct
	if (description.includes("Res-")) return " (resolution)"; // TODO: Check if correct, maybe different Zotero type?

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
				//Remove styles and span tags
				text = text
					.replace(/<style>[\s\S]*<\/style>/g, "")
					.replace(/<\/?span[^>]*>/g,"")
					.replace(/class\=\'s\S+\'/g, "");

				item.notes.push({
					title: "HUDOC Legal Summary",
					note: "<h1> HUDOC Legal Summary </h1> </br>" + text
				});

				item.complete();
			});
		}
		else {
			item.complete();
		}
	});
}

// eslint-disable-next-line no-unused-vars: "url"
function detectWeb(doc, url) {
	// We're waiting until the loading symbol is gone
	Zotero.monitorDOMChanges(doc.querySelector("#notification div"), { attributes: true, attributeFiler: ["style"] });

	var docType = scrapeMetaData(doc, "typedescription");

	if (url.includes("hudoc.echr.coe.int/fre#")) {
		//French website
		if ((docType.includes("Arrêt")
			|| docType.includes("Décision")
			|| docType.includes("Avis consultatif")
			|| docType.includes("Res-")
			|| docType.includes("Affaire Communiquée"))
		// Exclude translations and press releases.
		&& !(text(doc, "title").toLowerCase().includes("translation]") // toLowerCase() is added because "translation" is sometimes capitalized
			|| docType.includes("Communiqué de presse"))) {
			return "case";
		}
	}
	else if (url.includes("hudoc.echr.coe.int/eng#")) {
		//English website (so won't work for Spanish or German)
		if ((docType.includes("Judgment")
			|| docType.includes("Decision")
			|| docType.includes("Advisory Opinion")
			|| docType.includes("Res-")
			|| docType.includes("Communicated"))
		// Exclude translations and press releases.
		&& !(text(doc, "title").toLowerCase().includes("translation]") // toLowerCase() is added because "translation" is sometimes capitalized
			|| docType.includes("Press Release"))) {
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
	var item = new Zotero.Item("case");

	// Title
	var capTitle = ZU.capitalizeTitle(text(doc, "title").toLowerCase(), true);

	var splitTitle = capTitle.split(/\(/);

	// If title already contains the type, remove it.
	// Exclude non-split titles and advisory opinions
	if (!(splitTitle.length == 1) &&
			!scrapeMetaData(doc, "typedescription").includes("Advisory Opinion")) {

		let titleVersusMatch = splitTitle.findIndex(function(elem) {
			if (elem.includes("V.") || elem.includes("C.")) {
						return true;
			}
			return false;
		});

		let titleNumMatch = splitTitle.findIndex(function(elem) {
			if (/^(no.|II|IV|V\)|VI|IX|X\))/i.test(elem)) {
						return true;
			}
			return false;
		});

		let titleIndex = Math.max(titleVersusMatch, titleNumMatch);


		capTitle = splitTitle.slice(0, titleIndex+1).join("(");
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
		item.court = "ECtHR";
	}
	else {
		if (text(doc, "title").includes("Advisory Opinion")) {
			item.court = "ECtHR [GC]";
		}
		else if (court.includes("Grand Chamber")) {
			item.court = "ECtHR [GC]";
		}
		else if (court.includes("Commission")) {
			item.court = "Commission";
		}
		else if (court == "Committee of Ministers") {
			item.court = "Committee of Ministers";
		}
		else {
			item.court = "ECtHR";
		}
	}

	// Date of decision
	// convert to simple ISO: yyyy-mm-dd dd.mm.yyyy.
	item.dateDecided = scrapeMetaData(doc, "judgementdate").split("/").reverse().join('-');

	item.url = "http://hudoc.echr.coe.int/eng?i=" + getItemID(url);

	// Query remaining metadata from API
	var queryUrl = "https://hudoc.echr.coe.int/app/query/results?query=(contentsitename=ECHR) AND "
					+ getItemID(url)
					+ "&select=appno,conclusion,docname,languageisocode" // Adapt based on what is needed
					+ "&sort=&start=0&length=1";

	ZU.doGet(queryUrl, function (json) {
		json = JSON.parse(json).results[0].columns;

		Zotero.debug("Queried HUDOC API at: " + queryUrl);

		// Application numbers
		// FIXME: Decide whether to prepend "app. no.". Some styles automatically add "no." (Chicago)
		// while most others do not (OSCOLA, APA).
		var appno = json.appno.split(";");
		if (appno.toString().length !== 0) { // Only if not empty
			if (appno.length > 1) {
				var length = appno.length;
				var commaPart = appno.slice(0, length - 1);
				var appnos = commaPart.join(", ") + " and " + appno[length - 1].toString();

				item.docketNumber = "app. nos. " + appnos;
			} else {
				item.docketNumber = "app. no. " + appno;
			}
		}

		// Abstract
		item.abstractNote = json.conclusion.replace(/;/g, "; ");

		// Language
		item.language = json.languageisocode.toLowerCase();

		// Download PDF
		var docname = json.docname;

		var pdfurl = "https://hudoc.echr.coe.int/app/conversion/docx/pdf?library=ECHR&id="
					+ getItemID(url) + "&filename=" + docname + ".pdf";

		pdfurl = encodeURI(pdfurl); // the "docname" may contain chars not part of the URI schema

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
				"docketNumber": "app. nos. 16064/90, 16065/90, 16066/90, 16068/90, 16069/90, 16070/90, 16071/90, 16072/90 and 16073/90",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-94162",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p >Information Note on the Court’s case-law No. 122</p><p >August-September 2009</p><p >Varnava and Others v. Turkey [GC] - 16064/90, 16065/90, 16066/90 et al.</p><p >Judgment 18.9.2009 [GC]</p><p >Article 2</p><p >Positive obligations</p><p >Article 2-1</p><p >Effective investigation</p><p >Failure to conduct effective investigation into fate of Greek Cypriots missing since Turkish military operations in northern Cyprus in 1974: violation</p><p >&#xa0;</p><p >Article 3</p><p >Inhuman treatment</p><p >Silence of authorities in face of real concerns about the fate of Greek Cypriots missing since Turkish military operations in northern Cyprus in 1974: violation</p><p >&#xa0;</p><p >Article 5</p><p >Article 5-1</p><p >Liberty of person</p><p >Failure to conduct effective investigation into arguable claim that missing Greek Cypriots may have been detained during Turkish military operations in northern Cyprus in 1974: violation</p><p >&#xa0;</p><p >Article 35</p><p >Article 35-1</p><p >Six month period</p><p >Application in disappearance case lodged more than six months after the respondent State’s ratification of the right of individual petition: preliminary objection dismissed</p><p >&#xa0;</p><p >Article 35-2</p><p >Same as matter already examined</p><p >Court’s jurisdiction where it had already examined case concerning substantially same facts in an inter-State case: preliminary objection dismissed</p><p >&#xa0;</p><p >Article 35-3</p><p >Ratione temporis</p><p s temporal jurisdiction in respect of disappearances that had occurred some thirteen years before the respondent State recognised the right of individual petition: preliminary objection dismissed</p><p >&#xa0;</p><p >Facts – The applicants were relatives of nine Cypriot nationals who disappeared during Turkish military operations in northern Cyprus in July and August 1974. The facts were disputed. Eight of the missing men were members of the Greek-Cypriot forces and it is alleged by the applicants that they disappeared after being captured and detained by Turkish military forces. Witnesses had testified to seeing them in Turkish prisons in 1974 and some of the men were identified by their families from photographs of Greek-Cypriot prisoners of war that were published in the Greek press. The Turkish Government denied that the men had been taken into captivity by Turkish forces and maintained that they had died in action during the conflict. The ninth missing man, Mr Hadjipanteli, was a bank employee. The applicants alleged that he was one of a group of people taken by Turkish forces for questioning in August 1974 and who had been missing ever since. His body was discovered in 2007 in the context of the activity of the United Nations Committee of Missing Persons in Cyprus (CMP). The CMP was set up in 1981 with the task of drawing up comprehensive lists of missing persons on both sides and specifying whether they were alive or dead. It has no power to attribute responsibility or to make findings as to the cause of death. Mr Hadjipanteli’s remains were exhumed from a mass grave near a Turkish-Cypriot village. A medical certificate indicated that he had received bullet wounds to the skull and right arm and a wound to the right thigh. The Turkish Government denied he had been taken prisoner, noting that his name was not on the list of Greek Cypriots held in the alleged place of detention, which had been visited by the International Red Cross.</p><p >In a judgment of 10 January 2008 (see Information Note no. 104) a Chamber of the Court held that there had been continuing procedural violations of Articles 2 and 5, and a violation of Article 3. It found no substantive violation of Article 5.</p><p >Law</p><p >(a)  Preliminary objections – The respondent Government challenged the Court’s jurisdiction to examine the case on several counts. Firstly, they submitted that there was no legal interest in determining the applications as the Court had already decided the question of the disappearances of all missing Greek Cypriots in the fourth inter-State case (Cyprus v. Turkey [GC], no. 25781/94, 10 May 2001, Information Note no. 30). Secondly, the applications fell outside the Court’s temporal jurisdiction as the missing men had to be presumed to have died long before Turkey’s acceptance of the right of individual petition on 28 January 1987 and there could be no freestanding procedural obligation, divorced from the factual origin of the complaints. In any event, the procedural obligation under Articles 2 and 3 was a recent jurisprudential development and could not be regarded as binding the States beforehand. Lastly, the applications had been lodged on 25 January 1990, more than six months after Turkey’s acceptance of the right to individual petition, and so were out of time.</p><p >(i)  Legal interest: For the purposes of Article 35 § 2 (b) of the Convention, an application was only “substantially the same” as another which had already been examined if it concerned substantially not only the same facts and complaints but was introduced by the same persons. An inter-State application did not, therefore, deprive individual applicants of the possibility of introducing, or pursuing, their own claims. As to the question whether the applications should be struck from the Court’s list under Article 37 § 1 (c), the findings in the fourth inter-State case had not specified in respect of which individual missing persons they were made. Moreover, in individual applications, the Court had the competence to issue just satisfaction awards to individual applicants and to indicate measures under Article 46. A legal interest therefore remained in pursuing the examination of the applications.</p><p >Conclusion: preliminary objection dismissed (sixteen votes to one).</p><p >(ii)  Temporal jurisdiction: The procedural obligation to carry out an investigation into deaths under Article 2 had evolved into a separate and autonomous duty and could be considered a “detachable obligation” capable of binding the State even when the death took place before the entry into force of the Convention (see Šilih v. Slovenia [GC], no. 71463/01, 9 April 2009, Information Note no. 118). It was immaterial that that procedural obligation had only developed in the Court’s case-law after Turkey’s acceptance of the right of individual petition as case-law was a means of clarifying pre-existing texts to which the principle of non-retroactivity did not apply in the same manner as to legislative enactments.</p><p >As to the argument that the missing men had to be presumed dead long before any temporal jurisdiction had arisen in 1987, the Court distinguished between the making of a factual presumption and the legal consequences that flowed from it. The procedural obligation to investigate disappearances in life-threatening circumstances could hardly come to an end on discovery of the body or the presumption of death as an obligation to account for the disappearance and death, and to identify and prosecute any perpetrator of unlawful acts, would generally remain. Accordingly, even though a lapse of over thirty-four years without any news could provide strong circumstantial evidence of intervening death, this did not remove the procedural obligation to investigate.</p><p >Further, there was an important distinction to be drawn between the obligation to investigate a suspicious death and the obligation to investigate a suspicious disappearance. A disappearance was a distinct phenomenon, characterised by an ongoing situation of uncertainty and unaccountability in which there was a lack of information or even a deliberate concealment and obfuscation of what had occurred. It was not an “instantaneous” act or event; the additional distinctive element of subsequent failure to account for the whereabouts and fate of the missing person gave rise to a continuing situation, with the procedural obligation potentially persisting as long as the fate of the missing person was unaccounted for, even where death was presumed. In that connection, the requirement for proximity of the death and investigative steps to the date of entry into force of the Convention (see Šilih) applied only in the context of killings or suspicious deaths.</p><p >Conclusion: preliminary objection dismissed (sixteen votes to one).</p><p >(iii)  Six-month rule: Applicants in disappearance cases had to make proof of a certain amount of diligence and initiative and introduce their complaints without undue delay. While the standard of expedition expected of relatives should not be too rigorous in view of the serious nature of disappearance offences, applications could be rejected where there had been excessive or unexplained delay by applicants who were, or should have been, aware that no investigation had been instigated or that it had lapsed into inaction or become ineffective and that there was no immediate, realistic prospect of an effective investigation in the future. When that stage was reached depended on the circumstances of the particular case.</p><p >In the exceptional circumstances of the instant case, which involved an international conflict with no normal investigative procedures available, it had been reasonable for the applicants to await the outcome of the Government and United Nations initiatives, as these could have resulted in steps being taken to investigate known sites of mass graves and provided the basis for further measures. While it must have been apparent by the end of 1990 that those processes no longer offered any realistic hope of progress in either finding bodies or accounting for the fate of their relatives in the near future, the applicants had applied to the Court in January of that year. Accordingly, they had, in the special circumstances of the case, acted with reasonable expedition.</p><p >Conclusion: preliminary objection dismissed (fifteen votes to two).</p><p >(b)  Merits</p><p >Article 2: The Court was satisfied that there was an at least arguable case that the missing men had last been seen in an area under, or about to come under, the control of the Turkish armed forces. Whether they had died or been taken prisoner, those men still had to be accounted for. Article 2 had to be interpreted in so far as possible in the light of the general principles of international law, including the rules of international humanitarian law, which played an indispensable and universally-accepted role in mitigating the savagery and inhumanity of armed conflict. In a zone of international conflict Contracting States were under obligation to protect the lives of those not, or no longer, engaged in hostilities. That obligation also extended to the provision of medical assistance to the wounded, the proper disposal of remains and the provision of information on the identity and fate of those concerned. The respondent Government had not produced any evidence or convincing explanation to counter the applicants’ claims that the missing men had disappeared in areas under the former’s exclusive control. As the disappearances had occurred in life-threatening circumstances where the conduct of military operations was accompanied by widespread arrests and killings, Article 2 imposed a continuing obligation on the respondent Government to account for the missing men’s whereabouts and fate.</p><p >On the question of compliance with that obligation, the Court fully acknowledged the importance of the CMP’s ongoing exhumations and identifications of remains and gave full credit to the work being done in providing information and returning remains to relatives. It noted, however, that while the CMP’s work was an important first step in the investigative process, it was not sufficient to meet the Government’s obligation under Article 2 to carry out effective investigations. From the materials provided in respect of one of the missing men, Mr Hadjipanteli, it appeared that the procedure on identification of remains was to issue a medical certificate of death, briefly indicating the fatal injuries. There was, however, no report analysing the circumstances or even the dating of death and no investigative measures to locate or question witnesses. Thus, even though the location of the body had been established it could not be said that any clear light had been shed on how the victim had met his fate.</p><p >While recognising the considerable difficulty in assembling evidence and mounting a case so long after the events, the Court reiterated that to be effective an investigation had to be capable of leading to a determination of whether the death was caused unlawfully and, if so, to the identification and punishment of those responsible. There was no indication that the CMP had gone beyond its limited terms of reference and no other body or authority had taken on the role of determining the facts or collecting and assessing evidence with a view to a prosecution. While an investigation might prove inconclusive, such an outcome was not inevitable and the respondent Government could not be absolved from making the requisite efforts. The fact that both sides in the conflict may have preferred a “politically-sensitive” approach and that the CMP with its limited remit was the only solution which could be agreed under the brokerage of the UN could have no bearing on the application of the Convention. There had thus been a continuing failure to effectively investigate the fate of the nine missing men.</p><p >Conclusion: continuing procedural violation (sixteen votes to one).</p><p >Article 3: The Court found no reason to differ from its finding in the fourth inter-State case that the Turkish authorities’ silence in the face of the real concerns of the applicants over the fate of their missing relatives could only be categorised as inhuman treatment.</p><p >Conclusion: continuing violation (sixteen votes to one).</p><p >Article 5: There was an arguable case that two of the missing men, both of whom had been included on International Red Cross lists as detainees, had last been seen in circumstances falling within the control of the Turkish or Turkish-Cypriot forces. However, the Turkish authorities had not acknowledged their detention, nor had they provided any documentary evidence giving official trace of their movements. While there had been no evidence that any of the missing persons had been in detention in the period under the Court’s consideration, the Turkish Government had to show that they had carried out an effective investigation into the arguable claim that the two missing men had been taken into custody and had not been seen subsequently. The Court’s findings above in relation to Article 2 left no doubt that the authorities had also failed to conduct the necessary investigation in that regard.</p><p >Conclusion: continuing violation in respect of two of the missing men (sixteen votes to one).</p><p >Article 41: EUR 12,000 in respect of non-pecuniary damage to each of the applicants, in view of the grievous nature of the case and decades of uncertainty the applicants had endured. The Court explained that it did not apply specific scales of damages to awards in disappearance cases, but was guided by equity, which involved flexibility and an objective consideration of what was just, fair and reasonable in all the circumstances.</p><p >&#xa0;</p><p >© Council of Europe/European Court of Human Rights<br />This summary by the Registry does not bind the Court.</p><p >Click here for the <a href=\"http://www.echr.coe.int/ECHR/EN/Header/Case-Law/Case-law+analysis/Information+notes/\">Case-Law Information Notes</a></p><p >&#xa0;</p></div>"
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
				"docketNumber": "app. no. 15318/89",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-57920",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p >Information Note on the Court’s case-law No.</p><p >March 1995</p><p >Loizidou v. Turkey (preliminary objections) - 15318/89</p><p >Judgment 23.3.1995 [GC]</p><p >Article 1</p><p >Jurisdiction of states</p><p >Jurisdiction of Turkey in case concerning access to property in northern Cyprus</p><p >Article 35</p><p >Article 35-3</p><p >Ratione temporis</p><p >Restrictions ratione temporis des déclarations turques relatives à la Convention: preliminary objection joined to the merits</p><p >[This summary is extracted from the Court’s official reports (Series A or Reports of Judgments and Decisions). Its formatting and structure may therefore differ from the Case-Law Information Note summaries.]</p><p >I.STANDING OF THE APPLICANT GOVERNMENT</p><p >The applicant Government have been recognised by the international community as the Government of the Republic of Cyprus.  </p><p >Conclusion: their locus standi as the Government of a High Contracting Party not in doubt.</p><p >II.ALLEGED ABUSE OF PROCESS</p><p >Since objection not raised before the Commission the Turkish Government is estopped from raising it before the Court in so far as it applies to the applicant.</p><p >In so far as objection is directed to the applicant Government, the Court notes that this Government have referred the case to the Court inter alia because of concern for the rights of the applicant and other citizens in the same situation.  Such motivation not an abuse of Court's procedures.</p><p >Conclusion: objection rejected (unanimously).</p><p >III.THE TURKISH GOVERNMENT'S ROLE IN THE PROCEEDINGS</p><p >Not within the discretion of a Contracting Party to characterise its standing in the proceedings before the Court in the manner it sees fit.  Case originates in a petition made under Article&#xa0;25 against Turkey in her capacity as a High Contracting Party and has been referred to the Court under Article&#xa0;48&#xa0;(b) by another High Contracting Party.</p><p >Conclusion: Turkey is the respondent party in this case.</p><p >IV.SCOPE OF THE CASE</p><p >The applicant Government have confined themselves to seeking a ruling on the complaints under Article 1 of Protocol No. 1 and Article 8, in so far as they have been declared admissible by the Commission, concerning access to the applicant's property.</p><p >Not necessary to give a general ruling on the question whether it is permissible to limit a referral to the Court to some of the issues on which the Commission has stated its opinion.</p><p >Conclusion: only the above complaints are before the Court.  </p><p >V.OBJECTIONS RATIONE LOCI</p><p >A.Whether the facts alleged by the applicant are capable of falling within the jurisdiction of Turkey under Article 1 of the Convention</p><p >Court is not called upon at the preliminary objections stage to examine whether Turkey is actually responsible.  This falls to be determined at the merits phase. Its enquiry is limited to determining whether the matters complained of are capable of falling within the \"jurisdiction\" of Turkey even though they occur outside her national territory.</p><p >The concept of \"jurisdiction\" under Article&#xa0;1 is not restricted to the national territory of the High Contracting Parties.  Responsibility may also arise when as a consequence of military action, whether lawful or unlawful, a Contracting Party exercises effective control of an area outside its national territory.</p><p >Not disputed that the applicant was prevented by Turkish troops from gaining access to her property. </p><p >Conclusion: facts alleged by the applicant are capable of falling within Turkish \"jurisdiction\" within the meaning of Article 1 (sixteen votes to two).  </p><p >B.Validity of the territorial restrictions attached to Turkey's Article 25 and 46 declarations</p><p >Court has regard to the special character of the Convention as a treaty for the collective enforcement of human rights; the fact that it is a living instrument to be interpreted in the light of present-day conditions.  In addition, its provisions are to be interpreted and applied so as to make its safeguards effective.</p><p >Court seeks to ascertain the ordinary meaning given to Articles 25 and 46 in their context and in the light of their object and purpose.  Regard also had to subsequent practice in the application of the treaty. </p><p >If Articles 25 and 46 were to be interpreted as permitting restrictions (other than of a temporal nature) States would be enabled to qualify their consent under the optional clauses.  This would severely weaken the role of the Commission and Court and diminish the effectiveness of the Convention as a constitutional instrument of European public order.  The consequences for the enforcement of the Convention would be so far-reaching that a power should have been expressly provided for.  No such provision in either Article 25 or 46.</p><p >The subsequent practice of Contracting Parties of not attaching restrictions ratione loci or ratione materiae confirms the view that these are not permitted. </p><p >Not contested that Article 46 of the Convention was modelled on Article 36 of the Statute of the International Court of Justice.  However, the fundamental difference in the role and purpose of the respective tribunals, coupled with the existence of a practice of unconditional acceptance, provides a compelling basis for distinguishing Convention practice from that of the International Court.</p><p >Finally, the application of Article 63 § 4, by analogy, does not provide support for the claim that a territorial restriction is permissible.</p><p >C.Validity of the Turkish declarations under Articles&#xa0;25 and 46</p><p >Court does not consider that the issue of the severability of the invalid parts of Turkey's declarations can be decided by reference to the statements of her representatives expressed subsequent to the filing of the declarations.  Turkey must have been aware, in view of the consistent practice of Contracting Parties, that the impugned clauses were of questionable validity.  </p><p >Court finds that the impugned restrictions can be separated from the remainder of the text, leaving intact the acceptance of the optional clauses.</p><p >Conclusion: the territorial restrictions are invalid but the declarations under Articles 25 and 46 contain valid acceptances of the competence of the Commission and Court (sixteen votes to two).</p><p >VI.OBJECTION RATIONE TEMPORIS</p><p >The correct interpretation and application of the restrictions ratione temporis, in the Turkish declarations under Articles 25 and 46, and the notion of continuing violations of the Convention, raise difficult legal and factual questions.  On the present state of the file, Court does not have sufficient elements enabling it to decide these questions.</p><p >Conclusion: objection joined to the merits of the case (unanimously).</p><p >&#xa0;</p><p >© Council of Europe/European Court of Human Rights<br />This summary by the Registry does not bind the Court.</p><p >Click here for the <a href=\"http://www.echr.coe.int/ECHR/EN/Header/Case-Law/Case-law+analysis/Information+notes/\">Case-Law Information Notes</a></p><p >&#xa0;</p></div>"
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
				"url": "http://hudoc.echr.coe.int/eng?i=003-3004688-3312583",
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
				"docketNumber": "app. no. 8351/17",
				"language": "fre",
				"url": "http://hudoc.echr.coe.int/eng?i=001-194320",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p >Note d’information sur la jurisprudence de la Cour 231</p><p >Juillet 2019</p><p >Romeo Castaño c. Belgique - 8351/17</p><p >Arrêt 9.7.2019 [Section II]</p><p >Article 1</p><p >Juridiction des États</p><p >Juridiction de la Belgique née du refus d’exécuter un mandat d’arrêt européen, empêchant une enquête sur un meurtre en Espagne</p><p >Article 2</p><p >Article 2-1</p><p >Enquête effective</p><p >Refus d’exécuter un mandat d’arrêt européen, empêchant une enquête sur un meurtre en Espagne, au motif insuffisamment étayé du risque de mauvaises conditions de détention&#xa0;: violation</p><p >En fait – En 1981, le père des requérants fut assassiné par un commando appartenant à l’organisation terroriste ETA. En 2007, tous les membres du commando furent condamnés par la justice espagnole, hormis N.J.E., qui s’est réfugiée en Belgique. </p><p >Des mandats d’arrêt européens (ci-après «&#xa0;MAE&#xa0;») ont été décernés par un juge d’instruction espagnol en 2004, 2005 et 2015 à l’encontre de N.J.E. aux fins de poursuites pénales. Mais en 2013 et 2016, la chambre des mises en accusation belge refusa toutefois l’exécution des MAE estimant qu’il y avait de sérieux motifs de croire que l’exécution du MAE porterait atteinte aux droits fondamentaux de N.J.E. Le parquet fédéral belge se pourvut en cassation contre ces arrêts. Mais la Cour de cassation rejeta les pourvois en 2013 et 2016.</p><p >Les requérants se plaignent que l’Espagne ait été empêchée de poursuivre N.J.E. par le refus des autorités belges d’exécuter les MAE, système mis en place au sein de l’Union européenne (UE).</p><p >En droit</p><p >Article 1 (compétence ratione loci)&#xa0;: Le grief que les requérants tirent de l’article&#xa0;2 de la Convention à l’égard de la Belgique concerne le manquement allégué des autorités belges à coopérer avec les autorités espagnoles en prenant les mesures nécessaires pour permettre que l’auteure présumée de l’assassinat de leur père, réfugiée en Belgique, soit jugée en Espagne. Il ne repose donc pas sur l’affirmation d’un manquement de la Belgique à une éventuelle obligation procédurale d’enquêter elle-même sur cet assassinat.</p><p >Dans le cadre de l’existence d’engagements de coopération en matière pénale liant les deux États concernés par le biais du MAE, les autorités belges ont été informées de l’intention des autorités espagnoles de poursuivre N.J.E., et sollicitées de procéder à son arrestation et à sa remise.</p><p >Ces circonstances suffisent à considérer qu’un lien juridictionnel existe entre les requérants et la Belgique au sens de l’article&#xa0;1 concernant le grief soulevé par les requérants sous l’angle du volet procédural de l’article&#xa0;2.</p><p >Conclusion&#xa0;: exception préliminaire rejetée (unanimité).</p><p >Article 2 (volet procédural)&#xa0;: Dans le cadre de l’exécution d’un MAE par un État membre de l’UE, il convient de ne pas appliquer le mécanisme de reconnaissance mutuelle de manière automatique et mécanique, au détriment des droits fondamentaux. Compte tenu de la présomption de respect par l’État d’émission des droits fondamentaux qui prévaut dans la logique de la confiance mutuelle entre États membres de l’UE, le refus de remise doit être justifié par des éléments circonstanciés indiquant un danger manifeste pour les droits fondamentaux de l’intéressé de nature à renverser ladite présomption. En l’espèce, les juridictions belges ont justifié leur décision de refus d’exécuter les MAE émis par le juge d’instruction espagnol en raison du risque, en cas de remise à l’Espagne, que N.J.E. y subisse une détention dans des conditions contraires à l’article&#xa0;3 de la Convention. Cette justification peut constituer un motif légitime pour refuser l’exécution du MAE, et donc pour refuser la coopération avec l’Espagne. Encore faut-il, vu la présence de droits de tiers, que le constat d’un tel risque repose sur des bases factuelles suffisantes.</p><p >La chambre des mises en accusation s’est fondée essentiellement sur des rapports internationaux en date de 2011 à 2014 ainsi que sur le contexte de «&#xa0;l’histoire politique contemporaine de l’Espagne&#xa0;». Elle n’a pas procédé à un examen actualisé et circonstancié de la situation qui prévalait en 2016 et n’a pas cherché à identifier un risque réel et individualisable de violation des droits de la Convention dans le cas de N.J.E. ni des défaillances structurelles quant aux conditions de détention en Espagne.</p><p >De nombreux MAE ont été émis et exécutés précédemment à l’égard de membres présumés de l’ETA sans que les pays d’exécution des MAE, dont la Belgique, y aient vu des risques de violation des droits fondamentaux des personnes faisant l’objet de la remise.</p><p >Les circonstances de l’espèce et les intérêts en cause auraient dû amener les autorités belges, en faisant usage de la possibilité que la loi nationale leur donnait, à demander des informations complémentaires quant à l’application du régime de détention dans le cas de N.J.E., plus particulièrement quant à l’endroit et aux conditions de détention, afin de vérifier l’existence d’un risque concret et réel de violation de la Convention en cas de remise.</p><p >Ainsi, l’examen effectué par les juridictions belges lors des procédures de remise n’a pas été assez complet pour considérer le motif invoqué par elles pour refuser la remise de N.J.E. au détriment des droits des requérants comme reposant sur une base factuelle suffisante. La Belgique a donc manqué à l’obligation de coopérer qui découlait pour elle du volet procédural de l’article&#xa0;2 et il y a eu violation de cette disposition.</p><p >Ce constat n’implique pas nécessairement que la Belgique ait l’obligation de remettre N.J.E. aux autorités espagnoles. C’est l’insuffisance de la base factuelle du motif pour refuser la remise qui a conduit la Cour à constater une violation de l’article&#xa0;2. Cela n’enlève rien à l’obligation des autorités belges de s’assurer qu’en cas de remise aux autorités espagnoles N.J.E. ne courra pas de risque de traitement contraire à l’article&#xa0;3. Plus généralement, le présent arrêt ne saurait être interprété comme réduisant l’obligation des États de ne pas extrader une personne vers un pays qui demande son extradition lorsqu’il y a des motifs sérieux de croire que l’intéressé, si on l’extrade vers ce pays, y courra un risque réel d’être soumis à un traitement contraire à l’article&#xa0;3, et donc de s’assurer qu’un tel risque n’existe pas.</p><p >Conclusion&#xa0;: violation (unanimité).</p><p >Article 41&#xa0;: 5&#xa0;000 EUR à chacun des requérants pour préjudice moral.</p><p >(Voir aussi Soering c. Royaume-Uni, <a  href=\"http://hudoc.echr.coe.int/fre?i=001-62176\">14038/88</a>, 7&#xa0;juillet 1989&#xa0;; Mamatkoulov et Askarov c.&#xa0;Turquie [GC], 46827/99 et 46951/99, 4&#xa0;février 2005, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-4001\">Note d’information&#xa0;72</a>&#xa0;; Rantsev c.&#xa0;Chypre et Russie, 25965/04, 7&#xa0;janvier 2010, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-1143\">Note d’information 126</a>&#xa0;; Trabelsi c.&#xa0;Belgique, 140/10, 4&#xa0;septembre 2014, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-10080\">Note d’information 177</a>&#xa0;; Avotiņš c.&#xa0;Lettonie [GC], 17502/07, 23&#xa0;mai 2016, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-11062\">Note d’information 196</a>&#xa0;; Pirozzi c.&#xa0;Belgique, <a  href=\"http://hudoc.echr.coe.int/fre?i=001-182231\">21055/11</a>, 17&#xa0;avril 2018&#xa0;; et Güzelyurtlu et autres c.&#xa0;Chypre et Turquie [GC], 36925/07, 29&#xa0;janvier 2019, <a  href=\"http://hudoc.echr.coe.int/fre?i=002-12316\">Note d’information 225</a>&#xa0;; ainsi que la fiche thématique <a  href=\"https://www.echr.coe.int/Documents/FS_European_Union_FRA.pdf\">Jurisprudence relative à l’Union européenne</a>)</p><p >&#xa0;</p><p >© Conseil de l’Europe/Cour européenne des droits de l’homme<br />Rédigé par le greffe, ce résumé ne lie pas la Cour.</p><p >Cliquez ici pour accéder aux <a  href=\"http://www.echr.coe.int/NoteInformation/fr\">Notes d'information sur la jurisprudence</a></p></div>"
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
				"abstractNote": "Communicated; Communicated",
				"court": "ECtHR",
				"docketNumber": "app. no. 4871/16",
				"language": "eng",
				"url": "http://hudoc.echr.coe.int/eng?i=001-166884",
				"attachments": [
					{
						"title": "HUDOC Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"title": "HUDOC Legal Summary",
						"note": "<h1> HUDOC Legal Summary </h1> </br>\r\n<div><p >Information Note on the Court’s case-law 232</p><p >August-September 2019</p><p >Hanan v. Germany (relinquishment) - 4871/16</p><p >&#xa0;</p><p >Article 1</p><p >Jurisdiction of States</p><p >Responsibility of States</p><p >Jurisdiction as regards the death of civilians in Afghanistan following airstrike under NATO operational command: relinquishment in favour of the Grand Chamber </p><p >Towards the end of 2001 the United Nations Security Council authorised the establishment of an International Security Assistance Force (ISAF) in Afghanistan. Germany authorised the deployment of German forces as part of ISAF, with NATO subsequently taking over command. Parallel to the command structure of ISAF, disciplinary and administrative command and control remained with the respective troop contributing nations. </p><p >On 4 September 2009, following an attack by insurgents on two fuel tankers in the German military sector, a German Colonel ordered two United States Air Force airplanes to bomb the two fuel tankers. During the airstrike, the applicant’s two sons aged eight and twelve were killed. The civilian victims numbered between fourteen and over a hundred, depending on the sources.</p><p >In 2010 the German Federal Prosecutor General instigated a criminal investigation, but finally decided to take no further action on the complaint lodged by the applicant, an Afghan national living in Afghanistan, owing to insufficient incriminating evidence. The Prosecutor General concluded that there had been no intent to kill or harm civilians or to damage property to any degree disproportionate to the military benefit of the airstrike. The Colonel who had issued the order submitted, irrebuttably, that he had acted on the basis of the available information to the effect that the persons present at the fuel tankers were insurgents. The applicant’s appeals were dismissed.</p><p >The applicant submits that the impugned act was imputable to Germany, and that in the context of the airstrike his sons were under German jurisdiction within the meaning of Article&#xa0;1 of the Convention. Under Articles&#xa0;2 and 13 he complains of the lack of an effective investigation into the deaths of his two sons under those circumstances, and of the lack of an effective domestic remedy at his disposal to challenge the decision to take no further action on his complaint. </p><p >In September 2016 the application was communicated to the German Government. On 27 August 2019 the Chamber to which the case had been assigned declined jurisdiction in favour of the Grand Chamber.</p><p >&#xa0;</p><p >© Council of Europe/European Court of Human Rights<br />This summary by the Registry does not bind the Court.</p><p >Click here for the <a  href=\"http://www.echr.coe.int/NoteInformation/en\">Case-Law Information Notes</a></p></div>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
