{
	"translatorID": "5f0ca39b-898a-4b1e-b98d-8cd0d6ce9801",
	"label": "Airiti",
	"creator": "Aurimas Vinckevicius, jiaojiaodubai",
	"target": "^https?://www\\.airiti(library|books)\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 110,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-02 09:31:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 jiaojiaodubai<jiaojiaodubai23@gmail.com>

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
	if (/\/Detail(\/|\?)/.test(url)) {
		const typeTag = text(doc, '.preTag.journal > span:last-child');
		if (['期刊', 'Journals'].includes(typeTag)) {
			return 'journalArticle';
		}
		else if (['學位論文', 'Theses', '学位论文'].includes(typeTag)) {
			return 'thesis';
		}
		else if (['會議論文', 'Proceedings', '会议论文'].includes(typeTag)) {
			return 'conferencePaper';
		}
		else {
			return 'book';
		}
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	const items = {};
	let found = false;
	// '.searchResultInfo h3 > a' for  library
	// 'ul.index_tab_wrap >  li > a,[name="PublicationID"] h4 > a' for books
	const rows = doc.querySelectorAll('.searchResultInfo h3 > a,ul.index_tab_wrap >  li > a,[name="PublicationID"] h4 > a');
	for (const row of rows) {
		let id, href, title;
		if (doc.location.href.includes('airitilibrary')) {
			id = row.getAttribute('onclick').match(/'[^']*'/g).map(arg => arg.slice(1, -1))[0];
			href = `/Article/Detail?DocID=${id}`;
		}
		else {
			id = tryMatch(row.getAttribute('onclick'), /'([^']+)'/, 1);
			href = `/Detail/Detail?PublicationID=${id}`;
		}
		title = ZU.trimInternal(row.textContent);
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	const itemType = detectWeb(doc, url);
	if (itemType == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await doWeb(await requestDocument(url), url);
		}
	}
	else if (itemType == 'book') {
		await scrapeBooks(doc, url);
	}
	else {
		await scrapeLibrary(doc, url);
	}
}

async function scrapeBooks(doc, url) {
	const newItem = new Z.Item('book');
	newItem.title = text(doc, '.detail_list h3');
	newItem.abstractNote = text(doc, '#tab1');
	const data = {};
	doc.querySelectorAll('.detail_list > ul > li').forEach((elm) => {
		const field = ZU.trimInternal(elm.textContent);
		const key = tryMatch(field, /^(.+)?：/, 1);
		const value = tryMatch(field, /：(.*)$/, 1);
		if (key) data[key] = value;
	});
	newItem.place = data['出版地'];
	newItem.publisher = data['出版社'];
	newItem.date = data['出版日期'];
	newItem.ISBN = data['ISBN/識別號'];
	newItem.language = data['語文'];
	data['作者'].split(/\s?；\s?/).forEach((group) => {
		const role = tryMatch(group, /\((.+?)\)$/, 1);
		const creatorType = role == '譯' ? 'translator' : 'author';
		const names = group.replace(/\(.+?\)$/, '').split('、');
		names.forEach((name) => {
			const creator = ZU.cleanAuthor(
				ZU.capitalizeName(
					name.replace(/．([\u4e00-\u9fff])/g, (_, cjk) => `·${cjk}`).replace(/([\u4e00-\u9fff])．/g, (_, cjk) => `${cjk}·`)
				),
				creatorType
			);
			newItem.creators.push(creator);
		});
	});
	newItem.DOI = data.DOI;
	fixItem(newItem, doc, url);
	newItem.complete();
}

async function scrapeLibrary(doc, url = doc.location.href) {
	try {
		// throw new Error('debug');
		await scrapeAPI(doc, url);
	}
	catch (error) {
		await scrapeDoc(doc, url);
	}
}

