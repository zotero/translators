{
	"translatorID": "205879bc-85c2-4a4e-b2db-c37d0e80bc88",
	"label": "Lääkärilehti",
	"creator": "Shiyu Wang",
	"target": "^https?://www\\.laakarilehti\\.fi/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-09 23:29:42"
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

const oldMetaRegex = /^(?:Lehti (?<issue1>[\d-]*?): )?(?<section>.*?)\s+(?<issue>[\d-]*?)\/.*vsk (?<volume>\d+) s\.\s*?(?<pages>\d+.*?$)/i;
const ePageRegex = /^(?:Lehti (?<issue>[\d-]*?): )?(?<section>.*?)\s+Suom Lääkäril \d{4};(?<volume>\d+):(?<archiveLocation>e\d+),\s+(?<eURL>www.laakarilehti.fi.*$)/i;

// const noProxyOptions = {
// 	headers: { Cookie: '' },
// 	cookieSandbox: '' // this._translate.cookieSandbox
// };

/**
 * Adapted from `onCampus(epage)` of my own translator `Duodecim.js` (`63ef6a3b-2e64-4d58-aedc-07b31a108928`).
 *
 * @param {string} [ePage = 'e48243'] `/e\d+/` or a regular pathname.
 * @returns {Promise<boolean>} whether the network IP is a subscriber to SLL
 */
async function directAccess(ePage = 'e48243') {
	if (ePage.slice(0) === '/') ePage = ePage.slice(1, -1);
	const sllTestDoc = await requestDocument(`https://www.laakarilehti.fi/${ePage}`); //, noProxyOptions);
	Zotero.debug(`directAccess(): returned URL ${JSON.parse(JSON.stringify(sllTestDoc)).location}`);

	if (sllTestDoc?.querySelector('div.utils')) {
		if (ePage != 'e48243') Zotero.debug(`directAccess(): ${ePage} returns full text.`);
		else Zotero.debug('directAccess(): on a network with subscription to Lääkärilehti.');
		return true;
	}
	Zotero.debug('directAccess(): Not on campus or item requires subscription. Need proxy for SLL PDF.');
	return false;
}

// From `Duodecim.js`: Keep meaningful `\n`'s
function returnProtect(raw) {
	let output = '';
	raw.split(/[\n\r]+/).forEach((lineCandidate) => {
		const toAppend = ZU.trimInternal(lineCandidate);
		if (!/[A-ZÄ-Ö]/.test(toAppend.slice(0))) output = output.replace(/\n$/, ' ');
		output += toAppend + `\n`;
	});
	return output;
}

function detectWeb(doc) {
	if (doc.querySelector('div.util')
		|| doc.querySelector('div.login-container')
		|| doc.querySelector('span.meta.top')) return 'journalArticle';
	return false;
}

async function doWeb(doc, url) {
	let item = new Zotero.Item('journalArticle');
	item.publicationTitle = "Suomen Lääkärilehti";
	item.journalAbbreviation = "Suom Lääkäril";
	item.publisher = "Suomen lääkäriliitto";
	item.ISSN = '0039-5560, 2489-7434';
	item.language = 'fi';
	item.title = text('article h1') || '';
	item.date = attr(doc, 'meta[property="article:published_time"]', 'content');
	item.shortTitle = attr(doc, 'meta[property="og:title"]', 'content');
	// doc.querySelectorAll('span.authors span')?.forEach((author) => {
	for (const author of doc.querySelectorAll('span.authors span')) {
		item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
	}

	const urlObj = new URL(url);
	const notProxy = urlObj.hostname === 'www.laakarilehti.fi';
	const isOnCampus = await directAccess() && notProxy;
	const fullHTML = !doc.querySelector('div.login-container');
	let validPublicKey;
	const keyMatch = attr(doc, 'div.utils a[title="Jaa sähköpostitse"]', 'href')?.match(/\?public=.*$/);
	if (fullHTML) validPublicKey = keyMatch[0] || '';
	if (!fullHTML) item.tags.push('sll-no-access');
	if (fullHTML && !validPublicKey.length) item.attachments.push({ document: doc, snapshot: true }); // no webpage snapshot in most cases

	const metaSpan = ZU.trimInternal(innerText('article span.meta.top'));
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
			&& notProxy // TODO request with zero cookie?
			&& fullHTML) {
			Zotero.debug(`SLL: eURL ${metaTopGroups.eURL} as item.url`);
			item.url = 'https://' + metaTopGroups.eURL || undefined; // free to public with eURL
		}
	}
	if (item.section) item.section = ZU.capitalizeTitle(item.section.toLocaleLowerCase('FI'), true);
	if (item.section?.includes('Ledare')) item.language = 'sv';
	if (!item.url) item.url = `https://www.laakarilehti.fi${urlObj.pathname}${validPublicKey || ''}`;

	const pdfPath = attr(doc, 'div.utils a[title="Lataa PDF"]', 'href');
	if (pdfPath) {
		const pdfPageMeta = /SLL(?<issue>\d+(-\d+)?)-?\d{4}-(?<pages>\d+)\.pdf/i.exec(pdfPath)?.groups;
		if (pdfPageMeta) {
			for (const key of Object.keys(pdfPageMeta)) if (!item[key]) item[key] = pdfPageMeta[key];
			if (item.pages === pdfPageMeta.pages) item.pages += '-'; // a user will have to manually seek last page number from fetched PDF
		}

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

	if (/\/en$/.test(urlObj.pathname)) {
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
		item.abstractNote = returnProtect(innerText('div.article__ingress')
			|| doc.querySelector('article h1')?.nextElementSibling?.innerText) // e.g. e46447
			|| attr(doc, 'meta[property="og:description"]', 'content');
		
		let englishAbstract = '';
		const labels = doc.querySelectorAll('main article div.label');
		if (labels) for (const label of labels) if (label.innerText.includes("English summary")) {
			const englishElement = label.nextElementSibling;
			const title = text('div.content h3')
				|| text('div.content h2'); // 2015p2589
			const englishTitle = ZU.capitalizeTitle(title.replace('English summary: ', '').toLowerCase(), true);
			if (englishTitle) item.title += ` [${englishTitle}]`;

			englishElement.querySelectorAll('p')?.forEach(p => englishAbstract += `${p.innerText}\n`);
			if (englishAbstract.length) englishAbstract.replace(/\n$/m, '');
			if (item.abstractNote?.length
				&& englishAbstract.length) item.abstractNote += `\n\n${englishAbstract}`;

			break;
		}
	}

	item.complete();
}

