{
	"translatorID": "1a615592-77b0-4715-a509-702b66196ff1",
	"label": "Colorado Leg",
	"creator": "Andrew Schwartz",
	"target": "leg.colorado.gov",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-01-21 17:36:16"
}

/*
  ***** BEGIN LICENSE BLOCK *****

  Copyright © 2020 Andrew Schwartz

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
  if (url.includes('/bills/')) {
    return "bill";
  } else
  if (url.includes('/bill-search') && getSearchResults(doc, true)) {
    return "multiple";
  }
  return false;
}

function getSearchResults(doc, checkOnly) {
  var items = {};
  var found = false;
  var rows = doc.querySelectorAll(`header[class='search-result-single-item']>h4>a[href*="/bills/"]`);
  for (let row of rows) {
    let href = row.href;
    let title = ZU.trimInternal(row.textContent);
    if (!href || !title) continue;
    if (checkOnly) return true;
    found = true;
    items[href] = title;
  }
  return found ? items : false;
}

function scrape(doc, url) {
  var item = new Zotero.Item("bill");

  item.title = doc.querySelector(`h1[class='node__title node-title']`).textContent;

  let billNumber = doc.querySelector(
    `div[class='field field-name-field-bill-number field-type-text field-label-hidden']`
  ).textContent;
  item.billNumber = ZU.trimInternal(billNumber);

  item.complete();
}

function doWeb(doc, url) {
  if (detectWeb(doc, url) == "multiple") {
    Zotero.selectItems(getSearchResults(doc, false), function (items) {
      if (items) ZU.processDocuments(Object.keys(items), scrape);
    });
  } else
  {
    scrape(doc, url);
  }
}
