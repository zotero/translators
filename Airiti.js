{
	"translatorID": "5f0ca39b-898a-4b1e-b98d-8cd0d6ce9801",
	"label": "Airiti",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://([^/]*\\.)?airitilibrary.com/searchdetail.aspx",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsib",
	"lastUpdated": "2013-03-21 05:23:28"
}

function detectWeb(doc, url) {
	var icon = ZU.xpathText(doc, '//div[@id="main_gcs7"]//tbody/tr[2]\
									//div[starts-with(@class, "icon_")]/@class');
	if(!icon) return;

	switch(icon) {
		case "icon_T2":
			return "thesis";
		case "icon_J2":
			return "journalArticle";
		case "icon_C2":
			return "conferencePaper";
		default:
			return "journalArticle";
	}
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if(!type) return;

	var translator = Zotero.loadTranslator("web");
	//Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);

	translator.setHandler("itemDone", function(obj, item) {
		//adjust item type
		item.itemType = type;

		//names are not split correctly if we are given both chinese and english versions
		//english version is given in prentheses
		for(var i=0, n=item.creators.length; i<n; i++) {
			var name = item.creators[i].firstName + ' ' + item.creators[i].lastName;
			if(name.indexOf('(') != -1) {
				//which one do we go with??

			/*	var m = name.match(/\(.*?)\s+(\S+)\)/);
				if(m) {
					//english
					item.creators[i].firstName = m[1];
					item.creators[i].lastName = m[2];
				} else {
			*/		//chinese
					item.creators[i].firstName = undefined,
					item.creators[i].lastName = name.substring(0,name.indexOf('('));
					item.creators[i].fieldMode = 1;
			//	}
			}
		}
		
		var content = doc.getElementById('main_gcs7');
		
		if(!item.DOI) {
			item.DOI = ZU.xpathText(content,
				'(.//tr[./td[1][text()="DOI"]]/td[2]//a)[1]');
		}

		item.abstractNote = ZU.xpathText(content,
			'.//td[\
				text()="中文摘要" or \
				text()="英文摘要"\
			]/following-sibling::td',	//chinese summary followed by english summary
			null, '\n');

		item.complete();
	});

	translator.translate();
}

function detectSearch(item) {
	//accept all valid DOIs
	if(!item.DOI || !item.DOI.match(/^10\.[^/]+\/.+/)) {
		return false;
	}

	//also, if we're being provided a url, check it against our target regex
	if(item.url && !item.url.match(/^https?:\/\/([^/]*\.)?airitilibrary.com\/searchdetail.aspx/)) {
		return false;
	}

	return true;
}

