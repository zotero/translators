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

let report6Editors = 'V. Masson-Delmotte, P. Zhai, A. Pirani, S. L. Connors, C. Péan, S. Berger, N. Caud, Y. Chen, L. Goldfarb, M. I. Gomis, M. Huang, K. Leitzell, E. Lonnoy, J. B. R. Matthews, T. K. Maycock, T. Waterfield, O. Yelekçi, R. Yu, B. Zhou'
	.split(', ').map(name => ZU.cleanAuthor(name, 'editor'));

let report6TechSummaryAuthors = 'P. A. Arias, N. Bellouin, E. Coppola, R. G. Jones, G. Krinner, J. Marotzke, V. Naik, M. D. Palmer, G-K. Plattner, J. Rogelj, M. Rojas, J. Sillmann, T. Storelvmo, P. W. Thorne, B. Trewin, K. Achuta Rao, B. Adhikary, R. P. Allan, K. Armour, G. Bala, R. Barimalala, S. Berger, J. G. Canadell, C. Cassou, A. Cherchi, W. Collins, W. D. Collins, S. L. Connors, S. Corti, F. Cruz, F. J. Dentener, C. Dereczynski, A. Di Luca, A. Diongue Niang, F. J. Doblas-Reyes, A. Dosio, H. Douville, F. Engelbrecht, V. Eyring, E. Fischer, P. Forster, B. Fox-Kemper, J. S. Fuglestvedt, J. C. Fyfe, N. P. Gillett, L. Goldfarb, I. Gorodetskaya, J. M. Gutierrez, R. Hamdi, E. Hawkins, H. T. Hewitt, P. Hope, A. S. Islam, C. Jones, D. S. Kaufman, R. E. Kopp, Y. Kosaka, J. Kossin, S. Krakovska, J-Y. Lee, J. Li, T. Mauritsen, T. K. Maycock, M. Meinshausen, S-K. Min, P. M. S. Monteiro, T. Ngo-Duc, F. Otto, I. Pinto, A. Pirani, K. Raghavan, R. Ranasinghe, A. C. Ruane, L. Ruiz, J-B. Sallée, B. H. Samset, S. Sathyendranath, S. I. Seneviratne, A. A. Sörensson, S. Szopa, I. Takayabu, A-M. Treguier, B. van den Hurk, R. Vautard, K. von Schuckmann, S. Zaehle, X. Zhang, K. Zickfeld'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch1Authors = 'D. Chen, M. Rojas, B. H. Samset, K. Cobb, A. Diongue Niang, P. Edwards, S. Emori, S. H. Faria, E. Hawkins, P. Hope, P. Huybrechts, M. Meinshausen, S. K. Mustafa, G. K. Plattner, A. M. Tréguier'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch2Authors = 'S. K. Gulev, P. W. Thorne, J. Ahn, F. J. Dentener, C. M. Domingues, S. Gerland, D. Gong, D. S. Kaufman, H. C. Nnamchi, J. Quaas, J. A. Rivera, S. Sathyendranath, S. L. Smith, B. Trewin, K. von Shuckmann, R. S. Vose'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch3Authors = 'V. Eyring, N. P. Gillett, K. M. Achuta Rao, R. Barimalala, M. Barreiro Parrillo, N. Bellouin, C. Cassou, P. J. Durack, Y. Kosaka, S. McGregor, S. Min, O. Morgenstern, Y. Sun'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch4Authors = 'J. Y. Lee, J. Marotzke, G. Bala, L. Cao, S. Corti, J. P. Dunne, F. Engelbrecht, E. Fischer, J. C. Fyfe, C. Jones, A. Maycock, J. Mutemi, O. Ndiaye, S. Panickal, T. Zhou'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch5Authors = 'J. G. Canadell, P. M.S. Monteiro, M. H. Costa, L. Cotrim da Cunha, P. M. Cox, A. V. Eliseev, S. Henson, M. Ishii, S. Jaccard, C. Koven, A. Lohila, P. K. Patra, S. Piao, J. Rogelj, S. Syampungani, S. Zaehle, K. Zickfeld'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch6Authors = 'V. Naik, S. Szopa, B. Adhikary, P. Artaxo, T. Berntsen, W. D. Collins, S. Fuzzi, L. Gallardo, A. Kiendler Scharr, Z. Klimont, H. Liao, N. Unger, P. Zanis'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch7Authors = 'P. Forster, T. Storelvmo, K. Armour, W. Collins, J. L. Dufresne, D. Frame, D. J. Lunt, T. Mauritsen, M. D. Palmer, M. Watanabe, M. Wild, H. Zhang'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch8Authors = 'H. Douville, K. Raghavan, J. Renwick, R. P. Allan, P. A. Arias, M. Barlow, R. Cerezo-Mota, A. Cherchi, T. Y. Gan, J. Gergis, D. Jiang, A. Khan, W. Pokam Mba, D. Rosenfeld, J. Tierney, O. Zolina'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch9Authors = 'Fox-Kemper, B., H. T. Hewitt, C. Xiao, G. Aðalgeirsdóttir, S. S. Drijfhout, T. L. Edwards, N. R. Golledge, M. Hemer, R. E. Kopp, G. Krinner, A. Mix, D. Notz, S. Nowicki, I. S. Nurhati, L. Ruiz, J-B. Sallée, A. B. A. Slangen, Y. Yu'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch10Authors = 'F. J. Doblas-Reyes, A. A. Sörensson, M. Almazroui, A. Dosio, W. J. Gutowski, R. Haarsma, R. Hamdi, B.  Hewitson, W-T. Kwon, B. L. Lamptey, D. Maraun, T. S. Stephenson, I. Takayabu, L. Terray, A. Turner, Z. ZUo'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch11Authors = 'S. I. Seneviratne, X. Zhang, M. Adnan, W. Badi, C. Dereczynski, A. Di Luca, S. Ghosh, I. Iskandar, J. Kossin, S. Lewis, F. Otto, I. Pinto, M. Satoh, S. M. Vicente-Serrano, M. Wehner, B. Zhou'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6Ch12Authors = 'R. Ranasinghe, A. C. Ruane, R. Vautard, N. Arnell, E. Coppola, F. A. Cruz, S. Dessai, A. S. Islam, M. Rahimi, D. Ruiz Carrascal, J. Sillmann, M. B. Sylla, C. Tebaldi, W. Wang, R. Zaaboul'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

