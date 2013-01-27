{
  "translatorID": "6cb92652-6a2b-473e-b976-434f50b15069",
	"label": "Mailman",
	"creator": "Robin Paulson",
	"target": "/(pipermail|archives)/[A-Za-z0-9_-]*/[0-9]{4}-(January|February|March|April|May|June|July|August|September|October|November|December)/[0-9]{6}.html",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-01-26 02:49:48"
}

/*
	Mailman Translator - Parses emails from mailman archives and creates
	Zotero-based metadata
	Copyright (C) 2013 Robin Paulson
	Contact: robin@bumblepuppy.org

	This program is free software: you can redistribute it and/or modify it
	under the terms of the GNU Affero General Public License as published
	by the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/agpl.html>
*/

/*
This translator functions by detecting a web address similar to the following:

http://www.tangleball.org.nz/archives/discussion/2013-January/005016.html
http://lists.nzoss.org.nz/pipermail/nzlug/2013-January/001877.html
http://lists.linuxaudio.org/pipermail/linux-audio-user/2013-January/089128.html

It ignores everything before the 'archives' or'pipermail' part of the address,
ensuring it should work on any mailman installation. Some sites will no doubt
use other words instead of 'archives' or 'pipermail'. The translator will be
updated accordingly when these are discovered.

It similarly ignores everything between 'archives' or 'pipermail' and the year.
This is where the name of the mailman list is stored, it is assumed to contain
only letters, numbers, underscores or hyphens. This may need to be changed.

Please send suggestions for any bug fixes to the address above.

*/

function detectWeb(doc, url) {
	return true;
}

function doWeb(doc, url) {
	var item = new Z.Item("email"); /* set type of item to email */

	item.title = ZU.xpathText(doc,"/html/head/title"); /* get email title */

	var from = ZU.xpathText(doc,"/html/body/b"); /* get sender's name */
	if(from) item.creators.push(ZU.cleanAuthor(ZU.trimInternal(from), "author"));

	item.date = ZU.xpathText(doc,"/html/body/i"); /* get date email was sent */
	if(item.date) item.date = ZU.trimInternal(item.date);

	item.url = url; /* get url of archived email */
	
	item.attachments.push({title:"snapshot", mimeType:"text/html", url:item.url});
		/* get snapshot of archived email */

	item.accessDate = "CURRENT_TIMESTAMP"; /* get date and time of snapshot */

	item.complete();
}
