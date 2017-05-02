{
	"translatorID": "277d9192-7fdd-493c-8d55-4fcb63ee8a98",
	"label": "OpenReview",
	"creator": "Hatim TACHI, Ahmed ZERHOUNI,Jordan CHARLIER, Nader JEMOUI ",
	"target": "https://openreview.net/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2017-05-02 15:55:40"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Hatim TACHI, Ahmed ZERHOUNI,Jordan CHARLIER, Nader JEMOUI

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

	***** END LICENSE BLOCK ******/

	
function ParsedUrl(doc,url){
	var parse=doc.createElement("a");
	parse.href=url;
	parse.href=parse.href;
	if(parse.host===""){
		var newProtocolAndHost=window.location.protocol+"//"+window.location.host;
		if(url.charAt(1)==="/"){
			parse.href=newProtocolAndHost+url;
		}else{
			var currentFolder=("/"+parse.pathname).match(/.*\//)[0];
			parse.href=newProtocolAndHost+currentFolder+url;
		}
	}
	var properties=['host','hostname','hash','href','port','protocol','search'];
	for (var i=0,n=properties.length;i<n;i++){
		this[properties[i]]=parse[properties[i]];
	}
	this.pathname = (parse.pathname.charAt(0) !== "/" ? "/" : "") + parse.pathname;
}



function detectWeb(doc, url) {
	var myUrl=new ParsedUrl(doc,url);
	if(myUrl.pathname == "/group"){
		return"group";
	}else if(doc.getElementById("note_"+url.substring(url.indexOf("=")+1,url.indexOf("&")))){
		return "forum";
	} 
}




function doWeb(doc, url) {
	if(detectWeb(doc,url)=="forum"){
		var id ="#note_"+url.substring(url.indexOf("=")+1,url.indexOf("&"));
		var str = id+' .note_contents .note_content_value';
		var query = doc.querySelector(str);
		var _itemType ;
		var items=new Zotero.Item(_itemType);
	
		items.title= ZU.xpathText(doc, '//head/meta[@name="citation_title"]/@content');
	
		items.abstractNote= query.innerHTML;
		
		str ='.signatures';
		query=doc.querySelector(str);
		var author;
		author=query.innerHTML;
		items.url=url;
		items.creators.push({
							lastName: author,
							creatorType: 'author',
							fieldMode: 1
						});
		
		items.date= ZU.xpathText(doc, '//head/meta[@name="citation_online_date"]/@content');
		items.complete();
	}
	else if(detectWeb(doc,url)=="group"){
		var items=new Zotero.Item();
		var str="#group-container #main #header .panel h1";
		var query=doc.querySelector(str);
		items.title=query.innerHTML;
		
		str="#group-container #main #header .panel h3";
		query=doc.querySelector(str);
		
		var strt=query.innerHTML;
		
		str="#group-container #main #header .panel h4";
		query=doc.querySelector(str);
		
		items.abstractNote= strt+" , "+ query.innerHTML;
		
		str="#group-container #main #header .panel p";
		query=doc.querySelector(str);
		var list=query.innerHTML.split(":");
		items.date=list[1];
		
		str="#group-container #main #header .panel h4 a";
		query=doc.querySelector(str);
		items.extra=query.innerHTML;
		
		items.url=url;
		items.complete();
	}
}   


/** BEGIN TEST CASES **/
var testCase=[
	
	{
             "itemType": "webpage",
             "creators": [],
             "notes": [],
             "tags": [],
             "seeAlso": [],
             "attachments": [],
             "title": "NIPS 2016 - Deep Learning Symposium",
             "abstractNote": "Neural Information Processing Systems - Deep Learning Symposium , December 8, 2016 in Barcelona, Spain",
             "date": "September 5, 2016",
             "extra": "https://sites.google.com/site/nips2016deeplearnings/",
             "url": "https://openreview.net/group?id=NIPS.cc/2016/Deep_Learning_Symposium",
           	 "libraryCatalog": "OpenReview",
             "accessDate": "CURRENT_TIMESTAMP"
    },
    
     {
             "itemType": "webpage",
             "creators": [
               {
                 "lastName": "Xi Chen, Yan Duan, Rein Houthooft, John Schulman, Ilya Sutskever, Pieter Abbeel",
                 "creatorType": "author",
                 "fieldMode": 1
               }
             ],
             "notes": [],
             "tags": [],
             "seeAlso": [],
             "attachments": [],
             "title": "InfoGAN: Interpretable Representation Learning by Information Maximizing Generative Adversarial Nets",
             "abstractNote": "This paper describes InfoGAN, an information-theoretic extension to the Generative Adversarial Network that is able to learn disentangled representations in a completely unsupervised manner. InfoGAN is a generative adversarial network that also maximizes the mutual information between a small subset of the latent variables and the observation. We derive a lower bound of the mutual information objective that can be optimized efficiently. Specifically, InfoGAN successfully disentangles writing styles from digit shapes on the MNIST dataset, pose from lighting of 3D rendered images, and background digits from the central digit on the SVHN dataset. It also discovers visual concepts that include hair styles, presence/absence of eyeglasses, and emotions on the CelebA face dataset. Experiments show that InfoGAN learns interpretable representations that are competitive with representations learned by existing supervised methods.",
             "url": "https://openreview.net/forum?id=S1ObKwC9&noteId=S1ObKwC9",
             "date": "2016/08/27",
             "libraryCatalog": "OpenReview",
             "accessDate": "CURRENT_TIMESTAMP",
             "shortTitle": "InfoGAN"
           }
    
	];

	/** END TEST CASES **/ 
