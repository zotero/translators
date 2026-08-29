{
	"translatorID": "205879bc-85c2-4a4e-b2db-c37d0e80bc88",
	"label": "Lääkärilehti",
	"creator": "Shiyu Wang",
	"target": "^https?://www\\.(laakarilehti|potilaanlaakarilehti)\\.fi/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-29 15:21:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Shiyu WANG

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

// Read also comment block before testCases.

const oldMetaRegex = /^(?:Lehti (?<issue1>[\d-]*?): )?(?<section>.*?)\s+(?<issue>[\d-]*?)\/.*vsk (?<volume>\d+) s\.\s*?(?<pages>\d+.*?$)/i;
const ePageRegex = /^(?:Lehti (?<issue>[\d-]*?): )?(?<section>.*?)\s+Suom Lääkäril \d{4};(?<volume>\d+):(?<archiveLocation>e\d+),\s+(?<eURL>www.laakarilehti.fi.*$)/i;

/**
 * A variant from my own translator `Duodecim.js`, UID `63ef6a3b-2e64-4d58-aedc-07b31a108928`.
 *
 * @param {string} [ePage = '/e48243'] `/\/e\d+/` or a regular pathname.
 * @returns {Promise<boolean>} whether the network IP is a subscriber / whether the URL is valid
 */
async function directAccess(ePage = '/e48243') {
	if (ePage.charAt(0) != '/') ePage = '/' + ePage;
	const sllTestDoc = await requestDocument(`https://www.laakarilehti.fi${ePage}`); //, noProxyOptions);
	Zotero.debug(`directAccess(): returned URL ${JSON.parse(JSON.stringify(sllTestDoc)).location}`);

	if (sllTestDoc?.querySelector('div[class^="util"]')) {
		if (ePage != 'e48243') Zotero.debug(`directAccess(): ${ePage} returns full text.`);
		else Zotero.debug('directAccess(): on a network with subscription to Lääkärilehti.');
		return true;
	}
	Zotero.debug('directAccess(): Not on campus or item requires subscription. Need proxy for SLL PDF.');
	return false;
}

// A variant from `Duodecim.js`: Keep meaningful `\n`'s
function returnProtect(raw) {
	let output = '';
	raw.split(/[\n\r]+/).forEach((lineCandidate) => {
		const toAppend = ZU.trimInternal(lineCandidate);
		if (/[a-zä-ö]/.test(toAppend.charAt(0))) output = output.replace(/\n$/, ' ');
		output += toAppend + `\n`;
	});
	return output;
}

function detectWeb(doc, url) {
	if (url.includes('potilaanlaakarilehti')
		&& doc.querySelector('article time.date')) return 'magazineArticle';
	else if (doc.querySelector('div[class^="util"]') // e32580
		|| doc.querySelector('div.login-container')
		|| doc.querySelector('span.meta.top')) return 'journalArticle';
	return false;
}

async function doWeb(doc, url) {
	const urlObj = new URL(url);
	const notProxy = ['www.laakarilehti.fi', 'www.potilaanlaakarilehti.fi'].includes(urlObj.hostname);
	const asJournal = !urlObj.hostname.includes('potilaanlaakarilehti');

	let item = new Zotero.Item(`${asJournal ? 'journalArticle' : 'magazineArticle'}`);
	item.publisher = "Suomen Lääkäriliitto";
	item.language = 'fi';
	item.title = text('article h1') || '';
	item.shortTitle = attr(doc, 'meta[property="og:title"]', 'content');
	if (/\s+[-–]\s+|:\s/.test(item.shortTitle)) item.shortTitle = item.shortTitle.split(/\s+[-–]\s+|:\s/)[0];
	if (item.shortTitle === item.title) item.shortTitle = undefined;
	item.date = attr(doc, 'meta[property="article:published_time"]', 'content')
		|| attr(doc, 'time.date', 'datetime');
	item.abstractNote = returnProtect(innerText('div.article__ingress')
		|| doc.querySelector('article h1')?.nextElementSibling?.innerText) // e.g. e46447
		|| attr(doc, 'meta[property="og:description"]', 'content');

	for (const oneAuthor of doc.querySelectorAll(`${asJournal ? 'span' : 'div'}.authors span`)) {
		const nameCandidate = ZU.trimInternal(oneAuthor.textContent);
		if (nameCandidate === "Potilaan Lääkärilehti") break;
		item.creators.push(ZU.cleanAuthor(nameCandidate, 'author'));
	}

	if (!asJournal) {
		item.publicationTitle = "Potilaan Lääkärilehti";
		item.ISSN = '2323-9476';
		item.url = url;
		for (const tagBtn of doc.querySelectorAll("article > div.flex-auto-columns > a.label")) item.tags.push(tagBtn.innerText);
	}
	else {
		item.publicationTitle = "Suomen Lääkärilehti";
		item.journalAbbreviation = "Suom Lääkäril";
		item.ISSN = '0039-5560, 2489-7434';

		const isOnCampus = await directAccess() && notProxy;
		const fullHTML = !doc.querySelector('div.login-container');

		let validPublicKey;
		const keyMatch = (attr(doc, 'div[class^="util"] a[title="WhatsApp"]', 'href'))?.match(/\?public=[a-z0-9]*?($|(?=&))/);
		if (fullHTML) {
			if (keyMatch) validPublicKey = keyMatch[0] || '';
			if (!validPublicKey?.length) item.attachments.push({ document: doc, snapshot: true }); // rare
		}
		else item.tags.push('sll-no-access');

		const metaSpan = ZU.trimInternal(innerText('article .meta.top'));
		const metaRegex = metaSpan.includes('www.laakarilehti.fi/e') ? ePageRegex : oldMetaRegex;
		const metaTopGroups = metaSpan.match(metaRegex)?.groups;
		if (metaTopGroups) {
			for (const key of Object.keys(metaTopGroups)) {
				if (!['issue1', 'eURL'].includes(key)) {
					item[key] = metaTopGroups[key];
					if (key != 'section' && item[key]) {
						item[key] = item[key].replace(/\s/g, '');
					}
				}
			}
			if (!isOnCampus
				&& Object.keys(metaTopGroups).includes('archiveLocation')
				&& await directAccess(metaTopGroups.archiveLocation)
				&& notProxy // TODO ZU.request without proxy under proxied page?
				&& fullHTML) {
				Zotero.debug(`SLL: eURL ${metaTopGroups.eURL} as item.url`);
				item.url = 'https://' + metaTopGroups.eURL || undefined; // free to public with eURL
			}
		}
		if (item.section) item.section = ZU.capitalizeTitle(item.section.toLocaleLowerCase('FI'), true);
		if (item.section?.includes('Ledare')) item.language = 'sv';
		if (!item.url) { // no eURL
			const noNeedKey = fullHTML && !isOnCampus && notProxy && await directAccess(urlObj.pathname);
			const keyToFill = noNeedKey ? '' : (validPublicKey || '');
			item.url = 'https://www.laakarilehti.fi' + urlObj.pathname + keyToFill;
		}

		const pdfPath = attr(doc, 'div[class^="util"] a[title="Lataa PDF"]', 'href');
		if (pdfPath) {
			const pdfPageMeta = /SLL(?<issue>\d+(-\d+)?)-?\d{4}-(?<pages>\d+)\.pdf/i.exec(pdfPath)?.groups;
			if (!item.issue) item.issue = pdfPageMeta?.issue;
			if (!item.pages && pdfPageMeta) item.pages = pdfPageMeta.pages + '-'; // a user will have to manually seek last page number from PDF

			const asFile = isOnCampus || !notProxy;
			const toPush = {
				url: pdfPath,
				title: asFile ? 'PDF' : 'Linkki PDF-versioon (laakarilehti.fi)',
				mimeType: asFile ? 'application/pdf' : 'text/html'
			};
			if (!asFile) toPush.snapshot = false;
			item.attachments.push(toPush);
		}
		if (!item.pages) item.pages = item.archiveLocation;

		if (/\/en$/.test(urlObj.pathname)) { // English summary page
			item.publicationTitle = "Finnish Medical Journal";
			item.publisher = "Finnish Medical Association";
			const finnishTitle = attr(doc, 'meta[property="og:image:alt"]', 'content')
				|| attr(doc, 'meta[property="og:title"]', 'content');
			if (item.title) item.title = finnishTitle + ` [${item.title}]`;
			else item.title = finnishTitle;

			const paragraphs = doc.querySelectorAll('article > p');
			if (paragraphs) {
				item.abstractNote = '';
				paragraphs.forEach(p => item.abstractNote += p.innerText + '\n');
			}
		}
		else {
			const labels = doc.querySelectorAll('main article div.label');
			if (labels) for (const label of labels) if (label.innerText.includes("English summary")) {
				const englishElement = label.nextElementSibling;
				const title = englishElement.querySelector('h3').innerText // e.g. e39223
					|| englishElement.querySelector('h2').innerText; // e.g. 2015p2589
				if (!title) break;

				let englishTitle = title.replace('English summary: ', '');
				if (englishTitle === englishTitle.toUpperCase()) {
					englishTitle = englishTitle.charAt(0) + englishTitle.slice(1).toLowerCase();
				}
				if (englishTitle) item.title += ` [${englishTitle}]`;

				let englishAbstract = '';
				for (const p of englishElement.querySelectorAll('p')) {
					const pText = ZU.trimInternal(p.innerText);
					if (pText === ZU.trimInternal(innerText('span.authors'))) break;
					englishAbstract += `${pText}\n`;
				}
				if (item.abstractNote?.length && englishAbstract.length) {
					englishAbstract.replace(/\n$/m, '');
					item.abstractNote += `\n\n${englishAbstract}`;
				}

				break;
			}
		}
	}

	item.complete();
}

/**
 * Scraped in August 2026, the test cases demonstrate how this translator captures
 * a) non-journal news items
 * b) online-first journal articles or dedicated online page of them, and
 * c) published journals with volume, issue and page number.
 * d) patient version (Potilaan Lääkärilehti).
 *
 * If you happen to be testing via proxy or in a network IP range subscribing to SLL,
 * > you will always get the full URL with validPublicKey and, if applicable, PDF as file.
 * Otherwise, you get PDF as a web link attachment and, for free items, eURL as item.URL.
 */

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.laakarilehti.fi/terveydenhuolto/uusi-sahkoinen-bc-lausunto-kayttoon-syksylla/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Uusi sähköinen BC-lausunto käyttöön syksyllä",
				"creators": [
					{
						"firstName": "Ulla",
						"lastName": "Ora",
						"creatorType": "author"
					}
				],
				"date": "2026-07-01T09:14:27+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Se korvaa Kelan ja työeläkelaitosten etuuksien hakemisessa nykyiset B- ja C-lausunnot.",
				"archiveLocation": "e48850",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "e48850",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Terveydenhuolto",
				"url": "https://www.laakarilehti.fi/e48850",
				"volume": "81",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.laakarilehti.fi/terveydenhuolto/eroon-hoidon-tarpeen-arvioinnista/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Eroon hoidon tarpeen arvioinnista?",
				"creators": [
					{
						"firstName": "Anne",
						"lastName": "Seppänen",
						"creatorType": "author"
					}
				],
				"date": "2026-05-27T09:45:05+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Ei ehkä kokonaan, mutta hoidon jatkuvuuden avulla se saadaan toimimaan, sanovat lääkärit.",
				"archiveLocation": "e48581",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "e48581",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Terveydenhuolto",
				"url": "https://www.laakarilehti.fi/e48581",
				"volume": "81",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/adhd-n-laakehoitoa-ei-tarvitse-pelata-vinkkeja-kaytannon-tyohon/?public=4c37ef1f47541b38827578dc9ff30586",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "ADHD:n lääkehoitoa ei tarvitse pelätä – vinkkejä käytännön työhön",
				"creators": [
					{
						"firstName": "Anita",
						"lastName": "Puustjärvi",
						"creatorType": "author"
					},
					{
						"firstName": "Hanna",
						"lastName": "Putkonen",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Sumia",
						"creatorType": "author"
					},
					{
						"firstName": "Sami",
						"lastName": "Leppämäki",
						"creatorType": "author"
					},
					{
						"firstName": "Hertta",
						"lastName": "Ollikainen",
						"creatorType": "author"
					}
				],
				"date": "2025-04-24T12:32:00+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "• Lääkehoidon edellytys on huolellisella arviolla varmistettu diagnoosi.\n• Lääkkeet ovat tärkeä osa ADHD:n hoitoa. Kaikki eivät niitä tarvitse, mutta usein niistä on olennainen apu oireiden hallinnassa.\n• Tukitoimien ja lääkkeettömän hoidon tulee jatkua myös lääkehoidon aikana.\n• Hoidon vastetta ja haittoja seurataan alussa tiiviisti ja sopivan annoksen löydyttyä vähintään kerran vuodessa.\n• Väärinkäytön riski on otettava huomioon, mutta sitä ei tule liioitella.",
				"archiveLocation": "e43001",
				"issue": "9",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "691-",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Katsausartikkeli",
				"shortTitle": "ADHD:n lääkehoitoa ei tarvitse pelätä",
				"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/adhd-n-laakehoitoa-ei-tarvitse-pelata-vinkkeja-kaytannon-tyohon/?public=4c37ef1f47541b38827578dc9ff30586",
				"volume": "80",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/opioidiriippuvaisen-potilaan-kivun-hoito/?public=4338e24d1a50a0ab4d99613ccd1abf11",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Opioidiriippuvaisen potilaan kivun hoito [Treatment of pain in opioid dependent patients]",
				"creators": [
					{
						"firstName": "Katri",
						"lastName": "Hamunen",
						"creatorType": "author"
					},
					{
						"firstName": "Vesa K.",
						"lastName": "Kontinen",
						"creatorType": "author"
					}
				],
				"date": "2007-06-15T00:00:00+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Tärkein tieto\nOpioidit aiheuttavat fyysistä ja psyykkistä riippuvuutta sekä toleranssia. Lisäksi pitkäaikaiseen opioidien käyttöön voi liittyä lisääntynyttä kipuherkkyyttä.\nOpioidiriippuvaisen potilaan akuutin kivun hoidon tavoitteet ovat kivun asianmukainen hoito, sairaalahoidon mahdollistaminen, vieroitusoireiden estäminen sekä kiistatilanteiden välttäminen.\nAkuutin kivun hoidossa opioideja käytetään kohtalaisen ja voimakkaan kivun lieventämiseksi osana multimodaalista eli eri vaikutusmekanismeilla toimivaa kipulääkitystä.\nKorvaushoidossa olevan potilaan lääkityksen jatkamisesta tai korvaamisesta tulee huolehtia sairaalahoidon yhteydessä.\nKroonisen kivun hoito on haasteellista ja vaatii perehtymistä kokonaistilanteeseen ja yhteistyötä päihdepsykiatrian kanssa.\nPitkäaikainen opioidilääkitys kivun hoitoon tulee harvoin kyseeseen tässä potilasryhmässä.\n\n\nTreatment of pain in patients abusing opioids is challenging. Opioids cause physical and psychological dependence and tolerance. Opioid dependent patients also show increased pain sensitivity. The goals of management of acute pain are ensuring adequate and safe treatment of the pain, hospitalisation for treatment of the current medical problem and prevention or treatment of withdrawal symptoms. Detoxifying or weaning the patient from opioids is not the aim of treatment. Opioids for treatment of acute pain are used as part of a multimodal analgesic strategy as clinically indicated in patients with moderate to severe pain. Opioid maintenance treatment should be continued or replaced with appropriate opioid medication during hospitalisation to prevent withdrawal symptoms.\nManagement of chronic pain in patient abusing opioid is demanding and requires simultaneous treatment of the addiction. Long-term opioid medication is rarely indicated in addicted patients.",
				"issue": "24",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "2375-2380",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Katsausartikkeli",
				"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/opioidiriippuvaisen-potilaan-kivun-hoito/?public=4338e24d1a50a0ab4d99613ccd1abf11",
				"volume": "62",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.laakarilehti.fi/lehdet/1-2026/miten-nuorten-itsemurhia-voidaan-ehkaista/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Miten nuorten itsemurhia voidaan ehkäistä?",
				"creators": [
					{
						"firstName": "Sami",
						"lastName": "Pirkola",
						"creatorType": "author"
					},
					{
						"firstName": "Veera",
						"lastName": "Nieminen",
						"creatorType": "author"
					},
					{
						"firstName": "Kati",
						"lastName": "Kataja",
						"creatorType": "author"
					},
					{
						"firstName": "Alix",
						"lastName": "Helfer",
						"creatorType": "author"
					},
					{
						"firstName": "Kari",
						"lastName": "Aaltonen",
						"creatorType": "author"
					},
					{
						"firstName": "Mauri",
						"lastName": "Marttunen",
						"creatorType": "author"
					}
				],
				"date": "2026-01-16T00:00:00+02:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Nuorten itsemurhia ehkäistään useilla tasoilla: yhteiskunnallisella, nuorten yhteisöissä sekä sosiaali- ja terveydenhuollossa.\nRiskitekijöitä ovat mielenterveys- ja päihdeongelmat, persoonallisuuden impulsiivisuus, itsemurhat lähipiirissä sekä koetut takaiskut.\nItsetuhoisten nuorten tavoittaminen on haastavaa. Uudet sähköiset ympäristöt tarjonnevat tähän välineitä. Yleisellä ilmapiirillä, sosiaalisella medialla tai itsemurhavälineiden saatavuudella voi olla osansa monitekijäisessä itsemurhaprosessissa.",
				"archiveLocation": "e46447",
				"issue": "1",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "35-",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Katsaus",
				"url": "https://www.laakarilehti.fi/lehdet/1-2026/miten-nuorten-itsemurhia-voidaan-ehkaista/",
				"volume": "81",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.laakarilehti.fi/tieteessa/alkuperaistutkimukset/lasten-ahdistuneisuushairioiden-hoito-lastenpsykiatrian-yksikossasuuri-osa-voitaisiin-hoitaa-jo-perustasolla/?public=2b2f5e60e0afc5da248cbc58107ad1f0",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Lasten ahdistuneisuushäiriöiden hoito lastenpsykiatrian yksikössäSuuri osa voitaisiin hoitaa jo perustasolla [Treatment of paediatric anxiety disorders at the Child Psychiatric Evaluation, Acute and Consultation Process]",
				"creators": [
					{
						"firstName": "E. Juulia",
						"lastName": "Paavonen",
						"creatorType": "author"
					},
					{
						"firstName": "Hanna",
						"lastName": "Huhdanpää",
						"creatorType": "author"
					},
					{
						"firstName": "Hanna",
						"lastName": "Raaska",
						"creatorType": "author"
					},
					{
						"firstName": "Leena",
						"lastName": "Repokari",
						"creatorType": "author"
					}
				],
				"date": "2021-06-11T00:00:00+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "LÄHTÖKOHDAT Pelot ja ahdistuneisuushäiriöt ovat lapsilla yleisiä, joten perusterveydenhuollossa joudutaan usein arvioimaan niihin liittyvää hoidon tarvetta.\nMENETELMÄT Selvitimme ahdistuneisuuden vuoksi erikoissairaanhoitoon ohjautuneiden lasten oirekuvaa, hoitoa ja jatkohoidon tarvetta potilasasiakirjamerkinnöistä. Aineisto poimittiin systemaattisella otannalla ajalta 17.5.2018–27.9.2019. Siihen sisällytettiin kaikki lapset (n = 181), joilla oli masennus-, ahdistus- tai pakko-oireita ja jotka olivat niiden takia ohjautuneet tutkittaviksi lastenpsykiatrian tutkimus-, akuutti- ja konsultaatioyksikköön. Lopullinen aineisto käsitti 80 lasta, joilla oli ensisijaisesti pelko- tai ahdistusoireita.\nTULOKSET Valtaosa lapsista hyötyi lyhyestä fokusoidusta käyttäytymisterapeuttisesta hoitointerventiosta, ja yli puolella (55,7 %) käyntimäärä erikoissairaanhoidossa jäi vähäiseksi (≤ 8 käyntiä).\nPÄÄTELMÄT Suuri osa ahdistusoireisista lapsista voitaisiin hoitaa jo perustasolla. Psykoedukaation lisäksi tulisi tarjota apua oireiden hallintaan yksilöllisesti tai ryhmässä.\n\n\nBackground Fears and anxiety disorders are common in children. Therefore clinicians in primary care often have to assess their significance.\nMethods We evaluated the symptoms, treatment and need for further treatment on the basis of the medical records in children who were referred to a child psychiatric outpatient clinic. The sample comprised all children (N = 181) who were referred to the participating child psychiatric outpatient clinic between 17.5.2018 and 27.9.2019 and had mood or anxiety symptoms. Those with anxiety disorders, fears or separation anxiety were eligible for the study (N = 80).\nResults We found that most of these children benefitted significantly from psychoeducation and short focused behavioural interventions. In the majority of the children (55.7%), the treatment period was short and the highest number of visits was eight.\nConclusions We conclude that majority of children with anxiety disorders could be effectively treated already in primary care. These children and their parents should be provided with psychoeducation as well as individualized or group-based therapy for symptom management.",
				"issue": "23",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "1483-1487",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Alkuperäistutkimus",
				"shortTitle": "Lasten ahdistuneisuushäiriöiden hoito lastenpsykiatrian yksikössä",
				"url": "https://www.laakarilehti.fi/tieteessa/alkuperaistutkimukset/lasten-ahdistuneisuushairioiden-hoito-lastenpsykiatrian-yksikossasuuri-osa-voitaisiin-hoitaa-jo-perustasolla/",
				"volume": "76",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.laakarilehti.fi/tieteessa/alkuperaistutkimukset/diagnoosiviiveet-ovat-syyna-viidesosaan-korvattavista-potilasvahingoista/?public=49c98346a584f320ebdcf77506967a21",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Diagnoosiviiveet ovat syynä viidesosaan korvattavista potilasvahingoista [Diagnostic errors accounted for 20% of compensated patient injuries in Finland]",
				"creators": [
					{
						"firstName": "Eero",
						"lastName": "Hirvensalo",
						"creatorType": "author"
					},
					{
						"firstName": "Lasse",
						"lastName": "Rämö",
						"creatorType": "author"
					},
					{
						"firstName": "Morag",
						"lastName": "Tolvi",
						"creatorType": "author"
					},
					{
						"firstName": "Minna",
						"lastName": "Plit-Turunen",
						"creatorType": "author"
					}
				],
				"date": "2026-05-05T09:00:00+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Lähtökohdat Suomessa korvataan vuosittain 2 000–2 500 potilasvahinkoa. Niistä osa liittyy puutteelliseen diagnostiikkaan. Näitä hoitovahinkoja ei ole aikaisemmin analysoitu vahinkoaineistojen perusteella maassamme.\nMenetelmät Tutkimuksessa selvitettiin diagnoosiviiveiden aiheuttamat potilasvahingot kahden vuoden jaksoilla 2007–2008, 2017–2018 ja 2021–2022.\nTulokset Noin 20 % kaikista korvauspäätöksistä tehtiin diagnoosin ja hoidon viiveen perusteella, kuuden vuoden aikana yhteensä 2 550 tapausta. Pääosa korvatuista vahingoista liittyi päivystystoimintaan. Vakavia aivotapahtumien diagnoosiviiveitä oli yhteensä 151, näistä selkäydinkanavan alueen sairauksissa 116, sydän- ja verisuonitaudeissa 90, infektioissa 127 sekä umpilisäkkeen tulehduksen diagnostiikassa 68. Traumatologiassa puutteellisia diagnooseja oli sormien jänne- ja verisuonivammoissa 116, sormimurtumissa 115, värttinäluun alaosan ja ranteen murtumissa 111, reisiluun yläosan murtumissa 87, selkärangan murtumissa ja sijoiltaanmenoissa 83, sääriluun murtumissa 66, nilkan murtumissa 73 ja jalan alueen murtumissa 80. Syöpätaudeissa diagnoosiviiveitä ilmeni noin 50 tapausta vuodessa, yhteensä 326. Suurimmat alaryhmät olivat rinta-, aivo-, keuhko- ja paksusuolisyöpä.\nPäätelmät Koulutuksessa ja kliinisessä työssä tulisi kiinnittää erityistä huomiota niihin potilasryhmiin, joiden kohdalla diagnoosiviiveet ovat toistuvia ja yleisiä. Potilasvahinkoja on syytä seurata ja diagnoosiviiveisiin johtavia syitä tulee analysoida terveydenhuollon laadun arvioimiseksi.\n\n\nBackground The number of annually compensated patient injuries has varied between 2000 and 2500 in Finland. Injuries caused by delay in diagnostics have not been analysed in Finland before.\nMethods We analysed all compensated injuries associated with delayed diagnosis from the 2-year-periods of 2007–2008, 2017–2018 and 2021–2022. The data was collected from the Patient Insurance Centre.\nResults Delayed diagnosis as grounds for compensation accounted for 20% of all compensated patient injuries. There were 2550 cases in six years. The majority of these occurred in acute health care. Delayed diagnoses were found in acute disorders of brain in 151 and spinal canal in 116, cardiovascular diseases in 90, severe infection in 127, and appendicitis in 68 cases. Diagnostic errors were especially frequent in hand traumatology, with digital vascular or tendon injuries in 116, digital fractures in 115, and fractures of the distal antebrachium and wrist in 111 cases. Misdiagnosis in fractures of the upper femur were seen in 87, spinal injuries in 83, fractures of tibia in 66, ankle in 73, and fractures of the foot in 80 cases. Diagnostic delays in cancer were the major subgroup in elective medicine in all examined 2-year-periods, around 50 cases annually (total 326). Diagnostic delays were most common in breast, brain, lung, and colorectal tumours.\nConclusions Education should focus on developing proper examination skills and protocols in medical work, especially in fields where diagnostic errors are common. Analysis of patient injuries is justified to follow quality in clinical work.",
				"archiveLocation": "e48043",
				"issue": "12",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "898-",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Alkuperäistutkimus",
				"url": "https://www.laakarilehti.fi/e48043",
				"volume": "81",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.laakarilehti.fi/arkisto/muut/serotoniinioireyhtyma-vaarallinen-laakkeiden-haittavaikutus/?public=298e092254da97080ed6c8aedc0fac24",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Serotoniinioireyhtymä - vaarallinen lääkkeiden haittavaikutus",
				"creators": [
					{
						"firstName": "Kari",
						"lastName": "Laine",
						"creatorType": "author"
					}
				],
				"date": "1998-04-20T00:00:00+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Keskushermoston serotoniiniaktiivisuuden liiallisen lisääntymisen on havaittu voivan johtaa vakavaan oireistoon, ns. serotoniinioireyhtymään. Kyseessä on lääkehoitoon liittyvä akuutti sairaustila, jonka ilmaantuvuutta ei toistaiseksi tunneta. Serotoniinioireyhtymää on ilmennyt useiden lääkeaineiden käytön yhteydessä. Oireyhtymä voi pahimmillaan johtaa kuolemaan, mutta yleensä oireet helpottavat itsestään 12-24 tunnin kuluessa siitä, kun serotonergisen lääkkeen käyttö lopetetaan.",
				"issue": "12",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "1389",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Muut",
				"shortTitle": "Serotoniinioireyhtymä",
				"url": "https://www.laakarilehti.fi/arkisto/muut/serotoniinioireyhtyma-vaarallinen-laakkeiden-haittavaikutus/?public=298e092254da97080ed6c8aedc0fac24",
				"volume": "53",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/sarjamagneettistimulaation-mahdollisuudet-psykiatriassa-ja-tulevaisuuden-nakymat/?public=03de9b48d5045c1c691de94a29bb01bd",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sarjamagneettistimulaation mahdollisuudet psykiatriassa ja tulevaisuuden näkymät [Repetitive transcranial magnetic stimulation (rTMS) in psychiatry and future visions]",
				"creators": [
					{
						"firstName": "Tero",
						"lastName": "Taiminen",
						"creatorType": "author"
					},
					{
						"firstName": "Satu K.",
						"lastName": "Jääskeläinen",
						"creatorType": "author"
					}
				],
				"date": "2020-12-18T00:00:00+02:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "• Eurooppalaisessa näytönastekatsauksessa sarjamagneettistimulaatio (rTMS) on arvioitu varmasti tehokkaaksi masennuksen hoitomuodoksi (näytönaste A). Teho sijoittunee lääkehoidon ja sähköhoidon välille.\n• rTMS on todennäköisesti tehokasta (näytönaste B) kaksisuuntaisen mielialahäiriön masennusjaksoissa, traumaperäisessä stressihäiriössä ja skitsofrenian negatiivissa oireissa.\n• Menetelmän tekninen kehitys on nopeaa, ja lähitulevaisuudessa hoito todennäköisesti nopeutuu, tehostuu ja sen vaikuttavuus paranee edelleen.\n\n\nThe updated European guidelines state that rTMS is definitely effective against major depression (level A evidence). It is probably effective in depression in bipolar disorder, posttraumatic stress disorder and negative symptoms of schizophrenia. Technical development in the area is rapid, and in the near future rTMS treatment will probably be faster and more efficient.",
				"issue": "51-52",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "2853-2858",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Katsausartikkeli",
				"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/sarjamagneettistimulaation-mahdollisuudet-psykiatriassa-ja-tulevaisuuden-nakymat/?public=03de9b48d5045c1c691de94a29bb01bd",
				"volume": "75",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/ajokelpoisuuden-arviointi/?public=a5bda457f9701ea63768e707f1264aab",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ajokelpoisuuden arviointi [Evaluation of driving capacity]",
				"creators": [
					{
						"firstName": "Mikael",
						"lastName": "Ojala",
						"creatorType": "author"
					}
				],
				"date": "2015-10-02T00:00:00+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Ajokelpoisuutta on syytä pohtia aina potilaan tullessa vastaanotolle, ei vain ajokorttitarkastuksessa. Erityisesti tämä koskee iäkkäitä potilaita.\nLääkäri ei saa todistaa ajokykyisyyttä, jollei hän ole selvillä tutkittavan terveydentilasta. Tarvittaessa potilaan sairaushistoriasta on hankittava tietoa muista hoitopaikoista.\nAiempi terveystieto on yleensä tärkein aineisto ajokelpoisuuden arvioinnissa. Ajokykyä mittaavia lisätutkimuksia tehdään vain silloin, kun asia ei ilman niitä selviä.\nJos lääkäri katsoo, etteivät ajoterveysvaatimukset tutkimushetkellä täyty, hänen tulee asettaa joko tilapäinen tai pysyväisluonteinen ajokielto. Tilapäisestä ajokiellosta ei ilmoiteta poliisille, vaan lääkäri selostaa asian potilaalle ja antaa kannanottonsa myös kirjallisena. Pysyväisluonteisesta ajokiellosta tehdään ilmoitus poliisille.\n\n\nIn Finland we have a notification law (i.e. the doctor has to inform police) in cases of permanent loss of driving capacity, and we also have age related medical examinations for all drivers aged 70 years or more. In spite of these measures, there is emerging evidence that medical factors might be involved in one quarter of severe traffic accidents. The increasing number of elderly drivers probably explains the increasing trend of these cases. Better guidelines for doctors for assessment of driving health will be published in the near future. Traffic safety is team work, where doctors should have a role, but many other experts and the drivers themselves are needed if we are to continue the favourable road safety trend.",
				"issue": "40",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "2589-2594",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Katsausartikkeli",
				"url": "https://www.laakarilehti.fi/tieteessa/katsausartikkeli/ajokelpoisuuden-arviointi/?public=a5bda457f9701ea63768e707f1264aab",
				"volume": "70",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.laakarilehti.fi/tieteessa/alkuperaistutkimukset/kehitysvammaisuutta-esiintyy-enemman-pojilla-kuin-tytoilla/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Kehitysvammaisuutta esiintyy enemmän pojilla kuin tytöillä [Intellectual disability is more common among boys than among girls]",
				"creators": [
					{
						"firstName": "Maria",
						"lastName": "Arvio",
						"creatorType": "author"
					},
					{
						"firstName": "Jaana",
						"lastName": "Lähdetie",
						"creatorType": "author"
					}
				],
				"date": "2024-04-30T10:18:00+03:00",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Lähtökohdat Kehitysvammaiset ovat suurin yksittäinen vammaisryhmä. Diagnostiset kriteerit ovat olleet samat yli 50 vuoden ajan.\nMenetelmät Selvitimme Kelan etuusrekistereiden avulla kehitysvammadiagnoosin perusteella vammaistukea saavien alle 15-vuotiaiden poikien ja tyttöjen lukumäärät. Autismikirjon häiriö, epilepsia ja CP-vamma ovat yleisiä kehitysvamman liitännäisdiagnooseja, ja kartoitimme myös näihin diagnooseihin liittyviä etuisuuksia.\nTulokset Kehitysvammaisuus oli pojilla lähes kaksi kertaa yleisempi vammaistuen myöntämisperuste kuin tytöillä. Autismikirjon häiriö oli pojilla lähes neljä kertaa tyttöjä yleisempi kehitysvamman liitännäisdiagnoosi.\nPäätelmät X-kromosomissa on kognitiiviseen kehitykseen liittyvää geenejä, mutta ne selittävät vain osin sukupuolien välistä eroa kehitysvamman ja autismikirjon ilmenemisessä. Arvioimme, että poikien yliedustuksen taustalla on useita vielä tuntemattomia geneettisiä ja hankinnaisia tekijöitä sekä näiden yhteisvaikutuksia.\n\n\nBackground People with intellectual disability (ID) are the largest single disability group. The diagnostic criteria of ID have remained the same for over 50 years.\nMethod We used the statistical database of the national insurance institution of Finland and determined the number of individuals aged less than 15 years, who received disability allowance due to an ID diagnosis. Autism spectrum disorder, epilepsy and cerebral palsy are frequent comorbidities in people with ID. We also determined the number of individuals aged less than 15 years, who received disability allowance due to these diagnoses recorded by ICD-10 codes.\nResults ID was almost two times more common as a cause of disability allowance among boys than among girls. Autism spectrum disorder as a co-morbid diagnosis to ID was almost four times more common among boys than among girls.\nDiscussion In the X-chromosome, there are several genes affecting intelligence. Still, only part of the male predominance in ID is caused by X-chromosomal genes. We suppose that gene-gene and gene-environment interactions play a role in creating this sex difference which needs to be studied further.\nMaria Arvio, Jaana Lähdetie",
				"archiveLocation": "e39223",
				"issue": "20-21",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"pages": "863-",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Alkuperäistutkimus",
				"url": "https://www.laakarilehti.fi/e39223",
				"volume": "79",
				"attachments": [
					{
						"title": "Linkki PDF-versioon (laakarilehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.potilaanlaakarilehti.fi/uutiset/keuhkokuume-voi-nakya-iakkaalla-sekavuutena/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Keuhkokuume voi näkyä iäkkäällä sekavuutena",
				"creators": [],
				"date": "2026-05-31",
				"ISSN": "2323-9476",
				"abstractNote": "Erityisesti iäkkäillä ihmisillä keuhkokuume voi alkaa ilman korkeaa kuumetta tai voimakkaita hengitystieoireita ja sen ensimmäinen oire on sekavuus.",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"publicationTitle": "Potilaan Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"url": "https://www.potilaanlaakarilehti.fi/uutiset/keuhkokuume-voi-nakya-iakkaalla-sekavuutena/",
				"attachments": [],
				"tags": [
					{
						"tag": "INFEKTIO"
					},
					{
						"tag": "KEUHKOKUUME"
					},
					{
						"tag": "KEUHKOT"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.potilaanlaakarilehti.fi/kommentit/teho-osaston-frendit/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Teho-osaston frendit",
				"creators": [
					{
						"firstName": "Janna",
						"lastName": "Manninen",
						"creatorType": "author"
					}
				],
				"date": "2025-04-13",
				"ISSN": "2323-9476",
				"abstractNote": "Oli jännittävää katsoa, kuinka potilaita sarjassa hoidettiin, kirjoittaa Janna Manninen.",
				"language": "fi",
				"libraryCatalog": "Lääkärilehti",
				"publicationTitle": "Potilaan Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"url": "https://www.potilaanlaakarilehti.fi/kommentit/teho-osaston-frendit/",
				"attachments": [],
				"tags": [
					{
						"tag": "KOLUMNI"
					},
					{
						"tag": "MIELIPIDE"
					},
					{
						"tag": "TEHO-OSASTO"
					},
					{
						"tag": "TELEVISIO"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
