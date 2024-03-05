{
	"translatorID": "faa53754-fb55-4658-9094-ae8a7e0409a2",
	"label": "OpenAlex JSON",
	"creator": "Sebastian Karcher",
	"target": "json",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2024-02-26 04:33:01"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2024 Sebastian Karcher

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

// copied from CSL JSON
function parseInput() {
	var str, json = "";
	
	// Read in the whole file at once, since we can't easily parse a JSON stream. The
	// chunk size here is pretty arbitrary, although larger chunk sizes may be marginally
	// faster. We set it to 1MB.
	while ((str = Z.read(1048576)) !== false) json += str;
	
	try {
		return JSON.parse(json);
	}
	catch (e) {
		Zotero.debug(e);
		return false;
	}
}

function detectImport() {
	var parsedData = parseInput();
	// Z.debug(parsedData.ids)
	if (parsedData && parsedData.ids && parsedData.ids.openalex) {
		return true;
	}
	return false;
}

/* eslint-disable camelcase*/
var PDFversionMap = {
	submittedVersion: "Submitted Version PDF",
	acceptedVersion: "Accepted Version PDF",
	publishedVersion: "Full Text PDF"
}
/* eslint-disable camelcase*/
var mappingTypes = {
	article: "journalArticle",
	book: "book",
	"book-chapter": "bookSection",
	dissertation: "thesis",
	other: "document",
	report: "report",
	paratext: "document",
	dataset: "dataset",
	"reference-entry": "encyclopediaArticle",
	standard: "standard",
	editorial: "journalArticle",
	letter: "journalArticle",
	"peer-review": "document", // up for debate
	erratum: "journalArticle",
	grant: "manuscript" // up for debate
};

function doImport() {
	var data = parseInput();
	let OAtype = data.type;
	// Z.debug(OAtype)
	let type = "document"; // default to document
	type = mappingTypes[OAtype];
	var item = new Zotero.Item(type);
	item.title = data.title;
	item.date = data.publication_date;
	item.language = data.language;
	if (data.doi) {
			item.DOI = ZU.cleanDOI(data.doi);
	}
	if (data.primary_location.source) {
		let sourceName = data.primary_location.source.display_name;
		if (item.itemType == "thesis" || item.itemType == "dataset") {
			item.publisher = sourceName;
		}
		else if (item.itemType == "book") {
			item.publisher = data.primary_location.source.host_organization_name;
		}
		else {
			item.publicationTitle = sourceName;
			item.publisher = data.primary_location.source.host_organization_name;
		}
		item.ISSN = data.primary_location.source.issn;
	}

	let biblio = data.biblio;
	item.issue = biblio.issue;
	item.volume = biblio.volume;
	if (biblio.first_page && biblio.last_page && biblio.first_page != biblio.last_page) {
		item.pages = biblio.first_page + "-" + biblio.last_page;
	}
	else if (biblio.first_page) {
		item.pages = biblio.first_page;
	}


	let authors = data.authorships;
	for (let author of authors) {
		let authorName = author.author.display_name;
		item.creators.push(ZU.cleanAuthor(authorName, "author", false))
	}
	if (data.best_oa_location && data.best_oa_location.pdf_url) {
		let version = "Submitted Version PDF";
		if (data.best_oa_location.version) {
			version = PDFversionMap[data.best_oa_location.version];
		}
		item.attachments.push({url: data.best_oa_location.pdf_url, title: version, mimeType: "application/pdf"})
	}
	let tags = data.keywords;
	for (let tag of tags) {
		item.tags.push(tag.keyword)
	}
	item.complete();
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "{\r\n  \"id\": \"https://openalex.org/W2099326003\",\r\n  \"doi\": \"https://doi.org/10.2307/1885099\",\r\n  \"title\": \"Labor Contracts as Partial Gift Exchange\",\r\n  \"display_name\": \"Labor Contracts as Partial Gift Exchange\",\r\n  \"publication_year\": 1982,\r\n  \"publication_date\": \"1982-11-01\",\r\n  \"ids\": {\r\n    \"openalex\": \"https://openalex.org/W2099326003\",\r\n    \"doi\": \"https://doi.org/10.2307/1885099\",\r\n    \"mag\": \"2099326003\"\r\n  },\r\n  \"language\": \"en\",\r\n  \"primary_location\": {\r\n    \"is_oa\": false,\r\n    \"landing_page_url\": \"https://doi.org/10.2307/1885099\",\r\n    \"pdf_url\": null,\r\n    \"source\": {\r\n      \"id\": \"https://openalex.org/S203860005\",\r\n      \"display_name\": \"The Quarterly Journal of Economics\",\r\n      \"issn_l\": \"0033-5533\",\r\n      \"issn\": [\r\n        \"0033-5533\",\r\n        \"1531-4650\"\r\n      ],\r\n      \"is_oa\": false,\r\n      \"is_in_doaj\": false,\r\n      \"host_organization\": \"https://openalex.org/P4310311648\",\r\n      \"host_organization_name\": \"Oxford University Press\",\r\n      \"host_organization_lineage\": [\r\n        \"https://openalex.org/P4310311647\",\r\n        \"https://openalex.org/P4310311648\"\r\n      ],\r\n      \"host_organization_lineage_names\": [\r\n        \"University of Oxford\",\r\n        \"Oxford University Press\"\r\n      ],\r\n      \"type\": \"journal\"\r\n    },\r\n    \"license\": null,\r\n    \"version\": null,\r\n    \"is_accepted\": false,\r\n    \"is_published\": false\r\n  },\r\n  \"type\": \"article\",\r\n  \"type_crossref\": \"journal-article\",\r\n  \"indexed_in\": [\r\n    \"crossref\"\r\n  ],\r\n  \"open_access\": {\r\n    \"is_oa\": false,\r\n    \"oa_status\": \"closed\",\r\n    \"oa_url\": null,\r\n    \"any_repository_has_fulltext\": false\r\n  },\r\n  \"authorships\": [\r\n    {\r\n      \"author_position\": \"first\",\r\n      \"author\": {\r\n        \"id\": \"https://openalex.org/A5081873388\",\r\n        \"display_name\": \"George A. Akerlof\",\r\n        \"orcid\": null\r\n      },\r\n      \"institutions\": [\r\n        {\r\n          \"id\": \"https://openalex.org/I95457486\",\r\n          \"display_name\": \"University of California, Berkeley\",\r\n          \"ror\": \"https://ror.org/01an7q238\",\r\n          \"country_code\": \"US\",\r\n          \"type\": \"education\",\r\n          \"lineage\": [\r\n            \"https://openalex.org/I2803209242\",\r\n            \"https://openalex.org/I95457486\"\r\n          ]\r\n        }\r\n      ],\r\n      \"countries\": [\r\n        \"US\"\r\n      ],\r\n      \"is_corresponding\": true,\r\n      \"raw_author_name\": \"George A. Akerlof\",\r\n      \"raw_affiliation_string\": \"University of California, Berkeley\",\r\n      \"raw_affiliation_strings\": [\r\n        \"University of California, Berkeley\"\r\n      ]\r\n    }\r\n  ],\r\n  \"countries_distinct_count\": 1,\r\n  \"institutions_distinct_count\": 1,\r\n  \"corresponding_author_ids\": [\r\n    \"https://openalex.org/A5081873388\"\r\n  ],\r\n  \"corresponding_institution_ids\": [\r\n    \"https://openalex.org/I95457486\"\r\n  ],\r\n  \"apc_list\": {\r\n    \"value\": 6977,\r\n    \"currency\": \"USD\",\r\n    \"value_usd\": 6977,\r\n    \"provenance\": \"doaj\"\r\n  },\r\n  \"apc_paid\": {\r\n    \"value\": 6977,\r\n    \"currency\": \"USD\",\r\n    \"value_usd\": 6977,\r\n    \"provenance\": \"doaj\"\r\n  },\r\n  \"has_fulltext\": true,\r\n  \"fulltext_origin\": \"ngrams\",\r\n  \"cited_by_count\": 2786,\r\n  \"cited_by_percentile_year\": {\r\n    \"min\": 99,\r\n    \"max\": 100\r\n  },\r\n  \"biblio\": {\r\n    \"volume\": \"97\",\r\n    \"issue\": \"4\",\r\n    \"first_page\": \"543\",\r\n    \"last_page\": \"543\"\r\n  },\r\n  \"is_retracted\": false,\r\n  \"is_paratext\": false,\r\n  \"primary_topic\": {\r\n    \"id\": \"https://openalex.org/T10208\",\r\n    \"display_name\": \"Labor Market Dynamics and Inequality\",\r\n    \"score\": 0.9877,\r\n    \"subfield\": {\r\n      \"id\": \"https://openalex.org/subfields/2002\",\r\n      \"display_name\": \"Economics and Econometrics\"\r\n    },\r\n    \"field\": {\r\n      \"id\": \"https://openalex.org/fields/20\",\r\n      \"display_name\": \"Economics, Econometrics and Finance\"\r\n    },\r\n    \"domain\": {\r\n      \"id\": \"https://openalex.org/domains/2\",\r\n      \"display_name\": \"Social Sciences\"\r\n    }\r\n  },\r\n  \"topics\": [\r\n    {\r\n      \"id\": \"https://openalex.org/T10208\",\r\n      \"display_name\": \"Labor Market Dynamics and Inequality\",\r\n      \"score\": 0.9877,\r\n      \"subfield\": {\r\n        \"id\": \"https://openalex.org/subfields/2002\",\r\n        \"display_name\": \"Economics and Econometrics\"\r\n      },\r\n      \"field\": {\r\n        \"id\": \"https://openalex.org/fields/20\",\r\n        \"display_name\": \"Economics, Econometrics and Finance\"\r\n      },\r\n      \"domain\": {\r\n        \"id\": \"https://openalex.org/domains/2\",\r\n        \"display_name\": \"Social Sciences\"\r\n      }\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/T12137\",\r\n      \"display_name\": \"Existence and Dynamics of Monetary Equilibrium Models\",\r\n      \"score\": 0.9857,\r\n      \"subfield\": {\r\n        \"id\": \"https://openalex.org/subfields/2002\",\r\n        \"display_name\": \"Economics and Econometrics\"\r\n      },\r\n      \"field\": {\r\n        \"id\": \"https://openalex.org/fields/20\",\r\n        \"display_name\": \"Economics, Econometrics and Finance\"\r\n      },\r\n      \"domain\": {\r\n        \"id\": \"https://openalex.org/domains/2\",\r\n        \"display_name\": \"Social Sciences\"\r\n      }\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/T11743\",\r\n      \"display_name\": \"Critique of Political Economy and Capitalist Development\",\r\n      \"score\": 0.9847,\r\n      \"subfield\": {\r\n        \"id\": \"https://openalex.org/subfields/3312\",\r\n        \"display_name\": \"Sociology and Political Science\"\r\n      },\r\n      \"field\": {\r\n        \"id\": \"https://openalex.org/fields/33\",\r\n        \"display_name\": \"Social Sciences\"\r\n      },\r\n      \"domain\": {\r\n        \"id\": \"https://openalex.org/domains/2\",\r\n        \"display_name\": \"Social Sciences\"\r\n      }\r\n    }\r\n  ],\r\n  \"keywords\": [\r\n    {\r\n      \"keyword\": \"labor\",\r\n      \"score\": 0.4433\r\n    },\r\n    {\r\n      \"keyword\": \"exchange\",\r\n      \"score\": 0.4299\r\n    },\r\n    {\r\n      \"keyword\": \"gift\",\r\n      \"score\": 0.4135\r\n    }\r\n  ],\r\n  \"concepts\": [\r\n    {\r\n      \"id\": \"https://openalex.org/C134697681\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q1609677\",\r\n      \"display_name\": \"Clearing\",\r\n      \"level\": 2,\r\n      \"score\": 0.81496704\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C162324750\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q8134\",\r\n      \"display_name\": \"Economics\",\r\n      \"level\": 0,\r\n      \"score\": 0.7709161\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C2777388388\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q6821213\",\r\n      \"display_name\": \"Wage\",\r\n      \"level\": 2,\r\n      \"score\": 0.7343378\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C145236788\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q28161\",\r\n      \"display_name\": \"Labour economics\",\r\n      \"level\": 1,\r\n      \"score\": 0.72396404\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C14981831\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q1713661\",\r\n      \"display_name\": \"Market clearing\",\r\n      \"level\": 2,\r\n      \"score\": 0.70149326\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C2778126366\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q41171\",\r\n      \"display_name\": \"Unemployment\",\r\n      \"level\": 2,\r\n      \"score\": 0.6718695\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C2776544115\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q17058676\",\r\n      \"display_name\": \"Involuntary unemployment\",\r\n      \"level\": 3,\r\n      \"score\": 0.6377661\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C182306322\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q1779371\",\r\n      \"display_name\": \"Order (exchange)\",\r\n      \"level\": 2,\r\n      \"score\": 0.59540087\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C6968784\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q1193835\",\r\n      \"display_name\": \"Efficiency wage\",\r\n      \"level\": 3,\r\n      \"score\": 0.53425324\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C994546\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q207449\",\r\n      \"display_name\": \"Division of labour\",\r\n      \"level\": 2,\r\n      \"score\": 0.43008915\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C182095102\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q6007285\",\r\n      \"display_name\": \"Implicit contract theory\",\r\n      \"level\": 3,\r\n      \"score\": 0.42236993\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C18762648\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q42213\",\r\n      \"display_name\": \"Work (physics)\",\r\n      \"level\": 2,\r\n      \"score\": 0.41878027\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C175444787\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q39072\",\r\n      \"display_name\": \"Microeconomics\",\r\n      \"level\": 1,\r\n      \"score\": 0.30064553\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C80984254\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q608190\",\r\n      \"display_name\": \"Labor relations\",\r\n      \"level\": 2,\r\n      \"score\": 0.22578001\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C34447519\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q179522\",\r\n      \"display_name\": \"Market economy\",\r\n      \"level\": 1,\r\n      \"score\": 0.18438369\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C139719470\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q39680\",\r\n      \"display_name\": \"Macroeconomics\",\r\n      \"level\": 1,\r\n      \"score\": 0.08346212\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C78519656\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q101333\",\r\n      \"display_name\": \"Mechanical engineering\",\r\n      \"level\": 1,\r\n      \"score\": 0\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C10138342\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q43015\",\r\n      \"display_name\": \"Finance\",\r\n      \"level\": 1,\r\n      \"score\": 0\r\n    },\r\n    {\r\n      \"id\": \"https://openalex.org/C127413603\",\r\n      \"wikidata\": \"https://www.wikidata.org/wiki/Q11023\",\r\n      \"display_name\": \"Engineering\",\r\n      \"level\": 0,\r\n      \"score\": 0\r\n    }\r\n  ],\r\n  \"mesh\": [],\r\n  \"locations_count\": 1,\r\n  \"locations\": [\r\n    {\r\n      \"is_oa\": false,\r\n      \"landing_page_url\": \"https://doi.org/10.2307/1885099\",\r\n      \"pdf_url\": null,\r\n      \"source\": {\r\n        \"id\": \"https://openalex.org/S203860005\",\r\n        \"display_name\": \"The Quarterly Journal of Economics\",\r\n        \"issn_l\": \"0033-5533\",\r\n        \"issn\": [\r\n          \"0033-5533\",\r\n          \"1531-4650\"\r\n        ],\r\n        \"is_oa\": false,\r\n        \"is_in_doaj\": false,\r\n        \"host_organization\": \"https://openalex.org/P4310311648\",\r\n        \"host_organization_name\": \"Oxford University Press\",\r\n        \"host_organization_lineage\": [\r\n          \"https://openalex.org/P4310311647\",\r\n          \"https://openalex.org/P4310311648\"\r\n        ],\r\n        \"host_organization_lineage_names\": [\r\n          \"University of Oxford\",\r\n          \"Oxford University Press\"\r\n        ],\r\n        \"type\": \"journal\"\r\n      },\r\n      \"license\": null,\r\n      \"version\": null,\r\n      \"is_accepted\": false,\r\n      \"is_published\": false\r\n    }\r\n  ],\r\n  \"best_oa_location\": null,\r\n  \"sustainable_development_goals\": [\r\n    {\r\n      \"id\": \"https://metadata.un.org/sdg/8\",\r\n      \"score\": 0.77,\r\n      \"display_name\": \"Decent work and economic growth\"\r\n    }\r\n  ],\r\n  \"grants\": [],\r\n  \"referenced_works_count\": 20,\r\n  \"referenced_works\": [\r\n    \"https://openalex.org/W1480035415\",\r\n    \"https://openalex.org/W1502717336\",\r\n    \"https://openalex.org/W1516136238\",\r\n    \"https://openalex.org/W1739556303\",\r\n    \"https://openalex.org/W1990700960\",\r\n    \"https://openalex.org/W2035384243\",\r\n    \"https://openalex.org/W2061276533\",\r\n    \"https://openalex.org/W2068723801\",\r\n    \"https://openalex.org/W2074308844\",\r\n    \"https://openalex.org/W2086436931\",\r\n    \"https://openalex.org/W2088972693\",\r\n    \"https://openalex.org/W2117172030\",\r\n    \"https://openalex.org/W2148539013\",\r\n    \"https://openalex.org/W2157300266\",\r\n    \"https://openalex.org/W2162994934\",\r\n    \"https://openalex.org/W2166184809\",\r\n    \"https://openalex.org/W2332585815\",\r\n    \"https://openalex.org/W2512666569\",\r\n    \"https://openalex.org/W2796935577\",\r\n    \"https://openalex.org/W3023342100\"\r\n  ],\r\n  \"related_works\": [\r\n    \"https://openalex.org/W3181694214\",\r\n    \"https://openalex.org/W2495368365\",\r\n    \"https://openalex.org/W1491227498\",\r\n    \"https://openalex.org/W2099326003\",\r\n    \"https://openalex.org/W2090028775\",\r\n    \"https://openalex.org/W2083061677\",\r\n    \"https://openalex.org/W2127336856\",\r\n    \"https://openalex.org/W3124441914\",\r\n    \"https://openalex.org/W1592829115\",\r\n    \"https://openalex.org/W3124968136\"\r\n  ],\r\n  \"ngrams_url\": \"https://api.openalex.org/works/W2099326003/ngrams\",\r\n  \"abstract_inverted_index\": {\r\n    \"This\": [\r\n      0\r\n    ],\r\n    \"paper\": [\r\n      1,\r\n      64\r\n    ],\r\n    \"explains\": [\r\n      2\r\n    ],\r\n    \"involuntary\": [\r\n      3\r\n    ],\r\n    \"unemployment\": [\r\n      4\r\n    ],\r\n    \"in\": [\r\n      5\r\n    ],\r\n    \"terms\": [\r\n      6\r\n    ],\r\n    \"of\": [\r\n      7,\r\n      10,\r\n      71\r\n    ],\r\n    \"the\": [\r\n      8,\r\n      20,\r\n      38,\r\n      47,\r\n      57\r\n    ],\r\n    \"response\": [\r\n      9\r\n    ],\r\n    \"firms\": [\r\n      11,\r\n      33\r\n    ],\r\n    \"to\": [\r\n      12,\r\n      29\r\n    ],\r\n    \"workers'\": [\r\n      13\r\n    ],\r\n    \"group\": [\r\n      14\r\n    ],\r\n    \"behavior.\": [\r\n      15\r\n    ],\r\n    \"Workers'\": [\r\n      16\r\n    ],\r\n    \"effort\": [\r\n      17\r\n    ],\r\n    \"depends\": [\r\n      18\r\n    ],\r\n    \"upon\": [\r\n      19\r\n    ],\r\n    \"norms\": [\r\n      21\r\n    ],\r\n    \"determining\": [\r\n      22\r\n    ],\r\n    \"a\": [\r\n      23,\r\n      67\r\n    ],\r\n    \"fair\": [\r\n      24\r\n    ],\r\n    \"day's\": [\r\n      25\r\n    ],\r\n    \"work.\": [\r\n      26\r\n    ],\r\n    \"In\": [\r\n      27\r\n    ],\r\n    \"order\": [\r\n      28\r\n    ],\r\n    \"affect\": [\r\n      30\r\n    ],\r\n    \"those\": [\r\n      31,\r\n      53\r\n    ],\r\n    \"norms,\": [\r\n      32\r\n    ],\r\n    \"may\": [\r\n      34\r\n    ],\r\n    \"pay\": [\r\n      35,\r\n      43,\r\n      55\r\n    ],\r\n    \"more\": [\r\n      36,\r\n      45\r\n    ],\r\n    \"than\": [\r\n      37,\r\n      46\r\n    ],\r\n    \"market-clearing\": [\r\n      39,\r\n      48,\r\n      58\r\n    ],\r\n    \"wage.\": [\r\n      40\r\n    ],\r\n    \"Industries\": [\r\n      41\r\n    ],\r\n    \"that\": [\r\n      42,\r\n      54\r\n    ],\r\n    \"consistently\": [\r\n      44\r\n    ],\r\n    \"wage\": [\r\n      49,\r\n      59\r\n    ],\r\n    \"are\": [\r\n      50,\r\n      60\r\n    ],\r\n    \"primary,\": [\r\n      51\r\n    ],\r\n    \"and\": [\r\n      52,\r\n      76\r\n    ],\r\n    \"only\": [\r\n      56\r\n    ],\r\n    \"secondary.\": [\r\n      61,\r\n      77\r\n    ],\r\n    \"Thus,\": [\r\n      62\r\n    ],\r\n    \"this\": [\r\n      63\r\n    ],\r\n    \"also\": [\r\n      65\r\n    ],\r\n    \"gives\": [\r\n      66\r\n    ],\r\n    \"theory\": [\r\n      68\r\n    ],\r\n    \"for\": [\r\n      69\r\n    ],\r\n    \"division\": [\r\n      70\r\n    ],\r\n    \"labor\": [\r\n      72\r\n    ],\r\n    \"markets\": [\r\n      73\r\n    ],\r\n    \"between\": [\r\n      74\r\n    ],\r\n    \"primary\": [\r\n      75\r\n    ]\r\n  },\r\n  \"cited_by_api_url\": \"https://api.openalex.org/works?filter=cites:W2099326003\",\r\n  \"counts_by_year\": [\r\n    {\r\n      \"year\": 2024,\r\n      \"cited_by_count\": 5\r\n    },\r\n    {\r\n      \"year\": 2023,\r\n      \"cited_by_count\": 76\r\n    },\r\n    {\r\n      \"year\": 2022,\r\n      \"cited_by_count\": 75\r\n    },\r\n    {\r\n      \"year\": 2021,\r\n      \"cited_by_count\": 74\r\n    },\r\n    {\r\n      \"year\": 2020,\r\n      \"cited_by_count\": 98\r\n    },\r\n    {\r\n      \"year\": 2019,\r\n      \"cited_by_count\": 109\r\n    },\r\n    {\r\n      \"year\": 2018,\r\n      \"cited_by_count\": 96\r\n    },\r\n    {\r\n      \"year\": 2017,\r\n      \"cited_by_count\": 100\r\n    },\r\n    {\r\n      \"year\": 2016,\r\n      \"cited_by_count\": 108\r\n    },\r\n    {\r\n      \"year\": 2015,\r\n      \"cited_by_count\": 121\r\n    },\r\n    {\r\n      \"year\": 2014,\r\n      \"cited_by_count\": 133\r\n    },\r\n    {\r\n      \"year\": 2013,\r\n      \"cited_by_count\": 121\r\n    },\r\n    {\r\n      \"year\": 2012,\r\n      \"cited_by_count\": 131\r\n    }\r\n  ],\r\n  \"updated_date\": \"2024-02-22T15:54:42.549913\",\r\n  \"created_date\": \"2016-06-24\"\r\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Labor Contracts as Partial Gift Exchange",
				"creators": [
					{
						"firstName": "George A.",
						"lastName": "Akerlof",
						"creatorType": "author"
					}
				],
				"date": "1982-11-01",
				"DOI": "https://doi.org/10.2307/1885099",
				"ISSN": "0033-5533,1531-4650",
				"issue": "4",
				"pages": "543",
				"publicationTitle": "The Quarterly Journal of Economics",
				"volume": "97",
				"attachments": [],
				"tags": [
					{
						"tag": "exchange"
					},
					{
						"tag": "gift"
					},
					{
						"tag": "labor"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\"id\":\"https://openalex.org/W3123223998\",\"doi\":\"https://doi.org/10.1257/0002828042002561\",\"title\":\"Are Emily and Greg More Employable Than Lakisha and Jamal? A Field Experiment on Labor Market Discrimination\",\"display_name\":\"Are Emily and Greg More Employable Than Lakisha and Jamal? A Field Experiment on Labor Market Discrimination\",\"publication_year\":2004,\"publication_date\":\"2004-09-01\",\"ids\":{\"openalex\":\"https://openalex.org/W3123223998\",\"doi\":\"https://doi.org/10.1257/0002828042002561\",\"mag\":\"3123223998\"},\"language\":\"en\",\"primary_location\":{\"is_oa\":false,\"landing_page_url\":\"https://doi.org/10.1257/0002828042002561\",\"pdf_url\":null,\"source\":{\"id\":\"https://openalex.org/S23254222\",\"display_name\":\"The American Economic Review\",\"issn_l\":\"0002-8282\",\"issn\":[\"1944-7981\",\"0002-8282\"],\"is_oa\":false,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/P4310315912\",\"host_organization_name\":\"American Economic Association\",\"host_organization_lineage\":[\"https://openalex.org/P4310315912\"],\"host_organization_lineage_names\":[\"American Economic Association\"],\"type\":\"journal\"},\"license\":null,\"version\":null,\"is_accepted\":false,\"is_published\":false},\"type\":\"article\",\"type_crossref\":\"journal-article\",\"indexed_in\":[\"crossref\"],\"open_access\":{\"is_oa\":true,\"oa_status\":\"green\",\"oa_url\":\"http://papers.nber.org/papers/w9873.pdf\",\"any_repository_has_fulltext\":true},\"authorships\":[{\"author_position\":\"first\",\"author\":{\"id\":\"https://openalex.org/A5002563734\",\"display_name\":\"Marianne Bertrand\",\"orcid\":null},\"institutions\":[{\"id\":\"https://openalex.org/I40347166\",\"display_name\":\"University of Chicago\",\"ror\":\"https://ror.org/024mw5h28\",\"country_code\":\"US\",\"type\":\"education\",\"lineage\":[\"https://openalex.org/I40347166\"]}],\"countries\":[\"US\"],\"is_corresponding\":false,\"raw_author_name\":\"Marianne Bertrand\",\"raw_affiliation_string\":\"University of Chicago (  )\",\"raw_affiliation_strings\":[\"University of Chicago (  )\"]},{\"author_position\":\"last\",\"author\":{\"id\":\"https://openalex.org/A5034703281\",\"display_name\":\"Sendhil Mullainathan\",\"orcid\":\"https://orcid.org/0000-0001-8508-4052\"},\"institutions\":[{\"id\":\"https://openalex.org/I63966007\",\"display_name\":\"Massachusetts Institute of Technology\",\"ror\":\"https://ror.org/042nb2s44\",\"country_code\":\"US\",\"type\":\"education\",\"lineage\":[\"https://openalex.org/I63966007\"]}],\"countries\":[\"US\"],\"is_corresponding\":false,\"raw_author_name\":\"Sendhil Mullainathan\",\"raw_affiliation_string\":\"Massachusetts Institute Of Technology#TAB#\",\"raw_affiliation_strings\":[\"Massachusetts Institute Of Technology#TAB#\"]}],\"countries_distinct_count\":1,\"institutions_distinct_count\":2,\"corresponding_author_ids\":[],\"corresponding_institution_ids\":[],\"apc_list\":null,\"apc_paid\":null,\"has_fulltext\":false,\"cited_by_count\":3465,\"cited_by_percentile_year\":{\"min\":99,\"max\":100},\"biblio\":{\"volume\":\"94\",\"issue\":\"4\",\"first_page\":\"991\",\"last_page\":\"1013\"},\"is_retracted\":false,\"is_paratext\":false,\"primary_topic\":{\"id\":\"https://openalex.org/T12970\",\"display_name\":\"Labor Market Discrimination and Inequality in Employment\",\"score\":1.0,\"subfield\":{\"id\":\"3312\",\"display_name\":\"Sociology and Political Science\"},\"field\":{\"id\":\"33\",\"display_name\":\"Social Sciences\"},\"domain\":{\"id\":\"2\",\"display_name\":\"Social Sciences\"}},\"topics\":[{\"id\":\"https://openalex.org/T12970\",\"display_name\":\"Labor Market Discrimination and Inequality in Employment\",\"score\":1.0,\"subfield\":{\"id\":\"3312\",\"display_name\":\"Sociology and Political Science\"},\"field\":{\"id\":\"33\",\"display_name\":\"Social Sciences\"},\"domain\":{\"id\":\"2\",\"display_name\":\"Social Sciences\"}},{\"id\":\"https://openalex.org/T14006\",\"display_name\":\"Linguistic Borrowing and Language Contact Phenomena\",\"score\":0.9506,\"subfield\":{\"id\":\"1203\",\"display_name\":\"Language and Linguistics\"},\"field\":{\"id\":\"12\",\"display_name\":\"Arts and Humanities\"},\"domain\":{\"id\":\"2\",\"display_name\":\"Social Sciences\"}},{\"id\":\"https://openalex.org/T12380\",\"display_name\":\"Authorship Attribution and User Profiling in Text\",\"score\":0.9505,\"subfield\":{\"id\":\"1702\",\"display_name\":\"Artificial Intelligence\"},\"field\":{\"id\":\"17\",\"display_name\":\"Computer Science\"},\"domain\":{\"id\":\"3\",\"display_name\":\"Physical Sciences\"}}],\"keywords\":[{\"keyword\":\"labor market discrimination\",\"score\":0.6636},{\"keyword\":\"emily\",\"score\":0.3282}],\"concepts\":[{\"id\":\"https://openalex.org/C204495577\",\"wikidata\":\"https://www.wikidata.org/wiki/Q1205349\",\"display_name\":\"Callback\",\"level\":2,\"score\":0.83815134},{\"id\":\"https://openalex.org/C201280247\",\"wikidata\":\"https://www.wikidata.org/wiki/Q11032\",\"display_name\":\"Newspaper\",\"level\":2,\"score\":0.8025631},{\"id\":\"https://openalex.org/C76509639\",\"wikidata\":\"https://www.wikidata.org/wiki/Q918036\",\"display_name\":\"Race (biology)\",\"level\":2,\"score\":0.71496654},{\"id\":\"https://openalex.org/C56273599\",\"wikidata\":\"https://www.wikidata.org/wiki/Q3122841\",\"display_name\":\"White (mutation)\",\"level\":3,\"score\":0.6915195},{\"id\":\"https://openalex.org/C112698675\",\"wikidata\":\"https://www.wikidata.org/wiki/Q37038\",\"display_name\":\"Advertising\",\"level\":1,\"score\":0.49600014},{\"id\":\"https://openalex.org/C2987028688\",\"wikidata\":\"https://www.wikidata.org/wiki/Q49085\",\"display_name\":\"African american\",\"level\":2,\"score\":0.46188635},{\"id\":\"https://openalex.org/C2779530757\",\"wikidata\":\"https://www.wikidata.org/wiki/Q1207505\",\"display_name\":\"Quality (philosophy)\",\"level\":2,\"score\":0.41410452},{\"id\":\"https://openalex.org/C145236788\",\"wikidata\":\"https://www.wikidata.org/wiki/Q28161\",\"display_name\":\"Labour economics\",\"level\":1,\"score\":0.4028681},{\"id\":\"https://openalex.org/C162324750\",\"wikidata\":\"https://www.wikidata.org/wiki/Q8134\",\"display_name\":\"Economics\",\"level\":0,\"score\":0.35625333},{\"id\":\"https://openalex.org/C144024400\",\"wikidata\":\"https://www.wikidata.org/wiki/Q21201\",\"display_name\":\"Sociology\",\"level\":0,\"score\":0.30022982},{\"id\":\"https://openalex.org/C144133560\",\"wikidata\":\"https://www.wikidata.org/wiki/Q4830453\",\"display_name\":\"Business\",\"level\":0,\"score\":0.28154504},{\"id\":\"https://openalex.org/C107993555\",\"wikidata\":\"https://www.wikidata.org/wiki/Q1662673\",\"display_name\":\"Gender studies\",\"level\":1,\"score\":0.18850306},{\"id\":\"https://openalex.org/C41008148\",\"wikidata\":\"https://www.wikidata.org/wiki/Q21198\",\"display_name\":\"Computer science\",\"level\":0,\"score\":0.09495148},{\"id\":\"https://openalex.org/C55493867\",\"wikidata\":\"https://www.wikidata.org/wiki/Q7094\",\"display_name\":\"Biochemistry\",\"level\":1,\"score\":0.0},{\"id\":\"https://openalex.org/C185592680\",\"wikidata\":\"https://www.wikidata.org/wiki/Q2329\",\"display_name\":\"Chemistry\",\"level\":0,\"score\":0.0},{\"id\":\"https://openalex.org/C2549261\",\"wikidata\":\"https://www.wikidata.org/wiki/Q43455\",\"display_name\":\"Ethnology\",\"level\":1,\"score\":0.0},{\"id\":\"https://openalex.org/C138885662\",\"wikidata\":\"https://www.wikidata.org/wiki/Q5891\",\"display_name\":\"Philosophy\",\"level\":0,\"score\":0.0},{\"id\":\"https://openalex.org/C111472728\",\"wikidata\":\"https://www.wikidata.org/wiki/Q9471\",\"display_name\":\"Epistemology\",\"level\":1,\"score\":0.0},{\"id\":\"https://openalex.org/C104317684\",\"wikidata\":\"https://www.wikidata.org/wiki/Q7187\",\"display_name\":\"Gene\",\"level\":2,\"score\":0.0},{\"id\":\"https://openalex.org/C199360897\",\"wikidata\":\"https://www.wikidata.org/wiki/Q9143\",\"display_name\":\"Programming language\",\"level\":1,\"score\":0.0}],\"mesh\":[],\"locations_count\":5,\"locations\":[{\"is_oa\":false,\"landing_page_url\":\"https://doi.org/10.1257/0002828042002561\",\"pdf_url\":null,\"source\":{\"id\":\"https://openalex.org/S23254222\",\"display_name\":\"The American Economic Review\",\"issn_l\":\"0002-8282\",\"issn\":[\"1944-7981\",\"0002-8282\"],\"is_oa\":false,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/P4310315912\",\"host_organization_name\":\"American Economic Association\",\"host_organization_lineage\":[\"https://openalex.org/P4310315912\"],\"host_organization_lineage_names\":[\"American Economic Association\"],\"type\":\"journal\"},\"license\":null,\"version\":null,\"is_accepted\":false,\"is_published\":false},{\"is_oa\":true,\"landing_page_url\":\"http://papers.nber.org/papers/w9873.pdf\",\"pdf_url\":\"http://papers.nber.org/papers/w9873.pdf\",\"source\":{\"id\":\"https://openalex.org/S4308707206\",\"display_name\":\"Library Union Catalog of Bavaria, Berlin and Brandenburg (B3Kat Repository)\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I157725225\",\"host_organization_name\":\"University of Illinois Urbana-Champaign\",\"host_organization_lineage\":[\"https://openalex.org/I157725225\"],\"host_organization_lineage_names\":[\"University of Illinois Urbana-Champaign\"],\"type\":\"repository\"},\"license\":null,\"version\":\"publishedVersion\",\"is_accepted\":true,\"is_published\":true},{\"is_oa\":true,\"landing_page_url\":\"http://s3.amazonaws.com/fieldexperiments-papers2/papers/00216.pdf\",\"pdf_url\":\"http://s3.amazonaws.com/fieldexperiments-papers2/papers/00216.pdf\",\"source\":{\"id\":\"https://openalex.org/S4306401271\",\"display_name\":\"RePEc: Research Papers in Economics\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I77793887\",\"host_organization_name\":\"Federal Reserve Bank of St. Louis\",\"host_organization_lineage\":[\"https://openalex.org/I77793887\"],\"host_organization_lineage_names\":[\"Federal Reserve Bank of St. Louis\"],\"type\":\"repository\"},\"license\":null,\"version\":\"publishedVersion\",\"is_accepted\":true,\"is_published\":true},{\"is_oa\":true,\"landing_page_url\":\"http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.841.6374\",\"pdf_url\":\"http://www.nber.org/papers/w9873.pdf\",\"source\":{\"id\":\"https://openalex.org/S4306400349\",\"display_name\":\"CiteSeer X (The Pennsylvania State University)\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I130769515\",\"host_organization_name\":\"Pennsylvania State University\",\"host_organization_lineage\":[\"https://openalex.org/I130769515\"],\"host_organization_lineage_names\":[\"Pennsylvania State University\"],\"type\":\"repository\"},\"license\":null,\"version\":\"publishedVersion\",\"is_accepted\":true,\"is_published\":true},{\"is_oa\":true,\"landing_page_url\":\"http://hdl.handle.net/1721.1/63261\",\"pdf_url\":\"https://dspace.mit.edu/bitstream/1721.1/63261/1/areemilygregmore00bert.pdf\",\"source\":{\"id\":\"https://openalex.org/S4306400425\",\"display_name\":\"DSpace@MIT (Massachusetts Institute of Technology)\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I63966007\",\"host_organization_name\":\"Massachusetts Institute of Technology\",\"host_organization_lineage\":[\"https://openalex.org/I63966007\"],\"host_organization_lineage_names\":[\"Massachusetts Institute of Technology\"],\"type\":\"repository\"},\"license\":\"cc-by-nc\",\"version\":\"submittedVersion\",\"is_accepted\":false,\"is_published\":false}],\"best_oa_location\":{\"is_oa\":true,\"landing_page_url\":\"http://papers.nber.org/papers/w9873.pdf\",\"pdf_url\":\"http://papers.nber.org/papers/w9873.pdf\",\"source\":{\"id\":\"https://openalex.org/S4308707206\",\"display_name\":\"Library Union Catalog of Bavaria, Berlin and Brandenburg (B3Kat Repository)\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I157725225\",\"host_organization_name\":\"University of Illinois Urbana-Champaign\",\"host_organization_lineage\":[\"https://openalex.org/I157725225\"],\"host_organization_lineage_names\":[\"University of Illinois Urbana-Champaign\"],\"type\":\"repository\"},\"license\":null,\"version\":\"publishedVersion\",\"is_accepted\":true,\"is_published\":true},\"sustainable_development_goals\":[],\"grants\":[],\"referenced_works_count\":13,\"referenced_works\":[\"https://openalex.org/W1522598817\",\"https://openalex.org/W1978385790\",\"https://openalex.org/W1991418004\",\"https://openalex.org/W2010532565\",\"https://openalex.org/W2034666618\",\"https://openalex.org/W2067516326\",\"https://openalex.org/W2116190275\",\"https://openalex.org/W2159594033\",\"https://openalex.org/W3122492922\",\"https://openalex.org/W3122889739\",\"https://openalex.org/W3124290904\",\"https://openalex.org/W4240275752\",\"https://openalex.org/W4251381017\"],\"related_works\":[\"https://openalex.org/W2613684332\",\"https://openalex.org/W2283761799\",\"https://openalex.org/W2117563254\",\"https://openalex.org/W2036388380\",\"https://openalex.org/W2369126155\",\"https://openalex.org/W2577299680\",\"https://openalex.org/W2376554757\",\"https://openalex.org/W612150824\",\"https://openalex.org/W2898656313\",\"https://openalex.org/W2126556840\"],\"ngrams_url\":\"https://api.openalex.org/works/W3123223998/ngrams\",\"abstract_inverted_index\":{\"We\":[0,66],\"study\":[1],\"race\":[2,83],\"in\":[3,14,90],\"the\":[4,78,91],\"labor\":[5,93],\"market\":[6],\"by\":[7,82],\"sending\":[8],\"fictitious\":[9],\"resumes\":[10,23],\"to\":[11,45,86],\"help-wanted\":[12],\"ads\":[13],\"Boston\":[15],\"and\":[16,63],\"Chicago\":[17],\"newspapers.\":[18],\"To\":[19],\"manipulate\":[20],\"perceived\":[21],\"race,\":[22],\"are\":[24,41,73],\"randomly\":[25],\"assigned\":[26],\"African-American-\":[27],\"or\":[28],\"White-sounding\":[29],\"names.\":[30,79],\"White\":[31,49],\"names\":[32,50],\"receive\":[33],\"50\":[34],\"percent\":[35],\"more\":[36,43],\"callbacks\":[37],\"for\":[38,48,52],\"interviews.\":[39],\"Callbacks\":[40],\"also\":[42,67],\"responsive\":[44],\"resume\":[46],\"quality\":[47],\"than\":[51],\"African-American\":[53],\"ones.\":[54],\"The\":[55],\"racial\":[56],\"gap\":[57],\"is\":[58],\"uniform\":[59],\"across\":[60],\"occupation,\":[61],\"industry,\":[62],\"employer\":[64],\"size.\":[65],\"find\":[68],\"little\":[69],\"evidence\":[70],\"that\":[71],\"employers\":[72],\"inferring\":[74],\"social\":[75],\"class\":[76],\"from\":[77],\"Differential\":[80],\"treatment\":[81],\"still\":[84,87],\"appears\":[85],\"be\":[88],\"prominent\":[89],\"U.S.\":[92],\"market.\":[94]},\"cited_by_api_url\":\"https://api.openalex.org/works?filter=cites:W3123223998\",\"counts_by_year\":[{\"year\":2024,\"cited_by_count\":17},{\"year\":2023,\"cited_by_count\":274},{\"year\":2022,\"cited_by_count\":277},{\"year\":2021,\"cited_by_count\":281},{\"year\":2020,\"cited_by_count\":328},{\"year\":2019,\"cited_by_count\":367},{\"year\":2018,\"cited_by_count\":233},{\"year\":2017,\"cited_by_count\":220},{\"year\":2016,\"cited_by_count\":186},{\"year\":2015,\"cited_by_count\":178},{\"year\":2014,\"cited_by_count\":199},{\"year\":2013,\"cited_by_count\":149},{\"year\":2012,\"cited_by_count\":156}],\"updated_date\":\"2024-02-18T16:41:58.927399\",\"created_date\":\"2021-02-01\"}\r\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Are Emily and Greg More Employable Than Lakisha and Jamal? A Field Experiment on Labor Market Discrimination",
				"creators": [
					{
						"firstName": "Marianne",
						"lastName": "Bertrand",
						"creatorType": "author"
					},
					{
						"firstName": "Sendhil",
						"lastName": "Mullainathan",
						"creatorType": "author"
					}
				],
				"date": "2004-09-01",
				"DOI": "https://doi.org/10.1257/0002828042002561",
				"ISSN": "1944-7981,0002-8282",
				"issue": "4",
				"pages": "991-1013",
				"publicationTitle": "The American Economic Review",
				"volume": "94",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "emily"
					},
					{
						"tag": "labor market discrimination"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\"id\":\"https://openalex.org/W2105705711\",\"doi\":\"https://doi.org/10.1007/978-94-017-1406-8_2\",\"title\":\"The Effects of Financial Incentives in Experiments: A Review and Capital-Labor-Production Framework\",\"display_name\":\"The Effects of Financial Incentives in Experiments: A Review and Capital-Labor-Production Framework\",\"publication_year\":1999,\"publication_date\":\"1999-01-01\",\"ids\":{\"openalex\":\"https://openalex.org/W2105705711\",\"doi\":\"https://doi.org/10.1007/978-94-017-1406-8_2\",\"mag\":\"2105705711\"},\"language\":\"en\",\"primary_location\":{\"is_oa\":false,\"landing_page_url\":\"https://doi.org/10.1007/978-94-017-1406-8_2\",\"pdf_url\":null,\"source\":{\"id\":\"https://openalex.org/S4306463937\",\"display_name\":\"Springer eBooks\",\"issn_l\":null,\"issn\":null,\"is_oa\":false,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/P4310319965\",\"host_organization_name\":\"Springer Nature\",\"host_organization_lineage\":[\"https://openalex.org/P4310319965\"],\"host_organization_lineage_names\":[\"Springer Nature\"],\"type\":\"ebook platform\"},\"license\":null,\"version\":null,\"is_accepted\":false,\"is_published\":false},\"type\":\"book-chapter\",\"type_crossref\":\"book-chapter\",\"indexed_in\":[\"crossref\"],\"open_access\":{\"is_oa\":true,\"oa_status\":\"green\",\"oa_url\":\"https://authors.library.caltech.edu/83580/1/sswp1059.pdf\",\"any_repository_has_fulltext\":true},\"authorships\":[{\"author_position\":\"first\",\"author\":{\"id\":\"https://openalex.org/A5024087833\",\"display_name\":\"Colin F. Camerer\",\"orcid\":\"https://orcid.org/0000-0003-4049-1871\"},\"institutions\":[{\"id\":\"https://openalex.org/I122411786\",\"display_name\":\"California Institute of Technology\",\"ror\":\"https://ror.org/05dxps055\",\"country_code\":\"US\",\"type\":\"education\",\"lineage\":[\"https://openalex.org/I122411786\"]}],\"countries\":[\"US\"],\"is_corresponding\":false,\"raw_author_name\":\"Colin F. Camerer\",\"raw_affiliation_string\":\"Division of Humanities and Social Sciences 228-77, California Institute of Technology, Pasadena,\",\"raw_affiliation_strings\":[\"Division of Humanities and Social Sciences 228-77, California Institute of Technology, Pasadena,\"]},{\"author_position\":\"last\",\"author\":{\"id\":\"https://openalex.org/A5047900722\",\"display_name\":\"Robin M. Hogarth\",\"orcid\":\"https://orcid.org/0000-0001-7671-8981\"},\"institutions\":[{\"id\":\"https://openalex.org/I40347166\",\"display_name\":\"University of Chicago\",\"ror\":\"https://ror.org/024mw5h28\",\"country_code\":\"US\",\"type\":\"education\",\"lineage\":[\"https://openalex.org/I40347166\"]}],\"countries\":[\"US\"],\"is_corresponding\":false,\"raw_author_name\":\"Robin M. Hogarth\",\"raw_affiliation_string\":\"University of Chicago (Chicago).\",\"raw_affiliation_strings\":[\"University of Chicago (Chicago).\"]}],\"countries_distinct_count\":1,\"institutions_distinct_count\":2,\"corresponding_author_ids\":[],\"corresponding_institution_ids\":[],\"apc_list\":null,\"apc_paid\":null,\"has_fulltext\":false,\"cited_by_count\":622,\"cited_by_percentile_year\":{\"min\":99,\"max\":100},\"biblio\":{\"volume\":null,\"issue\":null,\"first_page\":\"7\",\"last_page\":\"48\"},\"is_retracted\":false,\"is_paratext\":false,\"primary_topic\":{\"id\":\"https://openalex.org/T10646\",\"display_name\":\"Social Preferences and Economic Behavior\",\"score\":0.9999,\"subfield\":{\"id\":\"https://openalex.org/subfields/3311\",\"display_name\":\"Safety Research\"},\"field\":{\"id\":\"https://openalex.org/fields/33\",\"display_name\":\"Social Sciences\"},\"domain\":{\"id\":\"https://openalex.org/domains/2\",\"display_name\":\"Social Sciences\"}},\"topics\":[{\"id\":\"https://openalex.org/T10646\",\"display_name\":\"Social Preferences and Economic Behavior\",\"score\":0.9999,\"subfield\":{\"id\":\"https://openalex.org/subfields/3311\",\"display_name\":\"Safety Research\"},\"field\":{\"id\":\"https://openalex.org/fields/33\",\"display_name\":\"Social Sciences\"},\"domain\":{\"id\":\"https://openalex.org/domains/2\",\"display_name\":\"Social Sciences\"}},{\"id\":\"https://openalex.org/T10315\",\"display_name\":\"Behavioral Economics and Decision Making\",\"score\":0.9985,\"subfield\":{\"id\":\"https://openalex.org/subfields/1800\",\"display_name\":\"General Decision Sciences\"},\"field\":{\"id\":\"https://openalex.org/fields/18\",\"display_name\":\"Decision Sciences\"},\"domain\":{\"id\":\"https://openalex.org/domains/2\",\"display_name\":\"Social Sciences\"}},{\"id\":\"https://openalex.org/T10841\",\"display_name\":\"Discrete Choice Models in Economics and Health Care\",\"score\":0.9821,\"subfield\":{\"id\":\"https://openalex.org/subfields/2002\",\"display_name\":\"Economics and Econometrics\"},\"field\":{\"id\":\"https://openalex.org/fields/20\",\"display_name\":\"Economics, Econometrics and Finance\"},\"domain\":{\"id\":\"https://openalex.org/domains/2\",\"display_name\":\"Social Sciences\"}}],\"keywords\":[{\"keyword\":\"financial incentives\",\"score\":0.6353},{\"keyword\":\"experiments\",\"score\":0.4196},{\"keyword\":\"capital-labor-production\",\"score\":0.25}],\"concepts\":[{\"id\":\"https://openalex.org/C29122968\",\"wikidata\":\"https://www.wikidata.org/wiki/Q1414816\",\"display_name\":\"Incentive\",\"level\":2,\"score\":0.8655314},{\"id\":\"https://openalex.org/C2779861158\",\"wikidata\":\"https://www.wikidata.org/wiki/Q1549811\",\"display_name\":\"Generosity\",\"level\":2,\"score\":0.597156},{\"id\":\"https://openalex.org/C145097563\",\"wikidata\":\"https://www.wikidata.org/wiki/Q1148747\",\"display_name\":\"Payment\",\"level\":2,\"score\":0.56911683},{\"id\":\"https://openalex.org/C2778348673\",\"wikidata\":\"https://www.wikidata.org/wiki/Q739302\",\"display_name\":\"Production (economics)\",\"level\":2,\"score\":0.55046386},{\"id\":\"https://openalex.org/C162324750\",\"wikidata\":\"https://www.wikidata.org/wiki/Q8134\",\"display_name\":\"Economics\",\"level\":0,\"score\":0.53527635},{\"id\":\"https://openalex.org/C175444787\",\"wikidata\":\"https://www.wikidata.org/wiki/Q39072\",\"display_name\":\"Microeconomics\",\"level\":1,\"score\":0.49067962},{\"id\":\"https://openalex.org/C196083921\",\"wikidata\":\"https://www.wikidata.org/wiki/Q7915758\",\"display_name\":\"Variance (accounting)\",\"level\":2,\"score\":0.4220477},{\"id\":\"https://openalex.org/C100001284\",\"wikidata\":\"https://www.wikidata.org/wiki/Q2248246\",\"display_name\":\"Public economics\",\"level\":1,\"score\":0.35535687},{\"id\":\"https://openalex.org/C10138342\",\"wikidata\":\"https://www.wikidata.org/wiki/Q43015\",\"display_name\":\"Finance\",\"level\":1,\"score\":0.17811051},{\"id\":\"https://openalex.org/C121955636\",\"wikidata\":\"https://www.wikidata.org/wiki/Q4116214\",\"display_name\":\"Accounting\",\"level\":1,\"score\":0.08130938},{\"id\":\"https://openalex.org/C138885662\",\"wikidata\":\"https://www.wikidata.org/wiki/Q5891\",\"display_name\":\"Philosophy\",\"level\":0,\"score\":0.0},{\"id\":\"https://openalex.org/C27206212\",\"wikidata\":\"https://www.wikidata.org/wiki/Q34178\",\"display_name\":\"Theology\",\"level\":1,\"score\":0.0}],\"mesh\":[],\"locations_count\":3,\"locations\":[{\"is_oa\":false,\"landing_page_url\":\"https://doi.org/10.1007/978-94-017-1406-8_2\",\"pdf_url\":null,\"source\":{\"id\":\"https://openalex.org/S4306463937\",\"display_name\":\"Springer eBooks\",\"issn_l\":null,\"issn\":null,\"is_oa\":false,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/P4310319965\",\"host_organization_name\":\"Springer Nature\",\"host_organization_lineage\":[\"https://openalex.org/P4310319965\"],\"host_organization_lineage_names\":[\"Springer Nature\"],\"type\":\"ebook platform\"},\"license\":null,\"version\":null,\"is_accepted\":false,\"is_published\":false},{\"is_oa\":true,\"landing_page_url\":\"https://resolver.caltech.edu/CaltechAUTHORS:20171129-161418280\",\"pdf_url\":\"https://authors.library.caltech.edu/83580/1/sswp1059.pdf\",\"source\":{\"id\":\"https://openalex.org/S4306402161\",\"display_name\":\"CaltechAUTHORS (California Institute of Technology)\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I122411786\",\"host_organization_name\":\"California Institute of Technology\",\"host_organization_lineage\":[\"https://openalex.org/I122411786\"],\"host_organization_lineage_names\":[\"California Institute of Technology\"],\"type\":\"repository\"},\"license\":null,\"version\":\"acceptedVersion\",\"is_accepted\":true,\"is_published\":false},{\"is_oa\":true,\"landing_page_url\":\"https://resolver.caltech.edu/CaltechAUTHORS:20110208-132914477\",\"pdf_url\":\"https://authors.library.caltech.edu/22080/1/wp1059%5B1%5D.pdf\",\"source\":{\"id\":\"https://openalex.org/S4306402162\",\"display_name\":\"CaltechAUTHORS (California Institute of Technology)\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I122411786\",\"host_organization_name\":\"California Institute of Technology\",\"host_organization_lineage\":[\"https://openalex.org/I122411786\"],\"host_organization_lineage_names\":[\"California Institute of Technology\"],\"type\":\"repository\"},\"license\":null,\"version\":\"acceptedVersion\",\"is_accepted\":true,\"is_published\":false}],\"best_oa_location\":{\"is_oa\":true,\"landing_page_url\":\"https://resolver.caltech.edu/CaltechAUTHORS:20171129-161418280\",\"pdf_url\":\"https://authors.library.caltech.edu/83580/1/sswp1059.pdf\",\"source\":{\"id\":\"https://openalex.org/S4306402161\",\"display_name\":\"CaltechAUTHORS (California Institute of Technology)\",\"issn_l\":null,\"issn\":null,\"is_oa\":true,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/I122411786\",\"host_organization_name\":\"California Institute of Technology\",\"host_organization_lineage\":[\"https://openalex.org/I122411786\"],\"host_organization_lineage_names\":[\"California Institute of Technology\"],\"type\":\"repository\"},\"license\":null,\"version\":\"acceptedVersion\",\"is_accepted\":true,\"is_published\":false},\"sustainable_development_goals\":[{\"id\":\"https://metadata.un.org/sdg/8\",\"display_name\":\"Decent work and economic growth\",\"score\":0.7}],\"grants\":[],\"referenced_works_count\":78,\"referenced_works\":[\"https://openalex.org/W1964405317\",\"https://openalex.org/W1964897423\",\"https://openalex.org/W1971669205\",\"https://openalex.org/W1973893247\",\"https://openalex.org/W1974975426\",\"https://openalex.org/W1975547507\",\"https://openalex.org/W1975989400\",\"https://openalex.org/W1978429956\",\"https://openalex.org/W1988930314\",\"https://openalex.org/W1988942456\",\"https://openalex.org/W1989930562\",\"https://openalex.org/W1993159809\",\"https://openalex.org/W1993308331\",\"https://openalex.org/W1993415685\",\"https://openalex.org/W1994069242\",\"https://openalex.org/W1995243998\",\"https://openalex.org/W1999945441\",\"https://openalex.org/W2002646132\",\"https://openalex.org/W2005513160\",\"https://openalex.org/W2007545850\",\"https://openalex.org/W2012218966\",\"https://openalex.org/W2013107161\",\"https://openalex.org/W2014686230\",\"https://openalex.org/W2015441835\",\"https://openalex.org/W2023124293\",\"https://openalex.org/W2023772254\",\"https://openalex.org/W2027369625\",\"https://openalex.org/W2033673182\",\"https://openalex.org/W2035920101\",\"https://openalex.org/W2041946752\",\"https://openalex.org/W2043765516\",\"https://openalex.org/W2045163169\",\"https://openalex.org/W2045385178\",\"https://openalex.org/W2045744884\",\"https://openalex.org/W2048229474\",\"https://openalex.org/W2049297495\",\"https://openalex.org/W2053046778\",\"https://openalex.org/W2053617883\",\"https://openalex.org/W2055269809\",\"https://openalex.org/W2057925076\",\"https://openalex.org/W2058953064\",\"https://openalex.org/W2062687423\",\"https://openalex.org/W2063125613\",\"https://openalex.org/W2065612900\",\"https://openalex.org/W2066088184\",\"https://openalex.org/W2067835286\",\"https://openalex.org/W2068473107\",\"https://openalex.org/W2072365199\",\"https://openalex.org/W2074960359\",\"https://openalex.org/W2075742573\",\"https://openalex.org/W2078169121\",\"https://openalex.org/W2079053008\",\"https://openalex.org/W2081124617\",\"https://openalex.org/W2083307720\",\"https://openalex.org/W2087991264\",\"https://openalex.org/W2088646424\",\"https://openalex.org/W2120677542\",\"https://openalex.org/W2131229778\",\"https://openalex.org/W2147330019\",\"https://openalex.org/W2151844206\",\"https://openalex.org/W2156616450\",\"https://openalex.org/W2161901642\",\"https://openalex.org/W2165828708\",\"https://openalex.org/W2172873870\",\"https://openalex.org/W2313173377\",\"https://openalex.org/W2315360633\",\"https://openalex.org/W2321372096\",\"https://openalex.org/W2412876785\",\"https://openalex.org/W3122684324\",\"https://openalex.org/W3124187280\",\"https://openalex.org/W4229716956\",\"https://openalex.org/W4231282061\",\"https://openalex.org/W4234863607\",\"https://openalex.org/W4242490622\",\"https://openalex.org/W4245280887\",\"https://openalex.org/W4246756863\",\"https://openalex.org/W4253633548\",\"https://openalex.org/W4290377501\"],\"related_works\":[\"https://openalex.org/W4388803188\",\"https://openalex.org/W4234975527\",\"https://openalex.org/W2108936692\",\"https://openalex.org/W4317927411\",\"https://openalex.org/W2071684985\",\"https://openalex.org/W2285351234\",\"https://openalex.org/W1867350216\",\"https://openalex.org/W4247867945\",\"https://openalex.org/W4298004773\",\"https://openalex.org/W4385380367\"],\"ngrams_url\":\"https://api.openalex.org/works/W2105705711/ngrams\",\"abstract_inverted_index\":{\"We\":[0,83],\"review\":[1],\"74\":[2],\"experiments\":[3],\"with\":[4,71],\"no,\":[5],\"low,\":[6],\"or\":[7],\"high\":[8],\"performance-based\":[9],\"financial\":[10],\"incentives.\":[11,98],\"The\":[12],\"modal\":[13],\"result\":[14],\"is\":[15,23,81],\"no\":[16,87],\"effect\":[17],\"on\":[18,78],\"mean\":[19],\"performance\":[20,33],\"(though\":[21],\"variance\":[22],\"usually\":[24],\"reduced\":[25],\"by\":[26,96],\"higher\":[27],\"payment).\":[28],\"Higher\":[29],\"incentive\":[30],\"does\":[31],\"improve\":[32],\"often,\":[34],\"typically\":[35],\"judgment\":[36],\"tasks\":[37],\"that\":[38,86],\"are\":[39,55],\"responsive\":[40],\"to\":[41,57],\"better\":[42],\"effort.\":[43],\"Incentives\":[44],\"also\":[45,84],\"reduce\":[46],\"\\u201cpresentation\\u201d\":[47],\"effects\":[48,54,58],\"(e.g.,\":[49],\"generosity\":[50],\"and\":[51,65,69],\"risk-seeking).\":[52],\"Incentive\":[53],\"comparable\":[56],\"of\":[59],\"other\":[60],\"variables,\":[61,73],\"particularly\":[62],\"\\u201ccognitive\":[63],\"capital\\u201d\":[64],\"task\":[66],\"\\u201cproduction\\u201d\":[67],\"demands,\":[68],\"interact\":[70],\"those\":[72],\"so\":[74],\"a\":[75],\"narrow-minded\":[76],\"focus\":[77],\"incentives\":[79],\"alone\":[80],\"misguided.\":[82],\"note\":[85],\"replicated\":[88],\"study\":[89],\"has\":[90],\"made\":[91],\"rationality\":[92],\"violations\":[93],\"disappear\":[94],\"purely\":[95],\"raising\":[97]},\"cited_by_api_url\":\"https://api.openalex.org/works?filter=cites:W2105705711\",\"counts_by_year\":[{\"year\":2023,\"cited_by_count\":3},{\"year\":2022,\"cited_by_count\":5},{\"year\":2021,\"cited_by_count\":9},{\"year\":2020,\"cited_by_count\":18},{\"year\":2019,\"cited_by_count\":21},{\"year\":2018,\"cited_by_count\":21},{\"year\":2017,\"cited_by_count\":21},{\"year\":2016,\"cited_by_count\":26},{\"year\":2015,\"cited_by_count\":36},{\"year\":2014,\"cited_by_count\":48},{\"year\":2013,\"cited_by_count\":41},{\"year\":2012,\"cited_by_count\":62}],\"updated_date\":\"2024-02-23T23:28:16.339197\",\"created_date\":\"2016-06-24\"}\r\n",
		"items": [
			{
				"itemType": "bookSection",
				"title": "The Effects of Financial Incentives in Experiments: A Review and Capital-Labor-Production Framework",
				"creators": [
					{
						"firstName": "Colin F.",
						"lastName": "Camerer",
						"creatorType": "author"
					},
					{
						"firstName": "Robin M.",
						"lastName": "Hogarth",
						"creatorType": "author"
					}
				],
				"date": "1999-01-01",
				"bookTitle": "Springer eBooks",
				"pages": "7-48",
				"publisher": "Springer Nature",
				"attachments": [
					{
						"title": "Accepted Version PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "capital-labor-production"
					},
					{
						"tag": "experiments"
					},
					{
						"tag": "financial incentives"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "{\"id\":\"https://openalex.org/W4234549826\",\"doi\":\"https://doi.org/10.1215/9780822377009\",\"title\":\"Clinical Labor\",\"display_name\":\"Clinical Labor\",\"publication_year\":2014,\"publication_date\":\"2014-01-01\",\"ids\":{\"openalex\":\"https://openalex.org/W4234549826\",\"doi\":\"https://doi.org/10.1215/9780822377009\"},\"language\":null,\"primary_location\":{\"is_oa\":false,\"landing_page_url\":\"https://doi.org/10.1215/9780822377009\",\"pdf_url\":null,\"source\":{\"id\":\"https://openalex.org/S4306463122\",\"display_name\":\"Duke University Press eBooks\",\"issn_l\":null,\"issn\":null,\"is_oa\":false,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/P4310315698\",\"host_organization_name\":\"Duke University Press\",\"host_organization_lineage\":[\"https://openalex.org/P4310315572\",\"https://openalex.org/P4310315698\"],\"host_organization_lineage_names\":[\"Duke University\",\"Duke University Press\"],\"type\":\"ebook platform\"},\"license\":null,\"version\":null,\"is_accepted\":false,\"is_published\":false},\"type\":\"book\",\"type_crossref\":\"book\",\"indexed_in\":[\"crossref\"],\"open_access\":{\"is_oa\":false,\"oa_status\":\"closed\",\"oa_url\":null,\"any_repository_has_fulltext\":false},\"authorships\":[{\"author_position\":\"first\",\"author\":{\"id\":\"https://openalex.org/A5081203523\",\"display_name\":\"Melinda Cooper\",\"orcid\":\"https://orcid.org/0000-0001-8341-8282\"},\"institutions\":[],\"countries\":[],\"is_corresponding\":false,\"raw_author_name\":\"Melinda Cooper\",\"raw_affiliation_string\":\"\",\"raw_affiliation_strings\":[]},{\"author_position\":\"last\",\"author\":{\"id\":\"https://openalex.org/A5053202470\",\"display_name\":\"Catherine Waldby\",\"orcid\":\"https://orcid.org/0000-0002-5989-9917\"},\"institutions\":[],\"countries\":[],\"is_corresponding\":false,\"raw_author_name\":\"Catherine Waldby\",\"raw_affiliation_string\":\"\",\"raw_affiliation_strings\":[]}],\"countries_distinct_count\":0,\"institutions_distinct_count\":0,\"corresponding_author_ids\":[],\"corresponding_institution_ids\":[],\"apc_list\":null,\"apc_paid\":null,\"has_fulltext\":false,\"cited_by_count\":406,\"cited_by_percentile_year\":{\"min\":99,\"max\":100},\"biblio\":{\"volume\":null,\"issue\":null,\"first_page\":null,\"last_page\":null},\"is_retracted\":false,\"is_paratext\":false,\"primary_topic\":{\"id\":\"https://openalex.org/T12664\",\"display_name\":\"Development and Evaluation of Clinical Guidelines\",\"score\":0.3247,\"subfield\":{\"id\":\"https://openalex.org/subfields/2739\",\"display_name\":\"Public Health, Environmental and Occupational Health\"},\"field\":{\"id\":\"https://openalex.org/fields/27\",\"display_name\":\"Medicine\"},\"domain\":{\"id\":\"https://openalex.org/domains/4\",\"display_name\":\"Health Sciences\"}},\"topics\":[{\"id\":\"https://openalex.org/T12664\",\"display_name\":\"Development and Evaluation of Clinical Guidelines\",\"score\":0.3247,\"subfield\":{\"id\":\"https://openalex.org/subfields/2739\",\"display_name\":\"Public Health, Environmental and Occupational Health\"},\"field\":{\"id\":\"https://openalex.org/fields/27\",\"display_name\":\"Medicine\"},\"domain\":{\"id\":\"https://openalex.org/domains/4\",\"display_name\":\"Health Sciences\"}}],\"keywords\":[{\"keyword\":\"labor\",\"score\":0.7357},{\"keyword\":\"clinical\",\"score\":0.6233}],\"concepts\":[{\"id\":\"https://openalex.org/C17744445\",\"wikidata\":\"https://www.wikidata.org/wiki/Q36442\",\"display_name\":\"Political science\",\"level\":0,\"score\":0.3224085}],\"mesh\":[],\"locations_count\":1,\"locations\":[{\"is_oa\":false,\"landing_page_url\":\"https://doi.org/10.1215/9780822377009\",\"pdf_url\":null,\"source\":{\"id\":\"https://openalex.org/S4306463122\",\"display_name\":\"Duke University Press eBooks\",\"issn_l\":null,\"issn\":null,\"is_oa\":false,\"is_in_doaj\":false,\"host_organization\":\"https://openalex.org/P4310315698\",\"host_organization_name\":\"Duke University Press\",\"host_organization_lineage\":[\"https://openalex.org/P4310315572\",\"https://openalex.org/P4310315698\"],\"host_organization_lineage_names\":[\"Duke University\",\"Duke University Press\"],\"type\":\"ebook platform\"},\"license\":null,\"version\":null,\"is_accepted\":false,\"is_published\":false}],\"best_oa_location\":null,\"sustainable_development_goals\":[{\"id\":\"https://metadata.un.org/sdg/8\",\"score\":0.45,\"display_name\":\"Decent work and economic growth\"}],\"grants\":[],\"referenced_works_count\":0,\"referenced_works\":[],\"related_works\":[\"https://openalex.org/W2748952813\",\"https://openalex.org/W2899084033\",\"https://openalex.org/W2955725829\",\"https://openalex.org/W2949263084\",\"https://openalex.org/W2743539335\",\"https://openalex.org/W2890326160\",\"https://openalex.org/W594353338\",\"https://openalex.org/W2724734218\",\"https://openalex.org/W4382466601\",\"https://openalex.org/W2922049016\"],\"ngrams_url\":\"https://api.openalex.org/works/W4234549826/ngrams\",\"abstract_inverted_index\":null,\"cited_by_api_url\":\"https://api.openalex.org/works?filter=cites:W4234549826\",\"counts_by_year\":[{\"year\":2023,\"cited_by_count\":11},{\"year\":2022,\"cited_by_count\":16},{\"year\":2021,\"cited_by_count\":45},{\"year\":2020,\"cited_by_count\":29},{\"year\":2019,\"cited_by_count\":61},{\"year\":2018,\"cited_by_count\":140},{\"year\":2017,\"cited_by_count\":41},{\"year\":2016,\"cited_by_count\":33},{\"year\":2015,\"cited_by_count\":23},{\"year\":2014,\"cited_by_count\":6},{\"year\":2012,\"cited_by_count\":1}],\"updated_date\":\"2024-02-22T22:31:09.009786\",\"created_date\":\"2022-05-12\"}\r\n",
		"items": [
			{
				"itemType": "book",
				"title": "Clinical Labor",
				"creators": [
					{
						"firstName": "Melinda",
						"lastName": "Cooper",
						"creatorType": "author"
					},
					{
						"firstName": "Catherine",
						"lastName": "Waldby",
						"creatorType": "author"
					}
				],
				"date": "2014-01-01",
				"publisher": "Duke University Press",
				"attachments": [],
				"tags": [
					{
						"tag": "clinical"
					},
					{
						"tag": "labor"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
