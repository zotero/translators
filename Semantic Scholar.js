{
	"translatorID": "276cb34c-6861-4de7-a11d-c2e46fb8af28",
	"label": "Semantic Scholar",
	"creator": "Guy Aglionby",
	"target": "^https?://(www\\.semanticscholar\\.org/(paper/.+|search\\?|reader/.+)|pdfs\\.semanticscholar\\.org/)",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-18 01:12:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Guy Aglionby
	
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

// See also https://github.com/zotero/translators/blob/master/BibTeX.js
var bibtex2zoteroTypeMap = {
	article: "journalArticle",
	inproceedings: "conferencePaper",
	conference: "conferencePaper",
};

function getItemTypeFromBibtex(doc) {
	const bibtex = ZU.xpathText(doc, '//pre[@class="bibtex-citation"]');
	const bibtexType = bibtex.split('{')[0].replace('@', '');
	return bibtex2zoteroTypeMap[bibtexType] || 'journalArticle';
}

function getSearchResults(doc, checkOnly) {
	let searchResults = doc.querySelectorAll('.result-page .cl-paper-row > a');
	if (checkOnly) {
		return searchResults.length > 0;
	}

	let items = {};
	for (let row of searchResults) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);

		if (href && title) {
			items[href] = title;
		}
	}

	return items;
}

function detectWeb(doc, url) {
	if (doc.querySelector('#app')) {
		Z.monitorDOMChanges(
			doc.querySelector('#app'),
			{ childList: true, subtree: true }
		);
	}

	if (url.includes('semanticscholar.org/search?')) {
		const hasSearchResults = getSearchResults(doc, true);
		if (hasSearchResults) {
			return 'multiple';
		}
	}

	return getItemTypeFromBibtex(doc);
}

function doWeb(doc, url) {
	const docType = detectWeb(doc, url)
	if (docType == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (items) {
				ZU.processDocuments(Object.keys(items), scrape);
			}
		});
		return;
	}

	scrape(doc, url);
}

function scrape(doc, url) {
	const itemType = getItemTypeFromBibtex(doc);
	const item = new Zotero.Item(itemType);

	const schemaTag = doc.querySelector('script.schema-data');
	const schemaObject = JSON.parse(schemaTag.innerHTML);
	const article = schemaObject['@graph'][1][0];
	
	if (article.about) {
		item.abstractNote = article.abstract.substring(article.about.length + 1);
		item.notes.push('[TLDR] ' + article.about);
	} else {
		item.abstractNote = article.abstract;
	}
	
	item.attachments.push({
		url: url,
		title: url.includes('semanticscholar.org/reader') ? 'Semantic Reader Link' : 'Semantic Scholar Link',
		mimeType: 'text/html',
		snapshot: false
	});

	if (article.mainEntity && (article.mainEntity.includes('pdfs.semanticscholar.org') || article.mainEntity.includes('.pdf'))) {
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: article.mainEntity
		});
	}

	if (article.sameAs) {
		item.DOI = ZU.cleanDOI(decodeURIComponent(article.sameAs));
		parseWithDOITranslator(item);
		return;
	}

	item.title = article.name;
	item.date = article.datePublished;
	item.url = url;
	if (url.includes('semanticscholar.org/reader')) {
		const catalogPageLink = doc.querySelector('[data-heap-id="reader_to_pdp_link"]');
		item.url = catalogPageLink ? catalogPageLink.href : null;
	}
	
	if (itemType == 'conferencePaper' && article.publisher) {
		item.conferenceName = article.publisher.name;
	}

	if (itemType == 'journalArticle' && article.publication) {
		item.publicationTitle = article.publication;
	}

	if (article.author) {
		article.author.forEach((author) => {
			item.creators.push(ZU.cleanAuthor(author.name, 'author'));
		});
	}

	item.complete();
}

