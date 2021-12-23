declare namespace Zotero {
	namespace Utilities {
		function debounce<Type>(fn: Type, delay?: number): Type;
		function throttle<Type>(
			fn: Type,
			wait: number,
			options: { leading: boolean; trailing: boolean }
		): Type;
		function capitalizeName(s: string): string;
		function cleanAuthor<T extends CreatorType>(
			author: string,
			creatorType: T,
			useComma?: boolean
		): Creator<T>;
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
		function getCreatorsForType(itemType: ItemType): CreatorType[];
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

		type HTTPRequestParameters = {
			method?,
			requestHeaders?: { [string]: string },
			body?: string,
			responseCharset?: string,
			responseType?: HTTPResponseType
		}

		type HTTPResponseType =
			| "text"
			| "json"
			| "document";

		type HTTPResponse<T> = {
			status: number,
			headers: { [string]: string },
			body: T
		};

		function request(
			url: string,
			{
				method = "GET",
				requestHeaders,
				body,
				responseCharset,
				responseType = "text"
			}?: HTTPRequestParameters
		): Promise<HTTPResponse<string>>;

		function requestText(
			url: string,
			{
				method = "GET",
				requestHeaders,
				body,
				responseCharset
			}?: Omit<HTTPRequestParameters, "responseType">
		): Promise<HTTPResponse<string>>;

		function request(
			url: string,
			{
				method = "GET",
				requestHeaders,
				body,
				responseCharset,
				responseType = "json"
			}?: {
				method?,
				requestHeaders?: { [string]: string },
				body?: string,
				responseCharset?: string,
				responseType?: "json"
			}
		): Promise<HTTPResponse<any>>;

		function requestJSON(
			url: string,
			{
				method = "GET",
				requestHeaders,
				body,
				responseCharset
			}?: Omit<HTTPRequestParameters, "responseType">
		): Promise<HTTPResponse<any>>;

		function request(
			url: string,
			{
				method = "GET",
				requestHeaders,
				body,
				responseCharset,
				responseType = "document"
			}?: {
				method?,
				requestHeaders?: { [string]: string },
				body?: string,
				responseCharset?: string,
				responseType?: "document"
			}
		): Promise<HTTPResponse<Document>>;

		function requestDocument(
			url: string,
			{
				method = "GET",
				requestHeaders,
				body,
				responseCharset
			}?: Omit<HTTPRequestParameters, "responseType">
		): Promise<HTTPResponse<Document>>;
	}

	interface Attachment {
		title: string;
		snapshot?: boolean;
		mimeType?: string;
		url?: string;
		document?: Document;
		proxy?: boolean;
	}

	type CreatorType =
		| "artist"
		| "contributor"
		| "performer"
		| "composer"
		| "wordsBy"
		| "sponsor"
		| "cosponsor"
		| "author"
		| "commenter"
		| "editor"
		| "translator"
		| "seriesEditor"
		| "bookAuthor"
		| "counsel"
		| "programmer"
		| "reviewedAuthor"
		| "recipient"
		| "director"
		| "scriptwriter"
		| "producer"
		| "interviewee"
		| "interviewer"
		| "cartographer"
		| "inventor"
		| "attorneyAgent"
		| "podcaster"
		| "guest"
		| "presenter"
		| "castMember";

	interface Creator<T extends CreatorType> {
		lastName: string?;
		firstName: string?;
		creatorType: T;
		fieldMode: 1?;
	}

	type ItemType =
		| "annotation"
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

	var Item: {
		new(): GenericItem;
		new(itemType: "artwork"): ArtworkItem;
		new(itemType: "audioRecording"): AudioRecordingItem;
		new(itemType: "bill"): BillItem;
		new(itemType: "blogPost"): BlogPostItem;
		new(itemType: "book"): BookItem;
		new(itemType: "bookSection"): BookSectionItem;
		new(itemType: "case"): CaseItem;
		new(itemType: "computerProgram"): ComputerProgramItem;
		new(itemType: "conferencePaper"): ConferencePaperItem;
		new(itemType: "dictionaryEntry"): DictionaryEntryItem;
		new(itemType: "document"): DocumentItem;
		new(itemType: "email"): EmailItem;
		new(itemType: "encyclopediaArticle"): EncyclopediaArticleItem;
		new(itemType: "film"): FilmItem;
		new(itemType: "forumPost"): ForumPostItem;
		new(itemType: "hearing"): HearingItem;
		new(itemType: "instantMessage"): InstantMessageItem;
		new(itemType: "interview"): InterviewItem;
		new(itemType: "journalArticle"): JournalArticleItem;
		new(itemType: "letter"): LetterItem;
		new(itemType: "magazineArticle"): MagazineArticleItem;
		new(itemType: "manuscript"): ManuscriptItem;
		new(itemType: "map"): MapItem;
		new(itemType: "newspaperArticle"): NewspaperArticleItem;
		new(itemType: "patent"): PatentItem;
		new(itemType: "podcast"): PodcastItem;
		new(itemType: "presentation"): PresentationItem;
		new(itemType: "radioBroadcast"): RadioBroadcastItem;
		new(itemType: "report"): ReportItem;
		new(itemType: "statute"): StatuteItem;
		new(itemType: "thesis"): ThesisItem;
		new(itemType: "tvBroadcast"): TVBroadcastItem;
		new(itemType: "videoRecording"): VideoRecordingItem;
		new(itemType: "webpage"): WebpageItem;
	}

	interface ArtworkItem {
		itemType: "artwork";
		title: string;
		abstractNote?: string;
		artworkMedium?: string;
		artworkSize?: string;
		date?: string;
		language?: string;
		shortTitle?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"artist" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface AudioRecordingItem {
		itemType: "audioRecording";
		title: string;
		abstractNote?: string;
		audioRecordingFormat?: string;
		seriesTitle?: string;
		volume?: string;
		numberOfVolumes?: string;
		place?: string;
		label?: string;
		date?: string;
		runningTime?: string;
		language?: string;
		ISBN?: string;
		shortTitle?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"performer" | "composer" | "contributor" | "wordsBy">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface BillItem {
		itemType: "bill";
		title: string;
		abstractNote?: string;
		billNumber?: string;
		code?: string;
		codeVolume?: string;
		section?: string;
		codePages?: string;
		legislativeBody?: string;
		session?: string;
		history?: string;
		date?: string;
		language?: string;
		url?: string;
		accessDate?: string;
		shortTitle?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"sponsor" | "contributor" | "cosponsor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface BlogPostItem {
		itemType: "blogPost";
		title: string;
		abstractNote?: string;
		blogTitle?: string;
		websiteType?: string;
		date?: string;
		url?: string;
		accessDate?: string;
		language?: string;
		shortTitle?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "commenter" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface BookItem {
		itemType: "book";
		title: string;
		abstractNote?: string;
		series?: string;
		seriesNumber?: string;
		volume?: string;
		numberOfVolumes?: string;
		edition?: string;
		place?: string;
		publisher?: string;
		date?: string;
		numPages?: string;
		language?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "editor" | "seriesEditor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface BookSectionItem {
		itemType: "bookSection";
		title: string;
		abstractNote?: string;
		bookTitle?: string;
		series?: string;
		seriesNumber?: string;
		volume?: string;
		numberOfVolumes?: string;
		edition?: string;
		place?: string;
		publisher?: string;
		date?: string;
		pages?: string;
		language?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "bookAuthor" | "contributor" | "editor" | "seriesEditor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface CaseItem {
		itemType: "case";
		caseName: string;
		abstractNote?: string;
		court?: string;
		dateDecided?: string;
		docketNumber?: string;
		reporter?: string;
		reporterVolume?: string;
		firstPage?: string;
		history?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "counsel">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface ComputerProgramItem {
		itemType: "computerProgram";
		title: string;
		abstractNote?: string;
		seriesTitle?: string;
		versionNumber?: string;
		date?: string;
		system?: string;
		place?: string;
		company?: string;
		programmingLanguage?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		rights?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		accessDate?: string;
		extra?: string;

		creators: Creator<"programmer" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface ConferencePaperItem {
		itemType: "conferencePaper";
		title: string;
		abstractNote?: string;
		date?: string;
		proceedingsTitle?: string;
		conferenceName?: string;
		place?: string;
		publisher?: string;
		volume?: string;
		pages?: string;
		series?: string;
		language?: string;
		DOI?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "editor" | "seriesEditor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface DictionaryEntryItem {
		itemType: "dictionaryEntry";
		title: string;
		abstractNote?: string;
		dictionaryTitle?: string;
		series?: string;
		seriesNumber?: string;
		volume?: string;
		numberOfVolumes?: string;
		edition?: string;
		place?: string;
		publisher?: string;
		date?: string;
		pages?: string;
		language?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "editor" | "seriesEditor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface DocumentItem {
		itemType: "document";
		title: string;
		abstractNote?: string;
		publisher?: string;
		date?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "editor" | "reviewedAuthor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface EmailItem {
		itemType: "email";
		subject: string;
		abstractNote?: string;
		date?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		language?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "recipient">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface EncyclopediaArticleItem {
		itemType: "encyclopediaArticle";
		title: string;
		abstractNote?: string;
		encyclopediaTitle?: string;
		series?: string;
		seriesNumber?: string;
		volume?: string;
		numberOfVolumes?: string;
		edition?: string;
		place?: string;
		publisher?: string;
		date?: string;
		pages?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		language?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "editor" | "seriesEditor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface FilmItem {
		itemType: "film";
		title: string;
		abstractNote?: string;
		distributor?: string;
		date?: string;
		genre?: string;
		videoRecordingFormat?: string;
		runningTime?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"director" | "contributor" | "producer" | "scriptwriter">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface ForumPostItem {
		itemType: "forumPost";
		title: string;
		abstractNote?: string;
		forumTitle?: string;
		postType?: string;
		date?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface HearingItem {
		itemType: "hearing";
		title: string;
		abstractNote?: string;
		committee?: string;
		place?: string;
		publisher?: string;
		numberOfVolumes?: string;
		documentNumber?: string;
		pages?: string;
		legislativeBody?: string;
		session?: string;
		history?: string;
		date?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface InstantMessageItem {
		itemType: "instantMessage";
		title: string;
		abstractNote?: string;
		date?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "recipient">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface InterviewItem {
		itemType: "interview";
		title: string;
		abstractNote?: string;
		date?: string;
		interviewMedium?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"interviewee" | "contributor" | "interviewer" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface JournalArticleItem {
		itemType: "journalArticle";
		title: string;
		abstractNote?: string;
		publicationTitle?: string;
		volume?: string;
		issue?: string;
		pages?: string;
		date?: string;
		series?: string;
		seriesTitle?: string;
		seriesText?: string;
		journalAbbreviation?: string;
		language?: string;
		DOI?: string;
		ISSN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "editor" | "reviewedAuthor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface LetterItem {
		itemType: "letter";
		title: string;
		abstractNote?: string;
		letterType?: string;
		date?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "recipient">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface MagazineArticleItem {
		itemType: "magazineArticle";
		title: string;
		abstractNote?: string;
		publicationTitle?: string;
		volume?: string;
		issue?: string;
		date?: string;
		pages?: string;
		language?: string;
		ISSN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "reviewedAuthor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface ManuscriptItem {
		itemType: "manuscript";
		title: string;
		abstractNote?: string;
		manuscriptType?: string;
		place?: string;
		date?: string;
		numPages?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface MapItem {
		itemType: "map";
		title: string;
		abstractNote?: string;
		mapType?: string;
		scale?: string;
		seriesTitle?: string;
		edition?: string;
		place?: string;
		publisher?: string;
		date?: string;
		language?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"cartographer" | "contributor" | "seriesEditor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface NewspaperArticleItem {
		itemType: "newspaperArticle";
		title: string;
		abstractNote?: string;
		publicationTitle?: string;
		place?: string;
		edition?: string;
		date?: string;
		section?: string;
		pages?: string;
		language?: string;
		shortTitle?: string;
		ISSN?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "reviewedAuthor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface PatentItem {
		itemType: "patent";
		title: string;
		abstractNote?: string;
		place?: string;
		country?: string;
		assignee?: string;
		issuingAuthority?: string;
		patentNumber?: string;
		filingDate?: string;
		pages?: string;
		applicationNumber?: string;
		priorityNumbers?: string;
		issueDate?: string;
		references?: string;
		legalStatus?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"inventor" | "attorneyAgent" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface PodcastItem {
		itemType: "podcast";
		title: string;
		abstractNote?: string;
		seriesTitle?: string;
		episodeNumber?: string;
		audioFileType?: string;
		runningTime?: string;
		url?: string;
		accessDate?: string;
		language?: string;
		shortTitle?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"podcaster" | "contributor" | "guest">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface PresentationItem {
		itemType: "presentation";
		title: string;
		abstractNote?: string;
		presentationType?: string;
		date?: string;
		place?: string;
		meetingName?: string;
		url?: string;
		accessDate?: string;
		language?: string;
		shortTitle?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"presenter" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface RadioBroadcastItem {
		itemType: "radioBroadcast";
		title: string;
		abstractNote?: string;
		programTitle?: string;
		episodeNumber?: string;
		audioRecordingFormat?: string;
		place?: string;
		network?: string;
		date?: string;
		runningTime?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"director" | "castMember" | "contributor" | "guest" | "producer" | "scriptwriter">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface ReportItem {
		itemType: "report";
		title: string;
		abstractNote?: string;
		reportNumber?: string;
		reportType?: string;
		seriesTitle?: string;
		place?: string;
		institution?: string;
		date?: string;
		pages?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "seriesEditor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface StatuteItem {
		itemType: "statute";
		nameOfAct: string;
		abstractNote?: string;
		code?: string;
		codeNumber?: string;
		publicLawNumber?: string;
		dateEnacted?: string;
		pages?: string;
		section?: string;
		session?: string;
		history?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface ThesisItem {
		itemType: "thesis";
		title: string;
		abstractNote?: string;
		thesisType?: string;
		university?: string;
		place?: string;
		date?: string;
		numPages?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface TVBroadcastItem {
		itemType: "tvBroadcast";
		title: string;
		abstractNote?: string;
		programTitle?: string;
		episodeNumber?: string;
		videoRecordingFormat?: string;
		place?: string;
		network?: string;
		date?: string;
		runningTime?: string;
		language?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"director" | "castMember" | "contributor" | "guest" | "producer" | "scriptwriter">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface VideoRecordingItem {
		itemType: "videoRecording";
		title: string;
		abstractNote?: string;
		videoRecordingFormat?: string;
		seriesTitle?: string;
		volume?: string;
		numberOfVolumes?: string;
		place?: string;
		studio?: string;
		date?: string;
		runningTime?: string;
		language?: string;
		ISBN?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		archive?: string;
		archiveLocation?: string;
		libraryCatalog?: string;
		callNumber?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"director" | "castMember" | "contributor" | "producer" | "scriptwriter">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface WebpageItem {
		itemType: "webpage";
		title: string;
		abstractNote?: string;
		websiteTitle?: string;
		websiteType?: string;
		date?: string;
		shortTitle?: string;
		url?: string;
		accessDate?: string;
		language?: string;
		rights?: string;
		extra?: string;

		creators: Creator<"author" | "contributor" | "translator">[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	interface GenericItem {
		itemType: ItemType;
		title: string;
		abstractNote?: string;
		date?: string;
		shortTitle?: string;
		url?: string;
		language?: string;
		rights?: string;
		extra?: string;

		[key: string]: string; // allow unknown fields

		creators: Creator<CreatorType>[];
		attachments: Attachment[];
		notes: Note[];
		seeAlso: string[];
		complete(): void;
	}

	type Item =
		| ArtworkItem
		| AudioRecordingItem
		| BillItem
		| BlogPostItem
		| BookItem
		| BookSectionItem
		| CaseItem
		| ComputerProgramItem
		| ConferencePaperItem
		| DictionaryEntryItem
		| DocumentItem
		| EmailItem
		| EncyclopediaArticleItem
		| FilmItem
		| ForumPostItem
		| HearingItem
		| InstantMessageItem
		| InterviewItem
		| JournalArticleItem
		| LetterItem
		| MagazineArticleItem
		| ManuscriptItem
		| MapItem
		| NewspaperArticleItem
		| PatentItem
		| PodcastItem
		| PresentationItem
		| RadioBroadcastItem
		| ReportItem
		| StatuteItem
		| ThesisItem
		| TVBroadcastItem
		| VideoRecordingItem
		| WebpageItem
		| GenericItem;

	interface Note {
		title?: string;
		note: string;
	}

	interface Collection { }

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
			handler: (translate: Zotero.Translate, item: GenericItem) => void
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

declare var request = ZU.request;
declare var requestText = ZU.requestText;
declare var requestJSON = ZU.requestJSON;
declare var requestDocument = ZU.requestDocument;
