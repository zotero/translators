

Beautify, unpack or deobfuscate JavaScript and HTML, make JSON/JSONP readable, etc.

All of the source code is completely free and open, available on GitHub under MIT licence,
and we have a command-line version, python library and a node package as well.



HTML <style>, <script> formatting:
	End script and style with newline?
Support e4x/jsx syntax
Use comma-first list style?
Detect packers and obfuscators?
Keep array indentation?
Break lines on chained methods?
Space before conditional: "if(x)" / "if (x)"
Unescape printable chars encoded as \xNN or \uNNNN?
Use JSLint-happy formatting tweaks?
Indent <head> and <body> sections?
Use a simple textarea for code input?

1

{

2

    "translatorID": "5cf8bb21-e350-444f-b9b4-f46d9fab7827",

3

    "label": "DABI",

4

    "creator": "Jens Mittelbach",

5

    "target": "dabi.ib.hu-berlin\\.de/.*?",

6

    "minVersion": "1.0",

7

    "maxVersion": "",

8

    "priority": 100,

9

    "inRepository": true,

10

    "translatorType": 4,

11

    "browserSupport": "g",

12

    "lastUpdated": "2015-12-15 18:59:56"

13

}

14

​

15

/* FW LINE 57:6869c32952b1 */

16

function flatten(c) {

17

    var b = new Array();

18

    for (var d in c) {

19

        var e = c[d];

20

        if (e instanceof Array) {

21

            b = b.concat(flatten(e))

22

        } else {

23

            b.push(e)

24

        }

25

    }

26

    return b

27

}

28

var FW = {

29

    _scrapers: new Array()

30

};

31

FW._Base = function() {

32

    this.callHook = function(b, c, e, a) {

33

        if (typeof this["hooks"] === "object") {

34

            var d = this["hooks"][b];

35

            if (typeof d === "function") {

36

                d(c, e, a)

37

            }

38

        }

39

    };

40

    this.evaluateThing = function(f, e, c) {

41

        var b = typeof f;

42

        if (b === "object") {

43

            if (f instanceof Array) {

44

                var d = this.evaluateThing;

45

                var a = f.map(function(g) {

46

                    return d(g, e, c)

47

                });

48

                return flatten(a)

49

            } else {

50

                return f.evaluate(e, c)

51

            }

52

        } else {

53

            if (b === "function") {

54

                return f(e, c)

55

            } else {

56

                return f

57

            }

58

        }

59

    }

60

};

61

FW.Scraper = function(a) {

62

    FW._scrapers.push(new FW._Scraper(a))

63

};

64

FW._Scraper = function(a) {

65

    for (x in a) {

66

        this[x] = a[x]

Flattr

Browser extensions and other uses:

    A bookmarklet (drag it to your bookmarks) by Ichiro Hiroshi to see all scripts used on the page,
    Chrome: jsbeautify-for-chrome by Tom Rix,
    Chrome: Pretty Beautiful JavaScript by Will McSweeney,
    Chrome: Quick source viewer by Tomi Mickelsson (github, blog),
    Chrome: Stackoverflow Code Beautify by Making Odd Edit Studios (github),
    Firefox: Javascript deminifier by Ben Murphy, to be used together with the firebug (github),
    Safari: Safari extension by Sandro Padin,
    Opera: Readable JavaScript (github) by Dither,
    Opera: Source extension by Deathamns,
    Sublime Text 2: JsFormat, a javascript formatting plugin for this nice editor by Davis Clark,
    vim: sourcebeautify.vim, a plugin by michalliu (requires node.js, V8, SpiderMonkey or cscript js engine),
    vim: vim-jsbeautify, a plugin by Maksim Ryzhikov (node.js or V8 required),
    Emacs: Web-beautify formatting package by Yasuyuki Oka,
    Komodo IDE: Beautify-js addon by Bob de Haas (github),
    C#: ghost6991 ported the javascript formatter to C#,
    Go: ditashi has ported the javascript formatter to golang,
    Fiddler proxy: JavaScript Formatter addon,
    gEdit tips by Fabio Nagao,
    Akelpad extension by Infocatcher,
    Beautifier in Emacs write-up by Seth Mason,
    Cloud9, a lovely IDE running in a browser, working in the node/cloud, uses jsbeautifier (github),
    Shrinker, a non-free JavaScript packer for Mac. I haven't used it, so I have no idea if it's any good,
    REST Console, a request debugging tool for Chrome, beautifies JSON responses (github),
    mitmproxy, a nifty SSL-capable HTTP proxy, provides pretty javascript responses (github).
    wakanda, a neat IDE for web and mobile applications has a Beautifier extension (github).
    Burp Suite now has a beautfier extension, thanks to Soroush Dalili,
    Netbeans jsbeautify plugin by Drew Hamlett (github).
    brackets-beautify-extension for Adobe Brackets by Drew Hamlett (github),
    codecaddy.net, a collection of webdev-related tools, assembled by Darik Hall,
    editey.com, an interesting and free Google-Drive oriented editor uses this beautifier,
    a beautifier plugin for Grunt by Vishal Kadam,
    SynWrite editor has a JsFormat plugin (rar, readme),
    LIVEditor, a live-editing HTML/CSS/JS IDE (commercial, Windows-only) uses the library,
    FullScreenMario, a HTML5/javascript remake of Super Mario Bros game, uses the library in its level editor.
    Doing anything interesting? Write me to einar@jsbeautifier.org and I'll include your link.

Written by Einar Lielmanis, einar@jsbeautifier.org, maintained and evolved by Liam Newman.

We use the wonderful CodeMirror syntax highlighting editor, written by Marijn Haverbeke.

Made with a great help of Jason Diamond, Patrick Hof, Nochum Sossonko, Andreas Schneider,
Dave Vasilevsky, Vital Batmanov, Ron Baldwin, Gabriel Harrison, Chris J. Shull, Mathias Bynens,
Vittorio Gambaletta, Stefano Sanfilippo and Daniel Stockman.

Run the tests
