{
	"translatorID": "6c51f0b2-75b2-4f4c-aa40-1e6bbbd674e3",
	"label": "National Diet Library Periodicals",
	"creator": "Frank Bennett",
	"target": "https://ndlonline.ndl.go.jp/#!/(detail|search)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2018-05-10 03:29:28"
}



// In case needed ever
//function getCookies(doc) {
//	var ret = {};
//	if (doc.cookie) {
//		var lst = doc.cookie.split(/; */);
//		for (var i=0,ilen=lst.length; i<ilen; i++) {
//			var pair = lst[i].split('=');
//			if (pair[1]) {
//				pair[1] = pair.slice(1).join("=");
//			}
//			if ("object" === typeof pair && pair.length) {
//				pair[1] = pair[1].split("|");
//				if (pair[1].length === 1) {
//					pair[1] = pair[1][0];
//				} else if (!pair[1].slice(-1)[0]) {
//					pair[1].pop();
//				}
//			}
//			ret[pair[0]] = pair[1];
//		}
//	}
//	return ret;
//}

function getPageUrl(key) {
	return "https://ndlonline.ndl.go.jp/detail/" + key;
}

var headers = {
	"referer": "https://ndlonline.ndl.go.jp/"
}

function getKeyFromUrl(url) {
	var key = null;
	var m = url.match(/detail\/([^\/]+)/);
	if (m) {
		key = m[1];
	}
	return key;
}

function getJsonUrl(url) {
	var key = getKeyFromUrl(url);
	var jsonUrlTemplate = "https://ndlonline.ndl.go.jp/risapi/search?id={ key }&lang=ja_JP&page=1&rows=20&searchPattern=ris_simple&start=0";
	return jsonUrlTemplate.replace(/{\s+key\s+}/, key);
}

function callData(urls, headers) {
	var jsonUrls = [];
	for (var url of urls) {
		jsonUrls.push(getJsonUrl(url));
	}
	ZU.doGet(jsonUrls, scrape, false, "utf8", headers);
}

