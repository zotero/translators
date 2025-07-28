{
	"translatorID": "72bc898c-ed9e-4e1c-8d38-15ec0464da5b",
	"label": "Sciences Data Bank",
	"creator": "jiaojiaodubai",
	"target": "^https?://www\\.scidb\\.cn",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-22 05:46:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 jiaojiaoduabi<jiaojiaoduabi23@gmail.com>

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
	if (url.includes('dataSetId=')) {
		return 'dataset';
	}
	return false;
}

async function doWeb(doc, url) {
	var newItem = new Z.Item('dataset');
	try {
		// Uncomment the next line for debugging offline scrapping schema.
		// throw new Error('debug');
		let getURL = `https://www.scidb.cn/api/sdb-dataset-service/dataset/details/${tryMatch(url, /dataSetId=(\w+)/, 1)}?&mode=front`;
		let json = await requestJSON(getURL);
		json = json.data.Content;
		Z.debug(json);
		newItem.title = json.titleEn;
		extra.add('original-title', filter(json.titleEn, json.titleZh), true);
		newItem.abstractNote = json.introductionEn.replace(/(^<p>|<\/p>$)/g, '');
		extra.add('abstracTranslation', filter(json.introductionEn, json.introductionZh).replace(/(^<p>|<\/p>$)/g, ''));
		newItem.identifier = json.dataSetId;
		newItem.type = json.dataSetType;
		newItem.versionNumber = json.version;
		newItem.date = ZU.strToISO(new Date(json.dataSetPublishDate).toString());
		newItem.repository = json.publisher;
		newItem.DOI = json.doi;
		extra.add('CSTR', json.cstr);
		newItem.url = tryMatch(url, /^.+dataSetId=\w+/);
		newItem.language = json.language.replace('_', '-');
		newItem.rights = json.copyRight.name;
		json.author.forEach((creator) => {
			let zhName = creator.nameZh;
			let enName = creator.nameEn;
			if (/[\u4e00-\u9fff]/.test(zhName)) {
				enName = ZU.capitalizeName(enName);
				extra.add('original-author', zhName, true);
			}
			newItem.creators.push(ZU.cleanAuthor(enName, 'author'));
		});
		newItem.tags = [...new Set([...json.keywordEn, ...json.keywordZh])];
		extra.add('foundation', json.funding.map(fund => fund.funding_nameEn).join(', '));
		extra.add('explain', json.explain);
		extra.add('relatedPapers', json.papers.map(paper => paper.url).join('; '));
		extra.add('correspondent', json.correspondent.join(', '));
		extra.add('visit', json.visit);
		extra.add('download', json.download);
	}
	catch (error) {
		let json = JSON.parse(text('script[type="application/ld+json"]'));
		Z.debug(json);
		let labels = new Labels(doc, '.vw-infos-item');
		Z.debug(labels.innerData.map(arr => [arr[0], ZU.trimInternal(arr[1].innerText)]));
		newItem.title = json.name;
		newItem.abstractNote = json.abstract;
		newItem.identifier = tryMatch(url, /dataSetId=(\w+)/, 1);
		newItem.versionNumber = json.version;
		newItem.date = ZU.strToISO(json.datePublished);
		newItem.repository = 'Science Data Bank';
		let identifier = Array.from(doc.querySelectorAll('.vw-copy-item-bd')).map(element => ZU.trimInternal(element.innerText));
		newItem.DOI = tryMatch(identifier.find(string => string.startsWith('DOI')), /DOI\s*(.+)/, 1);
		extra.add('CSTR', tryMatch(identifier.find(string => string.startsWith('CSTR')), /CSTR\s*(.+)/, 1));
		newItem.url = json.url;
		newItem.language = json.inLanguage.replace('_', '-');
		newItem.rights = ZU.trimInternal(text('.vw-by'));
		Array.from(doc.querySelectorAll('.vw-author-container .author_name')).forEach((element) => {
			let zhName = text(element, '.author_nameZh');
			let enName = text(element, '.author_nameEn');
			if (/[\u4e00-\u9fff]/.test(zhName)) {
				enName = ZU.capitalizeName(enName);
				extra.add('original-author', zhName, true);
			}
			newItem.creators.push(ZU.cleanAuthor(enName, 'author'));
		});
		newItem.tags = json.keywords.split(';');
		extra.add('foundation', labels.getWith(['Fundinginformation', '基金信息']));
		// Commas may appear in the title, using semicolons as separators may be better.
		extra.add(
			'relatedPapers',
			Array.from(doc.querySelectorAll('#parper_id .paper_title')).map(element => ZU.trimInternal(element.innerText)).join('; '));
		extra.add('correspondent', labels.getWith(['Corresponding', '通讯作者']));
		extra.add('visit', text('.vw-statistics li h6'));
		extra.add('download', text('.vw-statistics li h6', 1));
	}
	newItem.extra = extra.toString();
	// The dataset attachment may point to third-party websites
	// and require access permissions, so it is not downloaded with the item.
	newItem.complete();
}

