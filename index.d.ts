declare namespace Zotero {
	namespace Utilities {
		function debounce<Type>(fn: Type, delay?: number): Type;
		function throttle<Type>(
			fn: Type,
			wait: number,
			options: { leading: boolean; trailing: boolean }
		): Type;
		function capitalizeName(s: string): string;
		function cleanAuthor(
			author: string,
			creatorType: string,
			useComma: boolean
		): { firstName: string; lastName: string; creatorType: string };
		function trim(s: string): string;
		function trimInternal(s: string): string;
		function superCleanString(s: string): string;
		function isHTTPURL(url: string, allowNoScheme?: boolean): boolean;
		function cleanURL(url: string, tryHttp?: boolean): string;
		function cleanTags(s: string): string;
		function cleanDOI(s: string): string;
		function cleanISBN(s: string, dontValidate?: boolean): string | false;
		function toISBN13(isbnStr: string): string;
		function cleanISSN(issnStr: string): string | false;
		function text2html(s: string, singleNewlineIsParagraph?: boolean): string;
		function htmlSpecialChars(s: string): string;
		function unescapeHTML(s: string): string;
		// unimplemented: dom2text
		function autoLink(s: string): string;
		function parseMarkup(s: string): string;
		function levenshtein(a: string, b: string): number;
		function isEmpty(o: object): boolean;
		function arrayDiff<Type>(
			array1: Type[],
			array2: Type[],
			useIndex?: false
		): Type[];
		function arrayDiff<Type>(
			array1: Type[],
			array2: Type[],
			useIndex: true
		): number[];
		function arrayEquals<Type>(array1: Type[], array2: Type[]): boolean;
		function arrayShuffle<Type>(array: Type[]): Type[];
		function arrayUnique<Type>(array: Type[]): Type[];
		function forEachChunk<Type, RetType>(
			array: Type[],
			chunkSize: number,
			func: (chunk: Type[]) => RetType
		): RetType[];
		function assignProps(target: any, source: any, props?: string[]): void;
		function rand(min: number, max: number): number;
		function getPageRange(pages: string): [fromPage: number, toPage: number];
		function lpad(s: string, pad: string, length: number): string;
		function ellipsize(
			s: string,
			len: number,
			wordBoundary?: boolean,
			countChars?: boolean
		): string;
		function pluralize(
			num: number,
			forms: [singular: string, plural: string] | string
		): string;
		function numberFormat(
			num: number,
			decimalPlaces: number,
			decimalPoint?: string,
			thousandsSep?: string
		): string;
		function removeDiacritics(s: string, lowercaseOnly?: boolean): string;
		// processAsync
		function deepCopy<Type>(obj: Type): Type;
		function itemTypeExists(itemType: ItemType): boolean;
		function getCreatorsForType(itemType: ItemType): string[];
		function fieldIsValidForType(field: string, itemType: ItemType): boolean;
		function getLocalizedCreatorType(itemType: ItemType): string;
		function quotemeta(literal: string): string;
		function xpath(
			elements: Element | Element[],
			xpath: string,
			namespaces?: { [prefix: string]: string }
		): Element[];
		function xpathText(
			node: Element | Element[],
			xpath: string,
			namespaces?: { [prefix: string]: string },
			delimiter?: string
		): string | null;
		function randomString(len?: number, chars?: string): string;
		// varDump
		function itemToCSLJSON(item: Zotero.Item): any | Promise<any>;
		function itemFromCSLJSON(item: Zotero.Item, cslItem: any): void;
		function parseURL(url: string): {
			fileName: string;
			fileExtension: string;
			fileBaseName: string;
		};
		function resolveIntermediateURL(url: string): string;
		function stringToUTF8Array(
			s: string,
			array: number[] | Uint8Array,
			offset?: number
		): void;
		function getStringByteLength(s: string): number;
		function determineAttachmentIcon(attachment: Attachment): string;
		function generateObjectKey(): string;
		function isValidObjectKey(s: string): boolean;
		// XRegExp

		function capitalizeTitle(s: string, force?: boolean): string;
		function getVersion(): string;
		function getItemArray(
			doc: Document,
			inHere: Element | Element[],
			urlRe?: RegExp,
			rejectRe?: RegExp
		): { [link: string]: string };
		function processDocuments(
			urls: string | string[],
			processor: (doc: Document) => any,
			noCompleteOnError?: boolean
		): void;
		function doGet(
			urls: string | string[],
			processor?: (text: string) => void,
			done?: () => void,
			responseCharset?: string,
			requestHeaders?: { [header: string]: string },
			successCodes?: number[]
		): boolean;
		function doPost(
			url: string,
			body: string,
			onDone: (text: string, xmlhttp: XMLHttpRequest) => void,
			requestHeaders?: { [header: string]: string },
			responseCharset?: string,
			successCodes?: number[]
		): boolean;
		function urlToProxy(url: string): string;
		function urlToProper(url: string): string;
		function formatDate(date: Date, shortFormat?: boolean): string;
		function strToDate(str: string): Date;
		function strToISO(str: string): string;
		function createContextObject(
			item: Zotero.Item,
			version: string,
			asObj?: boolean
		);
		function parseContextObject(
			co: string,
			item: Zotero.Item[]
		): Zotero.Item[] | false;
	}

	interface Attachment {
		title: string;
		snapshot?: boolean;
		mimeType?: string;
		url?: string;
		document?: Document;
	}

	interface Creator {
		lastName: string?;
		firstName: string?;
		creatorType: string;
		fieldMode: 1?;
	}

	type ItemType =
		| "artwork"
		| "attachment"
		| "audioRecording"
		| "bill"
		| "blogPost"
		| "book"
		| "bookSection"
		| "case"
		| "computerProgram"
		| "conferencePaper"
		| "dictionaryEntry"
		| "document"
		| "email"
		| "encyclopediaArticle"
		| "film"
		| "forumPost"
		| "hearing"
		| "instantMessage"
		| "interview"
		| "journalArticle"
		| "letter"
		| "magazineArticle"
		| "manuscript"
		| "map"
		| "newspaperArticle"
		| "note"
		| "patent"
		| "podcast"
		| "presentation"
		| "radioBroadcast"
		| "report"
		| "statute"
		| "thesis"
		| "tvBroadcast"
		| "videoRecording"
		| "webpage";

	class Item {
		constructor(itemType?: ItemType);
		itemType: ItemType;
		creators: Creator[];
		[field: string]: (string | false | 0)?; // support unknown fields
		attachments: Attachment[];
		notes: Note[];
		complete(): void;
	}

	interface Note {
		title: string;
		note: string;
	}

	interface Collection {}

	interface Translator {
		translatorID: string;
		translatorType: number;
		label: string;
		creator: string;
		target: string;
		minVersion: string;
		maxVersion: string;
		priority: number;
		browserSupport: string;
		configOptions: object;
		displayOptions: object;
		hiddenPrefs: object;
		inRepository: boolean;
		lastUpdated: string;
		metadata: object;
		code: string;
		cacheCode: boolean;
		path: string;
		fileName: string;

		getCode(): Promise<string>;
		serialize(): object;
		logError(message: string, lineNumber: number, colNumber: number): void;
		logError(
			message: string,
			errorType: "error" | "warning" | "exception" | "strict",
			lineNumber: number,
			colNumber: number
		): void;
		replaceDeprecatedStatements(code: string): string;

		detectWeb(doc: Document, url: string): string | false;
		doWeb(doc: Document, url: string): void;

		detectImport(): string | false;
		doImport(): void;

		doExport(): void;

		detectSearch(items: Zotero.Item[] | Zotero.Item);
		doSearch(items: Zotero.Item[] | Zotero.Item);
	}

	interface Translate {
		setLocation(location: String): void;
		setTranslator(
			translator: Zotero.Translator[] | Zotero.Translator | string
		): boolean;
		getTranslatorObject(receiver: (obj: Zotero.Translator) => void): void;
		setHandler(
			type: "select",
			handler: (
				translate: Zotero.Translate,
				items: { [id: string]: string }
			) => string[]
		): void;
		setHandler(
			type: "itemDone",
			handler: (translate: Zotero.Translate, item: Zotero.Item) => void
		): void;
		setHandler(
			type: "collectionDone",
			handler: (
				translate: Zotero.Translate,
				collection: Zotero.Collection
			) => void
		): void;
		setHandler(
			type: "done",
			handler: (translate: Zotero.Translate, success: boolean) => void
		): void;
		setHandler(
			type: "debug",
			handler: (translate: Zotero.Translate, message: string) => boolean
		): void;
		setHandler(
			type: "error",
			handler: (translate: Zotero.Translate, error: Error | string) => void
		): void;
		setHandler(
			type: "translators",
			handler: (
				translate: Zotero.Translate,
				translators: Zotero.Translator[]
			) => void
		): void;
		setHandler(
			type: "pageModified",
			handler: (translate: Zotero.Translate, doc: Document) => void
		): void;
		clearHandlers(
			type:
				| "select"
				| "itemDone"
				| "collectionDone"
				| "done"
				| "debug"
				| "error"
				| "translators"
				| "pageModified"
		): void;
		removeHandler(
			type: "select",
			handler: (
				translate: Zotero.Translate,
				items: { [id: string]: string }
			) => string[]
		): void;
		removeHandler(
			type: "itemDone",
			handler: (translate: Zotero.Translate, item: Zotero.Item) => void
		): void;
		removeHandler(
			type: "collectionDone",
			handler: (
				translate: Zotero.Translate,
				collection: Zotero.Collection
			) => void
		): void;
		removeHandler(
			type: "done",
			handler: (translate: Zotero.Translate, success: boolean) => void
		): void;
		removeHandler(
			type: "debug",
			handler: (translate: Zotero.Translate, message: string) => boolean
		): void;
		removeHandler(
			type: "error",
			handler: (translate: Zotero.Translate, error: Error | string) => void
		): void;
		removeHandler(
			type: "translators",
			handler: (
				translate: Zotero.Translate,
				translators: Zotero.Translator[]
			) => void
		): void;
		removeHandler(
			type: "pageModified",
			handler: (translate: Zotero.Translate, doc: Document) => void
		): void;
		setTranslatorProvider(translatorProvider: object): void;
		incrementAsyncProcesses(f: string): void;
		decrementAsyncProcesses(f: string, by?: number): void;
		getTranslators(
			getAllTranslators?: boolean,
			checkSetTranslator?: boolean
		): Promise<Zotero.Translator[]>;
		translate(
			libraryID?: number | false,
			saveAttachments?: boolean,
			linkFiles?: boolean
		): Promise<Zotero.Item[]>;
		getProgress(): number | null;
		resolveURL(url: string, dontUseProxy?: boolean): string;
		setDocument(doc: Document): void;
		setLocation(location: string, rootLocation?: string): void;
		setString(s: string): void;
		setItems(items: Zotero.Item[]): void;
		setLibraryID(libraryID: string): void;
		setCollection(collection: Zotero.Collection): void;
		setDisplayOptions(displayOptions: object): void;
		setSearch(item: Zotero.Item): void;
		setIdentifier(identifier: {
			DOI?: string;
			ISBN?: string;
			PMID?: string;
		}): void;
	}

	// common
	function getOption(option: string): any;
	function getHiddenPref(pref: string): any;
	function loadTranslator(
		translatorType: "web" | "import" | "export" | "search"
	): Zotero.Translate;
	function done(returnValue: string | false): void;
	function debug(str: string, level?: 1 | 2 | 3 | 4 | 5): void;

	// web
	function selectItems(
		items: { [id: string]: string },
		callback: (items: { [id: string]: string }) => void
	): void;
	function monitorDOMChanges(target: Node, config: MutationObserverInit): void;

	// import & export
	function setProgress(value: number): void;

	// export
	function nextItem(): Zotero.Item;
	function nextCollection(): any;
}

import Z = Zotero;
import ZU = Zotero.Utilities;

declare function attr(
	node: ParentNode,
	selector: string,
	attr: string,
	index?: number
): string;
declare function attr(selector: string, attr: string, index?: number): string;
declare function text(
	node: ParentNode,
	selector: string,
	index?: number
): string;
declare function text(selector: string, index?: number): string;
declare function innerText(
	node: ParentNode,
	selector: string,
	index?: number
): string;
declare function innerText(selector: string, index?: number): string;
