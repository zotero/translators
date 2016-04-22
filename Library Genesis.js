{
	"translatorID": "11614156-f421-4e89-8ce0-a5e69ce3ebed",
	"label": "Library Genesis",
	"creator": "Reverend Wicks Cherrycoke",
	"target": "libgen.io|lib.gen.rus.ec",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsi",
	"lastUpdated": "2016-04-22 15:36:56"
}

var MIME_TYPES = {
  'pdf': 'application/pdf',
  'epub': 'application/epub+zip',
  'mobi': 'application/x-mobipocket-ebook',
  'djvu': 'image/vnd.djvu'
};
var MD5_REGEX = /md5=([0-9A-F]+)/;


function detectWeb(doc, url) {
  if (url.indexOf('book/index.php') != -1) {
    return 'book';
  }
}

function doWeb(doc, url) {
  var md5Hash = MD5_REGEX.exec(url)[1];

  // To save some work, we use the provided bibtex file to retrieve the
  // metadata and use Zotero's built-in bibtex importer
  var bibtexUrl = "http://libgen.io/book/bibtex.php?md5=" + md5Hash;
  ZU.processDocuments(bibtexUrl, function(bibtexDoc) {
    var bibtexStr = bibtexDoc.getElementsByTagName("textarea")[0].value
    var translator = Zotero.loadTranslator('import');
    translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
    translator.setString(bibtexStr);

    translator.setHandler('itemDone', function(obj, item) {
      // The bibtex messes up multiple authors, so we set them ourselves
      var authorStr = ZU.xpathText(doc, "//tbody/tr[3]/td[2]/b");
      item.creators = authorStr.split(",").map(function(author) {
        return ZU.cleanAuthor(author, "author", false);
      });

      // It also messes up multiple ISBNs, so we just pick the first one
      [' ', ','].forEach(function(splitChar) {
        if (item.ISBN.indexOf(splitChar) != -1) {
          item.ISBN = item.ISBN.split(splitChar)[0];
        }
      });

      // Add the full text attachment
      var extension = ZU.xpathText(doc, "//tbody/tr[11]/td[4]");
      var downloadUrl = (
        "http://libgen.io/get/" + md5Hash + "/" + md5Hash + "." + extension);
      item.attachments.push({
        title: "Full Text",
        url: downloadUrl,
        mimeType: MIME_TYPES[extension]});
      item.complete();
    });
    translator.translate();
  });
}
