{
	"translatorID": "96b9f483-c44d-5784-cdad-ce21b984fe01",
	"label": "Amazon.com",
	"creator": "Sean Takats and Michael Berkowitz",
	"target": "^https?://(?:www\\.)?amazon",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-10-29 13:47:54"
}

function detectWeb(doc, url) {
	var suffixRe = new RegExp("https?://(?:www\.)?amazon\.([^/]+)/");
	var suffixMatch = suffixRe.exec(url);
	var suffix = suffixMatch[1];
	var searchRe = new RegExp('^https?://(?:www\.)?amazon\.' + suffix + '/(gp/search/|exec/obidos/search-handle-url/|s/|s\\?|[^/]+/lm/|gp/richpub/)');
	if(searchRe.test(doc.location.href)) {
		return "multiple";
	} else {
		var xpath = '//input[@name="ASIN"]';
		if(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var elmt = doc.evaluate('//input[@name="storeID"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if(elmt) {
				var storeID = elmt.value;
				if (storeID=="books"){
					return "book";
				}
				else if (storeID=="music"){
					return "audioRecording";
				}
				else if (storeID=="dvd"|storeID=="video"|storeID=="movies-tv"){
					return "videoRecording";
				}
				else {
					return "book";
				}
			}
			else {
				return "book";
			}
		}
	}
}

