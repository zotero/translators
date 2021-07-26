{
	"translatorID": "5278b20c-7c2c-4599-a785-12198ea648bf",
	"label": "ARTstor",
	"creator": "Abe Jellinek",
	"target": "^https?://library\\.artstor\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-23 05:46:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('#/asset/')) {
		if (text(doc, '[data-qa-id="worktype"]').includes('Map')) {
			return "map";
		}
		else if (doc.querySelector('.video-player')) {
			return "videoRecording";
		}
		else {
			return "artwork";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	Z.monitorDOMChanges(doc.querySelector('app-root'));
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.card');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, '.asset-title'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) {
				Object.keys(items).forEach((url) => {
					ZU.doGet(buildMetadataURL(url),
						function (respText) {
							scrape(doc, url, JSON.parse(respText));
						});
				});
			}
		});
	}
	else {
		ZU.doGet(buildMetadataURL(url), function (respText) {
			scrape(doc, url, JSON.parse(respText));
		});
	}
}

function buildMetadataURL(pageURL) {
	let idMatches = pageURL.match(/\/asset\/([^/;]+)(;|$)/);
	if (idMatches) {
		let id = idMatches[1];
		return `https://library.artstor.org/api/v1/metadata?object_ids=${id}&legacy=false`;
	}
	
	// "encrypted" IDs (external collections)
	idMatches = pageURL.match(/\/asset\/[^/]+\/[^/]+\/([^?/;]+)/);
	if (!idMatches) {
		throw new Error('Could not extract ID from ARTstor URL: ' + pageURL);
	}
	
	let id = idMatches[1];
	return `https://library.artstor.org/api/v2/items/resolve?encrypted_id=${id}&ref=&legacy=false&openlib=true`;
}

