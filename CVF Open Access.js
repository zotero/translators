{
	"translatorID": "7499e44b-9ce8-43e9-b99f-cfc9ea8602c9",
	"label": "CVF Open Access",
	"creator": "Fabian Schilling",
	"target": "^https?://openaccess\\.thecvf\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-29 11:45:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Fabian Schilling

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
	if (/\/html\/.+_paper\.html/.test(url)) {
		return 'conferencePaper';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('dt.ptitle > a[href*="/html/"]');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let bibtex = text(doc, '.bibref');
	let bibField = name => bibtex.match(new RegExp(`\\b${name}\\s*=\\s*\\{([^}]*)\\}`))?.[1];

	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		// The BibTeX booktitle, unlike citation_conference_title, includes
		// suffixes like "Workshops" or "Findings"
		let booktitle = bibField('booktitle') || '';
		item.proceedingsTitle = booktitle.replace(/\s*\([A-Z]+\)/, '')
			|| attr(doc, 'meta[name="citation_conference_title"]', 'content');
		item.conferenceName = booktitle.replace(/^Proceedings of the\s+/i, '');
		let month = bibField('month');
		if (month && item.date && !item.date.includes('-')) {
			item.date = ZU.strToISO(`${month} ${item.date}`);
		}
		// 2019 workshop papers have placeholder page numbers
		if (/^0(-0)?$/.test(item.pages || '')) delete item.pages;
		item.abstractNote = text(doc, '#abstract') || item.abstractNote;
		let arxiv = attr(doc, '#content a[href*="arxiv.org/abs/"]', 'href').match(/abs\/([^/?#]+?)(?:v\d+)?(?:[/?#]|$)/)?.[1];
		if (arxiv) item.extra = `arXiv: ${arxiv}`;
		item.url = url;
		for (let attachment of item.attachments) {
			if (attachment.url) attachment.url = attachment.url.replace(/^http:/, 'https:');
		}
		item.complete();
	});
	await translator.translate();
}

// Test cases:
// 1. ICCV 2019: old "content_*" URL layout, BibTeX lines separated by <br>
// 2. CVPR 2023: new "content/*" URL layout, arXiv ID in Extra
// 3. CVPR 2023 listing page: multiple
// 4. ICCV 2025 Workshops: "Workshops" suffix missing from citation_conference_title
// 5. WACV 2025: conference without "IEEE/CVF" in its name
// 6. ACCV 2024: conference from the "other conferences" menu
// 7. ECCV 2018: "(ECCV)" in citation_conference_title, versioned arXiv link
// 8. CVPR 2026 Findings: "Findings" suffix missing from citation_conference_title
// 9. CVPR 2019 Workshops: workshop directory after "/html/", placeholder pages "0-0"

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openaccess.thecvf.com/content_ICCV_2019/html/Li_DeepGCNs_Can_GCNs_Go_As_Deep_As_CNNs_ICCV_2019_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "DeepGCNs: Can GCNs Go As Deep As CNNs?",
				"creators": [
					{
						"firstName": "Guohao",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "Matthias",
						"lastName": "Muller",
						"creatorType": "author"
					},
					{
						"firstName": "Ali",
						"lastName": "Thabet",
						"creatorType": "author"
					},
					{
						"firstName": "Bernard",
						"lastName": "Ghanem",
						"creatorType": "author"
					}
				],
				"date": "2019-10",
				"abstractNote": "Convolutional Neural Networks (CNNs) achieve impressive performance in a wide variety of fields. Their success benefited from a massive boost when very deep CNN models were able to be reliably trained. Despite their merits, CNNs fail to properly address problems with non-Euclidean data. To overcome this challenge, Graph Convolutional Networks (GCNs) build graphs to represent non-Euclidean data, borrow concepts from CNNs, and apply them in training. GCNs show promising results, but they are usually limited to very shallow models due to the vanishing gradient problem. As a result, most state-of-the-art GCN models are no deeper than 3 or 4 layers. In this work, we present new ways to successfully train very deep GCNs. We do this by borrowing concepts from CNNs, specifically residual/dense connections and dilated convolutions, and adapting them to GCN architectures. Extensive experiments show the positive effect of these deep GCN frameworks. Finally, we use these new concepts to build a very deep 56-layer GCN, and show how it significantly boosts performance (+3.7% mIoU over state-of-the-art) in the task of point cloud semantic segmentation. We believe that the community can greatly benefit from this work, as it opens up many opportunities for advancing GCN-based research.",
				"conferenceName": "IEEE/CVF International Conference on Computer Vision (ICCV)",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "9267-9276",
				"proceedingsTitle": "Proceedings of the IEEE/CVF International Conference on Computer Vision",
				"shortTitle": "DeepGCNs",
				"url": "https://openaccess.thecvf.com/content_ICCV_2019/html/Li_DeepGCNs_Can_GCNs_Go_As_Deep_As_CNNs_ICCV_2019_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openaccess.thecvf.com/content/CVPR2023/html/Ci_GFPose_Learning_3D_Human_Pose_Prior_With_Gradient_Fields_CVPR_2023_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "GFPose: Learning 3D Human Pose Prior With Gradient Fields",
				"creators": [
					{
						"firstName": "Hai",
						"lastName": "Ci",
						"creatorType": "author"
					},
					{
						"firstName": "Mingdong",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Wentao",
						"lastName": "Zhu",
						"creatorType": "author"
					},
					{
						"firstName": "Xiaoxuan",
						"lastName": "Ma",
						"creatorType": "author"
					},
					{
						"firstName": "Hao",
						"lastName": "Dong",
						"creatorType": "author"
					},
					{
						"firstName": "Fangwei",
						"lastName": "Zhong",
						"creatorType": "author"
					},
					{
						"firstName": "Yizhou",
						"lastName": "Wang",
						"creatorType": "author"
					}
				],
				"date": "2023-06",
				"abstractNote": "Learning 3D human pose prior is essential to human-centered AI. Here, we present GFPose, a versatile framework to model plausible 3D human poses for various applications. At the core of GFPose is a time-dependent score network, which estimates the gradient on each body joint and progressively denoises the perturbed 3D human pose to match a given task specification. During the denoising process, GFPose implicitly incorporates pose priors in gradients and unifies various discriminative and generative tasks in an elegant framework. Despite the simplicity, GFPose demonstrates great potential in several downstream tasks. Our experiments empirically show that 1) as a multi-hypothesis pose estimator, GFPose outperforms existing SOTAs by 20% on Human3.6M dataset. 2) as a single-hypothesis pose estimator, GFPose achieves comparable results to deterministic SOTAs, even with a vanilla backbone. 3) GFPose is able to produce diverse and realistic samples in pose denoising, completion and generation tasks.",
				"conferenceName": "IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)",
				"extra": "arXiv: 2212.08641",
				"language": "en",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "4800-4810",
				"proceedingsTitle": "Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition",
				"shortTitle": "GFPose",
				"url": "https://openaccess.thecvf.com/content/CVPR2023/html/Ci_GFPose_Learning_3D_Human_Pose_Prior_With_Gradient_Fields_CVPR_2023_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openaccess.thecvf.com/CVPR2023?day=all",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://openaccess.thecvf.com/content/ICCV2025W/E2E3D/html/Xia_CSG-Fusion_Consistent_Sparse-View_Gaussian_Splatting_via_Matching-based_Fusion_ICCVW_2025_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "CSG-Fusion: Consistent Sparse-View Gaussian Splatting via Matching-based Fusion",
				"creators": [
					{
						"firstName": "Yan",
						"lastName": "Xia",
						"creatorType": "author"
					},
					{
						"firstName": "Wenbo",
						"lastName": "Ji",
						"creatorType": "author"
					},
					{
						"firstName": "Weirong",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Cremers",
						"creatorType": "author"
					}
				],
				"date": "2025-10",
				"abstractNote": "Recent developments in Gaussian splatting have enabled high-fidelity 3D reconstruction from multi-view images, but pixel-aligned methods such as MASt3R often produce redundant primitives and inconsistent geometry under few-view settings. We propose CSG-Fusion, a feed-forward framework that mindfully integrates pixel-aligned pointmap to reduce redundant primitives and produce compact and consistent 3D structures. Our approach leverages a matching prior with spatial thresholds to prune overlapping Gaussians, forming a coherent base 3D model, and then applies a mask-based feature aggregation module to merge local features and improve photometric consistency with fewer primitives. To enforce cross-view agreement after fusion, we further incorporate context-view supervision to align appearance and geometry across perspectives. Experiments on the large-scale ScanNet++ and object-level DTU benchmarks demonstrate both the efficiency and generalization of our method. Compared to the leading pose-known and pose-free approaches, our method achieves higher rendering quality with substantially fewer Gaussians.",
				"conferenceName": "IEEE/CVF International Conference on Computer Vision (ICCV) Workshops",
				"language": "en",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "2653-2662",
				"proceedingsTitle": "Proceedings of the IEEE/CVF International Conference on Computer Vision Workshops",
				"shortTitle": "CSG-Fusion",
				"url": "https://openaccess.thecvf.com/content/ICCV2025W/E2E3D/html/Xia_CSG-Fusion_Consistent_Sparse-View_Gaussian_Splatting_via_Matching-based_Fusion_ICCVW_2025_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openaccess.thecvf.com/content/WACV2025/html/Cho_Feature_Augmentation_Based_Test-Time_Adaptation_WACV_2025_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Feature Augmentation Based Test-Time Adaptation",
				"creators": [
					{
						"firstName": "Younggeol",
						"lastName": "Cho",
						"creatorType": "author"
					},
					{
						"firstName": "Youngrae",
						"lastName": "Kim",
						"creatorType": "author"
					},
					{
						"firstName": "Junho",
						"lastName": "Yoon",
						"creatorType": "author"
					},
					{
						"firstName": "Seunghoon",
						"lastName": "Hong",
						"creatorType": "author"
					},
					{
						"firstName": "Dongman",
						"lastName": "Lee",
						"creatorType": "author"
					}
				],
				"date": "2025-02",
				"abstractNote": "Test-time adaptation (TTA) allows a model to be adapted to an unseen domain without accessing the source data. Due to the nature of practical environments TTA has a limited amount of data for adaptation. Recent TTA methods further restrict this by filtering input data for reliability making the effective data size even smaller and limiting adaptation potential. To address this issue We propose Feature Augmentation based Test-time Adaptation (FATA) a simple method that fully utilizes the limited amount of input data through feature augmentation. FATA employs Normalization Perturbation to augment features and adapts the model using the FATA loss which makes the outputs of the augmented and original features similar. FATA is model-agnostic and can be seamlessly integrated into existing models without altering the model architecture. We demonstrate the effectiveness of FATA on various models and scenarios on ImageNet-C and Office-Home validating its superiority in diverse real-world conditions. Code is available at https://github.com/RangeWING/FATA.",
				"conferenceName": "Winter Conference on Applications of Computer Vision (WACV)",
				"extra": "arXiv: 2410.14178",
				"language": "en",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "6838-6847",
				"proceedingsTitle": "Proceedings of the Winter Conference on Applications of Computer Vision",
				"url": "https://openaccess.thecvf.com/content/WACV2025/html/Cho_Feature_Augmentation_Based_Test-Time_Adaptation_WACV_2025_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openaccess.thecvf.com/content/ACCV2024/html/Park_Generative_Self-Supervised_Learning_for_Medical_Image_Classification_ACCV_2024_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Generative Self-Supervised Learning for Medical Image Classification",
				"creators": [
					{
						"firstName": "Inhyuk",
						"lastName": "Park",
						"creatorType": "author"
					},
					{
						"firstName": "Sungeun",
						"lastName": "Kim",
						"creatorType": "author"
					},
					{
						"firstName": "Jongbin",
						"lastName": "Ryu",
						"creatorType": "author"
					}
				],
				"date": "2024-12",
				"abstractNote": "This paper introduces the generative self-supervised learning method in medical image recognition. We use the generative models in two main ways: 1) creating diversified training data and 2) learning domain-aligned pretext knowledge for self-supervised learning. In general, gathering real-world medical data can be quite difficult, so we generate synthetic training data using the diffusion model with elaborated prompts. We also propose a domain-aligned generative approach for our self-supervised learning algorithm. Our approach learns the robust visual representation from the masked autoencoder model with adaptive instance normalization. It minimizes the domain gap between our synthetic training data and real-world data when training the masked autoencoder model. In this self-supervised learning process, we rely solely on generative data, allowing our approach to achieve state-of-the-art performance without utilizing any real-world medical data. We demonstrate that our approach surpasses the previous best results by significant margins of CheXpert, COVIDx, and ChestX-ray14 datasets. These results highlight the potential of generated data in medical image recognition, a field that has historically faced data scarcity. We open-source our implementation of the generative self-supervised learning method at: https://github.com/inhyukpark2/gen-ssl.",
				"conferenceName": "Asian Conference on Computer Vision (ACCV)",
				"language": "en",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "976-993",
				"proceedingsTitle": "Proceedings of the Asian Conference on Computer Vision",
				"url": "https://openaccess.thecvf.com/content/ACCV2024/html/Park_Generative_Self-Supervised_Learning_for_Medical_Image_Classification_ACCV_2024_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openaccess.thecvf.com/content_ECCV_2018/html/Samuel_Albanie_Semi-convolutional_Operators_for_ECCV_2018_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Semi-convolutional Operators for Instance Segmentation",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Novotny",
						"creatorType": "author"
					},
					{
						"firstName": "Samuel",
						"lastName": "Albanie",
						"creatorType": "author"
					},
					{
						"firstName": "Diane",
						"lastName": "Larlus",
						"creatorType": "author"
					},
					{
						"firstName": "Andrea",
						"lastName": "Vedaldi",
						"creatorType": "author"
					}
				],
				"date": "2018-09",
				"abstractNote": "Object detection and instance segmentation are dominated by region-based methods such as Mask RCNN. However, there is a growing interest in reducing these problems to pixel labeling tasks, as the latter could be more efficient, could be integrated seamlessly in image-to-image network architectures as used in many other tasks, and could be more accurate for objects that are not well approximated by bounding boxes. In this paper we show theoretically and empirically that constructing dense pixel embeddings that can separate object instances cannot be easily achieved using convolutional operators. At the same time, we show that simple modifications, which we call semi-convolutional, have a much better chance of succeeding at this task. We use the latter to show a connection to Hough voting as well as to a variant of the bilateral kernel that is spatially steered by a convolutional network. We demonstrate that these operators can also be used to improve approaches such as Mask RCNN, demonstrating better segmentation of complex biological shapes and PASCAL VOC categories than achievable by Mask RCNN alone.",
				"conferenceName": "European Conference on Computer Vision (ECCV)",
				"extra": "arXiv: 1807.10712",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "86-102",
				"proceedingsTitle": "Proceedings of the European Conference on Computer Vision",
				"url": "https://openaccess.thecvf.com/content_ECCV_2018/html/Samuel_Albanie_Semi-convolutional_Operators_for_ECCV_2018_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openaccess.thecvf.com/content/CVPR2026F/html/Huang_Revisiting_Real-Time_Detection_Transformer_with_Efficient_Encoder_Design_CVPRF_2026_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Revisiting Real-Time Detection Transformer with Efficient Encoder Design",
				"creators": [
					{
						"firstName": "Jiannan",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Aditya",
						"lastName": "Kane",
						"creatorType": "author"
					},
					{
						"firstName": "Fengzhe",
						"lastName": "Zhou",
						"creatorType": "author"
					},
					{
						"firstName": "Yunchao",
						"lastName": "Wei",
						"creatorType": "author"
					},
					{
						"firstName": "Humphrey",
						"lastName": "Shi",
						"creatorType": "author"
					}
				],
				"date": "2026-06",
				"abstractNote": "Real-time object detection is crucial for real-world applications as it requires high accuracy with low latency. While Detection Transformers (DETR) have demonstrated significant performance improvements, current real-time DETR models are challenging to reproduce from scratch due to excessive pre-training overheads on the backbone, constraining research advancements by hindering the exploration of novel backbone architectures. In this paper, we show that with general good design, it is possible to achieve **high performance** with **low pre-training cost**. After a thorough study of the backbone architecture, we propose EfficientNAT at various scales, which incorporates modern efficient convolution and local attention mechanisms. Moreover, we redesign the hybrid encoder with local attention, significantly enhancing both performance and inference speed. Based on these advancements, we present **Le-DETR** (**L**ow-cost and **E**fficient **DE**tection **TR**ansformer), which achieves a new **SOTA** in real-time detection using only ImageNet1K and COCO2017 training datasets, saving about **80%** images in the pre-training stage compared with previous methods. We demonstrate that with well-designed architectures, real-time DETR models can achieve strong performance without complex and computationally expensive pre-training. Extensive experiments show that **Le-DETR-M/L/X** achieves **52.9/54.3/55.1 mAP** on COCO Val2017 with **4.45/5.01/6.68 ms** latency on an RTX4090. It surpasses **YOLOv12-L/X** by **+0.6/-0.1 mAP** while achieving similar speed and **+20%** speedup. Compared with **DEIM-D-FINE**, Le-DETR-M achieves **+0.2 mAP** with slightly faster inference, and Le-DETR-X surpasses DEIM-D-FINE-L by **+0.4 mAP** with only **0.4 ms** additional latency.",
				"conferenceName": "IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR) Findings",
				"extra": "arXiv: 2602.21010",
				"language": "en",
				"libraryCatalog": "openaccess.thecvf.com",
				"pages": "6859-6868",
				"proceedingsTitle": "Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition Findings",
				"url": "https://openaccess.thecvf.com/content/CVPR2026F/html/Huang_Revisiting_Real-Time_Detection_Transformer_with_Efficient_Encoder_Design_CVPRF_2026_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://openaccess.thecvf.com/content_CVPRW_2019/html/CVPPP/Dobrescu_Understanding_Deep_Neural_Networks_for_Regression_in_Leaf_Counting_CVPRW_2019_paper.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Understanding Deep Neural Networks for Regression in Leaf Counting",
				"creators": [
					{
						"firstName": "Andrei",
						"lastName": "Dobrescu",
						"creatorType": "author"
					},
					{
						"firstName": "Mario",
						"lastName": "Valerio Giuffrida",
						"creatorType": "author"
					},
					{
						"firstName": "Sotirios A.",
						"lastName": "Tsaftaris",
						"creatorType": "author"
					}
				],
				"date": "2019-06",
				"abstractNote": "Deep learning methods are constantly increasing in popularity and success across a wide range of computer vision applications. However, they are perceived as `black boxes', due to the lack of an intuitive interpretation of their decision processes. We present a study aimed at understanding how Deep Neural Networks (DNN) reach a decision in regression tasks. This study focuses on deep learning approaches in the common plant phenotyping task of leaf counting. We employ Layerwise Relevance Propagation (LRP) and Guided Back Propagation to provide insight into which parts of the input contribute to intermediate layers and the output. We observe that the network largely disregards the background and focuses on the plant during training. More importantly, we found that the leaf blade edges are the most relevant part of the plant for the network model in the counting task. Results are evaluated using a VGG-16 deep neural network on the CVPPP 2017 Leaf Counting Challenge dataset.",
				"conferenceName": "IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR) Workshops",
				"libraryCatalog": "openaccess.thecvf.com",
				"proceedingsTitle": "Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops",
				"url": "https://openaccess.thecvf.com/content_CVPRW_2019/html/CVPPP/Dobrescu_Understanding_Deep_Neural_Networks_for_Regression_in_Leaf_Counting_CVPRW_2019_paper.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