function getCreators(details) {
	var creatorSplit;
	var creators = [];
	if (!details.creator) return creators;
	for (var cObj of details.creator) {
		for (var i=0,ilen=cObj.length; i<ilen; i++) {
			if (cObj[i] === "creator") {
				var newCreator = {};
				var creatorParts = cObj.slice(i+2);
				for (var creatorPart of creatorParts) {
					if (creatorPart[0] === "name") {
						creatorSplit = creatorPart[2].split(/\s+/);
						newCreator.lastName = creatorSplit[0];
						newCreator.firstName = creatorSplit[1];
						newCreator.creatorType = "author";
					} else if (creatorPart[0] === "transcription") {
						creatorSplit = creatorPart[2].split(/\/\//);
						newCreator.multi = {
							_key: {
								"en": {
									lastName: creatorSplit[0],
									firstName: creatorSplit[1],
									creatorType: "author"
								}
							}
						}
					}
				}
				creators.push(newCreator);
			}
		}
	}
	return creators;
}

function scrape(jsonTxt) {
	var obj = JSON.parse(jsonTxt);
	// Uncomment to dump the data object in all its glory
	// Zotero.debug(JSON.stringify(obj, null, 1));
	obj = obj.response.docs[0];
	var details = obj["view_detailParameters"];
	var item = new Zotero.Item("journalArticle");
	item.title = "Dummy";
	item.url = getPageUrl(obj["risGrouping_parentIssToken_ssd"])
	item.title = details.title[0];
	item.multi._keys.title = {};
	if (details.alternative) {
		item.multi._keys.title.en = details.alternative[0]
	}
	if (details.titleTranscription) {
		item.multi._keys.title['ja-Kana'] = details.titleTranscription[0];
	}
	item.creators = getCreators(details);
	item.language = details.language[0]
	if (details.issue) {
		item.issue = details.issue[0];
	} else {
		if (details.publicationVolume) {
			item.volume = details.publicationVolume[0].replace(/^\((.*)\)$/, "$1")
		}
		if (details.number) {
			item.issue = details.number[0]
		}
	}
	if (details.volumeDate) {
		var date = details.volumeDate[0].split(":").slice(-1)[0].replace(/\./g, "-")
		item.issued = date;
	}
	if (details.publicationName) {
		var institutionalEditor = false;
		var publicationSplit = details.publicationName[0].split(/\s+=\s+/)
		var publicationMainSplit = publicationSplit[0].split(/\s+\/\s+/);
		item.publicationTitle = publicationMainSplit[0];
		if (publicationMainSplit[1]) {
			institutionalEditor = {
				lastName: publicationMainSplit[1].replace(/\u7d38/, ""),
				fieldMode: 1,
				creatorType: "editor"
			}
		}
		if (publicationSplit[1]) {
			var publicationAlternativeSplit = publicationSplit[1].split(/\s+\/\s+/);
			item.multi._keys.publicationTitle = {
				"en": publicationAlternativeSplit[0]
			}
			if (publicationAlternativeSplit[1] && institutionalEditor) {
				institutionalEditor.multi = {
					_key: {
						en: {
							lastName: publicationAlternativeSplit[1],
							fieldMode: 1,
							creatorType: "editor"
						}
					}
				}
			}
		}
		if (institutionalEditor) {
			item.creators.push(institutionalEditor)
		}
	}
	if (details.pageRange) {
		item.pages = details.pageRange[0].replace(/\u301c/g, "-")
	}
	// If attachments are available, process them assuming they are all PDF files.
	// Otherwise, complete immediately.
	if (obj.view_sameAs && obj.view_sameAs.length) {
		var attachmentUrls = [];
		for (var attch of obj.view_sameAs) {
			if (attch[0] === "sameAs" && attch[1].resource) {
				attachmentUrls.push(attch[1].resource);
			}
		}
		ZU.processDocuments(attachmentUrls,
			function(doc, url) {
				// There has to be a better way to do this.
				var urlNode = ZU.xpath(doc, "//meta[@http-equiv='Refresh']")[0];
				var attachmentUrl = urlNode.getAttribute('content');
				attachmentUrl = attachmentUrl.split(';').slice(-1)[0].slice(4);
				attachmentUrl = "http://dl.ndl.go.jp" + attachmentUrl;
				item.attachments.push({
					title: item.title,
					mimeType: "application/pdf",
					url: attachmentUrl
				})
			},
			function() {
				item.complete();
			})
	} else {
		item.complete();
	}
}

function detectWeb(doc, url) {
	var m = url.match(/https:\/\/ndlonline.ndl.go.jp\/#\!\/(detail|search)/);
	if (m) {
		if (m[1] === "detail") {
			return "journalArticle";
		} else if (m[1] === "search") {
			return "multiple";
		}
	}
	return false;
}

function doWeb(doc, url) {
	Zotero.debug(doc.cookie)
	//var app_uid = getCookies(doc).app_uid;
	//var headers = getHeaders(app_uid);
	var m = url.match(/https:\/\/ndlonline.ndl.go.jp\/#\!\/(detail\/|search)([^\/]+)/);
	if (m) {
		if (m[1] === "detail/") {
			callData([url], headers);
		} else if (m[1] === "search") {
			var urlMap = {};
			var rowNodes = ZU.xpath(doc, "//div[contains(@class, 'rowContainer')]");
			for (var rowNode of rowNodes) {
				var titleNode = ZU.xpath(rowNode, ".//a[contains(@class, 'materialTitle')]")[0];
				if (titleNode) {
					var prefixNote = "";
					var hasDigital = ZU.xpath(rowNode, ".//p[contains(@class, 'digital')]/a")[0];
					if (hasDigital) {
						prefixNote = "[PDF] ";
					}
					var childUrl = titleNode.getAttribute("href");
					var val = titleNode.textContent.trim();
					urlMap[childUrl] = prefixNote + val;
				}
			}
			Z.selectItems(urlMap, function(itemUrls) {
				var urls = Object.keys(itemUrls);
				callData(urls, headers);
			})
		}
	}
}
