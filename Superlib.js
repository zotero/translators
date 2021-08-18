{
	"translatorID": "33553736-4ea9-4b1a-b1e1-d43b2a918156",
	"label": "Superlib",
	"creator": "018<lyb018@gmail.com>",
	"target": "^https?://(book|jour)\\.ucdrs\\.superlib\\.net/(search|views/specific)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-18 19:44:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 018<lyb018@gmail.com>

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

function trim(content) {
	return content.replace(/^[\xA0\s]+/gm, '')
		.replace(/[\xA0\s]+$/gm, '')
		.replace(/\n+/g, '\n')
		.replace(/:\n+/g, ': ')
		.replace(/]\n/g, ']')
		.replace(/】\n/g, '】')
		.replace(/\n\/\n/g, '/');
}

// https://aurimasv.github.io/z2csl/typeMap.xml#map-book
// https://aurimasv.github.io/z2csl/typeMap.xml#map-conferencePaper
// https://aurimasv.github.io/z2csl/typeMap.xml#map-thesis
// https://aurimasv.github.io/z2csl/typeMap.xml#map-journalArticle
// https://aurimasv.github.io/z2csl/typeMap.xml#map-patent
var TYPE_MAP = {
	图书: 'book',
	会议论文: 'conferencePaper',
	学位论文: 'thesis',
	期刊: 'journalArticle',
	专利: 'patent'
};

function doPerson(item, data) {
	// （日）本田晃一著；朱运程译 translator author
	if (!data) return;
	const persons = data.split(/；|;/g);
	for (var person of persons) {
		if (person.endsWith('著')) {
			item.creators.push({
				lastName: person.trim().replace(/著$/g, ''),
				creatorType: 'author',
				fieldMode: 1
			});
		}
		else if (person.endsWith('译')) {
			item.creators.push({
				lastName: person.trim().replace(/译$/g, ''),
				creatorType: 'translator',
				fieldMode: 1
			});
		}
		else {
			item.creators.push({
				lastName: person,
				creatorType: 'author',
				fieldMode: 1
			});
		}
	}
}

function doInventor(item, data) {
	if (!data || data.length <= 0) return;
	const persons = data.split('，');
	for (var person of persons) {
		item.creators.push({
			lastName: person,
			creatorType: 'inventor',
			fieldMode: 1
		});
	}
}

function doTag(item, data) {
	if (!data || data.length <= 0) return;
	const tags = data.split('；');
	for (var tag of tags) {
		item.tags.push(tag.trim());
	}
}

function sourceType(doc) {
	var type = doc.querySelector('.on span').textContent;
	return type;
}

function detectType(doc) {
	return TYPE_MAP[sourceType(doc)];
}

function detectWeb(doc, url) {
	if (url.includes('/search')) {
		return getSearchResults(doc, true) ? 'multiple' : false;
	}
	else {
		var dType = detectType(doc, url);
		if (dType) {
			return dType;
		}
	}
	
	return false;
}