async function scrapeAPI(doc, url) {
	const id = tryMatch(url, /Detail\/([^?&#/]+)/, 1) || tryMatch(url, /DocID=([^?&#/]+)/, 1);
	const respond = await requestJSON('https://www.airitilibrary.com/Article/CiteExport', {
		method: 'POST',
		body: `jsString=%5b%22${id}%22%5d&type=RIS`
	});
	const translator = Zotero.loadTranslator('import');
	// RIS
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
	translator.setString(respond.ReturnData.Content);
	translator.setHandler('itemDone', (_obj, item) => {
		fixItem(item, doc, url);
		item.complete();
	});
	await translator.translate();
}

async function scrapeDoc(doc, url) {
	const translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		fixItem(item, doc, url);
		item.complete();
	});
	const em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}

function fixItem(item, doc, url) {
	function fix(field, callback) {
		if (item[field]) {
			item[field] = callback(item[field]);
		}
	}
	function addExtra(field, value) {
		if (value) {
			item.extra += `\n${field}: ${value}`;
		}
	}
	item.itemType = detectWeb(doc, url);
	fix('title', ZU.capitalizeTitle);
	fix('date', ZU.strToISO);
	fix('language', (language) => {
		return {
			英文: 'en-US',
			繁體中文: 'zh-TW'
		}[language];
	});
	item.libraryCatalog = 'Airiti';
	switch (item.itemType) {
		case 'journalArticle':
			fix('publicationTitle', ZU.capitalizeTitle);
			break;
		case 'thesis':
			delete item.issue;
			item.numPages = item.pages;
			delete item.pages;
			item.thesisType = `${tryMatch(text(doc, '.sourceTitleName'), /\/([^/]+)\(.*\)$/, 1)}學位論文`;
			item.creators = Array.from(doc.querySelectorAll('.author a[key1]')).map((elm) => {
				const creatorType = elm.getAttribute('key4') == '10' ? 'contributor' : 'author';
				return /[\u4e00-\u9fff]/.test(elm.textContent)
					? {
						lastName: elm.textContent,
						creatorType: creatorType
					}
					: ZU.cleanAuthor(elm.textContent, creatorType);
			});
			break;
		case 'conferencePaper':
			delete item.issue;
			item.proceedingsTitle = item.conferenceName;
			delete item.conferenceName;
			break;
	}
	if (!item.extra) item.extra = '';
	addExtra('original-title', ZU.capitalizeTitle(text(doc, 'h3.subTitleColor')));
	item.creators.forEach((creator) => {
		if (/[\u4e00-\u9fff]/.test(creator.lastName)) {
			if (creator.firstName) {
				creator.lastName = creator.firstName + creator.lastName;
			}
			if (/\(.+?\)$/.test(creator.lastName)) {
				const original = tryMatch(creator.lastName, /\((.+?)\)$/, 1);
				creator.lastName = creator.lastName.replace(/\((.+?)\)$/, '');
				addExtra('original-author', ZU.capitalizeName(original));
			}
			creator.firstName = '';
			creator.fieldMode = 1;
		}
		else if (!creator.firstName) {
			const formatedCreator = ZU.cleanAuthor(ZU.capitalizeName(creator.lastName), creator.creatorType);
			creator.firstName = formatedCreator.firstName;
			creator.lastName = formatedCreator.lastName;
			delete creator.fieldMode;
		}
	});
	item.attachments = [];
}

function tryMatch(string, pattern, index = 0) {
	if (!string) return '';
	const match = string.match(pattern);
	return (match && match[index])
		? match[index]
		: '';
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Article/Detail/P20200813001-202112-202112200001-202112200001-473-478",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Thinking on the Construction of Model Party Branch in Colleges and Universities",
				"creators": [
					{
						"lastName": "Lan",
						"creatorType": "author",
						"firstName": "Bingxin"
					},
					{
						"lastName": "Hu",
						"creatorType": "author",
						"firstName": "Huan"
					}
				],
				"date": "2021",
				"DOI": "10.6981/FEM.202112_2(12).0063",
				"ISSN": "2692-7608",
				"abstractNote": "The Party branch is the Party's basic organization, the basic unit of the Party organization to carry out its work, the Party's fighting fortress in the basic social organizations, and the foundation of all the Party's work and combat effectiveness. Party building work is an effective way for schools to consolidate ideological and political work and an important starting point for carrying out ideological and political education. The construction of grass-roots Party branches is the top priority of the Party building work in colleges and universities, it is necessary to strengthen political guidance and enhance Party member education; strictly grasp standard procedures, do a good job in Party member management, strictly regulate Party discipline, strengthen Party member supervision, focus on central work, extensively organize teachers and students, choose advanced models, focus on propagation work; gather the joint efforts of teachers and students, promote collaborative education; strengthen the sense of purpose, connect and serve teachers and students, and solidly promote the creation of model Party branches, give full play to the leading and exemplary role, educate people for the Party and cultivate talents for the country.",
				"issue": "12",
				"journalAbbreviation": "Frontiers in Economics and Management",
				"language": "en-US",
				"libraryCatalog": "Airiti",
				"pages": "473-478",
				"publicationTitle": "Frontiers in Economics and Management",
				"url": "https://doi.org/10.6981%2fFEM.202112_2(12).0063",
				"volume": "2",
				"attachments": [],
				"tags": [
					{
						"tag": "Colleges and Universities"
					},
					{
						"tag": "Model"
					},
					{
						"tag": "Party Branch"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Article/Detail?DocID=U0146-0501202217010500",
		"defer": true,
		"items": [
			{
				"itemType": "thesis",
				"title": "解析客戶體驗對客戶契約的影響——網約車場景實證分析",
				"creators": [
					{
						"lastName": "鄭宇浩",
						"creatorType": "author",
						"firstName": "",
						"fieldMode": 1
					},
					{
						"lastName": "李希熙",
						"creatorType": "contributor",
						"firstName": "",
						"fieldMode": 1
					}
				],
				"date": "2021",
				"abstractNote": "网约车作为共享经济的重要模块，透过线上的信息技术与线下的服务结合，共构服务体验以满足大众的出行需求，同时，客户体验以及客户契约作为近年来营销学科中比较热门的学术主题，从未在类似网约车这种线上结合线下的场景中被研究过，再者，目前企业对于客户体验管理的方法论逐渐重视，而了解客户体验的形成因素也是其中的重要一环，最后，大多数的论文都以反映型变量来描述客户体验，对与客户体验的形成因素以及影响因素有诸多混淆。综上所述，本研究旨在建立网约车场景下合理的客户体验量表，以及深度解析客户体验对于客户契约的影响。\n本研究的研究方法以及步骤如下：透过文獻阅读研究以及对目前网约车龙头企业滴滴出行内部高层管理者和资深员工的深度访谈，梳理出乘客的客户旅程模型，严谨地开发适用于网约车场景的客户体验量表，以此建构两个阶段的研究假设模型。接?，本研究设计了问卷并且以电子形式的问卷向互联网的使用族群发放，在除去未使用过网约车的?本后，透过SPSS 以及Smartpls 对回收问卷进行量表的信度、效度验证，并且以结构方程模型法进行数据分析与假设验证。\n关于本研究的研究成果，首先，对于客户体验构念的形成，以感官性体验、情感性体验、行为性体验、认知性体验、社交性体验等五个维度的形成方式经过了数据的检验；在第一阶段的研究中，路径分析的结果验证了客户体验对客户契约正向影响的显著性；在第二阶段的研究中，客户体验的五个维度内，以行为性体验和社交性体验显著地正向影响三个客户契约的影响价值（客户终生价值、客户影响价值、客户知识价值）。特别地，对于客户终生价值的影响，行为性体验高于社交性体验。而在对于客户影响价值的影响中，行为性体验的影响被客户终生价值完全中介。最后，客户契约中，客户终生价值正向影响客户影响价值。网约车企业可以参考本研究的结果对自身服务的客户体验情?有初步的了解，进而改善自身产品服务为客户带来的体验。",
				"extra": "original-title: Decomposed Analysis on the Influence of Customer Experience on Customer Engagement: an Empirical Study with the Online Ride-hailing Context.\noriginal-author: Yu-hao Zheng",
				"language": "zh-TW",
				"libraryCatalog": "Airiti",
				"numPages": "67",
				"thesisType": "碩士學位論文",
				"university": "北京清華大學",
				"url": "Article/Detail?docID=U0146-0501202217010500",
				"attachments": [],
				"tags": [
					{
						"tag": "SEM modeling"
					},
					{
						"tag": "customer engagement"
					},
					{
						"tag": "customer experience"
					},
					{
						"tag": "online ride-hailing service"
					},
					{
						"tag": "客戶契約"
					},
					{
						"tag": "客戶體驗"
					},
					{
						"tag": "結構方程模型"
					},
					{
						"tag": "網約車"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Article/Detail?DocID=U0003-2904202321341600",
		"defer": true,
		"items": [
			{
				"itemType": "thesis",
				"title": "常見的風濕病患者中使用羥氯奎寧與心律不整的風險",
				"creators": [
					{
						"lastName": "羅健賢",
						"creatorType": "author",
						"firstName": "",
						"fieldMode": 1
					},
					{
						"lastName": "蘇峻弘",
						"creatorType": "contributor",
						"firstName": "",
						"fieldMode": 1
					},
					{
						"lastName": "魏正宗",
						"creatorType": "contributor",
						"firstName": "",
						"fieldMode": 1
					}
				],
				"date": "2023",
				"abstractNote": "研究目的：羥氯奎寧（Hydroxychloroquine, HCQ）是在某些風濕性疾病，例如系統性紅斑性狼瘡（Systemic lupus erythematosus, SLE），類風濕性關節炎（Rheumatoid arthritis, RA）或乾燥症（Sjögren’s syndrome, SS）的一種標準治療藥物。接受HCQ治療的患者中是否增加心律不整的風險是一個重要的安全問題。關於HCQ治療是否增加心律不整的臨床結果仍然不一致。\n\n研究方法及資料：這是一項回顧性的研究，利用台灣的長期健康保險資料庫進行。從2000年到2012年，選擇年齡≥20歲新診斷的RA、SLE或SS的患者。通過傾向評分匹配法將接受HCQ治療和未接受HCQ治療的患者分兩組。使用Cox比例風險模型，在控制相關變數後，分析兩組之間心律不整風險的差異。我們還分析了不同人群和不同研究設計，以研究HCQ和心律不整風險之間的關聯。\n\n研究結果：在使用HCQ的患者和未使用HCQ的患者中，所有心律不整的風險並無差異（調整風險比為0.81，95% CI 0.61–1.07），包括心室心律不整在內。無論每日HCQ劑量是否小於400毫克或大於等於400毫克，以及持續追蹤時間是否小於或等於4個月或大於4個月，心律不整的風險也沒有差異。我們在相同資料來源（台灣健康保險資料庫）中對不同的人群（單一RA疾病）與也使用了不同統計方法（巢式病例對照研究）對SLE患者進行了另外分析。結果使用HCQ與心律不整風險之間顯示相似中性的結果。\n\n結論：在常見的自體免疫病患者，HCQ的使用並沒有增加所有心律不整的風險和心室性心律不整。無論藥物治療時間或每日劑量差異，結果均一致。\n\n關鍵詞 羥氯奎寧、心律不整、類風濕性關節炎、系統性紅斑性狼瘡、乾燥症。",
				"extra": "DOI: 10.6834/csmu202300046\noriginal-title: Hydroxychloroquine and the Risk of Cardiac Arrhythmia in Patients with Common Rheumatic Diseases\noriginal-author: Chien-Hsien Lo Myint Oo Lwin\noriginal-author: Cheng-Chung Wei",
				"language": "zh-TW",
				"libraryCatalog": "Airiti",
				"numPages": "35",
				"thesisType": "博士學位論文",
				"university": "中山醫學大學",
				"url": "https://doi.org/10.6834%2fcsmu202300046",
				"attachments": [],
				"tags": [
					{
						"tag": "Arrhythmia"
					},
					{
						"tag": "Hydroxychloroquine"
					},
					{
						"tag": "Hydroxychloroquine"
					},
					{
						"tag": "Rheumatoid arthritis"
					},
					{
						"tag": "Sjögren's syndrome"
					},
					{
						"tag": "Systemic lupus erythematosus"
					},
					{
						"tag": "arrhytSjögren's syndrome"
					},
					{
						"tag": "arrhythmia"
					},
					{
						"tag": "rheumatoid arthritis"
					},
					{
						"tag": "systemic lupus erythematosus"
					},
					{
						"tag": "乾燥症"
					},
					{
						"tag": "心律不整"
					},
					{
						"tag": "系統性紅斑性狼瘡"
					},
					{
						"tag": "羥氯奎寧"
					},
					{
						"tag": "類風濕性關節炎"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Article/Detail/P20110413001-200411-201104130017-201104130017-446-453",
		"defer": true,
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "國小自然與生活科技教師參與輔導團研習活動之民俗誌研究",
				"creators": [
					{
						"lastName": "曾國鴻",
						"creatorType": "author",
						"fieldMode": 1,
						"firstName": ""
					},
					{
						"lastName": "賴秋露",
						"creatorType": "author",
						"fieldMode": 1,
						"firstName": ""
					},
					{
						"lastName": "鍾季娟",
						"creatorType": "author",
						"fieldMode": 1,
						"firstName": ""
					},
					{
						"lastName": "何妙桂",
						"creatorType": "author",
						"fieldMode": 1,
						"firstName": ""
					},
					{
						"lastName": "廖文榮",
						"creatorType": "author",
						"fieldMode": 1,
						"firstName": ""
					}
				],
				"date": "2004",
				"DOI": "10.29495/CITE.200411.0446",
				"abstractNote": "本研究針對九年一貫輔導團規劃之「國小自然與生活科技領域研習」進行探究，目的是探討教師參與輔導團研習活動的意願及其影響因素，並瞭解輔導團研習活動對自然與生活科技教師教學能力之影響，最後根據研究結果提供輔導團作爲規劃研習活動之參考。本研究採俗民誌研究法，研究者先進入研習現場參與觀察，再以六位自然與生活科技領域相關教師爲對象，進行焦點團體訪談，最後輔以相關資料文件做分析，研究結果發現：充實知識是參與研習意願的動力來源、研習的時間爲教師決定是否參與研習的重要因素、家庭狀況與研習地點的安排影響教師是否參與研習的決定、研習的方式應考量研習的目的做不同形式的安排、研習教材內容會充實教師的專業知能、講師的授課方式讓研習教師對教學技巧自我反省。研習綜合歸納之研究結論如下：1.自然與生活科技教師參與輔導團研習活動的意願高。2.影響教師參與輔導團研習活動的意願之主要因素爲「研習時間」、「研習地點」、「家庭狀況」。3.輔導團研習活動在「教材內容」方面，對教師之影響爲充實知識與補充教學資料。4.輔導團之研習在「講師授課方式」方面，對教師在運用教具、教學方法與師生互動等層面有影響。",
				"extra": "original-title: An Ethnographical Study of Elementary Science and Technology Teachers Participating in Advisory Team Workshop",
				"language": "zh-TW",
				"libraryCatalog": "Airiti",
				"pages": "446-453",
				"proceedingsTitle": "科技教育課程改革與發展學術研討會論文集",
				"publisher": "國立高雄師範大學",
				"url": "https://doi.org/10.29495%2fCITE.200411.0446",
				"attachments": [],
				"tags": [
					{
						"tag": "Compulsory Education Advisory Group"
					},
					{
						"tag": "ethnographic"
					},
					{
						"tag": "science and life technology"
					},
					{
						"tag": "solution-focused group counseling"
					},
					{
						"tag": "study"
					},
					{
						"tag": "俗民誌"
					},
					{
						"tag": "自然與生活科技"
					},
					{
						"tag": "輔導團"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Article/Query?queryString=%7B%22%E6%9F%A5%E8%A9%A2%E6%99%82%E9%96%93%22%3A%222024%2F11%2F01%2011%3A58%3A07%22%2C%22%E6%9F%A5%E8%A9%A2%E6%AD%B7%E5%8F%B2%E9%A1%9E%E5%9E%8B%E4%BB%A3%E7%A2%BC%22%3A%22ADLang%22%2C%22%E6%98%AF%E5%90%A6%E9%97%9C%E9%8D%B5%E5%AD%97%E7%B5%B1%E8%A8%88%22%3Atrue%2C%22DSF%22%3A%7B%22SearchFileds%22%3A%5B%7B%22FieldName%22%3A49%2C%22SearchKeyWord%22%3A%22%E8%87%BA%E7%81%A3%22%2C%22FieldQuery%22%3Atrue%7D%5D%2C%22IsFuzzySearch%22%3Afalse%7D%2C%22BSF%22%3A%7B%22SearchFiledList%22%3A%5B%7B%22FieldName%22%3A0%2C%22SearchKeyWord%22%3A%22%E8%87%BA%E7%81%A3%22%2C%22FieldQuery%22%3Atrue%2C%22FieldLogic%22%3A0%7D%5D%7D%7D",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Publication/Information?publicationID=P20200813001&type=%E6%9C%9F%E5%88%8A&tabName=2&issueYear=&issueID=&publisherID=U20190709001&SessionID=",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.airitibooks.com/Detail/Detail?PublicationID=P20230807081",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "奧本海默（上）：原子彈的誕生",
				"creators": [
					{
						"firstName": "",
						"lastName": "凱·柏德",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "馬丁·薛文",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "",
						"lastName": "林鶯",
						"creatorType": "translator",
						"fieldMode": 1
					}
				],
				"date": "2023",
				"ISBN": "9786263539051",
				"abstractNote": "2006年普立茲獎傳記類得獎作品．美國國家書評獎最佳傳記\n★《書單》和《發現雜誌》年度科學類好書\n★《紐約時報》年度一百本值得關注的好書\n★《紐約時報書評》、《華盛頓郵報圖書世界》、《堪薩斯城星報》及《芝加哥論壇報》年度好書\n他是美國的普羅米修斯，「原子彈之父」，戰爭期間為他的國家帶頭努力從大自然攫取令人敬畏的太陽之火。之後，他明智道出其中的危險，也對潛在的助益懷抱希望。…但，奧本海默的警告無人理會，最後，他被消音了，成為麥卡錫主",
				"language": "zh-TW",
				"libraryCatalog": "Airiti",
				"place": "臺灣",
				"publisher": "時報文化出版企業股份有限公司",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitibooks.com/Home/Index",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.airitibooks.com/Search/Results?SearchFieldList_obj=%5B%7B%22SearchString%22%3A%22%25E8%2587%25BA%25E7%2581%25A3%22%2C%22SearchType%22%3A%22%25E6%2589%2580%25E6%259C%2589%25E6%25AC%2584%25E4%25BD%258D%22%2C%22SearchFieldCondition%22%3A%22AND%22%7D%5D&OutputKeyinSearchFieldList_obj=%5B%7B%22SearchString%22%3A%22%25E8%2587%25BA%25E7%2581%25A3%22%2C%22SearchType%22%3A%22%25E6%2589%2580%25E6%259C%2589%25E6%25AC%2584%25E4%25BD%258D%22%2C%22SearchFieldCondition%22%3A%22AND%22%7D%5D&IsLibraryCollections=Y&toPage=",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
