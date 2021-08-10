{
	"translatorID": "c6efb3a8-a6c9-4ff2-b1c5-27fb4b5b2935",
	"label": "IPCC",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.ipcc\\.ch/report/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-10 19:48:13"
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

let report6Editors = 'Valérie Masson-Delmotte; Panmao Zhai; Anna Pirani; Sarah L. Connors; C. Péan; Sophie Berger; Nada Caud; Y. Chen; Leah Goldfarb; Melissa I. Gomis; Mengtian Huang; Katherine Leitzell; Elisabeth Lonnoy; J. B. Robin Matthews; Thomas K. Maycock; Tim Waterfield; Özge Yelekçi; R. Yu; Botao Zhou'
	.split('; ').map(name => ZU.cleanAuthor(name, 'editor', name.includes(', ')));

let report6TechSummaryAuthors = 'Paola A. Arias; Nicolas Bellouin; Erika Coppola; Richard G. Jones; Gerhard Krinner; Jochem Marotzke; Vaishali Naik; Matthew D. Palmer; Gian-Kasper Plattner; Joeri Rogelj; Maisa Rojas; Jana Sillmann; Trude Storelvmo; Peter W. Thorne; Blair Trewin; Krishna M. Achutarao; Bhupesh Adhikary; Richard P. Allan; Kyle Armour; Govindasamy Bala; Rondrotiana Barimalala; Sophie Berger; Josep G. Canadell; Christophe Cassou; Annalisa Cherchi; William Collins; William D. Collins; Sarah L. Connors; Susanna Corti; Faye A. Cruz; Frank J. Dentener; Claudine Dereczynski; Di Luca, Alejandro; Aïda Diongue-Niang; Francisco J. Doblas-Reyes; Alessandro Dosio; Hervé Douville; François Engelbrecht; Veronika Eyring; Erich Fischer; Piers Forster; Baylor Fox-Kemper; Jan S. Fuglestvedt; John C. Fyfe; Nathan P. Gillett; Leah Goldfarb; Irina V. Gorodetskaya; José Manuel Gutiérrez; Rafiq Hamdi; Ed Hawkins; Helene T. Hewitt; Pandora Hope; Akm Saiful Islam; Christopher Jones; Darrell S. Kaufman; Robert E. Kopp; Yu Kosaka; James Kossin; Svitlana Krakovska; June-Yi Lee; Jian Li; Thorsten Mauritsen; Thomas K. Maycock; Malte Meinshausen; Seung-Ki Min; Scheel Monteiro, Pedro; Thanh Ngo-Duc; Friederike Otto; Izidine Pinto; Anna Pirani; Krishnan Raghavan; Roshanka Ranasinghe; Alex C. Ruane; Lucas Ruiz; Jean-Baptiste Sallée; Bjørn H. Samset; Shubha Sathyendranath; Sonia I. Seneviratne; Anna A. Sörensson; Sophie Szopa; Izuru Takayabu; Anne-Marie Treguier; Bart van den Hurk; Robert Vautard; von Schuckmann, Karina; Sönke Zaehle; Xuebin Zhang; Kirsten Zickfeld'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch1Authors = 'Deliang Chen; Maisa Rojas; Bjørn H. Samset; Kim Cobb; Aïda Diongue-Niang; Paul Edwards; Seita Emori; Sergio Henrique Faria; Ed Hawkins; Pandora Hope; Philippe Huybrechts; Malte Meinshausen; Sawsan K. Mustafa; Gian-Kasper Plattner; Anne Marie Tréguier'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch2Authors = 'Sergey K. Gulev; Peter W. Thorne; Jinho Ahn; Frank J. Dentener; Catia M. Domingues; Sebastian Gerland; Daoyi Gong; Darrell S. Kaufman; Hyacinth C. Nnamchi; Johannes Quaas; Juan Antonio Rivera; Shubha Sathyendranath; Sharon L. Smith; Blair Trewin; von Shuckmann, Karina; Russell S. Vose'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch3Authors = 'Veronika Eyring; Nathan P. Gillett; Krishna M. Achutarao; Rondrotiana Barimalala; Barreiro Parrillo, Marcelo; Nicolas Bellouin; Christophe Cassou; Paul J. Durack; Yu Kosaka; Shayne McGregor; Seung-Ki Min; Olaf Morgenstern; Ying Sun'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch4Authors = 'June-Yi Lee; Jochem Marotzke; Govindasamy Bala; Long Cao; Susanna Corti; John P. Dunne; François Engelbrecht; Erich Fischer; John C. Fyfe; Christopher Jones; Amanda Maycock; Joseph Mutemi; Ousman Ndiaye; Swapna Panickal; Tianjun Zhou'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch5Authors = 'Josep G. Canadell; Scheel Monteiro, Pedro; Marcos H. Costa; Cotrim da Cunha, Leticia; Peter M. Cox; Alexey V. Eliseev; Stephanie Henson; Masao Ishii; Samuel Jaccard; Charles Koven; Annalea Lohila; Prabir K. Patra; Shilong Piao; Joeri Rogelj; Stephen Syampungani; Sönke Zaehle; Kirsten Zickfeld'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch6Authors = 'Vaishali Naik; Sophie Szopa; Bhupesh Adhikary; Artaxo Netto, Paulo Eduardo; Terje Berntsen; William D. Collins; Sandro Fuzzi; Laura Gallardo; Astrid Kiendler-Scharr; Zbigniew Klimont; Hong Liao; Nadine Unger; Prodromos Zanis'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch7Authors = 'Piers Forster; Trude Storelvmo; Kyle Armour; William Collins; Jean-Luis Dufresne; David Frame; Daniel J. Lunt; Thorsten Mauritsen; Matthew D. Palmer; Masahiro Watanabe; Martin Wild; Xuebin Zhang'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch8Authors = 'Hervé Douville; Krishnan Raghavan; James A. Renwick; Richard P. Allan; Paola A. Arias; M. Barlow; Cerezo Mota, Ruth; Annalisa Cherchi; Thian Yew Gan; Joelle Gergis; Dabang Jiang; Asif Khan; Pokam Mba, Wilfried; Daniel Rosenfeld; Jessica Tierney; Olga Zolina'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch9Authors = 'Baylor Fox-Kemper; Helene T. Hewitt; Cunde Xiao; Guðfinna Aðalgeirsdóttir; Sybren S. Drijfhout; Tamsin L. Edwards; Nicholas R. Golledge; Mark Hemer; Robert E. Kopp; Gerhard Krinner; Alan Mix; Dirk Notz; Sophie Nowicki; Intan S. Nurhati; Lucas Ruiz; Jean-Baptiste Sallée; Aimée B. A. Slangen; Yongqiang Yu'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch10Authors = 'Francisco J. Doblas-Reyes; Anna A. Sörensson; M. Almazroui; Alessandro Dosio; William J. Gutowski; Rein Haarsma; Rafiq Hamdi; Bruce Hewitson; Won-Tae Kwon; Benjamin L. Lamptey; Douglas Maraun; Tannecia S. Stephenson; Izuru Takayabu; Laurent Terray; Andrew Turner; Zhiyan Zuo'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch11Authors = 'Sonia I. Seneviratne; Xuebin Zhang; M. Adnan; W. Badi; Claudine Dereczynski; Di Luca, Alejandro; S. Ghosh; Iskhaq Iskandar; James Kossin; Sophie Lewis; Friederike Otto; Izidine Pinto; Masaki Satoh; Sergio M. Vicente-Serrano; Michael Wehner; Botao Zhou'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6Ch12Authors = 'Roshanka Ranasinghe; Alex C. Ruane; Robert Vautard; Nigel Arnell; Erika Coppola; Faye A. Cruz; Suraje Dessai; Akm Saiful Islam; Mohammad Rahimi; Ruiz Carrascal, Daniel; Jana Sillmann; Mouhamadou Bamba Sylla; Claudia Tebaldi; Wen Wang; Rashyd Zaaboul'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

let report6AtlasAuthors = 'José Manuel Gutiérrez; Richard G. Jones; Gemma Teresa Narisma; Muniz Alves, Lincoln; Muhammad Amjad; Irina V. Gorodetskaya; Michael Grose; Nana Ama Browne Klutse; Svitlana Krakovska; Jian Li; Daniel Martínez-Castro; Linda O. Mearns; Sebastian H. Mernild; Thanh Ngo-Duc; van den Hurk, Bart; Jin-Ho Yoon'
	.split('; ').map(name => ZU.cleanAuthor(name, 'author', name.includes(', ')));

function chapter(slug, itemTemplate) {
	return Object.assign(new Zotero.Item('bookSection'), itemTemplate, {
		bookTitle: 'Climate Change 2021: The Physical Science Basis. Contribution of Working Group I to the Sixth Assessment Report of the Intergovernmental Panel on Climate Change',
		publisher: 'Cambridge University Press',
		date: '2021',
		creators: [...(itemTemplate.creators || []), ...report6Editors],
		attachments: [
			{
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: `https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_${slug}.pdf`
			}
		]
	});
}

function addSupplementaryMaterial(chapters) {
	let supplementaryMaterials = {};
	
	for (let [label, item] of Object.entries(chapters)) {
		if (item.itemType != 'bookSection'
			|| /summary|annex/i.test(item.title)) continue;
		
		supplementaryMaterials[label + ' - Supplementary Material'] = Object.assign(new Zotero.Item('bookSection'), item, {
			title: item.title + ' - Supplementary Material',
			attachments: item.attachments.map(a => Object.assign({}, a, {
				url: a.url.replace('.pdf', '_Supplementary_Material.pdf')
			}))
		});
	}
	
	return Object.assign({}, chapters, supplementaryMaterials);
}

let citations = {
	'/report/ar6/wg1/': addSupplementaryMaterial({
		'Full Report': Object.assign(new Zotero.Item('book'), {
			// yes, it's a report, but it's published like a book
			title: 'Climate Change 2021: The Physical Science Basis. Contribution of Working Group I to the Sixth Assessment Report of the Intergovernmental Panel on Climate Change',
			abstractNote: 'The Working Group I contribution to the Sixth Assessment Report addresses the most up-to-date physical understanding of the climate system and climate change, bringing together the latest advances in climate science, and combining multiple lines of evidence from paleoclimate, observations, process understanding, and global and regional climate simulations.',
			publisher: 'Cambridge University Press',
			date: '2021',
			creators: report6Editors,
			attachments: [
				{
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: 'https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Full_Report.pdf'
				}
			]
		}),
		'Summary for Policymakers': chapter('SPM', {
			title: 'Summary for policymakers',
			abstractNote: 'The Summary for Policymakers (SPM) provides a high-level summary of the understanding of the current state of the climate, including how it is changing and the role of human influence, and the state of knowledge about possible climate futures, climate information relevant to regions and sectors, and limiting human-induced climate change.'
		}),
		'Technical Summary': chapter('TS', {
			title: 'Technical summary',
			abstractNote: 'The Technical Summary (TS) is designed to bridge between the comprehensive assessment of the Working Group I Chapters and its Summary for Policymakers (SPM). It is primarily built from the Executive Summaries of the individual chapters and atlas and provides a synthesis of key findings based on multiple lines of evidence.',
			creators: report6TechSummaryAuthors
		}),
		'Chapter 1: Framing, context, methods': chapter('Chapter_01', {
			title: 'Framing, context, and methods',
			creators: report6Ch1Authors
		}),
		'Chapter 2: Changing state of the climate system': chapter('Chapter_02', {
			title: 'Changing state of the climate system',
			creators: report6Ch2Authors
		}),
		'Chapter 3: Human influence on the climate system': chapter('Chapter_03', {
			title: 'Human influence on the climate system',
			creators: report6Ch3Authors
		}),
		'Chapter 4: Future global climate: scenario-based projections and near-term information': chapter('Chapter_04', {
			title: 'Future global climate: scenario-based projections and near-term information',
			creators: report6Ch4Authors
		}),
		'Chapter 5: Global carbon and other biogeochemical cycles and feedbacks': chapter('Chapter_05', {
			title: 'Global carbon and other biogeochemical cycles and feedbacks',
			creators: report6Ch5Authors
		}),
		'Chapter 6: Short-lived climate forcers': chapter('Chapter_06', {
			title: 'Short-lived climate forcers',
			creators: report6Ch6Authors
		}),
		'Chapter 7: The Earth\'s energy budget, climate feedbacks, and climate sensitivity': chapter('Chapter_07', {
			title: 'The Earth\'s energy budget, climate feedbacks, and climate sensitivity',
			creators: report6Ch7Authors
		}),
		'Chapter 8: Water cycle changes': chapter('Chapter_08', {
			title: 'Water cycle changes',
			creators: report6Ch8Authors
		}),
		'Chapter 9: Ocean, cryosphere, and sea level change': chapter('Chapter_09', {
			title: 'Ocean, cryosphere, and sea level change',
			creators: report6Ch9Authors
		}),
		'Chapter 10: Linking global to regional climate change': chapter('Chapter_10', {
			title: 'Linking global to regional climate change',
			creators: report6Ch10Authors
		}),
		'Chapter 11: Weather and climate extreme events in a changing climate': chapter('Chapter_11', {
			title: 'Weather and climate extreme events in a changing climate',
			creators: report6Ch11Authors
		}),
		'Chapter 12: Climate change information for regional impact and for risk assessment': chapter('Chapter_12', {
			title: 'Climate change information for regional impact and for risk assessment',
			creators: report6Ch12Authors
		}),
		Atlas: chapter('Atlas', {
			title: 'Atlas',
			creators: report6AtlasAuthors,
			url: 'https://interactive-atlas.ipcc.ch/'
		}),
		'Annex I Observational Products': chapter('Annex_I', {
			title: 'Annex I: Observational products',
			// the IPCC's recommended citations call annex authors "editors,"
			// but we'll call them authors so they show up before the section
			// in the citation, separately from the book editors
			creators: [ZU.cleanAuthor('Blair Trewin', 'author')]
		}),
		'Annex II Models': chapter('Annex_II', {
			title: 'Annex II: Models',
			creators: [
				ZU.cleanAuthor('José Manuel Gutiérrez', 'author'),
				ZU.cleanAuthor('Anne-Marie Treguier', 'author')
			]
		}),
		'Annex III Radiative Forcing': chapter('Annex_III', {
			title: 'Annex III: Tables of historical and projected well-mixed greenhouse gas mixing ratios and effective radiative forcing of all climate forcers',
			creators: [
				ZU.cleanAuthor('Frank J. Dentener', 'author'),
				ZU.cleanAuthor('B. Hall', 'author'),
				ZU.cleanAuthor('Chris Smith', 'author')
			]
		}),
		'Annex IV Modes of Variability': chapter('Annex_IV', {
			title: 'Annex IV: Modes of variability',
			creators: [
				ZU.cleanAuthor('Christophe Cassou', 'author'),
				ZU.cleanAuthor('Annalisa Cherchi', 'author'),
				ZU.cleanAuthor('Yu Kosaka', 'author')
			]
		}),
		'Annex V Monsoons': chapter('Annex_V', {
			title: 'Annex V: Monsoons',
			creators: [
				ZU.cleanAuthor('Annalisa Cherchi', 'author'),
				ZU.cleanAuthor('Andrew Turner', 'author')
			]
		}),
		'Annex VI Climatic Impact-Driver and Extreme Indices': chapter('Annex_VI', {
			title: 'Annex VI: Climatic impact-driver and extreme indices',
			creators: [
				ZU.cleanAuthor('José Manuel Gutiérrez', 'author'),
				ZU.cleanAuthor('Roshanka Ranasinghe', 'author'),
				ZU.cleanAuthor('Alex C. Ruane', 'author'),
				ZU.cleanAuthor('Robert Vautard', 'author')
			]
		}),
		'Annex VII Glossary': chapter('Annex_VII', {
			title: 'Annex VII: Glossary',
			creators: [
				ZU.cleanAuthor('J. B. Robin Matthews', 'author'),
				ZU.cleanAuthor('Jan S. Fuglestvedt', 'author'),
				ZU.cleanAuthor('Valérie Masson-Delmotte', 'author'),
				ZU.cleanAuthor('Vincent Möller', 'author'),
				ZU.cleanAuthor('Carlos Méndez', 'author'),
				ZU.cleanAuthor('van Diemen, Renée', 'author', true),
				ZU.cleanAuthor('Andy Reisinger', 'author'),
				ZU.cleanAuthor('Sergey Semenov', 'author')
			]
		})
	})
};

function detectWeb(doc, _url) {
	let pathname = doc.location.pathname;
	if (pathname == '/report/sixth-assessment-report-working-group-i/') {
		pathname = '/report/ar6/wg1/';
	}

	if (citations[pathname]) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, _url) {
	let pathname = doc.location.pathname;
	if (pathname == '/report/sixth-assessment-report-working-group-i/') {
		pathname = '/report/ar6/wg1/';
	}

	let chapters = citations[pathname];
	Zotero.selectItems(chapters, function (items) {
		if (items) {
			for (let key of Object.keys(items)) {
				chapters[key].complete();
			}
		}
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ipcc.ch/report/ar6/wg1/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