/**
 * Scraped in August 2026, the test cases demonstrate how this translator captures
 * a) non-journal news items
 * b) online-first journal articles or dedicated online page of them, and
 * c) published journals with volume, issue and page number.
 *
 * If you happen to be testing via proxy or in a network IP range subscribing to SLL,
 * > you will always get the full URL with validPublicKey and, if applicable, PDF as file.
 * Otherwise, you get PDF as a web link attachment and, for some items, eURL as item.URL for some items.
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
				"publisher": "Suomen lääkäriliitto",
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
				"publisher": "Suomen lääkäriliitto",
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
				"publisher": "Suomen lääkäriliitto",
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
				"title": "Opioidiriippuvaisen potilaan kivun hoito [Treatment of Pain in Opioid Dependent Patients]",
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
				"publisher": "Suomen lääkäriliitto",
				"section": "Katsausartikkeli",
				"shortTitle": "Opioidiriippuvaisen potilaan kivun hoito",
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
				"publisher": "Suomen lääkäriliitto",
				"section": "Katsaus",
				"url": "https://www.laakarilehti.fi/lehdet/1-2026/miten-nuorten-itsemurhia-voidaan-ehkaista/?public=0f26edc781cc73cf347108dc23c21703",
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
				"title": "Lasten ahdistuneisuushäiriöiden hoito lastenpsykiatrian yksikössäSuuri osa voitaisiin hoitaa jo perustasolla [Treatment of Paediatric Anxiety Disorders at the Child Psychiatric Evaluation, Acute and Consultation Process]",
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
				"publisher": "Suomen lääkäriliitto",
				"section": "Alkuperäistutkimus",
				"shortTitle": "Lasten ahdistuneisuushäiriöiden hoito lastenpsykiatrian yksikössä",
				"url": "https://www.laakarilehti.fi/tieteessa/alkuperaistutkimukset/lasten-ahdistuneisuushairioiden-hoito-lastenpsykiatrian-yksikossasuuri-osa-voitaisiin-hoitaa-jo-perustasolla/?public=2b2f5e60e0afc5da248cbc58107ad1f0",
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
				"title": "Diagnoosiviiveet ovat syynä viidesosaan korvattavista potilasvahingoista [Diagnostic Errors Accounted for 20% of Compensated Patient Injuries in Finland]",
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
				"publisher": "Suomen lääkäriliitto",
				"section": "Alkuperäistutkimus",
				"shortTitle": "Diagnoosiviiveet ovat syynä viidesosaan korvattavista potilasvahingoista",
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
				"publisher": "Suomen lääkäriliitto",
				"section": "Muut",
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
				"title": "Sarjamagneettistimulaation mahdollisuudet psykiatriassa ja tulevaisuuden näkymät [Repetitive Transcranial Magnetic Stimulation (rtms) in Psychiatry and Future Visions]",
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
				"publisher": "Suomen lääkäriliitto",
				"section": "Katsausartikkeli",
				"shortTitle": "Sarjamagneettistimulaation mahdollisuudet psykiatriassa ja tulevaisuuden näkymät",
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
				"title": "Ajokelpoisuuden arviointi [Evaluation of Driving Capacity]",
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
				"publisher": "Suomen lääkäriliitto",
				"section": "Katsausartikkeli",
				"shortTitle": "Ajokelpoisuuden arviointi",
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
	}
]
/** END TEST CASES **/