var suffix;
function doWeb(doc, url) {
	var suffixRe = new RegExp("https?://(?:www\.)?amazon\.([^/]+)/");
	var suffixMatch = suffixRe.exec(url);
	suffix = suffixMatch[1];

	var searchRe = new RegExp('^https?://(?:www\.)?amazon\.' + suffix + '/(gp/search/|exec/obidos/search-handle-url/|s/|s\\?|[^/]+/lm/|gp/richpub/)');
	var m = searchRe.exec(doc.location.href);
	var uris = new Array();
	if (suffix == "co.jp"){
		suffix = "jp";
	}
	if (suffix == ".com") suffix = "com";
	if(m) {
		var availableItems = new Array();
		
		
		if(doc.location.href.match(/gp\/richpub\//)){ // Show selector for Guides
			var xpath = '//a[(contains(@href, "ref=cm_syf_dtl_pl") or contains(@href, "ref=cm_syf_dtl_top")) and preceding-sibling::b]';
		} else if (doc.location.href.match(/\/lm\//)) { // Show selector for Lists
			var xpath = '//span[@id="lm_asinlink95"]//a'
		} else { // Show selector for Search results
			var xpath = '//div[@class="productTitle"]/a | //a[span[@class="srTitle"]] | //div[@class="title"]/a[@class="title"]';
		}
		var elmts = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var elmt = elmts.iterateNext();
		var asins = new Array();
		var i = 0;
		var asinRe = new RegExp('/(dp|product)/([^/]+)/');
		do {
			var link = elmt.href;
			var searchTitle = elmt.textContent;
			if  (asinRe.exec(link)) {
				var asinMatch = asinRe.exec(link);
				availableItems[i] = searchTitle;
				asins[i] = asinMatch[2];
				i++;
			}
		} while (elmt = elmts.iterateNext());
		
		Zotero.selectItems(availableItems, function(items) {
			if(!items) {
				return true;
			}
			
			for(var i in items) {
				var timestamp = encodeURIComponent(generateISODate());
				var params = "AWSAccessKeyId=AKIAIPYIWJ24AGZJ64AA&AssociateTag=httpwwwdig0e7-20&ItemId=" + Zotero.Utilities.trim(asins[i]) + "&Operation=ItemLookup&ResponseGroup=ItemAttributes&Service=AWSECommerceService&Timestamp="+timestamp+"&Version=2011-08-01";
				var signString = "GET\necs.amazonaws."+suffix+"\n/onca/xml\n"+params;
				var signature = b64_hmac_sha256("054vk/Lt3LJMxch1srIHUbvI+2T/fZ6E5c0qwlbj", signString);
				signature = encodeURIComponent(signature);
				uris.push("http://ecs.amazonaws." + suffix + "/onca/xml?"+params+"&Signature="+signature+"%3D"); //wants the %3D for some reason
			}
			
			Zotero.Utilities.HTTP.doGet(uris, parseXML, function() {Zotero.done();}, null);
		});

	} else {
		var elmts = doc.evaluate('//input[@name = "ASIN"]', doc, null, XPathResult.ANY_TYPE, null);
		var elmt;
		while(elmt = elmts.iterateNext()) {
			var asin = elmt.value;
		}
		var timestamp = encodeURIComponent(generateISODate()); 
		var params = "AWSAccessKeyId=AKIAIPYIWJ24AGZJ64AA&AssociateTag=httpwwwdig0e7-20&ItemId=" + Zotero.Utilities.trim(asin) + "&Operation=ItemLookup&ResponseGroup=ItemAttributes&Service=AWSECommerceService&Timestamp="+timestamp+"&Version=2011-08-01";
		var signString = "GET\necs.amazonaws."+suffix+"\n/onca/xml\n"+params;
		var signature = b64_hmac_sha256("054vk/Lt3LJMxch1srIHUbvI+2T/fZ6E5c0qwlbj", signString);
		signature = encodeURIComponent(signature);		
		uris.push("http://ecs.amazonaws." + suffix + "/onca/xml?"+params+"&Signature="+signature+"%3D"); //wants the %3D for some reason
		Zotero.Utilities.HTTP.doGet(uris, parseXML, function() {Zotero.done();}, null);
	}
	Zotero.wait();
}

function parseXML(text) {
	text = text.replace(/<!DOCTYPE[^>]*>/, "").replace(/<\?xml[^>]*\?>/, "");
	var texts = text.split("<Items>");
	texts = texts[1].split("</ItemLookupResponse>");
	text = "<Items>" + texts[0];
	var xml = (new DOMParser()).parseFromString(text, "text/xml");
	var publisher = "";

	if (!ZU.xpath(xml, "//Errors").length) {
		var publisher = getXPathNodeTrimmed(xml, "Publisher");
		var binding = getXPathNodeTrimmed(xml, "Binding");
		var productGroup = getXPathNodeTrimmed(xml, "ProductGroup");
			
		if (productGroup=="Book") {
			var newItem = new Zotero.Item("book");
			newItem.publisher = publisher;
			getCreatorNodes(xml, "Author", newItem, "author");
			getBookCreatorNodes(xml, newItem);
		}
		else if (productGroup == "Music") {
			var newItem = new Zotero.Item("audioRecording");
			newItem.label = publisher;
			newItem.audioRecordingType = binding;
			getCreatorNodes(xml, "Artist", newItem, "performer");
		}
		else if (productGroup == "DVD" | productGroup == "Video") {
			var newItem = new Zotero.Item("videoRecording");
			newItem.studio = publisher;
			newItem.videoRecordingType = binding;
			getCreatorNodes(xml, "Actor", newItem, "castMember");
			getCreatorNodes(xml, "Director", newItem, "director");
		}
		else{
			var newItem = new Zotero.Item("book");
			newItem.publisher = publisher;
			getCreatorNodes(xml, "Author", newItem, "author");
			getBookCreatorNodes(xml, newItem);
		}
		
		newItem.runningTime = getXPathNodeTrimmed(xml, "RunningTime");
		
		//Retrieve Creators as Authors if no creator found above
		if (newItem.creators.length == 0){
			getDefaultCreatorNodes(xml,newItem);
		}
		
		newItem.date = getXPathNodeTrimmed(xml, "PublicationDate");
		if (!newItem.date){
			newItem.date = getXPathNodeTrimmed(xml, "ReleaseDate");
		}
		newItem.edition = getXPathNodeTrimmed(xml, "Edition");
		newItem.ISBN = getXPathNodeTrimmed(xml, "ISBN");
		newItem.numPages = getXPathNodeTrimmed(xml, "NumberOfPages");
		var title = getXPathNodeTrimmed(xml, "Title");
		if(title.lastIndexOf("(") != -1 && title.lastIndexOf(")") == title.length-1) {
			title = title.substring(0, title.lastIndexOf("(")-1);
		}
		var ASIN = getXPathNodeTrimmed(xml, "ASIN");
		if (ASIN){
			var url = "http://www.amazon." + suffix + "/dp/" + ASIN;
			newItem.attachments.push({title:"Amazon.com Link", snapshot:false, mimeType:"text/html", url:url});
		}
		
		newItem.extra = getXPathNodeTrimmed(xml, "OriginalReleaseDate");
		
		newItem.title = title;
		newItem.complete();
	}
}

function getXPathNodeTrimmed(xml, name) {
	var node = ZU.xpath(xml, "//"+name);
	var val = "";
	if(node.length){
		val = Zotero.Utilities.trimInternal(node[0].textContent);
	}
	return val;
}

function getCreatorNodes(xml, name, newItem, creatorType) {
	var nodes = ZU.xpath(xml, "//"+name);
	for(var i=0; i<nodes.length; i++) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(nodes[i].textContent, creatorType));
	}
}
function getBookCreatorNodes(xml, newItem) {
	var roleArray = new Array;
	var roles = ZU.xpath(xml,"//"+"Creator/@Role");
	for(var i=0; i<roles.length; i++){
		roleArray.push(roles[i].textContent.toLowerCase());
		fixRoleArray(roleArray); /*Ensures that book editors, 
			translators, series editors, and contributors are 
			scraped as such and ignores other creators*/
	}
	var nodes = ZU.xpath(xml, "//Creator");
	for(var i=0; i<nodes.length; i++) {
		if(roleArray[i] != "other"){
			newItem.creators.push(Zotero.Utilities.cleanAuthor(nodes[i].textContent, roleArray[i]));
		}
	}
}