/**
 * Attempts to get the part of the pattern described from the character,
 * and returns an empty string if not match.
 * @param {String} string
 * @param {RegExp} pattern
 * @param {Number} index
 * @returns
 */
function tryMatch(string, pattern, index = 0) {
	if (!string) return '';
	let match = string.match(pattern);
	return (match && match[index])
		? match[index]
		: '';
}

/**
 * Compare whether string1 is the same as string2,
 * if ture, return empty string '',
 * if false, return string2;
 */
function filter(string1, string2) {
	return string1 == string2
		? ''
		: string2;
}

const extra = {
	clsFields: [],
	elseFields: [],
	add: function (key, value, cls = false) {
		if (value && cls) {
			this.clsFields.push([key, value]);
		}
		else if (value) {
			this.elseFields.push([key, value]);
		}
	},
	toString: function () {
		return [...this.clsFields, ...this.elseFields]
			.map(entry => `${entry[0]}: ${entry[1]}`)
			.join('\n');
	}
};

class Labels {
	constructor(doc, selector) {
		this.innerData = [];
		Array.from(doc.querySelectorAll(selector))
			.filter(element => element.firstElementChild)
			.filter(element => !element.querySelector(selector))
			.filter(element => !/^\s*$/.test(element.textContent))
			.forEach((element) => {
				let elementCopy = element.cloneNode(true);
				let key = elementCopy.removeChild(elementCopy.firstElementChild).innerText.replace(/\s/g, '');
				this.innerData.push([key, elementCopy]);
			});
	}

