{
	"translatorID": "1ed36c21-de68-4ba4-a27f-d724ce258db4",
	"label": "Society for Neuroscience Abstract 2016",
	"creator": "Kouchi C. Nakamura, PhD; kouichi.c.nakamura@gmail.com",
	"target": "^https?://www\\.abstractsonline\\.com/pp8/#!/(4036|4376)/presentation/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-09-28 06:13:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Kouichi C. Nakamura, PhD

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
This Zotero translator works with Soceity for Neuroscience Abstract from 2016 onwards

**Caveats**
Does not support "mulitple" yet
Does not support taking a snapshot for "attachments"
The dynamically generated HTML of abstractsonline.com does not allow above operations

supported years: four digits after /pp8/ in the url specifies a year
4376 ... 2017
4071 ... 2016

Ideally "target" should be as below to support "multiple" entries
^https?://www\.abstractsonline\.com/pp8/#!/\d+/(presentation|presentations|sessions|participants)/

If you find a failure or error, please let me know:
Dr Kouichi C. Nakamura
kouichi.c.nakamura@gmail.com
*/


function detectWeb(doc, url) {

	if (url.search(/\/presentation\/\d+/) != -1) {
		return 'conferencePaper';
	} //else if (url.search(/(presentations|session|participant)\/[^\\]+\/\d+/) != -1) {
	//	return 'multiple'; // does not work
	//}
}

function doWeb(doc, url) {

	if (detectWeb(doc,url) == 'conferencePaper') {
		var id = [];
		id[0] = url.match(/\d+$/)[0];
		var baseurl = url.replace(/\d+$/,"");

		scrape(id,baseurl);

	} else if (detectWeb(doc,url) == 'multiple') {
		//TODO does not work properly becuase the page HTML is dynamically generated and
		// ZU.processDocuments() cannot obtain the actual page content from URL.

		var items = {};

		var bodyTitle = ZU.xpath(doc,'//h4[@class="name"]//span[@class="bodyTitle"]');

		for (var i = 0; i < bodyTitle.length; i++) {
			var item = new Zotero.Item("conferencePaper");
			item.title = bodyTitle[i].innerText.replace(/^\d+\.\d+\.\s/,"");

			item.id = ZU.xpath(doc,'//h4[@class="name"]/@data-id')[i].value;

			items[item.id] = item.title;
		}
		//Zotero.debug(items);

		Zotero.selectItems(items, function(selectedItems){

		if(!selectedItems) return true;

			var abstractIDs = [];
			for (var i in selectedItems) {
				abstractIDs.push(i);
				//ZU.processDocuments(i, scrape);
			}

			var baseurl = url.replace(/presentations.+$|sessions.+$|participants.+$/,"presntation/");
			Zotero.debug(baseurl);
			scrape(abstractIDs,baseurl);
		});

	}
}




function scrape(ids,baseurl){

Zotero.debug(ids);

for (k = 0; k < ids.length; k++) {

	var newurl = baseurl + ids[k];
	Zotero.debug(newurl);

	ZU.processDocuments(newurl, function (doc) {
		// NOTE doGet()  html does not contain the actual contents,
		// object is HTTPreqest object, use processDocuments
		//
		// Zotero.debug(doc); //object HTMLDocument
		// Zotero.debug(doc.URL);

		var item = new Zotero.Item("conferencePaper");

		// pages, title
		var color_primary = ZU.xpath(doc,'//h1[@class="color-primary"]');

		//TODO when multiple doc does not contain the contents

		// Zotero.debug(color_primary);
		//TODO does not work for mulitiple

		// var m1 = color_primary[0].innerHTML.match(/^\s*(\d+\.\d+)\n\s*\/\s(\w+\d+)\n\s*\-\s/);

		// 282.18/B8, 1, 3.02
		var m1 = color_primary[0].innerHTML.match(
			/^\s*\n\s*(\d+)(\.(\d+))?\n(\s*\/\s([\w\/\d]+)\n)?\s*-\s/);

		//Zotero.debug(m1);

		var title;
		if (m1 != null ) {
			if (m1[3] != undefined) {
				if (m1[5] != undefined) {
					item.pages = m1[1] + "." + m1[3] + "/" + m1[5];
				} else {
					item.pages = m1[1] + "." + m1[3];
				}
			} else {
				item.pages = m1[1];
			}

			title = color_primary[0].innerHTML.replace(
				/^\s*\n\s*\d+(\.\d+)?\n(\s*\/\s[\w\/\d]+\n)?\s*-\s/,"");
		} else {
			// SPC01, SOC01, SAT02, PDW01

			var m2 = color_primary[0].innerHTML.match(/^[\s\n]*([\w\d]+)\n.+\s*-\s/);
			//Zotero.debug(m2);

			item.pages = m2[1];

			var m3 = color_primary[0].innerHTML.match(/\n\s+-\s(.+)\t+<br>\t/);
			if (m3 != null) {
				title = m3[1];
			} else {
				title = "";
			}
			//Zotero.debug(m3[1]); // null

		}
		if (title == title.toUpperCase()) {
			title = ZU.capitalizeTitle(title,true);
		};

		item.title = title;

		//Zotero.debug(item.pages);
		//Zotero.debug(item.title);


		// extra
		var well =ZU.xpath(doc,'//div[@class="well well-small"]');
		//Zotero.debug(well[0].innerHTML);

		var mst = well[0].innerHTML.match(/<dt>Session Type<\/dt>[.\n\s]*<dd>(.+)<\/dd>/);

		if (mst == null) {
			mst = "";
		}

		//Zotero.debug(mst);
		var session = ZU.xpath(doc,'//h2[@class="session"]/a');

		item.extra = "Session: " + session[0].innerText
			+ "; " + "Session Type: " + mst[1];


		//attachments
		//TODO does not work
		// item.attachments = [{
		//	url: doc.URL,
		//	title: "Print page",
		//	mimeType: "text/html",
		//	snapshot: true
		//}];


		// creators

		var disclosure = ZU.xpath(doc,'//div[@class="span7"]/dl/dd[2]'); // Use Disclosure data

		var m = disclosure[0].innerHTML.match(/<b>[^<]+:<\/b>/g);
		var names = [];
		for (i = 0; i < m.length; i++) {
			item.creators.push(ZU.cleanAuthor(m[i].match(/<b>([^<]+):<\/b>/)[1],"author"));
		}
		//Zotero.debug(item.creators);


		// date
		var spandate = ZU.xpath(doc,'//span[@class="session-date"]');

		item.date = spandate[0].innerHTML.match(/\w+\s\d+,\s\d+/)[0];

		if (ZU.xpath(doc,'//div[@class="span7"]/dl/dd[3]').length != 0) {
			item.abstractNote = ZU.xpath(doc,'//div[@class="span7"]/dl/dd[3]')[0].innerHTML;
		}

		item.publicationTitle = "Society for Neuroscience Abstract";
		item.url = doc.URL;
		item.conferenceName = "Society for Neuroscience";
		item.language = 'eng';

		item.complete();

		});
	}
}

// All the tests will fail because page contents cannot be loaded. They will issue "TypeError: m2 is n ull"
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/17079",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Electrophysiology of rat motor thalamus reveals unique patterns of firing during movement",
				"creators": [
					{
						"firstName": "M.",
						"lastName": "Gaidica",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Cyr",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Hurst",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Kamath",
						"creatorType": "author"
					},
					{
						"firstName": "D. K.",
						"lastName": "Leventhal",
						"creatorType": "author"
					}
				],
				"date": "November 15, 2017",
				"abstractNote": "The thalamus is commonly regarded as a relay nucleus, but it is increasingly appreciated that it is a critical node in shaping normal and pathological motor behaviors. It remains unclear how its primary inputs from the basal ganglia, cerebellum, and cortex differentially contribute to the cortical-bound output of the “motor thalamus”. To determine behavioral correlates of neuronal activity in the rat motor thalamus we performed electrophysiology during a cued choice reaction time task. We found task-specific firing rate modulations for all behavioral events based on single unit neuronal classifications. This included neurons that rapidly increased their firing rate in response to sensory cues, neurons that showed tonically sustained firing during all movements, and neurons that showed rhythmic increases in firing rate precisely at movement onset. We performed a detailed investigation of neuronal activity specifically associated with the movement onset population as it has specific implications to movement disorders characterized by the inability to initiate movements (e.g. Parkinson’s disease). These neurons’ firing rates are depressed during a hold period prior to cued movement initiation. This is consistent with standard thalamocortical firing rate models which suggest GABAergic afferents from the basal ganglia regulate movement through disinhibition. Secondly, the burst frequency across these neurons was highly regular and consistently in the theta band (4-8 Hz). Finally, many of these neurons fired more strongly for contralateral movements. Ongoing work is directed at determining whether these functional classifications are correlated with distinct anatomic or physiologic features (e.g., cerebellar vs basal ganglia afferents), and how these activity patterns are generated.",
				"conferenceName": "Society for Neuroscience",
				"extra": "Session: Session 689 - Subcortical Physiology and Regulation of Behavior; Session Type: Poster",
				"language": "eng",
				"libraryCatalog": "Society for Neuroscience Abstract 2016",
				"pages": "689.12/DP07/II19",
				"proceedingsTitle": "Society for Neuroscience Abstract",
				"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/17079",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/30154",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Mafb and c-Maf control the balanced neurogenesis of MGE-derived PV<sup>+</sup> and SST<sup>+</sup> GABAergic cortical interneurons",
				"creators": [
					{
						"firstName": "L.",
						"lastName": "Pai",
						"creatorType": "author"
					},
					{
						"firstName": "D.",
						"lastName": "Vogt",
						"creatorType": "author"
					},
					{
						"firstName": "A. C.",
						"lastName": "Perez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Wimer",
						"creatorType": "author"
					},
					{
						"firstName": "G.",
						"lastName": "McKinsey",
						"creatorType": "author"
					},
					{
						"firstName": "J. S.",
						"lastName": "Hu",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Sandberg",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Pla",
						"creatorType": "author"
					},
					{
						"firstName": "L. V.",
						"lastName": "Goodrich",
						"creatorType": "author"
					},
					{
						"firstName": "J. T.",
						"lastName": "Paz",
						"creatorType": "author"
					},
					{
						"firstName": "J. L.",
						"lastName": "Rubenstein",
						"creatorType": "author"
					}
				],
				"date": "November 13, 2017",
				"abstractNote": "GABAergic cortical interneurons (CINs), primarily generated by medial and caudal ganglionic eminences (MGE &amp; CGE), control circuit excitability by acting as a breaking system in the brain. CIN malfunctions are implicated in neuropsychiatric diseases including autism spectrum disorder, schizophrenia and epilepsy. Understanding CIN generation and maturation are crucial in order to better understand interneuronopathy-related brain diseases.<br>MGE-derived CINs are composed of two broad subgroups: parvalbumin- (PV; late-born) and somatostatin- (SST; early-born) expressing. While MGE interneuron progenitor fate is initially determined by the Nkx2.1 and Lhx6 transcription factors (TFs), factors regulating the control over CIN fate and generation are still being uncovered. Here, we characterized two TFs, Mafb and c-Maf, which are genetically downstream of Nkx2.1, Lhx6 and Dlx, as critical for generating the correct balance of early and late born MGE CIN progenitors.<br>Combined deletion of Mafb and c-Maf from MGE progenitors resulted in ~70% reduction of MGE-derived CINs at P35, with preferential loss of the PV subgroup. Surviving CINs reside in deeper cortical layers and are more likely to be early-born SST interneurons. At embryonic ages, EdU birthdating experiments showed no change of MGE CIN progenitor numbers with deletion of Mafb and c-Maf but an increase of precocious neurogenesis. Notably, we also found a robust increase of SST CINs in the neocortex of these mutants. Together, these results suggest Mafb and c-Maf control the balance of neurogenesis in late progenitors of the MGE, and these early disruptions cause a shift in the balance of PV<sup>+</sup> and SST<sup>+</sup> CINs.",
				"conferenceName": "Society for Neuroscience",
				"extra": "Session: Session 282 - Fate Specification and Generation of Neuronal Diversity; Session Type: Poster",
				"language": "eng",
				"libraryCatalog": "Society for Neuroscience Abstract 2016",
				"pages": "282.18/B8",
				"proceedingsTitle": "Society for Neuroscience Abstract",
				"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/30154",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/1247",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Dialogues Between Neuroscience and Society",
				"creators": [
					{
						"firstName": "S.",
						"lastName": "Mukherjee",
						"creatorType": "author"
					}
				],
				"date": "November 11, 2017",
				"abstractNote": "Mukherjee, a physician and researcher, wrote the Pulitzer Prize-winning book <i>The Emperor of All Maladies: A Biography of Cancer</i>, which explores the disease that has plagued humans for thousands of years. His new book, <i>The Gene: An Intimate History</i>, examines the quest to decipher how human heredity combines with life experiences to control our lives. In this lecture, Dr. Mukherjee will engage in a conversation with SfN President Eric Nestler about the excitement and importance of communicating the promise of scientific inquiry to the public.",
				"conferenceName": "Society for Neuroscience",
				"extra": "Session: Session 001 - DIALOGUES BETWEEN NEUROSCIENCE AND SOCIETY - Siddhartha Mukherjee; Session Type: Lecture",
				"language": "eng",
				"libraryCatalog": "Society for Neuroscience Abstract 2016",
				"pages": "1",
				"proceedingsTitle": "Society for Neuroscience Abstract",
				"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/1247",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/32999",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Sensory adaptation: Predicting the future from the past",
				"creators": [
					{
						"firstName": "A. A.",
						"lastName": "Stocker",
						"creatorType": "author"
					}
				],
				"date": "November 11, 2017",
				"abstractNote": "Four presentations will discuss neuronal adaptation, its implications for behavioral performance, and optimal coding in the domains of perceptual decisions, associative learning and economic decisions.<br>Prima facie, neuronal adaptation seems to guarantee an efficient representation. However, neuronal adaptation also poses serious challenges, because it makes firing rates ambiguous. In sensory systems, this ambiguity is referred to as \"coding catastrophe\" (Fairhall et al 2001; Schwarz et al 2007). In the neural circuit underlying economic decisions, uncorrected adaptation would result in arbitrary choice biases (Padoa-Schioppa and Rustichini, 2014).<br>Coding ambiguity may explain illusions and framing effects observed in perceptual and economic decisions. Yet, neural systems are not completely vulnerable to the effects of ambiguity. For example, dedicated studies show that animals performing economic decisions do not present the choice biases predicted by uncorrected adaptation. Thus the neural decision circuit corrects the effects of neuronal adaptation, and similar corrections must take place in sensory systems.<br>But if neuronal adaptation is ultimately corrected, is adaptation at all beneficial to the organism? Addressing this question, recent results indicate that neuronal adaptation in sensory areas (Liu et al 2016), dopaminergic areas (Diederen et al, 2016) and orbitofrontal cortex increases behavioral performance in perceptual decisions, associative learning and economic decisions, respectively.<br>Importantly, neuronal adaptation, coding ambiguity and behavioral performance are closely related to the issue of optimal coding. In sensory systems, a neuronal representation is optimal if it transmits maximal information (Barlow, 1961). This occurs if tuning curves match the cumulative distribution function of the stimuli distribution, and early work showed that neuronal adaptation results in optimal coding (Laughlin, 1981). These classic notions were recently extended in a Bayesian sense (Wei et al, 2015). In contrast, in the domain of economic decisions, the neuronal representation of subjective values is optimal if it maximizes the expected payoff. Recent work indicates that range adaptation observed in orbitofrontal cortex induces (constrained) optimal coding.",
				"conferenceName": "Society for Neuroscience",
				"extra": "Session: Session 003 - Neuronal Adaptation and Behavioral Performance in Perceptual and Economic Decisions - Camillo Padoa-Schioppa; Session Type: Symposium",
				"language": "eng",
				"libraryCatalog": "Society for Neuroscience Abstract 2016",
				"pages": "3.02",
				"proceedingsTitle": "Society for Neuroscience Abstract",
				"shortTitle": "Sensory adaptation",
				"url": "http://www.abstractsonline.com/pp8/#!/4376/presentation/32999",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