function getDefaultCreatorNodes(xml, newItem) {
	var roleArray = new Array
	var roles = ZU.xpath(xml,"//"+"Creator/@Role");
	for(var i=0; i<roles.length; i++){
		roleArray.push(roles[i].textContent.toLowerCase())
	}
	var nodes = ZU.xpath(xml, "//Creator");
	for(var i=0; i<nodes.length; i++) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(nodes[i].textContent, roleArray[i]));
	}
}

function fixRoleArray(roleArray){
	/*used for books only*/
	for(var i=0; i<roleArray.length; i++){
		switch(roleArray[i]){
			case "author":
				break;
			case "translator":
				break;
			case "editor":
				break;
			case "series editor":
				break;
			case "contributor":
				break;
			default:
				roleArray[i] = "other";
		}
	}
}

function generateISODate(){
	var ts = new Date();
	var isodate = ts.getUTCFullYear()+"-"+Zotero.Utilities.lpad(ts.getUTCMonth()+1, "0", 2)+"-"+Zotero.Utilities.lpad(ts.getUTCDate(), "0", 2)+"T"+Zotero.Utilities.lpad(ts.getUTCHours(), "0", 2)+":"+Zotero.Utilities.lpad(ts.getUTCMinutes(), "0", 2)+":"+Zotero.Utilities.lpad(ts.getUTCSeconds(), "0", 2)+"Z";
	return isodate;
}

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2 Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 * Also http://anmar.eu.org/projects/jssha2/
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha256(s)    { return rstr2hex(rstr_sha256(str2rstr_utf8(s))); }
function b64_sha256(s)    { return rstr2b64(rstr_sha256(str2rstr_utf8(s))); }
function any_sha256(s, e) { return rstr2any(rstr_sha256(str2rstr_utf8(s)), e); }
function hex_hmac_sha256(k, d)
  { return rstr2hex(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_sha256(k, d)
  { return rstr2b64(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_sha256(k, d, e)
  { return rstr2any(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha256_vm_test()
{
  return hex_sha256("abc").toLowerCase() ==
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
}

/*
 * Calculate the sha256 of a raw string
 */
function rstr_sha256(s)
{
  return binb2rstr(binb_sha256(rstr2binb(s), s.length * 8));
}

/*
 * Calculate the HMAC-sha256 of a key and some data (raw strings)
 */
function rstr_hmac_sha256(key, data)
{
  var bkey = rstr2binb(key);
  if(bkey.length > 16) bkey = binb_sha256(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
	ipad[i] = bkey[i] ^ 0x36363636;
	opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binb_sha256(ipad.concat(rstr2binb(data)), 512 + data.length * 8);
  return binb2rstr(binb_sha256(opad.concat(hash), 512 + 256));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
	x = input.charCodeAt(i);
	output += hex_tab.charAt((x >>> 4) & 0x0F)
		   +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
	var triplet = (input.charCodeAt(i) << 16)
				| (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
				| (i + 2 < len ? input.charCodeAt(i+2)      : 0);
	for(var j = 0; j < 4; j++)
	{
	  if(i * 8 + j * 6 > input.length * 8) output += b64pad;
	  else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
	}
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var remainders = Array();
  var i, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
	dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. We stop when the dividend is zero.
   * All remainders are stored for later use.
   */
  while(dividend.length > 0)
  {
	quotient = Array();
	x = 0;
	for(i = 0; i < dividend.length; i++)
	{
	  x = (x << 16) + dividend[i];
	  q = Math.floor(x / divisor);
	  x -= q * divisor;
	  if(quotient.length > 0 || q > 0)
		quotient[quotient.length] = q;
	}
	remainders[remainders.length] = x;
	dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
	output += encoding.charAt(remainders[i]);

  /* Append leading zero equivalents */
  var full_length = Math.ceil(input.length * 8 /
									(Math.log(encoding.length) / Math.log(2)))
  for(i = output.length; i < full_length; i++)
	output = encoding[0] + output;

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
	/* Decode utf-16 surrogate pairs */
	x = input.charCodeAt(i);
	y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
	if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
	{
	  x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
	  i++;
	}

	/* Encode output as utf-8 */
	if(x <= 0x7F)
	  output += String.fromCharCode(x);
	else if(x <= 0x7FF)
	  output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
									0x80 | ( x         & 0x3F));
	else if(x <= 0xFFFF)
	  output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
									0x80 | ((x >>> 6 ) & 0x3F),
									0x80 | ( x         & 0x3F));
	else if(x <= 0x1FFFFF)
	  output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
									0x80 | ((x >>> 12) & 0x3F),
									0x80 | ((x >>> 6 ) & 0x3F),
									0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
	output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
								  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
	output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
								   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of big-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binb(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
	output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
	output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
  return output;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
	output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
  return output;
}

/*
 * Main sha256 function, with its support functions
 */
function sha256_S (X, n) {return ( X >>> n ) | (X << (32 - n));}
function sha256_R (X, n) {return ( X >>> n );}
function sha256_Ch(x, y, z) {return ((x & y) ^ ((~x) & z));}
function sha256_Maj(x, y, z) {return ((x & y) ^ (x & z) ^ (y & z));}
function sha256_Sigma0256(x) {return (sha256_S(x, 2) ^ sha256_S(x, 13) ^ sha256_S(x, 22));}
function sha256_Sigma1256(x) {return (sha256_S(x, 6) ^ sha256_S(x, 11) ^ sha256_S(x, 25));}
function sha256_Gamma0256(x) {return (sha256_S(x, 7) ^ sha256_S(x, 18) ^ sha256_R(x, 3));}
function sha256_Gamma1256(x) {return (sha256_S(x, 17) ^ sha256_S(x, 19) ^ sha256_R(x, 10));}
function sha256_Sigma0512(x) {return (sha256_S(x, 28) ^ sha256_S(x, 34) ^ sha256_S(x, 39));}
function sha256_Sigma1512(x) {return (sha256_S(x, 14) ^ sha256_S(x, 18) ^ sha256_S(x, 41));}
function sha256_Gamma0512(x) {return (sha256_S(x, 1)  ^ sha256_S(x, 8) ^ sha256_R(x, 7));}
function sha256_Gamma1512(x) {return (sha256_S(x, 19) ^ sha256_S(x, 61) ^ sha256_R(x, 6));}

var sha256_K = new Array
(
  1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993,
  -1841331548, -1424204075, -670586216, 310598401, 607225278, 1426881987,
  1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522,
  264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
  -1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585,
  113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
  1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885,
  -1035236496, -949202525, -778901479, -694614492, -200395387, 275423344,
  430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
  1537002063, 1747873779, 1955562222, 2024104815, -2067236844, -1933114872,
  -1866530822, -1538233109, -1090935817, -965641998
);

function binb_sha256(m, l)
{
  var HASH = new Array(1779033703, -1150833019, 1013904242, -1521486534,
					   1359893119, -1694144372, 528734635, 1541459225);
  var W = new Array(64);
  var a, b, c, d, e, f, g, h;
  var i, j, T1, T2;

  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;

  for(i = 0; i < m.length; i += 16)
  {
	a = HASH[0];
	b = HASH[1];
	c = HASH[2];
	d = HASH[3];
	e = HASH[4];
	f = HASH[5];
	g = HASH[6];
	h = HASH[7];

	for(j = 0; j < 64; j++)
	{
	  if (j < 16) W[j] = m[j + i];
	  else W[j] = safe_add(safe_add(safe_add(sha256_Gamma1256(W[j - 2]), W[j - 7]),
											sha256_Gamma0256(W[j - 15])), W[j - 16]);

	  T1 = safe_add(safe_add(safe_add(safe_add(h, sha256_Sigma1256(e)), sha256_Ch(e, f, g)),
														  sha256_K[j]), W[j]);
	  T2 = safe_add(sha256_Sigma0256(a), sha256_Maj(a, b, c));
	  h = g;
	  g = f;
	  f = e;
	  e = safe_add(d, T1);
	  d = c;
	  c = b;
	  b = a;
	  a = safe_add(T1, T2);
	}

	HASH[0] = safe_add(a, HASH[0]);
	HASH[1] = safe_add(b, HASH[1]);
	HASH[2] = safe_add(c, HASH[2]);
	HASH[3] = safe_add(d, HASH[3]);
	HASH[4] = safe_add(e, HASH[4]);
	HASH[5] = safe_add(f, HASH[5]);
	HASH[6] = safe_add(g, HASH[6]);
	HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
}

function safe_add (x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.amazon.com/Test-William-Sleator/dp/0810989891/ref=sr_1_1?ie=UTF8&qid=1308010556&sr=8-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Sleator",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html",
						"url": false
					}
				],
				"publisher": "Amulet Books",
				"date": "2010-04-01",
				"edition": "Reprint",
				"ISBN": "0810989891",
				"numPages": "320",
				"title": "Test",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Dstripbooks&field-keywords=foot&x=0&y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/Loveless-My-Bloody-Valentine/dp/B000002LRJ/ref=ntt_mus_ep_dpi_1",
		"items": [
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"firstName": "My Bloody",
						"lastName": "Valentine",
						"creatorType": "performer"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html",
						"url": false
					}
				],
				"label": "Sire / London/Rhino",
				"audioRecordingType": "Audio CD",
				"date": "1991-11-05",
				"extra": "1991-11-05",
				"title": "Loveless",
				"libraryCatalog": "Amazon.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/s?ie=UTF8&keywords=The%20Harvard%20Concise%20Dictionary%20of%20Music%20and%20Musicians&index=blended&Go=o",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.amazon.com/Adaptation-Superbit-Collection-Nicholas-Cage/dp/B00005JLRE/ref=sr_1_1?ie=UTF8&qid=1309683150&sr=8-1",
		"items": [
			{
				"itemType": "videoRecording",
				"creators": [
					{
						"firstName": "Nicolas",
						"lastName": "Cage",
						"creatorType": "castMember"
					},
					{
						"firstName": "Meryl",
						"lastName": "Streep",
						"creatorType": "castMember"
					},
					{
						"firstName": "Chris",
						"lastName": "Cooper",
						"creatorType": "castMember"
					},
					{
						"firstName": "Tilda",
						"lastName": "Swinton",
						"creatorType": "castMember"
					},
					{
						"firstName": "Jay",
						"lastName": "Tavare",
						"creatorType": "castMember"
					},
					{
						"firstName": "Spike",
						"lastName": "Jonze",
						"creatorType": "director"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Amazon.com Link",
						"snapshot": false,
						"mimeType": "text/html",
						"url": "http://www.amazon.com/dp/B00005JLRE"
					}
				],
				"studio": "Sony Pictures Home Entertainment",
				"videoRecordingType": "DVD",
				"runningTime": "114",
				"date": "2003-05-20",
				"ISBN": "0767879805",
				"extra": "2002-12-06",
				"title": "Adaptation",
				"libraryCatalog": "Amazon.com"
			}
		]
	}
]
/** END TEST CASES **/