	getWith(label, element = false) {
		if (Array.isArray(label)) {
			let result = label
				.map(aLabel => this.getWith(aLabel, element));
			result = element
				? result.find(element => element.childNodes.length)
				: result.find(element => element);
			return result
				? result
				: element
					? document.createElement('div')
					: '';
		}
		let pattern = new RegExp(label);
		let keyValPair = this.innerData.find(element => pattern.test(element[0]));
		if (element) return keyValPair ? keyValPair[1] : document.createElement('div');
		return keyValPair
			? ZU.trimInternal(keyValPair[1].innerText)
			: '';
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.scidb.cn/en/detail?dataSetId=3057ac19267b4d6bbfe08ddd3a01d55d",
		"items": [
			{
				"itemType": "dataset",
				"title": "Dataset for humidity-sensitive chemoelectric flexible sensors based on metal-air redox reaction for health management",
				"creators": [
					{
						"firstName": "Shuo",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "Yong",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Xiaoping",
						"lastName": "Liang",
						"creatorType": "author"
					},
					{
						"firstName": "Haomin",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Haojie",
						"lastName": "Lu",
						"creatorType": "author"
					},
					{
						"firstName": "Mengjia",
						"lastName": "Zhu",
						"creatorType": "author"
					},
					{
						"firstName": "Huimin",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Mingchao",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Qiu",
						"lastName": "Xinping",
						"creatorType": "author"
					},
					{
						"firstName": "Yafeng",
						"lastName": "Song",
						"creatorType": "author"
					},
					{
						"firstName": "Yingying",
						"lastName": "Zhang",
						"creatorType": "author"
					}
				],
				"date": "2022-06-21",
				"DOI": "10.57760/sciencedb.01874",
				"abstractNote": "This is a dataset for humidity-sensitive chemoelectric flexible sensors based on metal-air redox reaction for health management",
				"extra": "CSTR: 31253.11.sciencedb.01874\nfoundation: National Natural Science Foundation of China, National Natural Science Foundation of China, National Key Basic Research and Development Program\nrelatedPapers: https://www.nature.com/articles/s41467-022-33133-y\ncorrespondent: yingyingzhang@tsinghua.edu.cn\nvisit: 998\ndownload: 35",
				"identifier": "3057ac19267b4d6bbfe08ddd3a01d55d",
				"language": "en-US",
				"libraryCatalog": "Science Data Bank",
				"rights": "CC BY-NC-SA 4.0",
				"type": "personal",
				"url": "https://www.scidb.cn/en/detail?dataSetId=3057ac19267b4d6bbfe08ddd3a01d55d",
				"versionNumber": "V3",
				"attachments": [],
				"tags": [
					{
						"tag": "flexible electronics"
					},
					{
						"tag": "humidity sensor"
					},
					{
						"tag": "metal-air reodx reaction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scidb.cn/detail?dataSetId=533223505102110720",
		"items": [
			{
				"itemType": "dataset",
				"title": "MODIS daily cloud-free snow cover product over the Tibetan Plateau",
				"creators": [
					{
						"firstName": "Qiu",
						"lastName": "Yubao",
						"creatorType": "author"
					},
					{
						"firstName": "Liu",
						"lastName": "Lijing",
						"creatorType": "author"
					},
					{
						"firstName": "Shi",
						"lastName": "Lijuan",
						"creatorType": "author"
					},
					{
						"firstName": "He",
						"lastName": "Siyu",
						"creatorType": "author"
					},
					{
						"firstName": "Chu",
						"lastName": "Duo",
						"creatorType": "author"
					},
					{
						"firstName": "Shi",
						"lastName": "Jiancheng",
						"creatorType": "author"
					},
					{
						"firstName": "Guo",
						"lastName": "Huadong",
						"creatorType": "author"
					}
				],
				"date": "2021-11-08",
				"DOI": "10.11922/sciencedb.55",
				"abstractNote": "We have updated the data of \"MODIS daily cloud-free snow cover product over the Tibetan Plateaut \"(http://www.csdata.org/p/15/) , Version updated to C6.1.The updated product has a time range from 2002 to 2021 and version updated to C6.1. The description of the differecnce between C6 and C6.1 can be found in http://www.csdata.org/p/15/",
				"extra": "original-author: 邱玉宝\noriginal-author: 刘立京\noriginal-author: 石利娟\noriginal-author: 何思宇\noriginal-author: 除多\noriginal-author: 施建成\noriginal-author: 郭华东\nCSTR: 31253.11.sciencedb.55\nrelatedPapers: MODIS daily cloud-free snow cover product over the Tibetan Plateau\ncorrespondent: qiuyb@aircas.ac.cn\nvisit: 48,965\ndownload: 1,835",
				"identifier": "533223505102110720",
				"language": "en-US",
				"libraryCatalog": "Science Data Bank",
				"rights": "CC BY 4.0 您可以自由地：共享 — 在任何媒介以任何形式复制、发行本作品,演绎 — 修改、转换或以本作品为基础进行创作在任何用途下，甚至商业目的。只要你遵守许可协议条款，许可人就无法收回你的这些权利。",
				"url": "https://www.doi.org/10.11922/sciencedb.55",
				"versionNumber": "V3",
				"attachments": [],
				"tags": [
					{
						"tag": "MODIS"
					},
					{
						"tag": "Tibetan Plateau"
					},
					{
						"tag": "cloud free"
					},
					{
						"tag": "cloud removal algorithm"
					},
					{
						"tag": "daily snow cover products"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
