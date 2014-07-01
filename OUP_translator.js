{
    "translatorID": "e9989043-fcdf-4f33-93b6-0381828aeb41",
    "label": "OUP",
    "creator": "JingjingYin and Qiang Fang",
    "target": "^https?://ukcatalogue\\\\.oup\\\\.com/product/\\\\d+\\\\.do",
    "minVersion": "1.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsib",
    "lastUpdated": "2014-06-30 20:53:21"
}

/*
Oxford University Press Translator
Copyright (C) 2014 Jingjing Yin and Qiang Fang

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/
function detectWeb(doc, url){
     if(url.indexOf('product/') != -1){
          return 'book';
     }
}

function doWeb(doc, url) {
     var item = new Zotero.Item("book");
     
     var subTitle = doc.getElementsByClassName('prodShortDesc')[0];
     if (subTitle){
          item.title = Zotero.Utilities.trimInternal(doc.getElementsByClassName('prodName')[0].textContent+':'+subTitle.textContent);
     } else item.title = Zotero.Utilities.trimInternal(doc.getElementsByClassName('prodName')[0].textContent);

     var edition = doc.getElementsByClassName("volumeEdition")[0];
     if (edition) item.edition = Zotero.Utilities.trimInternal(edition.textContent);
     
     var aut1 = doc.getElementsByClassName('composedBy')[0];
     var aut2 = doc.getElementsByClassName('authors')[0];
     if (aut1)      var auts = aut1;
     else  var auts = aut2;
     var role = 'author';
     if(auts.textContent.trim().indexOf('Edited ') == 0) role = 'editor';
     auts = auts.getElementsByTagName('b');
     for(var i=0; i<auts.length; i++) {
          var name = ZU.trimInternal(auts[i].textContent);
          item.creators.push(ZU.cleanAuthor(name, role, false));
     }
     
     var alsoAvailable=ZU.xpathText(doc,'//div[@class="alsoAvailable"]');
     var date_isbn_1 = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-1]');
     var date_isbn_2 = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-2]');
     var pages1 = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-2]');
     var pages2 = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-3]');
     if (alsoAvailable) {
          item.numPages = Zotero.Utilities.trimInternal(pages2.split(' ')[0]);
          item.date = Zotero.Utilities.trimInternal(date_isbn_2.split('|')[2]);
          item.ISBN = Zotero.Utilities.trimInternal(date_isbn_2.split('|')[0]);
          
     } else {
          item.numPages = Zotero.Utilities.trimInternal(pages1.split(' ')[0]);
          item.date = Zotero.Utilities.trimInternal(date_isbn_1.split('|')[2]);
          item.ISBN = Zotero.Utilities.trimInternal(date_isbn_1.split('|')[0]);
     }

     var publisher = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[a]');     
     if (publisher) item.publisher = Zotero.Utilities.trimInternal(publisher.split(',')[0]);
     else item.publisher = "Oxford University Press";
     
      item.abstractNote = ZU.trimInternal(ZU.xpathText(doc,'//div[@id="tab_01_content"]/table/tbody/tr/td/table/tbody/tr/td/text()',null,' ')+ZU.xpathText(doc,'//div[@id="tab_01_content"]/table/tbody/tr/td/table/tbody/tr/td/p[1]',null,' '));

     var tags = ZU.xpathText(doc,'//div[@class="breadcrumb"]/a[position()>1]',null,';');
     item.tags = tags.split(';');
     
     item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "web",
        "url": "http://ukcatalogue.oup.com/product/9780193221031.do",
        "items": [
            {
                "itemType": "book",
                "creators": [
                    {
                        "firstName": "Ian",
                        "lastName": "Denley",
                        "creatorType": "author"
                    }
                ],
                "notes": [],
                "tags": [
                    "Music",
                    "Woodwind & Brass",
                    "Flute"
                ],
                "seeAlso": [],
                "attachments": [],
                "title": "Flute Time 1 Piano Accompaniment book",
                "numPages": "32",
                "date": "24 July 2003",
                "ISBN": "978-0-19-322103-1",
                "publisher": "Flute Time",
                "abstractNote": "Tutor Easy Piano accompaniments to selected pieces in Flute Time 1",
                "libraryCatalog": "OUP"
            }
        ]
    },
    {
        "type": "web",
        "url": "http://ukcatalogue.oup.com/product/9780194422505.do",
        "items": [
            {
                "itemType": "book",
                "creators": [
                    {
                        "firstName": "Sandra",
                        "lastName": "Fotos",
                        "creatorType": "author"
                    },
                    {
                        "firstName": "Hossein",
                        "lastName": "Nassaji",
                        "creatorType": "author"
                    }
                ],
                "notes": [],
                "tags": [
                    "Academic, Professional, & General",
                    "Language & Linguistics",
                    "Language Teaching & Learning",
                    "Teaching & Learning English as a Foreign or Second Language",
                    "Background & Reference Material",
                    "Teaching Theory & Methods"
                ],
                "seeAlso": [],
                "attachments": [],
                "title": "Form-focused Instruction and Teacher Education : Studies in Honour of Rod Ellis",
                "numPages": "296",
                "date": "24 May 2007",
                "ISBN": "978-0-19-442250-5",
                "publisher": "Oxford University Press",
                "abstractNote": "An overview of form-focused instruction as an option for second language grammar teaching. It combines theoretical concerns, classroom practices, and teacher education.",
                "libraryCatalog": "OUP",
                "shortTitle": "Form-focused Instruction and Teacher Education"
            }
        ]
    },
    {
        "type": "web",
        "url": "http://ukcatalogue.oup.com/product/9780198781875.do",
        "items": [
            {
                "itemType": "book",
                "creators": [
                    {
                        "firstName": "A. H.",
                        "lastName": "Halsey",
                        "creatorType": "editor"
                    },
                    {
                        "firstName": "Hugh",
                        "lastName": "Lauder",
                        "creatorType": "editor"
                    },
                    {
                        "firstName": "Phillip",
                        "lastName": "Brown",
                        "creatorType": "editor"
                    },
                    {
                        "firstName": "Amy Stuart",
                        "lastName": "Wells",
                        "creatorType": "editor"
                    }
                ],
                "notes": [],
                "tags": [
                    "Academic, Professional, & General",
                    "Society, Culture, & Environment",
                    "Education"
                ],
                "seeAlso": [],
                "attachments": [],
                "title": "Education : Culture, Economy, and Society",
                "numPages": "842",
                "date": "17 April 1997",
                "ISBN": "978-0-19-878187-5",
                "publisher": "Oxford University Press",
                "abstractNote": "is a book for everyone concerned with the social study of education: students studying the sociology of education, foundations of education, educational policy, and other related courses. It aims to establish the social study of education at the centre stage of political and sociological debate about post-industrial societies. In examining major changes which have taken place in the late twentieth century, it gives students a comprehensive introduction to both the nature of these changes and to their interpretation in relation to long-standing debates within education, sociology, and cultural studies. The extensive editorial introduction outlines the major theoretical approaches within the sociology of education, assesses their contribution to an adequate understanding of the changing educational context, and sets out the key issues and areas for future research. The 52 papers in this wide-ranging thematic reader bring together the most powerful work in education into an international dialogue which is sure to become a classic text.",
                "libraryCatalog": "OUP",
                "shortTitle": "Education"
            }
        ]
    }
]
/** END TEST CASES **/