let report6AtlasAuthors = 'J. M. Gutiérrez, R. G. Jones, G. T. Narisma, L. M. Alves, M. Amjad, I. V. Gorodetskaya, M. Grose, N. A. B. Klutse, S. Krakovska, J. Li, D. Martínez-Castro, L. O. Mearns, S. H. Mernild, T. Ngo-Duc, B. van den Hurk, J-H. Yoon'
	.split(', ').map(name => ZU.cleanAuthor(name, 'author'));

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
		'Atlas': chapter('Atlas', {
			title: 'Atlas',
			creators: report6AtlasAuthors,
			url: 'https://interactive-atlas.ipcc.ch/'
		}),
		'Annex I Observational Products': chapter('Annex_I', {
			title: 'Annex I: Observational products',
			// the IPCC's recommended citations call annex authors "editors,"
			// but we'll call them authors so they show up before the section
			// in the citation, separately from the book editors
			creators: [ZU.cleanAuthor('B. Trewin', 'author')]
		}),
		'Annex II Models': chapter('Annex_II', {
			title: 'Annex II: Models',
			creators: [
				ZU.cleanAuthor('J. M. Gutiérrez', 'author'),
				ZU.cleanAuthor('A-M. Treguier', 'author')
			]
		}),
		'Annex III Radiative Forcing': chapter('Annex_III', {
			title: 'Annex III: Tables of historical and projected well-mixed greenhouse gas mixing ratios and effective radiative forcing of all climate forcers',
			creators: [
				ZU.cleanAuthor('F. J. Dentener', 'author'),
				ZU.cleanAuthor('B. Hall', 'author'),
				ZU.cleanAuthor('C. Smith', 'author')
			]
		}),
		'Annex IV Modes of Variability': chapter('Annex_IV', {
			title: 'Annex IV: Modes of variability',
			creators: [
				ZU.cleanAuthor('C. Cassou', 'author'),
				ZU.cleanAuthor('A. Cherchi', 'author'),
				ZU.cleanAuthor('Y. Kosaka', 'author')
			]
		}),
		'Annex V Monsoons': chapter('Annex_V', {
			title: 'Annex V: Monsoons',
			creators: [
				ZU.cleanAuthor('A. Cherchi', 'author'),
				ZU.cleanAuthor('A. Turner', 'author')
			]
		}),
		'Annex VI Climatic Impact-Driver and Extreme Indices': chapter('Annex_VI', {
			title: 'Annex VI: Climatic impact-driver and extreme indices',
			creators: [
				ZU.cleanAuthor('J. M. Gutiérrez', 'author'),
				ZU.cleanAuthor('R. Ranasinghe', 'author'),
				ZU.cleanAuthor('A. C. Ruane', 'author'),
				ZU.cleanAuthor('R. Vautard', 'author')
			]
		}),
		'Annex VII Glossary': chapter('Annex_VII', {
			title: 'Annex VII: Glossary',
			creators: [
				ZU.cleanAuthor('J. B. R. Matthews', 'author'),
				ZU.cleanAuthor('J. S. Fuglestvedt', 'author'),
				ZU.cleanAuthor('V. Masson-Delmotte', 'author'),
				ZU.cleanAuthor('V. Möller', 'author'),
				ZU.cleanAuthor('C. Méndez', 'author'),
				ZU.cleanAuthor('van Diemen, R.', 'author', true),
				ZU.cleanAuthor('A. Reisinger', 'author'),
				ZU.cleanAuthor('S. Semenov', 'author')
			]
		})
	})
};

function detectWeb(doc, url) {
	if (citations[doc.location.pathname]) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	let chapters = citations[doc.location.pathname];
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