function doSearch(item) {
	if(!detectSearch(item)) return;

	ZU.processDocuments('http://dx.doi.org/' + item.DOI, function(doc) {
		if(!doc.location.href.match(/^https?:\/\/([^/]*\.)?airitilibrary.com\/searchdetail.aspx/)) {
			return;
		}

		if(detectWeb(doc, doc.location.href)) {
			var translator = Zotero.loadTranslator("web");
			//load self so we can use itemDone handler
			translator.setTranslator("5f0ca39b-898a-4b1e-b98d-8cd0d6ce9801");
			translator.setDocument(doc);
			translator.setHandler("itemDone", function(obj, newItem) {
				if(!newItem.DOI) newItem.DOI = item.DOI;
				newItem.complete();
			});
			translator.translate();
		}
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.airitilibrary.com/searchdetail.aspx?DocIDs=P20110413001-200411-201104130017-201104130017-446-453",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "",
						"lastName": "曾國鴻",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "賴秋露",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "鍾季娟",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "何妙桂",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "廖文榮",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"自然與生活科技",
					"輔導團",
					"俗民誌",
					"science and life technology",
					"study",
					"Compulsory Education Advisory Group",
					"ethnographic",
					"solution-focused group counseling"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "國小自然與生活科技教師參與輔導團研習活動之民俗誌研究",
				"date": "2004/11/01",
				"publicationTitle": "科技教育課程改革與發展學術研討會論文集",
				"issue": "2004",
				"publisher": "科技教育課程改革與發展學術研討會論文集",
				"language": "zh-tw",
				"abstractNote": "本研究針對九年一貫輔導團規劃之「國小自然與生活科技領域研習」進行探究，目的是探討教師參與輔導團研習活動的意願及其影響因素，並瞭解輔導團研習活動對自然與生活科技教師教學能力之影響，最後根據研究結果提供輔導團作爲規劃研習活動之參考。本研究採俗民誌研究法，研究者先進入研習現場參與觀察，再以六位自然與生活科技領域相關教師爲對象，進行焦點團體訪談，最後輔以相關資料文件做分析，研究結果發現：充實知識是參與研習意願的動力來源、研習的時間爲教師決定是否參與研習的重要因素、家庭狀況與研習地點的安排影響教師是否參與研習的決定、研習的方式應考量研習的目的做不同形式的安排、研習教材內容會充實教師的專業知能、講師的授課方式讓研習教師對教學技巧自我反省。研習綜合歸納之研究結論如下：1.自然與生活科技教師參與輔導團研習活動的意願高。2.影響教師參與輔導團研習活動的意願之主要因素爲「研習時間」、「研習地點」、「家庭狀況」。3.輔導團研習活動在「教材內容」方面，對教師之影響爲充實知識與補充教學資料。4.輔導團之研習在「講師授課方式」方面，對教師在運用教具、教學方法與師生互動等層面有影響。\nThe aim of the research is to examine teachers willing of participating in further study in Science and Technology field held by CEAG (Compulsory Education Advisory Group) and factors that influenced their participation. Also, the effects of further study to the teachers teaching abilities in teaching Science and Technology filed. Finally, giving the research results to CEAG as a reference for planning further study afterwards.\nThis research adopt ethnographic approach that researcher goes to the scene of further study to observe, and then choose six teachers to have a group interview. Then compare with the relevant information to analyze. The result shows: Pursuing of great knowledge is the motivation of teachers to participate in further study; Time is the most influential factor that teacher determine whether to attend the further study; Family conditions and place affect their decisions to participate in further study; Way of further study should take the purpose of further study into consideration to have different arrangement; The content of the further study would enrich teachers’ teaching abilities; Teaching style of the lecturer would motivate self-examination in teachers' teaching techniques. In conclusion:\n1. Most of teachers in Science and Technology field like to participate in further study.\n2. The main reasons that affect teachers’ participation in further study are time, place and family condition.\n3. In the aspect of teaching content, further study held by CEAG helps teachers by supplying relevant teaching materials.\n4. In the aspect of teaching style of lecturer, further study held by CEAG helps teachers: to use teaching aids more effectively, an alternative thinking on their teaching methods, and improve interaction between teacher and student.",
				"pages": "446-453",
				"url": "http://www.airitilibrary.com/searchdetail.aspx?DocIDs=P20110413001-200411-201104130017-201104130017-446-453",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.airitilibrary.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.airitilibrary.com/searchdetail.aspx?DocIDs=16726685-200706-16-2-74-79-a",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "雷一益",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "陈震远",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "陈震武",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "陈宗豪",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					"消费者小额贷款",
					"世代研究法",
					"个案对照研究法",
					"逾期放款",
					"small-scale consumers loan",
					"retro-prospective cohort study",
					"case-control study",
					"overdue loan"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "以大样本数据的cohort study探讨消费性小额信用贷款的逾期因素",
				"date": "2007/06/01",
				"publicationTitle": "淮海工學院學報(自然科學版)",
				"volume": "16",
				"issue": "2",
				"publisher": "淮海工學院學報(自然科學版)",
				"language": "zh-cn",
				"abstractNote": "金融机构获利的稳定，健全与持续的授信质量影响很大，全球性新巴塞尔资本协议(New Basel Capital Accord)的推动及主管机关要求金融机构改善资产质量及合并政策的影响下，使台湾的金融业进入激烈合并竞争的时代。消费性货款随着社会趋势的发展日益增大，为了探讨消费性小额授信户逾期还款行为。这里运用台湾地区两家商业银行1996-2001年间的授信户样本数据，采用retro-prospective cohort Study以修正前学者采用Case-control Study的限制，及配合新巴塞尔资本协议(New Basel Capital Accord)下金融全球化的规定。结果发现样本数大小会影响logistic模型的显著性因素及适合度。另外也发现Logistic regression模型预测能力，其逾期案件预测结果正确预测率达70.0%，66.95%及71%，另在整体正确预测率从67.3%和69.85%增至72.1%。因此，以大样本retro-prospective cohort study所发现的影响因素及预测能力的稳定性，较符合新巴塞尔资本协议规定及科学程序。\nThe stability of profits made by financial organs is subject to the sustainability of their credit. As the New Basel Accord is to be implemented globally, the banking industry will en counter increasing competition and need to improve the quality of the assets. Many banks will be confronted with the dilemma of reducing default rates and increasing return rates (on assets and on equity). Since small-scale consumers loans are relatively profitable and their risks are more diversified, they are preferred in accreditation over business loans. Because the cohort study reflects the study design of the real date, which is stipulated in the New Basel Capital Accord, the above findings can serve as reference for assessing credit risk, whereas these findings would not be obtained in the previous case-control studies. This research intends to use a retro-prospective cohort to analyze the significance of factors affecting default behavior. Unlike previous case-control studies, the cohort study can assess some elements of credit risk. There are two findings in this study. First, the sample sizes would affect the number and the choice of the explanatory variables in logistic regression models. Second, the predicted power increases significantly with the sample sizes.",
				"pages": "74-79",
				"ISSN": "1672-6685",
				"url": "http://www.airitilibrary.com/searchdetail.aspx?DocIDs=16726685-200706-16-2-74-79-a",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.airitilibrary.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.airitilibrary.com/searchdetail.aspx?DocIDs=U0011-0406200711273000",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "",
						"lastName": "張雀鳳",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"口腔保健",
					"齲齒發生率",
					"追蹤研究",
					"Oral health",
					"caries incidence",
					"follow-up study"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "學童口腔保健行為與新齲齒發生之探討－10個月追蹤研究",
				"date": "2007/01/01",
				"publicationTitle": "高雄醫學大學口腔衛生科學研究所碩士在職專班學位論文",
				"issue": "2007年",
				"publisher": "高雄醫學大學口腔衛生科學研究所碩士在職專班學位論文",
				"language": "zh-tw",
				"abstractNote": "中文摘要\n研究背景：\n台灣國小學童高齲齒率在校園內儼然是學童健康的一大問題，以DMFT分析是與累積的危險因素有關，然而兒童在不同時期造成齲齒的危險因子應不全然相同；齲齒形成的複雜性和多成因的特質，評估齲齒的危險因子應以追蹤研究來加以分析，採追蹤研究（prospective follow-up study）可將當期新齲齒的發生與當時期那些影響因素作分析比較。\n研究目的：\n了解學童口腔健康狀況與口腔保健行為關係及影響新齲齒發生之相關因素。         \n研究方法：\n本研究為追蹤研究（prospective follow-up study），研究對象以高雄縣某公立小學1至5年級學童為對象，每個年級3個班級，共完成問卷及口腔檢查人數為504人；經過10個月後之後測剔除未能全程參與或中途轉學者剩餘475人，其中男生261人、女生214人，後測完成率94.25％。\n研究結果：\n在10個月的追蹤研究發現DMFT index平均增加了0.35； DMFS index平均增加了0.45（p＜.0001﹐p＜.0001 ），恆牙填補率增加5.00（p=0.0450）， DMFT index 在9歲時增加呈現高峰0.46，之後隨年齡的增加逐漸趨於平緩，整體而言達統計上的顯著性差異，性別方面發現女生比男生有較高的DMFT index及DMFS index，其齲齒狀況則隨年齡增加而遞增。在多變項迴歸分析調整過前測DMFT指數、性別、年級、父親教育程度、甜食習慣、潔牙時機與看牙醫的經驗等重要影響因素之後，發現父親教育程度與前後改變量的恆牙填補率有顯著性相關。而研究中也發現主要影響學童口腔健康來自於家庭因素。\n討論及結論：\n整體而言恆牙齲齒經驗指數男生優於女生，盛行率方面亦發現同樣的結果；在填補數上結果顯示女生的填補數則較男生高，研究發現學童的潔牙行為可有效減少齲齒的發生。餐後潔牙及攝取甜食後有潔牙行為其齲齒經驗指數較低，齲齒發生率亦較少\n建議：\n口腔保健是一個連續性、長遠性、必然性的推展工作，因此健康促進不只注重於健康及與健康有關的行為，也應該致力於健康及健康行為與環境之間的關係。\n\nAbstract\nBackground:\nHigh caries prevalence is still a major problem for Taiwanese pupils. The phenomenon, analyzed by DMFT, was related to the accumulated risk factors. However, caries risk factors in different growing periods would be various. Prospective follow-up study was used to analyze the risk factors of caries owing to the complex of forming and the multi-origin characteristics. The researcher adopted prospective follow-up study to compare and analyze the new contemporaneous incidence of caries and the influence factors.\nAim:\nThe aim of this study was to evaluate the relationship among new oral incidence of caries, oral health behavior, and related factors.\nMethods:\nProspective follow-up study was assumed in this study. Study participants were recruited from first grader to fifth grader of a primary school in Kaohsiung County .For each grade, 3 classes were randomly selected, questionnaired, and orally examined with finally a total of 504 subjects. After 10 months of following-up, students who couldn’t participate thoroughly or transferred to other schools during the study were excluded. A total of 475 subjects (male: 261; female:214) remained with the completion rate of 94.25% of the posttest.  \nResult:\nThe result showed an increase of 0.35 on mean DMFT index, 0.45 (p < .0001, p < .0001) on DMFS index, and 5.00 (p = 0.0450) on filling rate of permanent teeth in this 10-month prospective follow-up study. The increase of DMFT index reached the peak of 0.46 at the age of 9, and then gently steadied by the addition of age. Overall, a statistically significant difference showed in the study. On the aspect of gender, higher DMFT index and DMFS index were presented on girl students, whose caries status augmented when the age increased. After the adjustment of important influence factors the pretest of DMFT index, gender education, sweet habit, timing of cleaning teeth, and the dental clinic experience in the Multiple Regression Analysis, the researcher found a strong relation between father’s education and the filling rates of the caries of permanent teeth on pretest and posttest. Meanwhile, domestic factors were the key to influence oral health of school children. \nDiscussion and Conclusion:\nThe DMFT index of permanent teeth was higher on boys than on girls, same as the prevalence. The result of filling rate indicated girls’ filling rate was higher than boys’. The behavior of cleaning teeth on school children could effectively lessen the occurring of caries. Cleaning teeth after meal and after sweet lowered the DMFT index and the caries incidence. \nSuggestion:\nOral health was an inevitable, long-term, and continual promotion job.Therefore, health promotion should focus not only on physical condition and health-related behaviors but also on the relationship among health, health-related behaviors, and environment.",
				"url": "http://www.airitilibrary.com/searchdetail.aspx?DocIDs=U0011-0406200711273000",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.airitilibrary.com"
			}
		]
	}
]
/** END TEST CASES **/