function scrape(doc, url, json) {
	if (!json.success || !json.metadata.length) {
		throw new Error('ARTstor metadata retrieval failed');
	}
	
	let meta = json.metadata[0];
	let item = new Zotero.Item(resolveTypeID(meta.object_type_id));
	
	item.DOI = ZU.cleanDOI(meta.doi);
	// URL will be overwritten if the accession number has a source link
	if (url.includes(';')) {
		url = url.substring(0, url.indexOf(';'));
	}
	item.url = url;
	
	for (let { fieldName, fieldValue } of meta.metadata_json) {
		switch (fieldName) {
			case 'Work Type':
				if (fieldValue.includes('Map')) {
					item.itemType = 'map';
				}
				item.tags.push({ fieldValue });
				break;
			case 'Creator': {
				let type = 'artist';
				if (item.itemType == 'map') {
					type = 'cartographer';
				}
				else if (item.itemType == 'videoRecording') {
					type = 'contributor'; // sometimes cast member, sometimes director
				}
				
				fieldValue = fieldValue
					.replace(/^[^:]+:/, '')
					.replace(/\(.*\)/, '')
					.replace(/\d+-(\d+)?/, '');
				
				item.creators.push(ZU.cleanAuthor(fieldValue, type, true));
				break;
			}
			case 'Title':
				if (!item.title) {
					// titles after the first are usually annotated or otherwise
					// difficult to deal with
					item.title = fieldValue;
				}
				else {
					item.extra = append(item.extra, `Alternate Title: ${fieldValue}`);
				}
				break;
			case 'Date':
				item.date = ZU.strToISO(fieldValue);
				break;
			case 'Measurements':
				item.artworkSize = fieldValue;
				break;
			case 'Description':
			case 'Collector\'s Notes':
				item.abstractNote = append(item.abstractNote, fieldValue);
				break;
			case 'Repository':
				item.archive = ZU.cleanTags(fieldValue);
				break;
			case 'Accession Number':
			case 'Physical Location of Original': {
				item.archiveLocation = ZU.cleanTags(fieldValue);
				let linkMatches = fieldValue.match(/<a href=["']?([^>]+)["']?>/i);
				if (linkMatches) {
					item.url = linkMatches[1];
				}
				break;
			}
			case 'Subject':
				item.tags.push(...fieldValue.split(';').map(tag => ({ tag })));
				break;
			case '_Archival Location':
				if (!item.archiveLocation) {
					// these are not often as useful as accession numbers
					item.archiveLocation = fieldValue;
				}
				break;
			case 'Rights':
			case 'License':
				item.rights = append(item.rights, ZU.cleanTags(fieldValue));
				break;
			case 'Location':
				item.extra = append(item.extra, `Depicted Location: ${fieldValue}`);
				break;
			case 'Source':
				if (fieldValue.startsWith('Photographer:')) {
					item.creators.push(
						ZU.cleanAuthor(
							fieldValue.substring('Photographer:'.length),
							'artist'
						)
					);
				}
				break;
			case 'Notes':
				item.notes.push({ note: fieldValue });
				break;
			case 'Scale':
				if (item.itemType == 'map') {
					item.scale = fieldValue;
				}
				break;
			case 'Type':
				if (item.itemType == 'map') {
					item.mapType = fieldValue;
				}
				break;
			case 'Extent':
				if (item.itemType == 'videoRecording') {
					item.runningTime = fieldValue;
				}
				break;
			default:
				Z.debug(`Unknown field: ${fieldName} = ${fieldValue}`);
		}
	}
	
	if (!item.title) {
		item.title = 'Untitled';
	}
	
	// PDF attachments not handled yet
	
	if (json.imageUrl) {
		// ideal situation: the JSON has a direct image URL in it
		item.attachments.push({
			title: 'Artwork Image',
			mimeType: 'image/jpeg',
			url: (json.imageServer || 'https://stor.artstor.org/') + json.imageUrl
		});
	}
	else if (meta.image_url) {
		// almost ideal: we get a URL with some extraneous info that we need to
		// clean, but after we do that, we can fetch the image directly
		let basePart = 'https://stor.artstor.org/iiif/fpx/';
		let idPart = meta.image_url.replace(/\.fpx.*/, '.fpx');
		let imagePart = `/full/${meta.width},/0/default.jpg`;
		
		item.attachments.push({
			title: 'Artwork Image',
			mimeType: 'image/jpeg',
			url: basePart + idPart + imagePart
		});
	}
	else if (meta.image_compound_urls && meta.image_compound_urls.length) {
		// not really very ideal: we need to make a second GET request for the
		// "compound image" metadata
		let imageURLs = meta.image_compound_urls
			.map(imgURL => 'https://stor.artstor.org/iiif/' + imgURL);
		ZU.doGet(imageURLs, function (respText) {
			let { '@id': imageURL, width } = JSON.parse(respText);
			item.attachments.push({
				title: 'Artwork Image',
				mimeType: 'image/jpeg',
				url: `${imageURL}/full/${width},/0/default.jpg`
			});
		}, function () {
			// when all requests have completed
			item.complete();
		});
		return;
	}
	else if (doc) {
		// bad: this last resort will fail if the user hasn't clicked the
		// download link already (which they probably haven't). but at least
		// it'll alert them that the translator *tried* to download the image,
		// so they can do it themselves if they need to.
		item.attachments.push({
			title: 'Artwork Image',
			mimeType: 'image/jpeg',
			url: attr(doc, '#downloadAssetLink', 'href')
		});
	}
	
	item.complete();
}

function resolveTypeID(typeID) {
	switch (typeID) {
		case 24:
			return 'videoRecording';
		default:
			Z.debug('Unknown type ID (probably artwork): ' + typeID);
			return 'artwork';
	}
}

function append(existingText, newText) {
	if (!existingText) {
		return newText;
	}
	
	if (!newText) {
		return existingText;
	}
	
	return existingText + '\n' + newText;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://library.artstor.org/#/asset/openlibrary/external/4jEkdDElLjUzRkY6fz5%252BRXlDOHkje1x9fg%253D%253D",
		"items": [
			{
				"itemType": "artwork",
				"title": "Trailer Home",
				"creators": [
					{
						"firstName": "Barbara",
						"lastName": "Lane",
						"creatorType": "artist"
					}
				],
				"date": "2001",
				"extra": "Alternate Title: Exterior view\nDepicted Location: Bradford County, Pennsylvania",
				"libraryCatalog": "ARTstor",
				"rights": "Bryn Mawr College has made these images, which were taken by current and former faculty, students, and staff, and in some cases friends of the College, available for personal or research use. Users of these images are expected to abide by all copyright and other intellectual property laws. Where we know that Bryn Mawr College owns the copyright, we have attempted to include that information, because Bryn Mawr College grants any user the right to make any use of those images. In other cases the College has secured permission to make the image available, but the photographer still owns the copyright and all rights outside this limited license. Images currently protected by copyright that are not owned by Bryn Mawr College cannot be published or exhibited without obtaining the legally required permission from the copyright owner. It is the obligation of the researcher to determine and satisfy copyright and other restrictions. We recommend, where applicable, that patrons retain a record of their fair use determinations or attempts to secure permissions. Questions can be directed to sscommons@brynmawr.edu.\nThis image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/copyright for contact information and instructions on how to proceed.",
				"url": "https://library.artstor.org/#/asset/openlibrary/external/4jEkdDElLjUzRkY6fz5%252BRXlDOHkje1x9fg%253D%253D",
				"attachments": [
					{
						"title": "Artwork Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.artstor.org/#/asset/28315008",
		"items": [
			{
				"itemType": "artwork",
				"title": "Tolu trade card (recto and verso)",
				"creators": [
					{
						"lastName": "Lawrence and Martin",
						"creatorType": "artist"
					}
				],
				"abstractNote": "Unmounted medical trade card with text in English on the recto and verso.\nTrade cards promoting medical services and products were designed to directly connect patent medicine manufacturers to the consumer public. The peak popularity of trade cards is estimated to have been between 1870 and 1890.\nPhotographed by staff at the Center for Jewish History in 2020.",
				"archive": "Medical Center Archives at NewYork Presbyterian/Weill Cornell Medicine",
				"archiveLocation": "P-15356",
				"artworkSize": "3.10\" x 4.45\"",
				"libraryCatalog": "ARTstor",
				"rights": "Presumed to be in the public domain, though please note that rights ownership varies and the researcher must determine these issues and assume full responsibility for fulfilling the usage terms connected with all archival material, as well as any third party or the licensing of any additional rights. In the event that the image becomes a source for publication, we request a credit line indicating the Medical Center Archives of NewYork-Presbyterian/Weill Cornell Medicine.\nThis image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/copyright for contact information and instructions on how to proceed.",
				"url": "https://library.artstor.org/#/asset/28315008",
				"attachments": [
					{
						"title": "Artwork Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Advertising cards"
					},
					{
						"tag": "Cold (Disease)"
					},
					{
						"tag": "Cough"
					},
					{
						"tag": "Lungs -- Diseases"
					},
					{
						"tag": "Throat -- Diseases"
					},
					{
						"tag": "Tuberculosis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.artstor.org/#/asset/28362645",
		"items": [
			{
				"itemType": "artwork",
				"title": "Ubekendt dame med blomsterkrans",
				"creators": [
					{
						"firstName": "Cornelius",
						"lastName": "Høyer",
						"creatorType": "artist"
					}
				],
				"date": "1756",
				"archive": "Statens Museum for Kunst",
				"archiveLocation": "KMS4919",
				"artworkSize": "54 x 47 mm",
				"libraryCatalog": "ARTstor",
				"rights": "Creative Commons: Free Reuse (CC0)",
				"url": "https://collection.smk.dk/#/en/detail/KMS4919",
				"attachments": [
					{
						"title": "Artwork Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.artstor.org/#/asset/SS7730456_7730456_11870403",
		"defer": true,
		"items": [
			{
				"itemType": "map",
				"title": "The Map Maker",
				"creators": [
					{
						"firstName": "Arthur",
						"lastName": "Szyk",
						"creatorType": "artist"
					},
					{
						"lastName": "Other Creators",
						"creatorType": "artist"
					}
				],
				"date": "1942",
				"abstractNote": "A satirical map attacking the Axis by the artist Arthur Szyk, published in Esquire Magazine in 1942. Goebbels welcomes General Tojo to the Axis, announcing that \"Now that you've joined us, the Fuhrer will make a special map for you,\" as Hitler paints the swastika over a bloody map of South and Latin America.\nSzyk was a Polish Jew whose work typically featured social and political issues. He emigrated to London in 1937 and to New York in 1940, and produced a number of attacks on the Nazis before and during World War II.",
				"extra": "Alternate Title: Full TItle: The Map Maker [Hitler]",
				"libraryCatalog": "ARTstor",
				"mapType": "Map published in book or serial - source in collection",
				"rights": "For important information about copyright and use, see http://persuasivemaps.library.cornell.edu/copyright.\nThis image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/copyright for contact information and instructions on how to proceed.",
				"url": "https://library.artstor.org/#/asset/SS7730456_7730456_11870403",
				"attachments": [
					{
						"title": "Artwork Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Pictorial"
					},
					{
						"tag": "Satirical"
					},
					{
						"tag": "World War II"
					}
				],
				"notes": [
					{
						"note": "For further information on the Collector’s Notes and a Feedback/Contact Link, see https://persuasivemaps.library.cornell.edu/content/about-collection-personal-statement and https://persuasivemaps.library.cornell.edu/content/feedback-and-contact"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.artstor.org/#/asset/SS33851_33851_1648337",
		"defer": true,
		"items": [
			{
				"itemType": "map",
				"title": "Dolph's map of Wilmington and northern New Castle County",
				"creators": [
					{
						"lastName": "Dolph Map Company",
						"creatorType": "artist"
					}
				],
				"abstractNote": "Index to streets",
				"archive": "Special Collections, University of Delaware Library / Newark, Delaware 19717-5267",
				"archiveLocation": "Spec, Oversized map drawers, Oversized drawer 3 Folder 7",
				"extra": "Alternate Title: Municipal maps\nDepicted Location: United States--Delaware--New Castle County--Wilmington",
				"libraryCatalog": "ARTstor",
				"rights": "Use of materials from this collection beyond the exceptions provided for in the Fair Use and Educational Use clauses of the U.S. Copyright Law may violate federal law. Permission to publish is required from the copyright holder. Please contact Special Collections, University of Delaware Library, http://www.lib.udel.edu/cgi-bin/askspec.cgi\nThis image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/copyright for contact information and instructions on how to proceed.",
				"scale": "3000 feet to the inch",
				"url": "https://library.artstor.org/#/asset/SS33851_33851_1648337",
				"attachments": [
					{
						"title": "Artwork Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": " Delaware--Maps."
					},
					{
						"tag": "Wilmington (Del.)--Maps."
					}
				],
				"notes": [
					{
						"note": "One of five maps on a single sheet. Top corner torn (inset map of Newark). Additional information in collection folders."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.artstor.org/#/asset/SS7730507_7730507_8920869",
		"defer": true,
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Congressional Conversation: Pell and Brooke (a)",
				"creators": [
					{
						"lastName": "Senator Claiborne Pell",
						"creatorType": "contributor"
					}
				],
				"date": "1969",
				"abstractNote": "Congressional Conversation(a):  Senators Pell and Brooke discuss political issues including the Vietnam War, Justice Fortas' resignation, ethics rules, and the state of the fishing industry.",
				"archive": "University of Rhode Island Libraries",
				"libraryCatalog": "ARTstor",
				"rights": "All rights reserved. For copyright and permissions, contact the University of Rhode Island Libraries at archives@etal.uri.edu.\nThis image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/copyright for contact information and instructions on how to proceed.",
				"runningTime": "00:28:36",
				"shortTitle": "Congressional Conversation",
				"url": "https://library.artstor.org/#/asset/SS7730507_7730507_8920869",
				"attachments": [
					{
						"title": "Artwork Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.artstor.org/#/asset/SS35428_35428_20594675",
		"items": [
			{
				"itemType": "artwork",
				"title": "Big Trees of the West - Second Cut from a Redwood Log.; verso: G28 Pacific Novelty Company, Publishers, San Francisco, Cal. Made in Germany [divided back, no message]",
				"creators": [
					{
						"firstName": "American",
						"lastName": "Pacific Novelty Company (publisher",
						"creatorType": "artist"
					}
				],
				"date": "1907",
				"archive": "Trinity College, Watkinson Library (Hartford, Connecticut, USA)",
				"archiveLocation": "Box 19.174-3",
				"artworkSize": "9 x 14 cm (3.54 x 5.51 inches) approximately",
				"extra": "Alternate Title: overall\nAlternate Title: recto",
				"libraryCatalog": "ARTstor",
				"rights": "This digital collection and its contents are made available by Trinity College Library for limited non-commercial, educational and personal use only.  For other uses, or for additional information regarding the collection, contact the staff of Watkinson Library (www.watkinsonlibrary.org).\nThis image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/copyright for contact information and instructions on how to proceed.",
				"shortTitle": "Big Trees of the West - Second Cut from a Redwood Log.; verso",
				"url": "https://library.artstor.org/#/asset/SS35428_35428_20594675",
				"attachments": [
					{
						"title": "Artwork Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": " California (USA)"
					},
					{
						"tag": " Logging"
					},
					{
						"tag": " Lumber industry"
					},
					{
						"tag": " Redwood (genus, Sequoia)"
					},
					{
						"tag": " Sequoiadendron giganteum (Giant redwood, species)"
					},
					{
						"tag": " Trees"
					},
					{
						"tag": "Postcards"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