function parseWithDOITranslator(item) {
	var translate = Zotero.loadTranslator('search');
	translate.setTranslator('b28d0d42-8549-4c6d-83fc-8382874a5cb9'); // DOI Content Negotiation
	translate.setSearch({ DOI: item.DOI });
	translate.setHandler('itemDone', (obj, doiItem) => {
		let originalItemType = item.itemType;
		let oldAttachments = item.attachments;
		let oldNotes = item.notes;
		Object.assign(item, doiItem);
		item.libraryCatalog = 'Semantic Scholar';
		item.itemType = originalItemType;
		if (!item.attachments.length) {
			item.attachments = oldAttachments;
		}
		if (!item.notes.length) {
			item.notes = oldNotes;
		}
	});
	translate.setHandler('done', () =>  item.complete());
	translate.setHandler('error', (_, error) => Zotero.debug(error));
	translate.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/Text-Analysis-of-Cases-Description-in-Urban-Field-Liu-Song/dd1e49494be449af48cfb223e22766f805d1f216",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Text Analysis of Cases Description in Urban Management Field Based on Knowledge Atlas",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Xutong",
						"lastName": "Liu"
					},
					{
						"creatorType": "author",
						"firstName": "Hui",
						"lastName": "Song"
					},
					{
						"creatorType": "author",
						"firstName": "Longqi",
						"lastName": "Dai"
					},
					{
						"creatorType": "author",
						"firstName": "Bo",
						"lastName": "Xu"
					}
				],
				"date": "2018",
				"DOI": "10.1145/3207677.3278062",
				"ISBN": "9781450365123",
				"abstractNote": "With1 the development of information technology, Chinese urban Management has entered the information age. There will be a large number of cases with unstructured text which are reported by city officers and citizens entering into the digital platform, processing these text only by traditional method such as searching by key words will not only consume a lot of energy and time, but also be difficult to generalize the core issues of urban management because of the lost of the relationships between entities and events. In this paper, we propose a domain-oriented method to analyze the text using the domain-oriented knowledge graph and BLSTM-CRF model. we define a new graph structure to grasp the syntactical pattern and core concepts of this field by the method of hierarchical LDA (H-LDA). Combing the BLSTM-CRF language processing model with the domain knowledge graph, key entities and the corresponding description phrase are extracted from the text and recomposed as a short description. We make a further statistical analysis on the basic of the descriptions and semantic labels to find problems that affecting urban development and put forward pertinent suggestions.",
				"conferenceName": "the 2nd International Conference",
				"language": "en",
				"libraryCatalog": "Semantic Scholar",
				"pages": "1-7",
				"place": "Hohhot, China",
				"proceedingsTitle": "Proceedings of the 2nd International Conference on Computer Science and Application Engineering - CSAE '18",
				"publisher": "ACM Press",
				"url": "http://dl.acm.org/citation.cfm?doid=3207677.3278062",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [],
				"notes": [
					"[TLDR] A new graph structure is defined to grasp the syntactical pattern and core concepts of this field by the method of hierarchical LDA (H-LDA), and key entities and the corresponding description phrase are extracted from the text and recomposed as a short description."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/Attention-Transformer-Model-for-Translation-of-Dhanani-Rafi/6043e3b975a9e775203eec9ef0eab19d6dd0d378",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Attention Transformer Model for Translation of Similar Languages",
				"creators": [
					{
						"firstName": "Farhan",
						"lastName": "Dhanani",
						"creatorType": "author"
					},
					{
						"firstName": "Muhammad",
						"lastName": "Rafi",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"abstractNote": "This paper illustrates our approach to the shared task on similar language translation in the fifth conference on machine translation (WMT-20). Our motivation comes from the latest state of the art neural machine translation in which Transformers and Recurrent Attention models are effectively used. A typical sequence-sequence architecture consists of an encoder and a decoder Recurrent Neural Network (RNN). The encoder recursively processes a source sequence and reduces it into a fixed-length vector (context), and the decoder generates a target sequence, token by token, conditioned on the same context. In contrast, the advantage of transformers is to reduce the training time by offering a higher degree of parallelism at the cost of freedom for sequential order. With the introduction of Recurrent Attention, it allows the decoder to focus effectively on order of the source sequence at different decoding steps. In our approach, we have combined the recurrence based layered encoder-decoder model with the Transformer model. Our Attention Transformer model enjoys the benefits of both Recurrent Attention and Transformer to quickly learn the most probable sequence for decoding in the target language. The architecture is especially suited for similar languages (languages coming from the same family). We have submitted our system for both Indo-Aryan Language forward (Hindi to Marathi) and reverse (Marathi to Hindi) pair. Our system trains on the parallel corpus of the training dataset provided by the organizers and achieved an average BLEU point of 3.68 with 97.64 TER score for the Hindi-Marathi, along with 9.02 BLEU point and 88.6 TER score for Marathi-Hindi testing set.",
				"conferenceName": "WMT",
				"libraryCatalog": "Semantic Scholar",
				"url": "https://www.semanticscholar.org/paper/Attention-Transformer-Model-for-Translation-of-Dhanani-Rafi/6043e3b975a9e775203eec9ef0eab19d6dd0d378",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					"[TLDR] This paper illustrates the approach to the shared task on similar language translation in the fifth conference on machine translation (WMT-20) with a recurrence based layered encoder-decoder model with the Transformer model that enjoys the benefits of both Recurrent Attention and Transformer."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/TRANS-BLSTM%3A-Transformer-with-Bidirectional-LSTM-Huang-Xu/c79a8fd667f59e6f1ca9d54afc34f792e9079c7e",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "TRANS-BLSTM: Transformer with Bidirectional LSTM for Language Understanding",
				"creators": [
					{
						"firstName": "Zhiheng",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Peng",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Davis",
						"lastName": "Liang",
						"creatorType": "author"
					},
					{
						"firstName": "Ajay K.",
						"lastName": "Mishra",
						"creatorType": "author"
					},
					{
						"firstName": "Bing",
						"lastName": "Xiang",
						"creatorType": "author"
					}
				],
				"date": "16 March 2020",
				"abstractNote": "Bidirectional Encoder Representations from Transformers (BERT) has recently achieved state-of-the-art performance on a broad range of NLP tasks including sentence classification, machine translation, and question answering. The BERT model architecture is derived primarily from the transformer. Prior to the transformer era, bidirectional Long Short-Term Memory (BLSTM) has been the dominant modeling architecture for neural machine translation and question answering. In this paper, we investigate how these two modeling techniques can be combined to create a more powerful model architecture. We propose a new architecture denoted as Transformer with BLSTM (TRANS-BLSTM) which has a BLSTM layer integrated to each transformer block, leading to a joint modeling framework for transformer and BLSTM. We show that TRANS-BLSTM models consistently lead to improvements in accuracy compared to BERT baselines in GLUE and SQuAD 1.1 experiments. Our TRANS-BLSTM model obtains an F1 score of 94.01% on the SQuAD 1.1 development dataset, which is comparable to the state-of-the-art result.",
				"libraryCatalog": "Semantic Scholar",
				"publicationTitle": "ArXiv",
				"shortTitle": "TRANS-BLSTM",
				"url": "https://www.semanticscholar.org/paper/TRANS-BLSTM%3A-Transformer-with-Bidirectional-LSTM-Huang-Xu/c79a8fd667f59e6f1ca9d54afc34f792e9079c7e",
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					"[TLDR] It is shown that TRANS-BLSTM models consistently lead to improvements in accuracy compared to BERT baselines in GLUE and SQuAD 1.1 experiments, and is proposed as a joint modeling framework for transformer and BLSTM."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/reader/204e3073870fae3d05bcbc2f6a8e263d9b72e776",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Attention is All you Need",
				"creators": [
					{
						"firstName": "Ashish",
						"lastName": "Vaswani",
						"creatorType": "author"
					},
					{
						"firstName": "Noam M.",
						"lastName": "Shazeer",
						"creatorType": "author"
					},
					{
						"firstName": "Niki",
						"lastName": "Parmar",
						"creatorType": "author"
					},
					{
						"firstName": "Jakob",
						"lastName": "Uszkoreit",
						"creatorType": "author"
					},
					{
						"firstName": "Llion",
						"lastName": "Jones",
						"creatorType": "author"
					},
					{
						"firstName": "Aidan N.",
						"lastName": "Gomez",
						"creatorType": "author"
					},
					{
						"firstName": "Lukasz",
						"lastName": "Kaiser",
						"creatorType": "author"
					},
					{
						"firstName": "Illia",
						"lastName": "Polosukhin",
						"creatorType": "author"
					}
				],
				"date": "12 June 2017",
				"abstractNote": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data.",
				"libraryCatalog": "Semantic Scholar",
				"publicationTitle": "ArXiv",
				"url": "https://www.semanticscholar.org/paper/204e3073870fae3d05bcbc2f6a8e263d9b72e776",
				"attachments": [
					{
						"title": "Semantic Reader Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					"[TLDR] A new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely is proposed, which generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/reader/fa72afa9b2cbc8f0d7b05d52548906610ffbb9c5",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Neural Machine Translation by Jointly Learning to Align and Translate",
				"creators": [
					{
						"firstName": "Dzmitry",
						"lastName": "Bahdanau",
						"creatorType": "author"
					},
					{
						"firstName": "Kyunghyun",
						"lastName": "Cho",
						"creatorType": "author"
					},
					{
						"firstName": "Yoshua",
						"lastName": "Bengio",
						"creatorType": "author"
					}
				],
				"date": "1 September 2014",
				"abstractNote": "Neural machine translation is a recently proposed approach to machine translation. Unlike the traditional statistical machine translation, the neural machine translation aims at building a single neural network that can be jointly tuned to maximize the translation performance. The models proposed recently for neural machine translation often belong to a family of encoder-decoders and consists of an encoder that encodes a source sentence into a fixed-length vector from which a decoder generates a translation. In this paper, we conjecture that the use of a fixed-length vector is a bottleneck in improving the performance of this basic encoder-decoder architecture, and propose to extend this by allowing a model to automatically (soft-)search for parts of a source sentence that are relevant to predicting a target word, without having to form these parts as a hard segment explicitly. With this new approach, we achieve a translation performance comparable to the existing state-of-the-art phrase-based system on the task of English-to-French translation. Furthermore, qualitative analysis reveals that the (soft-)alignments found by the model agree well with our intuition.",
				"libraryCatalog": "Semantic Scholar",
				"publicationTitle": "CoRR",
				"url": "https://www.semanticscholar.org/paper/fa72afa9b2cbc8f0d7b05d52548906610ffbb9c5",
				"attachments": [
					{
						"title": "Semantic Reader Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					"[TLDR] It is conjecture that the use of a fixed-length vector is a bottleneck in improving the performance of this basic encoder-decoder architecture, and it is proposed to extend this by allowing a model to automatically (soft-)search for parts of a source sentence that are relevant to predicting a target word, without having to form these parts as a hard segment explicitly."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/reader/2fd10e095b146f99da8cdc6ff58720e2e8fca36d",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "When Attention Meets Fast Recurrence: Training Language Models with Reduced Compute",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Tao",
						"lastName": "Lei"
					}
				],
				"date": "2021",
				"DOI": "10.18653/v1/2021.emnlp-main.602",
				"abstractNote": "Large language models have become increasingly difficult to train because of the growing computation time and cost. In this work, we present SRU++, a highly-efficient architecture that combines fast recurrence and attention for sequence modeling. SRU++ exhibits strong modeling capacity and training efficiency. On standard language modeling tasks such as Enwik8, Wiki-103 and Billion Word datasets, our model obtains better bits-per-character and perplexity while using 3x-10x less training cost compared to top-performing Transformer models. For instance, our model achieves a state-of-the-art result on the Enwik8 dataset using 1.6 days of training on an 8-GPU machine. We further demonstrate that SRU++ requires minimal attention for near state-of-the-art performance. Our results suggest jointly leveraging fast recurrence with little attention as a promising direction for accelerating model training and inference.",
				"conferenceName": "Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing",
				"language": "en",
				"libraryCatalog": "Semantic Scholar",
				"pages": "7633-7648",
				"place": "Online and Punta Cana, Dominican Republic",
				"proceedingsTitle": "Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing",
				"publisher": "Association for Computational Linguistics",
				"shortTitle": "When Attention Meets Fast Recurrence",
				"url": "https://aclanthology.org/2021.emnlp-main.602",
				"attachments": [
					{
						"title": "Semantic Reader Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					"[TLDR] This work presents SRU++, a highly-efficient architecture that combines fast recurrence and attention for sequence modeling that exhibits strong modeling capacity and training efficiency and suggests jointly leveragingFast recurrence with little attention as a promising direction for accelerating model training and inference."
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
