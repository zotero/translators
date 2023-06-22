{
	"translatorID": "c25b90b3-bd07-474e-a157-e8636d2a49fa",
	"label": "National Digital Library of Theses and Dissertations in Taiwan",
	"creator": "",
	"target": "(^https?://hdl.handle.net|https?://ndltd.ncl.edu.tw)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-14 01:18:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	if (url.includes( 'result')) {
		return 'multiple';
	}
	else if (doc.querySelectorAll('table.tableoutfmt1')) {
		return 'thesis';
	}
	else if (url.includes("login?o=dwebmge")) {
		return false;
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// get list
	var rows = doc.querySelectorAll('a[class="slink"]');
	//Z.debug(rows);
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.text);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	Z.debug(items);
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var rows = doc.querySelectorAll('table#format0_disparea.tableoutfmt2');
	//Z.debug(rows);
	if (rows) {
		var item = new Zotero.Item("thesis");
		item.title = ZU.xpathText(doc, '//th[contains(text(), "論文名稱") or contains(text(), "Title")]/following-sibling::td').split(',')[0];
		contianer = doc.querySelector('ul.yui-nav');
		//Z.debug(contianer.querySelectorAll("a[title='摘要'] , a[title='Abstract']"))
		if (contianer.querySelectorAll("a[title='摘要'] , a[title='Abstract']")!== null){
			//Z.debug(doc.querySelectorAll('td[class="stdncl2"]')[0].innerText);
			ZU.cleanTags(item.abstractNote = doc.querySelectorAll('td[class="stdncl2"]')[0].innerText.replace("\n","").replace(/\s*[\r\n]\s*/g, '\n'));
		}
		
		var creator = ZU.xpathText(doc, '//th[contains(text(), "研究生") or contains(text(), "Author")]/following-sibling::td').split(",")[0];
		item.creators.push({lastName: creator, firstName: "", creatorType:'author'});

		var tags = ZU.xpathText(doc, '//th[contains(text(), "外文關鍵詞") or contains(text(), "keyword (eng)")]/following-sibling::td').split("、");

		for (let i=0; i<tags.length; i++) {
			item.tags.push(
				tags[i].trim()
			);
		}

		item.language = ZU.xpathText(doc, '//th[contains(text(), "語文別") or contains(text(), "language")]/following-sibling::td');
		item.date = ZU.xpathText(doc, '//th[contains(text(), "論文出版年") or contains(text(), "Publication Year")]/following-sibling::td');
		item.numPages = ZU.xpathText(doc, '//th[contains(text(), "論文頁數") or contains(text(), "number of pages")]/following-sibling::td');
		item.university = ZU.xpathText(doc, '//th[contains(text(), "校院名稱") or contains(text(), "Institution")]/following-sibling::td');
		if (ZU.xpathText(doc, '//th[contains(text(), "學位類別") or contains(text(), "degree")]/following-sibling::td') == '碩士') {
			item.thesisType = 'master';
		}
		else if (ZU.xpathText(doc, '//th[contains(text(), "學位類別") or contains(text(), "degree")]/following-sibling::td') == "博士") {
			item.thesisType = 'doctor';
		}
		var link = ZU.xpathText(doc, '//input[@readonly="yes"]/@value');
		item.url = link;
		item.complete();
	}
	//Z.debug(rows)
	//Z.debug(link);
	//Z.debug(thesisdata);
	//Z.debug(item);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ndltd.ncl.edu.tw/cgi-bin/gs32/gsweb.cgi?o=dnclcdr&s=id=%22106THU00394015%22.&searchmode=basic",
		"detectedItemType": "thesis",
		"items": [
			{
				"itemType": "thesis",
				"title": "利用卷積神經網路與平行運算過濾垃圾郵件之設計與實作, Filtering Spam Mails Using Convolutional Neural Networks and Parallel Computing",
				"creators": [
					{
						"lastName": "李鼎中",
						"firstName": "",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"abstractNote": "隨著資訊科技的發展以及資訊設備(如個人電腦、平板、手機)的普及，電子郵件已是工作或生活密不可分的溝通工具，並且因為政府業務及金融交易必須綁定能夠代表真實身分的聯絡工具，故電子郵件的重要性無法被取代。也正因為如此，電子郵件也成為廣告行銷、以及電腦駭客、商業間諜、國家間諜等有心人士用於散佈偽冒寄件者(引誘開啟郵件)、惡意程式(木馬程式、勒索病毒)、惡意連結(釣魚網站)、通知重新認證(騙取帳號、密碼)等之主要媒介，若不慎點擊郵件連結或遭受進一步感染，對個人及企業之資訊安全有重大危害。統計任職企業之垃圾郵件過濾系統，每月收到的郵件中，近25%郵件被歸類為垃圾郵件，但仍有少量信件遭過濾機制漏攔(false negative)或誤攔(false positive)。加州大學爾灣分校(UCI)垃圾郵件開放性資料以及其使用郵件內文特徵(content-based)作為垃圾郵件過濾器之想法(約有7%誤判率，93%正確率)。本論文以機器學習之類神經網路(neural network)及卷積神經網路(convolutional neural network)演算法實作UCI垃圾郵件過濾器之辨識率，也獲得良好的效果。實驗證明經過上述模型訓練後，卷積神經網路獲得更好的結果，可以達到91%的正確率。此外，為了實務應用上效能的需求，我們加入了GPU平行運算，實驗顯示可以得到4.17倍的加速比。",
				"language": "中文",
				"libraryCatalog": "National Digital Library of Theses and Dissertations in Taiwan",
				"numPages": "40",
				"thesisType": "master",
				"university": "東海大學",
				"url": "https://hdl.handle.net/11296/c8jhq5",
				"attachments": [],
				"tags": [
					{
						"tag": "GPU parallel computing"
					},
					{
						"tag": "convolutional neural network"
					},
					{
						"tag": "machine learning"
					},
					{
						"tag": "neural network"
					},
					{
						"tag": "spam emails"
					},
					{
						"tag": "speedup"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ndltd.ncl.edu.tw/cgi-bin/gs32/gsweb.cgi?o=dnclcdr&s=id=%22111NYCU5159026%22.&searchmode=basic",
		"detectedItemType": "thesis",
		"items": [
			{
				"itemType": "thesis",
				"title": "以人工智慧分析三維積體電路封裝銲點之可靠度破壞",
				"creators": [
					{
						"lastName": "徐伯寧",
						"firstName": "",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"abstractNote": "隨著半導體產業的高速發展，高階晶片市場日漸成了各家競爭的對象，晶片結構也隨之變的複雜。現在世界正處在電動汽車崛起的開端，晶片除了要求運算穩定，還要求能在高溫高壓的極端環境下能夠有好的表現，進一步使 3D 封裝的驗證技術需求上升。本研究在覆晶銲錫與新型的奈米雙晶銅兩種銅對銅接點因可靠度測試產生的的常見損壞模式中，運用有限元素法找出應力分布，另外使用3D X-ary 技術結合 AI 分析，在不破壞樣品的情況下觀察出錫球內空隙的形成，並推斷其破壞程度。第一部分，使用奈米雙晶銅製作的銅對銅接點，在PBO 與二氧化矽兩種不同介電層的影響下，在完成溫度循環測試後，觀察到接合面ii內部空孔聚集的情況。此研究觀察到的空孔集中都是在溫度循環測試後才容易出現。經過有限元素法分析，發現在-55℃與 125℃時的應力方向相反，所產生的應力梯度是引起空孔移動並聚集的因素之一。而兩種不同填充物所反饋的應力方向也會使空孔聚集的方式不同，使用PBO 的樣品空孔聚集處位於應力變化區外圍，二氧化矽的樣品則是會聚集到中央區域。第二部分，結合卷積神經網路(CNN)的 AI 深度學習，持續觀察 3DX-ray 的銲錫凸塊空孔形成，進而達到快速判讀缺陷與良好比率。此研究透過 3D X-ray 儀器對焊錫微凸塊樣品進行非破壞性掃描，偵測經過迴銲處理產生的缺陷，當樣品達到額定阻值時即停止蒐集數據，並通過收集的 3D X-ray 斷層掃描圖，建立一個圖像數據庫用以訓練AI 機器。而 AI 可以基於使用者提供的全新非破壞性 3D X-ray 斷層掃描圖進行快速檢測和預測銲點未來發生故障區域的可能性，準確度高達 89.9%。此研究還展示了迴銲銲錫凸塊“良好”或“失敗”條件的重要特徵，例如中間橫截面的面積損失百分比等。此技術能夠用來預測迴銲錫接點。因為可靠度測試產生的缺陷，進而預測元件使用的壽命。",
				"language": "中文",
				"libraryCatalog": "National Digital Library of Theses and Dissertations in Taiwan",
				"numPages": "79",
				"thesisType": "doctor",
				"university": "國立陽明交通大學",
				"url": "https://hdl.handle.net/11296/mw4cfp",
				"attachments": [],
				"tags": [
					{
						"tag": "3D X-ray"
					},
					{
						"tag": "AI"
					},
					{
						"tag": "Convolutional Neural Network"
					},
					{
						"tag": "Deep Learning"
					},
					{
						"tag": "Finite Element Method"
					},
					{
						"tag": "Thermal Migration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ndltd.ncl.edu.tw/cgi-bin/gs32/gsweb.cgi/ccd=DJTswN/search?q=sc=%22%E6%9D%B1%E6%B5%B7%E5%A4%A7%E5%AD%B8%22.&searchmode=basic#result",
		"detectedItemType": "multiple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
