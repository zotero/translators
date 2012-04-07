{
    "translatorID": "73be930f-5773-41b2-a7a1-37c0eeade92f",
    "label": "OZON.ru",
    "creator": "Victor Rybynok",
    "target": "^http://www\\.ozon\\.ru",
    "minVersion": "2.1.9",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsib",
    "lastUpdated": "2012-04-02 16:56:37"
}

/**
    OZON.ru translator. Only supports "Book" "Item Type".
    Copyright (c) 2012 Victor Rybynok, v.rybynok@gmail.com

    This program is free software: you can redistribute it and/or
    modify it under the terms of the GNU Affero General Public License
    as published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public
    License along with this program.  If not, see
    <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
    var namespace = doc.documentElement.namespaceURI;
    var nsResolver = namespace ? function(prefix) {
        if (prefix == "x" ) return namespace; else return null;
    } : null;
    var itemTypeXPath = '//ul[@class="navLine"]/li[1]/a';
    var itemTypeDOMNode = 
        doc.evaluate(itemTypeXPath, doc, nsResolver,
        XPathResult.ANY_TYPE, null).iterateNext();
    var itemType;
    if(itemTypeDOMNode) itemType = itemTypeDOMNode.textContent
    else itemType = "";
    if (itemType == "Книги") {
        var nameXPath = '//div[@class="techDescription"]/div/div[2]/span';
        var valueXPath = '//div[@class="techDescription"]/div/div[3]/span';
        var nameXPathRes = doc.evaluate(
            nameXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
        var valueXPathRes = doc.evaluate(
            valueXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
        if(!IsAudioBook(nameXPathRes, valueXPathRes)) return "book";
    }
    else {
        itemTypeXPath = '//ul[@class="navLine"]/li[2]/a';
        itemTypeDOMNode = 
            doc.evaluate(itemTypeXPath, doc, nsResolver,
            XPathResult.ANY_TYPE, null).iterateNext();
        if(itemTypeDOMNode) itemType = itemTypeDOMNode.textContent
        else itemType = "";
        if (itemType == "Цифровые книги") return "book";
    }
}

function IsAudioBook(nameXPathRes, valueXPathRes) {
    var nameDOMNode;
    var valueDOMNode;
    while( (nameDOMNode = nameXPathRes.iterateNext()) &&
        (valueDOMNode = valueXPathRes.iterateNext()) )
    {
        var nameText = CleanText(nameDOMNode.textContent);
        var valueText = CleanText(valueDOMNode.textContent);
        if(nameText == "Формат аудиокниги") return true;
    }
    return false;
}

function MergeObjects(obj1, obj2) {
    var result = new Object();
    for (var attrName in obj1) { result[attrName] = obj1[attrName]; }
    for (var attrName in obj2) { result[attrName] = obj2[attrName]; }
    return result;
}

function CleanText(text) {
    var result = text.replace(/^\s*|\s*$/g, '');
    result = result.replace(/\s+/g, ' ');
    return result;
}

function GetCreators(creatorsStr, creatorsCategory) {
    var result = new Array();
    if (creatorsStr.match(",")) {
        var authors = creatorsStr.split(",");
        for (var i in authors) {
            result.push(
                Zotero.Utilities.cleanAuthor(authors[i], creatorsCategory));
        }
    } else {
        result.push(Zotero.Utilities.cleanAuthor(creatorsStr, creatorsCategory));
    }
    return result;
}

function GetLanguage(languageStr) {
    switch(languageStr) {
        case "Русский":
            return "ru";
        case "Английский":
            return "en";
        default:
            return "";
    }
}

function GetISBN(isbnDateStr) {
    return isbnDateStr.replace(/;\s.*$/, "");
}

function GetDate(isbnDateStr) {
    var dateSlash = isbnDateStr.replace(/^.*;\s|\sг\.$/g, "");
    var dateArray = dateSlash.split("/");
    var dateZotero = dateArray.reverse().join("-");
    return dateZotero;
}

function GetNumPages(numPagesStr) {
    return numPagesStr.replace(/\sстр\./, "");
}

function GetEdition(editionStr) {
    return editionStr.replace(/-е издание\./, "");
}

function ParseProductDetail(pdXPathRes) {
    var result = new Object();
    var creatorsObject = new Object();
    var pdDOMNode;
    while(pdDOMNode = pdXPathRes.iterateNext()) {
        var text = CleanText(pdDOMNode.textContent);
        var name = text.replace(/[:,\s].*$/, "");
        var value = text.replace(/^\S*\s+/, "");
        //Zotero.debug(name + " -> " + value);
        switch(name) {
            case "Автор":
            case "Авторы":
                creatorsObject["authors"] = GetCreators(value, "author");
            break;
            case "Составитель":
                creatorsObject["compilers"] = GetCreators(value, "author");
            break;
            case "Переводчик":
            case "Переводчики":
                creatorsObject["translators"] = GetCreators(value, "translator");
            break;
            case "Редактор":
            case "Редакторы":
                creatorsObject["editors"] = GetCreators(value, "editor");
            break;
            case "Язык":
            case "Языки":
                result["language"] = GetLanguage(value);
            break;
            case "Издательство":
                result["publisher"] = value;
            break;
            case "Серия":
                result["series"] = value;
            break;
            case "ISBN":
                result["ISBN"] = GetISBN(value);
                result["date"] = GetDate(value);
            break;
            default:
                //"Naked" year
                if( name.match(/^\d\d\d\d$/) &&  !result["date"] ) {
                    result["date"] = name;
                }
        }
    }
    creatorsObject["all"] = new Array();
    if(creatorsObject["authors"]) {
        creatorsObject["all"] =
            creatorsObject["all"].concat(creatorsObject["authors"]);
    }
    if(creatorsObject["compilers"]) {
        creatorsObject["all"] =
            creatorsObject["all"].concat(creatorsObject["compilers"]);
    }
    if(creatorsObject["translators"]) {
        creatorsObject["all"] =
            creatorsObject["all"].concat(creatorsObject["translators"]);
    }
    if(creatorsObject["editors"]) {
        creatorsObject["all"] =
            creatorsObject["all"].concat(creatorsObject["editors"]);
    }
    if(creatorsObject["all"]) {
        result["creators"] = creatorsObject["all"];
    }
    return result;
}

function ParseTechDesc(nameXPathRes, valueXPathRes) {
    var result = Object();
    var nameDOMNode;
    var valueDOMNode;
    while( (nameDOMNode = nameXPathRes.iterateNext()) &&
        (valueDOMNode = valueXPathRes.iterateNext()) )
    {
        var nameText = CleanText(nameDOMNode.textContent);
        var valueText = CleanText(valueDOMNode.textContent);
        if(nameText == "Страниц") {
            result["numPages"] = GetNumPages(valueText);
            return result;
        }
    }
}

function ParseDetailDesc(nameXPathRes, valueXPathRes) {
    var result = Object();
    var nameDOMNode;
    var valueDOMNode;
    while( (nameDOMNode = nameXPathRes.iterateNext()) &&
        (valueDOMNode = valueXPathRes.iterateNext()) )
    {
        var nameText = CleanText(nameDOMNode.textContent);
        var valueText;
        switch(nameText) {
            case "От производителя":
                valueText = Zotero.Utilities.cleanTags(valueDOMNode.innerHTML);
                result["abstractNote"] = valueText;
            break;
            case "От OZON.ru":
                valueText = CleanText(valueDOMNode.textContent);
                if(valueText.match("издание\.$"))
                    result["edition"] = GetEdition(valueText);
            break;
        }
    }
    return result;
}

function doWeb(doc, url) {
    var namespace = doc.documentElement.namespaceURI;
    var nsResolver = namespace ? function(prefix) {
        if (prefix == "x" ) return namespace; else return null;
    } : null;

    var pdObject = new Object();
    //pdObject["url"] = url;

    var pdXPath = '//div[@class="l h1"]/h1';
    var pdXPathRes = doc.evaluate(
        pdXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
    pdObject["title"] = CleanText(pdXPathRes.iterateNext().textContent);
    pdXPath = '//div[@class="product-detail"]/p';
    pdXPathRes = doc.evaluate(
        pdXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
    pdObject = MergeObjects(pdObject, ParseProductDetail(pdXPathRes));

    var nameXPath = '//div[@class="techDescription"]/div/div[2]/span';
    var valueXPath = '//div[@class="techDescription"]/div/div[3]/span';
    var nameXPathRes = doc.evaluate(
        nameXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
    var valueXPathRes = doc.evaluate(
        valueXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
    pdObject = MergeObjects(
        pdObject, ParseTechDesc(nameXPathRes, valueXPathRes))

    nameXPath = '//table[@id="detail_description"]/tbody/tr[1]/th';
    valueXPath = '//table[@id="detail_description"]/tbody/tr[2]/td';
    nameXPathRes = doc.evaluate(
        nameXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
    valueXPathRes = doc.evaluate(
        valueXPath, doc, nsResolver, XPathResult.ANY_TYPE, null);
    pdObject = MergeObjects(
        pdObject, ParseDetailDesc(nameXPathRes, valueXPathRes))

    //Zotero.debug(pdObject);
    var newItem = new Zotero.Item("book");
    for(var field in pdObject) newItem[field] = pdObject[field];
    //Zotero.debug(zzz)

    var linkurl = url;
    newItem.attachments = [{
        "url": linkurl,
        "title": "OZON.ru Link",
        "mimeType": "text/html",
        "snapshot": false       
    }];

    newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "web",
        "url": "http://www.ozon.ru/context/detail/id/87889/",
        "items": [
            {
                "itemType": "book",
                "creators": [
                    {
                        "firstName": "Бьерн",
                        "lastName": "Страуструп",
                        "creatorType": "author"
                    }
                ],
                "notes": [],
                "tags": [],
                "seeAlso": [],
                "attachments": [
                    {
                        "url": "http://www.ozon.ru/context/detail/id/87889/",
                        "title": "OZON.ru Link",
                        "mimeType": "text/html",
                        "snapshot": false
                    }
                ],
                "title": "Язык программирования C++",
                "language": "ru",
                "publisher": "Бином, Невский Диалект",
                "ISBN": "5-7940-0031-7, 5-7989-0127-0, 0-201-88954-4",
                "date": "1999-1-1",
                "numPages": "991",
                "abstractNote": "Книга Бьерна Страуструпа является каноническим изложением возможностей С++, написанным автором этого популярнейшего языка программирования. Помимо подробного описания самого языка, на страницах книги вы найдете множество доказавших свою эффективность подходов к решению разнообразных задач программирования и проектирования. Многочисленные примеры демонстрируют как хороший стиль программирования на С - совместимом ядре С++, так и современный объектно - ориентированный подход к созданию программных продуктов. Данное третье издание бестселлера было существенно переработано автором. С одной стороны, результатом этой переработки стала большая доступность книги для новичков. С другой стороны, текст обогатился сведениями и техниками программирования, которые могут оказаться полезными даже для многоопытных специалистов по С++. Разумеется, не обойдены вниманием и нововведения языка: стандартная библиотека шаблонов (STL), пространства имен (namespaces), механизм идентификации типов во время выполнения (RTTI), явныеприведения типов (cast - операторы) и другие. Книга адресована программистам, использующим в своей повседневной работе С++. Она также будет полезна преподавателям, студентам и всем, кто хочет ознакомиться с описанием языка `из первых рук`.",
                "libraryCatalog": "OZON.ru"
            }
        ]
    },
    {
        "type": "web",
        "url": "http://www.ozon.ru/context/detail/id/87972/",
        "items": [
            {
                "itemType": "book",
                "creators": [
                    {
                        "firstName": "Гради",
                        "lastName": "Буч",
                        "creatorType": "author"
                    },
                    {
                        "firstName": "Грэди",
                        "lastName": "Буч",
                        "creatorType": "author"
                    }
                ],
                "notes": [],
                "tags": [],
                "seeAlso": [],
                "attachments": [
                    {
                        "url": "http://www.ozon.ru/context/detail/id/87972/",
                        "title": "OZON.ru Link",
                        "mimeType": "text/html",
                        "snapshot": false
                    }
                ],
                "title": "Объектно - ориентированный анализ и проектирование с примерами приложений на С++",
                "language": "ru",
                "publisher": "Бином, Невский Диалект",
                "ISBN": "0-8053-5340-2, 5-7989-0067-3, 5-7940-0017-1",
                "date": "1998",
                "numPages": "560",
                "abstractNote": "Книга Гради Буча, признанного эксперта в области объекто - ориентированной методологии разработки программного обеспечения, содержит классическое изложение вопросов анализа и проектирования сложных систем. В первой части книги автор исследует суть фундаментальных понятий ООП (таких как `класс`, `объект`, `наследование`), анализирует концепции, лежащие в основе объектно - ориентированных языков и методик разработки. Вторая часть содержит подробное описание обозначений (известных как `нотация Буча`), давноуже ставших родными для тысяч разработчиков во всем мире. Здесь же автор делится своим богатым опытом организации процесса разработки программ, дает рекомендации по подбору команды и планированию промежуточных релизов. В третьей части изложенные ранее методы применяются для анализа и проектирования нескольких приложений. На глазах у читателя создается каркас соответствующих систем, принимаются принципиальные проектные решения. Книга будет полезна аналитикам и разработчикам программного обеспечения, преподавателям и студентам высших учебных заведений. По сравнению с первым изданием книга несколько дополнена (что отразилось и в названии), все примеры приведены на языке С++.",
                "libraryCatalog": "OZON.ru"
            }
        ]
    },
    {
        "type": "web",
        "url": "http://www.ozon.ru/context/detail/id/117417/",
        "items": [
            {
                "itemType": "book",
                "creators": [
                    {
                        "firstName": "Крэг",
                        "lastName": "Ларман",
                        "creatorType": "author"
                    }
                ],
                "notes": [],
                "tags": [],
                "seeAlso": [],
                "attachments": [
                    {
                        "url": "http://www.ozon.ru/context/detail/id/117417/",
                        "title": "OZON.ru Link",
                        "mimeType": "text/html",
                        "snapshot": false
                    }
                ],
                "title": "Применение UML и шаблонов проектирования. Введение в объектно-ориентированный анализ и проектирование",
                "language": "ru",
                "publisher": "Вильямс",
                "ISBN": "5-8459-0125-1, 0-13-748880-7",
                "date": "2001-1-1",
                "numPages": "496",
                "abstractNote": "Те, кто еще не знакомы с вопросами объектно-ориентированного анализа и проектирования, наверняка планируют освоить эту область знаний. Данная книга станет хорошим путеводителем и позволит шаг за шагом пройти путь от определения требований к системе до создания кода. В книге рассматривается унифицированный язык моделирования UML, который является признанным стандартом для описания моделей и обеспечивает возможность общения между разработчиками. Для иллюстрации всего процесса объектно-ориентированного анализа и проектирования в книге приводится исчерпывающее описание реального примера. В нем показано, как перейти от этапа объектно-ориентированного проектирования к созданию кода на языке Java. Книга рассчитана на читателей с различным уровнем подготовки, интересующихся вопросами объектно-ориентированного анализа и проектирования.",
                "libraryCatalog": "OZON.ru"
            }
        ]
    },
    {
        "type": "web",
        "url": "http://www.ozon.ru/context/detail/id/1335648/",
        "items": [
            {
                "itemType": "book",
                "creators": [
                    {
                        "firstName": "Дональд Э.",
                        "lastName": "Кнут",
                        "creatorType": "author"
                    },
                    {
                        "firstName": "С.",
                        "lastName": "Тригуб",
                        "creatorType": "translator"
                    },
                    {
                        "firstName": "Ю.",
                        "lastName": "Гордиенко",
                        "creatorType": "translator"
                    },
                    {
                        "firstName": "И.",
                        "lastName": "Красикова",
                        "creatorType": "translator"
                    },
                    {
                        "firstName": "Ю.",
                        "lastName": "Козаченко",
                        "creatorType": "editor"
                    }
                ],
                "notes": [],
                "tags": [],
                "seeAlso": [],
                "attachments": [
                    {
                        "url": "http://www.ozon.ru/context/detail/id/1335648/",
                        "title": "OZON.ru Link",
                        "mimeType": "text/html",
                        "snapshot": false
                    }
                ],
                "title": "Искусство программирования. Том 1. Основные алгоритмы",
                "language": "ru",
                "publisher": "Вильямс",
                "series": "Искусство программирования",
                "ISBN": "978-5-8459-0080-7, 0-201-89683-4",
                "date": "2010",
                "numPages": "720",
                "abstractNote": "Первый том серии книг \"Искусство программирования\" начинается с описания основных понятий и методов программирования. Затем автор сосредоточивается на рассмотрении информационных структур - представлении информации внутри компьютера, структурных связях между элементами данных и способах эффективной работы с ними. Для методов имитации, символьных вычислений, числовых методов и методов разработки программного обеспечения даны примеры элементарных приложений. По сравнению с предыдущим изданием добавлены десятки простых, но в то же время очень важных алгоритмов. В соответствии с современными направлениями исследований был существенно переработан также раздел математического введения.",
                "edition": "3",
                "libraryCatalog": "OZON.ru"
            }
        ]
    }
]
/** END TEST CASES **/