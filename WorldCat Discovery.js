{
	"translatorID": "159c65e6-329f-455e-9caa-e0c80bf8435e",
	"label": "WorldCat Discovery",
	"creator": "Andrew Shields",
	"target": "^https?://[^/]+\\.on\\.worldcat\\.org",
	"minVersion": "3.0.9",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2015-01-09 21:18:25"
}

/*
WorldCat Discovery translator for Zotero.
Copyright (C) 2015 Andrew Shields

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
var detectWeb, doWeb, pageIsActionRecord, parseOpenURLData;

detectWeb = function(doc, url) {
  var activeRecord, isActionRecord, numberOfRecords, record, records, _i, _len;
  isActionRecord = pageIsActionRecord(url);
  records = doc.getElementsByClassName('record');
  numberOfRecords = records.length;
  activeRecord = doc.getElementsByClassName('record active')[0];
  if (!(isActionRecord || numberOfRecords)) {
	return false;
  } else {
	if (isActionRecord) {
	  activeRecord = doc.getElementById('main');
	  return parseOpenURLData(activeRecord).type;
	} else {
	  for (_i = 0, _len = records.length; _i < _len; _i++) {
		record = records[_i];
		Zotero.monitorDOMChanges(record, {
		  attributes: true,
		  attributeFilter: ['class']
		});
	  }
	  if (activeRecord) {
		return parseOpenURLData(activeRecord).type;
	  } else {
		return 'multiple';
	  }
	}
  }
};

doWeb = function(doc, url) {
  var activeRecord, isActionRecord, items, numberOfRecords, oclcNum, record, records, saveItems, _i, _len;
  isActionRecord = pageIsActionRecord(url);
  records = doc.getElementsByClassName('record');
  numberOfRecords = records.length;
  activeRecord = doc.getElementsByClassName('record active')[0];
  if (!(isActionRecord || numberOfRecords)) {
	return false;
  } else {
	saveItems = function(items) {
	  var oclcNum, _results;
	  _results = [];
	  for (oclcNum in items) {
		url = "//www.worldcat.org/oclc/" + oclcNum + "?page=endnotealt&client=worldcat.org-detailed_record";
		_results.push(Zotero.Utilities.doGet(url, function(responseDocument) {
		  var translator;
		  responseDocument = responseDocument.trim();
		  if (responseDocument.match(/^TY\s+-\s+CONF/)) {
			responseDocument.replace(/^TY\s+-\s+CONF/, 'TY  - BOOK');
			responseDocument.replace(/^AU\s+-\s+/gm, 'A3  - ');
		  }
		  translator = Zotero.loadTranslator('import');
		  translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
		  translator.setString(responseDocument);
		  translator.setHandler('itemDone', function() {
			var item;
			item = arguments[arguments.length - 1];
			item.extra = void 0;
			item.archive = void 0;
			if (item.libraryCatalog === 'http://worldcat.org') {
			  item.libraryCatalog = 'Open WorldCat';
			}
			item.title = item.title.replace(/\s+:/, ':');
			return item.complete();
		  });
		  return translator.getTranslatorObject(function(translator) {
			translator.options.defaultItemType = 'book';
			translator.options.typeMap = {
			  'ELEC': 'book'
			};
			return translator.doImport();
		  });
		}));
	  }
	  return _results;
	};
	items = {};
	if (isActionRecord) {
	  activeRecord = doc.getElementById('main');
	  oclcNum = activeRecord.getAttribute('data-oclcnum');
	  items[oclcNum] = parseOpenURLData(activeRecord).title;
	  return saveItems(items);
	} else {
	  if (activeRecord) {
		oclcNum = activeRecord.getAttribute('data-oclcnum');
		items[oclcNum] = parseOpenURLData(activeRecord).title;
		return saveItems(items);
	  } else {
		for (_i = 0, _len = records.length; _i < _len; _i++) {
		  record = records[_i];
		  oclcNum = record.getAttribute('data-oclcnum');
		  items[oclcNum] = parseOpenURLData(record).title;
		}
		return Zotero.selectItems(items, saveItems);
	  }
	}
  }
};

pageIsActionRecord = function(url) {
  return url.indexOf('/oclc/') !== -1 && url.indexOf('/search?') === -1;
};

parseOpenURLData = function(baseItemElement) {
  var contextObject, item, itemType;
  contextObject = Zotero.Utilities.xpathText(baseItemElement, './/span[@class="Z3988"]/@title');
  item = new Zotero.Item();
  Zotero.Utilities.parseContextObject(contextObject, item);
  itemType = Zotero.Utilities.xpathText(baseItemElement, './/div[@class="basicbib"]//i[contains(@class, "icon")]/@class');
  item.type = itemType.indexOf('icon-snd') !== -1 ? 'audioRecording' : itemType.indexOf('icon-compfile') !== -1 || itemType.indexOf('icon-intmm') !== -1 ? 'computerProgram' : itemType.indexOf('icon-map') !== -1 ? 'map' : item.itemType;
  return item;
};
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://goshen.on.worldcat.org/search?sortKey=LIBRARY_PLUS_RELEVANCE&databaseList=638&queryString=monkeys&changedFacet=format&scope=&format=all&format=Compfile&subformat=Compfile%3A%3Acompfile_digital&database=all&author=all&year=all&yearFrom=&yearTo=&language=all",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://goshen.on.worldcat.org/oclc/9323519",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Microcomputers in K-12 education: second annual conference proceedings",
				"creators": [
					{
						"lastName": "Conference of Microcomputers in K-12 Education",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Barrette",
						"firstName": "Pierre.",
						"creatorType": "author"
					}
				],
				"date": "1983",
				"ISBN": "0914894870 9780914894872",
				"language": "English",
				"libraryCatalog": "Open WorldCat",
				"publisher": "Computer Science Press",
				"shortTitle": "Microcomputers in K-12 education",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/