{
	"translatorID": "5278b20c-7c2c-4599-a785-12198ea648bf",
	"label": "ARTstor",
	"creator": "Sebastian Karcher",
	"target": "^https?://library\\.artstor\\.org",
	"minVersion": "3.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2014-11-13 15:09:17"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	ARTstor Translator, Copyright © 2012 Sebastian Karcher
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

function getData(doc, checkOnly) {
	var data = {},
		widgets = doc.getElementsByClassName('MetaDataWidget'),
		topWidget = null, topZIndex;
	
	// Dtermine the top metadata window
	for (var i=0; i<widgets.length; i++) {
		
		var zindex = doc.defaultView.getComputedStyle(widgets[i], null)
			.getPropertyValue('z-index');
		if (!zindex && zindex !== 0) continue;
		
		if (!topWidget || topZIndex < zindex) {
			topWidget = widgets[i];
			topZIndex = zindex;
		}
	}
	
	if (!topWidget) return false;
	
	var fields = topWidget.getElementsByClassName('field'),
		found = false;
	for (var i=0; i<fields.length; i++) {
		var field = ZU.trimInternal(fields[i].textContent);
		
		var value = fields[i].nextElementSibling;
		if (!value || !value.classList.contains('data')) continue;
		value = ZU.unescapeHTML(ZU.cleanTags(value.innerHTML));
		
		if (!field || !value.trim()) continue;
		
		if (checkOnly) return true;
		
		found = true;
		data[field] = value;
	}
	
	return found ? data : false;
}

function detectWeb(doc, url) {
	//monitor changes to body's direct children. That's where the metadata popup is added
	Zotero.monitorDOMChanges(doc.body, {childList: true});

	if (getData(doc, true)) {
		return "artwork";
	}
}

function associateData(newItem, value, field) {
	if (!value) return;
	if (typeof value == 'string') value = ZU.trimInternal(value);
	if (!value) return;
	
	newItem[field] = value;
}

function doWeb(doc, url) {
	var newItem = new Zotero.Item("artwork"),
		data = getData(doc),
		content;
	
	if (data.Creator) {
		content = data.Creator.replace(/\s*\(.*/, '');
		associateData(newItem,
			ZU.cleanAuthor(content, "artist", artist.indexOf(',') != -1),
			'creators'
		);
	}
	
	if (data.Date) {
		content = data.Date.replace(/^Photographed (?:in )?/, '');
		associateData(newItem, content, "date");
	}
	
	if (data.Rights) {
		var m = data.Rights.match(/^.*(©.*)$/m);
		if (m) associateData(newItem, m[1], "rights");
	}
	
	if (data.Subject) {
		content = data.Subject.split(/\s*;\s*/);
		associateData(newItem, content, 'tags');
	}
	
   //these might not be complete - it's pretty straightforward to add more
	associateData(newItem, data.Title, "title");
	associateData(newItem, data.Measurements, "artworkSize");
	associateData(newItem, data.Material, "artworkMedium");
	associateData(newItem, data.Repository, "archive");
	associateData(newItem, data['ID Number'], "archiveLocation");
	associateData(newItem, data.Description, "abstractNote");
	
	newItem.complete();
}