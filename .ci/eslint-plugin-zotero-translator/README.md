# eslint-plugin-zotero-translator

Checks Zotero translators for errors and recommended style

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-zotero-translator`:

```
$ npm install eslint-plugin-zotero-translator --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-zotero-translator` globally.

## Usage

Add `zotero-translator` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "zotero-translator"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "zotero-translator/rule-name": 2
    }
}
```

## Supported Rules

* Fill in provided rules here