function getSearchResults(doc, checkOnly, itemInfo) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.book1');
	for (let row of rows) {
		let a = row.querySelector('td > table .px14');
		if (!a) {
			a = row.querySelector('a');
		}
		if (!a) {
			continue;
		}

		if (checkOnly) return true;
		
		let url = a.href;

		// Z.debug(url);
		let title = ZU.trimInternal(a.textContent);
		
		found = true;
		if (!found['']) {
			items[''] = '【提醒：存在失败的可能，请隔几个小时后试试，或单个抓取。】';
		}
		
		if (itemInfo) {
			var download = row.querySelector('.get a');
			if (download && download.textContent == 'PDF下载') {
				itemInfo[url] = {
					pdfurl: download.href
				};
			}
		}
		if (title.startsWith('《') && title.endsWith('》')) {
			title = title.replace(/《|》/g, '');
		}
		
		items[url] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var itemInfo = {};
		Zotero.selectItems(getSearchResults(doc, false, itemInfo), function (items) {
			if (items) {
				if (items['']) {
					delete items[''];
				}
				scrapeItem(Object.keys(items), itemInfo);
			}
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrapeItem(items, itemInfo) {
	ZU.processDocuments(items, function (doc, url) {
		scrape(doc, url, itemInfo[url] ? itemInfo[url].pdfurl : null);
	});
}

function scrape(doc, url, pdfurl) {
	if (!url || url.length <= 0) {
		return;
	}
	
	var itemType = detectType(doc);
	var item = new Zotero.Item(itemType);

	item.url = url;
	switch (sourceType(doc)) {
		case '图书':
			item.title = text(doc, '.tutilte');
			var infos = text(doc, '.tubox dl');
			infos = trim(infos);
			for (var section0 of infos.split('\n')) {
				if (!section0.trim()) continue;
		
				let index = section0.indexOf('】');
				if (index <= -1) continue;
		
				let key = section0.substr(0, index + 1).trim();
				let value = section0.substr(index + 1).trim();
				// Z.debug(key + ':' + value);
				switch (key) {
					case "【作　者】":
						doPerson(item, value);
						break;
					case "【出版项】":
						var vals = Object.values(value.split(/：|,/g));
						item.publisher = vals[1];
						item.date = vals[2];
						break;
					case "【ISBN号】":
						item.ISBN = value;
						break;
					case "【形态项】":
						item.numPages = value;
						break;
					case "【中图法分类号】":
						item.archiveLocation = value.replace(/\(.*\)/, '');
						break;
						
					default:
						break;
				}
			}
		
			// 摘要
			item.abstractNote = text(doc, '.tu_content').replace(/内容提要:\n*/g, '');
			break;
		case '期刊':
			item.title = ZU.trimInternal(text(doc, 'h1.title'));
			infos = doc.querySelectorAll('#m_top li');
			for (var section1 of infos) {
				let content = ZU.trimInternal(section1.textContent);
				if (!content || content.length <= 0) continue;
		
				let index = content.indexOf('】');
				if (index <= -1) continue;
		
				content = trim(content);
				let key = content.substr(0, index + 1).trim();
				let value = content.substr(index + 1).trim();
				switch (key) {
					case "【作 者】":
						doPerson(item, value);
						break;
					case "【刊 名】":
						item.publicationTitle = value;
						break;
					case "【期 号】":
						item.issue = value;
						break;
					case "【出版日期】":
						item.date = value;
						break;
					case "【摘 要】":
						item.abstractNote = value;
						break;
					case "【关键词】":
						doTag(item, value);
						break;
					case "【影响因子】":
						item.extra = '影响因子: ' + value;
						break;
					default:
						break;
				}
			}
			break;
		case '学位论文':
			item.title = ZU.trimInternal(text(doc, 'h1.title'));
			infos = doc.querySelectorAll('#m_top li');
			for (var section5 of infos) {
				let content = ZU.trimInternal(section5.textContent);
				if (!content || content.length <= 0) continue;
		
				let index = content.indexOf('】');
				if (index <= -1) continue;
		
				content = trim(content);
				let key = content.substr(0, index + 1).trim();
				let value = content.substr(index + 1).trim();
				switch (key) {
					case "【作 者】":
						doPerson(item, value);
						break;
					case "【学位授予单位】":
						item.university = value;
						break;
					case "【导师姓名】":
						item.creators.push({
							lastName: value,
							creatorType: 'contributor',
							fieldMode: 1
						});
						break;
					case "【学位年度】":
						item.date = value;
						break;
					case "【摘 要】":
						item.abstractNote = value.replace(/隐藏更多/g, '');
						break;
					case "【关键词】":
						doTag(item, value);
						break;
					case "【学位名称】":
						item.type = value;
						break;
					default:
						break;
				}
			}
			break;
		case '会议论文':
			item.title = ZU.trimInternal(text(doc, 'h1.title'));
			infos = doc.querySelectorAll('#m_top li');
			for (var section3 of infos) {
				let content = ZU.trimInternal(section3.textContent);
				if (!content || content.length <= 0) continue;
		
				let index = content.indexOf('】');
				if (index <= -1) continue;
		
				content = trim(content);
				let key = content.substr(0, index + 1).trim();
				let value = content.substr(index + 1).trim();
				switch (key) {
					case "【作 者】":
						doPerson(item, value);
						break;
					case "【会议名称】":
						item.conferenceName = value;
						break;
					case "【会议录名称】":
						item.series = value;
						break;
					case "【日 期】":
						item.date = value;
						break;
					case "【摘 要】":
						item.abstractNote = value.replace(/隐藏更多/g, '');
						break;
					case "【关键词】":
						doTag(item, value);
						break;
					case "【作者联系方式】":
						item.place = value;
						break;
					default:
						break;
				}
			}
			break;
		case '专利':
			item.title = ZU.trimInternal(text(doc, 'h1.title'));
			infos = doc.querySelectorAll('.content li');
			for (var section4 of infos) {
				let content = ZU.trimInternal(section4.textContent);
				if (!content || content.length <= 0) continue;
		
				let index = content.indexOf('】');
				if (index <= -1) continue;
		
				content = trim(content);
				let key = content.substr(0, index + 1).trim();
				let value = content.substr(index + 1).trim();
				switch (key) {
					case "【申请号】":
						item.applicationNumber = value;
						break;
					case "【申请人】":
						doInventor(item, value);
						break;
					case "【发明人】":
						doInventor(item, value);
						break;
					case "【申请日期】":
						item.filingDate = value;
						break;
					case "【地 址】":
						item.place = value;
						break;
					case "【专利类型】":
						item.extra = '专利类型: ' + value;
						break;
					case "【IPC号】":
						item.extra += '; IPC号: ' + value;
						break;
					case "【摘 要】":
						item.abstractNote = value;
						break;
					default:
						break;
				}
			}
			break;
	}
	
	if (item.title.startsWith('《') && item.title.endsWith('》')) {
		item.title = item.title.replace(/《|》/g, '');
	}
	
	// 如果抓取失败，请配合油猴脚本使用：https://greasyfork.org/zh-CN/scripts/408790
	if (pdfurl) {
		item.attachments.push({
			url: pdfurl,
			title: 'Full Text PDF',
			mimeType: 'application/pdf'
		});
	}
	else {
		var download = doc.querySelector('.link a');
		if (download && download.textContent == 'PDF下载') {
			item.attachments.push({
				url: download.href,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://book.ucdrs.superlib.net/views/specific/2929/bookDetail.jsp?dxNumber=000018108791&d=F788C1F57DDBFD163B5EDCB5371550F0&fenlei=02140804",
		"items": [
			{
				"itemType": "book",
				"title": "认知跃迁",
				"creators": [
					{
						"lastName": "（日）本田晃一",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "朱运程",
						"creatorType": "translator",
						"fieldMode": 1
					}
				],
				"date": "2019.04",
				"ISBN": "9787221152459",
				"abstractNote": "在这个发展迅速的世界，每个人都承受着前所未有的压力和挑战。一个人想要取得成功，不是去苛求外部环境，而是要打破固有认知，扩展人生格局，形成更加高效的认知系统。作者将在成功人士身上得到的启发，通过验证形成了自己的认知。通过这些认知，作者将父亲负债累累濒临破产的企业转亏为盈，并积累下了巨额财富。本书将这些认知通过轻松幽默的语言，结合自己的经历阐述出来，为我们看待事物提供与众不同的视角，帮助我们重新认识自我、认清世界。通过本书可以迅速提高认知、扩展格局，快速找到事物本质，打破生活和事业中的困境，让我们成为一个有竞争力的人。",
				"archiveLocation": "B848.4-49",
				"libraryCatalog": "Superlib",
				"numPages": "239",
				"publisher": "贵州人民出版社",
				"url": "http://book.ucdrs.superlib.net/views/specific/2929/bookDetail.jsp?dxNumber=000018108791&d=F788C1F57DDBFD163B5EDCB5371550F0&fenlei=02140804",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://jour.ucdrs.superlib.net/views/specific/2929/thesisDetail.jsp?dxNumber=390107316149&d=73BC951F9D12D3EF5BFAD6281BFC35F0&sw=%E8%AE%A4%E7%9F%A5",
		"items": [
			{
				"itemType": "thesis",
				"title": "认知是否具有现象性？",
				"creators": [
					{
						"lastName": "孙玉婷",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "蔡仲",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2019",
				"abstractNote": "意识有感官、身体感觉、情绪情感、认知等形式,前三种意识形式的每一种意识状态似乎都具有独特的现象特征,但是对于认知状态是否具有现象特征存在激烈争论。一方面,一些理论家认为现象特征是有意识的认知状态固有的现象属性;另一方面,另一些理论家则固守心灵哲学中的传统观点,认为有意识的认知状态不具有现象特征,并且将有意识的认知状态的现象特征还原到感官的现象特征上。本文基于以下几点采取支持认知现象学的立场。首先,我们能够通过内省立即知道我们自身所处的认知状态,而要解释这一事实,就必须承认认知状态的现象感受性,这也就是所谓的自我认识论证;其次,我们能够通过许多案例直观地体验认知的现象感受性,一些理论家基于这些经验实例,构造出巧妙的现象对比论证。这是一种非还原的认知现象学立场,也就是说,现象性是认知状态的固有属性,不可以还原到感官现象性上,现象意识的范围可以拓展到有意识的认知状态。当然,对于以上观点,认知现象学的反对者从不同方面提出质疑。对于自我认识论证,要么质疑内省的可靠性,要么否认我们对自身心理状态的认识特权,要么提出其它方式来解释这种认识特权;对于现象对比论证,还是要将案例中涉及的现象差异还原到心理意象的现象性上。对于反对者的这些做法,我们将指出其中的不足指出,因而他们并不能完成反对认知的现象性的目标,从而捍卫非还原的认知现象学观点。",
				"libraryCatalog": "Superlib",
				"thesisType": "硕士",
				"university": "南京大学",
				"url": "http://jour.ucdrs.superlib.net/views/specific/2929/thesisDetail.jsp?dxNumber=390107316149&d=73BC951F9D12D3EF5BFAD6281BFC35F0&sw=%E8%AE%A4%E7%9F%A5",
				"attachments": [],
				"tags": [
					{
						"tag": "内省论证"
					},
					{
						"tag": "现象对比论证"
					},
					{
						"tag": "现象特征"
					},
					{
						"tag": "自我认识论证"
					},
					{
						"tag": "认知"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://jour.ucdrs.superlib.net/views/specific/2929/CPDetail.jsp?dxNumber=330107854501&d=FDBE0D57AC904E5720CCAD02A1BBDA49&sw=%E5%BA%94%E6%BF%80%E4%B8%8E%E8%AE%A4%E7%9F%A5%E7%9A%84ERP%E7%A0%94%E7%A9%B6",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "慢性应激对注意控制影响的ERP证据及tDCS干预",
				"creators": [
					{
						"lastName": "刘清衿",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "刘永",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "冷雪晨",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "韩金凤",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "王喜术",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "夏锋",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "陈红",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2019",
				"abstractNote": "慢性应激是指应激源持续时间超过30天或应激源持续时间较短,但对个体的影响在30天以上的应激。慢性应激不但会引起一系列身心疾病,也会影响大脑的认知功能,尤其是前额叶执行功能。测量、评估慢性应激的危害,并且找到对应的干预方法对人类心理健康十分重要。本研究即以重大考试(研究生入学考试)作为慢性应激源,以多个应激状态评估量表和血压等生理指标作为评定慢性应激的主客观指标,引用注意控制网络ANT范式,采用事件",
				"conferenceName": "第二十二届全国心理学学术会议",
				"libraryCatalog": "Superlib",
				"place": "西南大学心理学部；陆军军医大学西南医院全军肝胆外科研究所",
				"series": "第二十二届全国心理学学术会议摘要集",
				"url": "http://jour.ucdrs.superlib.net/views/specific/2929/CPDetail.jsp?dxNumber=330107854501&d=FDBE0D57AC904E5720CCAD02A1BBDA49&sw=%E5%BA%94%E6%BF%80%E4%B8%8E%E8%AE%A4%E7%9F%A5%E7%9A%84ERP%E7%A0%94%E7%A9%B6",
				"attachments": [],
				"tags": [
					{
						"tag": "ERPs"
					},
					{
						"tag": "tDCS"
					},
					{
						"tag": "慢性应激"
					},
					{
						"tag": "注意控制"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://jour.ucdrs.superlib.net/views/specific/2929/thesisDetail.jsp?dxNumber=390107059051&d=3F56D2F62968EC84A161D3152EBC23C5&sw=%E5%BA%94%E6%BF%80%E4%B8%8E%E8%AE%A4%E7%9F%A5%E7%9A%84ERP%E7%A0%94%E7%A9%B6",
		"items": [
			{
				"itemType": "thesis",
				"title": "在校大学生特质焦虑人群情绪与认知冲突的ERP研究",
				"creators": [
					{
						"lastName": "徐丹丹",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "季淑梅",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2018",
				"abstractNote": "目前大多数研究者主要关注临床焦虑障碍的情绪、认知加工的特点,对于在应激条件下非临床的高特质焦虑得分者研究相对较少。而较高水平的焦虑易感倾向预示着高风险的焦虑障碍以及其它精神疾病。研究在校大学生特质焦虑人群对情绪、认知加工的特点,有助于焦虑症及其他精神疾病的早期诊断和预防。本文利用事件相关电位(Event-Related Potentials,ERP)技术,以高、低特质焦虑个体为研究对象,探讨在校大学生特质焦虑人群情绪冲突和认知冲突的ERP时空模式特点。本研究内容包含以下两部分:第一部分采用“词-面孔”Stroop范式,令16名高、低特质焦虑被试完成由“开心”和“悲伤”面孔及对应情绪词作为材料的情绪冲突任务,探讨在校大学生特质焦虑人群情绪冲突效应及冲突适应效应。对反应正确率的统计分析显示,高、低特质焦虑组均出现情绪冲突效应和冲突适应效应;在反应时上,高、低特质焦虑组均呈现情绪冲突效应,而高特质焦虑组无冲突适应效应,表明高特质焦虑人群冲突监控能力较弱。ERP结果显示,高特质焦虑组在前额区P100和中央顶区N450波幅上表现出冲突适应效应,表明早期注意和冲突监测能力增强;而高特质焦虑组前额区冲突慢电位SP波幅无冲突适应效应,表明对情绪冲突的反应选择及冲突解决能力减弱。第二部分:利用经典Simon范式,令16名高、低特质焦虑被试完成颜色-位置冲突任务,探讨在校大学生特质焦虑人群对空间位置认知冲突的解决和脑加工特征。行为结果表明,高、低特质焦虑组在反应时和正确率上表现出相同干扰模式的Simon效应。ERP结果表明,高特质焦虑组比低特质焦虑组在中央顶区的P300波幅的Simon效应量大,表现出更大的Simon效应;高特质焦虑组对冲突反应的N270和P300波幅小于低特质焦虑组,表明高特质焦虑人群对空间位置冲突加工的认知抑制能力下降。本研究通过情绪冲突和认知冲突揭示了在校大学生特质焦虑人群对冲突反应监控和抑制能力不足。",
				"libraryCatalog": "Superlib",
				"thesisType": "硕士",
				"university": "燕山大学",
				"url": "http://jour.ucdrs.superlib.net/views/specific/2929/thesisDetail.jsp?dxNumber=390107059051&d=3F56D2F62968EC84A161D3152EBC23C5&sw=%E5%BA%94%E6%BF%80%E4%B8%8E%E8%AE%A4%E7%9F%A5%E7%9A%84ERP%E7%A0%94%E7%A9%B6",
				"attachments": [],
				"tags": [
					{
						"tag": "事件相关电位"
					},
					{
						"tag": "冲突适应效应"
					},
					{
						"tag": "情绪冲突"
					},
					{
						"tag": "特质焦虑"
					},
					{
						"tag": "认知冲突"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
