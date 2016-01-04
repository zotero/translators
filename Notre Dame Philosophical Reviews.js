{
  "translatorID": "a823550b-6475-4b20-8539-a3c416906228",
  "label": "Notre Dame Philosophical Reviews",
  "creator": "Emiliano Heyns",
  "target": "^https://ndpr\\.nd\\.edu/news/[0-9]+",
  "minVersion": "2.1",
  "maxVersion": "",
  "priority": 100,
  "inRepository": true,
  "translatorType": 4,
  "browserSupport": "gcsibv",
  "lastUpdated": "2016-01-04 11:59:43"
}

// Generated by CoffeeScript 1.10.0

/*
Notre Dame Philosophical Reviews Translator
Copyright (C) 2016 Emiliano Heyns

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
var detectWeb, doWeb, testCases;

detectWeb = function(doc, url) {
  return 'journalArticle';
};

doWeb = function(doc, url) {
  var abstract, author, bibliography, item, ref, ref1, ref2, ref3, ref4, reviewedby, reviewer;
  item = new Zotero.Item('journalArticle');
  item.publication = 'Notre Dame Philosophical Reviews';
  item.ISSN = '1538 - 1617';
  item.url = doc.location.href;
  item.date = ((ref = doc.getElementsByClassName('pubdate')[0]) != null ? ref.getAttribute('datetime') : void 0) || '';
  item.shortTitle = ((ref1 = doc.getElementsByClassName('entry-title')[0]) != null ? ref1.textContent : void 0) || '';
  author = (ref2 = doc.getElementsByClassName('author')[0]) != null ? ref2.textContent : void 0;
  if (author) {
    item.shortTitle + (" (" + author + ")");
  }
  if (item.shortTitle) {
    item.title = "Book review: " + item.shortTitle;
  }
  reviewer = doc.getElementsByClassName('reviewers')[0];
  if (reviewer) {
    reviewedby = doc.getElementsByClassName('reviewed-by')[0];
    if (reviewedby) {
      reviewer.removeChild(reviewedby);
    }
    reviewer = reviewer.textContent.replace(/,.*/, '').trim();
    item.creators = [Zotero.Utilities.cleanAuthor(reviewer, 'author')];
  }
  item.abstract = abstract = ((ref3 = doc.getElementsByClassName('entry-content')[0]) != null ? ref3.textContent : void 0) || '';
  item.extra = bibliography = ((ref4 = doc.getElementsByClassName('bibliography')[0]) != null ? ref4.textContent : void 0) || '';
  return item.complete();
};


/** BEGIN TEST CASES **/

var testCases = [
  {
    "type": "web",
    "url": "https://ndpr.nd.edu/news/24395-pleasure-and-the-good-life-concerning-the-nature-varieties-and-plausibility-of-hedonism/",
    "items": [
      {
        "itemType": "journalArticle",
        "title": "Book review: Pleasure and the Good Life: Concerning the Nature, Varieties, and Plausibility of Hedonism",
        "creators": [
          {
            "firstName": "Leonard D.",
            "lastName": "Katz",
            "creatorType": "author"
          }
        ],
        "date": "20050302T020002-05:00",
        "ISSN": "1538 - 1617",
        "extra": "Feldman, Fred, Pleasure and the Good Life: Concerning the Nature, Varieties, and Plausibility of Hedonism, Oxford University Press, 2004, 221pp, $35.00 (hbk), ISBN  019926516X.",
        "libraryCatalog": "Notre Dame Philosophical Reviews",
        "shortTitle": "Pleasure and the Good Life: Concerning the Nature, Varieties, and Plausibility of Hedonism",
        "url": "https://ndpr.nd.edu/news/24395-pleasure-and-the-good-life-concerning-the-nature-varieties-and-plausibility-of-hedonism/",
        "attachments": [],
        "tags": [],
        "notes": [],
        "seeAlso": []
      }
    ]
  }, {
    "type": "web",
    "url": "https://ndpr.nd.edu/news/63254-locke-s-touchy-subjects-materialism-and-immortality/",
    "items": [
      {
        "itemType": "journalArticle",
        "title": "Book review: Locke's Touchy Subjects: Materialism and Immortality",
        "creators": [
          {
            "firstName": "Shelley",
            "lastName": "Weinberg",
            "creatorType": "author"
          }
        ],
        "date": "20151217T223000-05:00",
        "ISSN": "1538 - 1617",
        "extra": "Nicholas Jolley, Locke's Touchy Subjects: Materialism and Immortality, Oxford University Press, 2015, 142pp., $50.00 (hbk), ISBN 9780198737094.",
        "libraryCatalog": "Notre Dame Philosophical Reviews",
        "shortTitle": "Locke's Touchy Subjects: Materialism and Immortality",
        "url": "https://ndpr.nd.edu/news/63254-locke-s-touchy-subjects-materialism-and-immortality/",
        "attachments": [],
        "tags": [],
        "notes": [],
        "seeAlso": []
      }
    ]
  }
]


/** END TEST CASES **/
