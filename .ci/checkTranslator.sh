#!/bin/bash

# Global variable holding the currently checked file
TRANSLATOR=
TRANSLATOR_BASENAME=

# These checks will result in an error
declare -a ERROR_CHECKS=(
    "notOneTranslatorID"
    "nonUniqueTranslatorID"
    "executableFile"
    "invalidJSON"
    "withCarriageReturn"
    "deprecatedForEach"
)

# These checks will emit warnings but still pass
declare -a WARN_CHECKS=(
    "badLicense"
    "problematicJS"
)

#-----------------------------------------------------------------------
# Checks
#-----------------------------------------------------------------------

# Every translator must have exactly one translator ID
notOneTranslatorID () {
    local nIds
    nIds=$(grep -c '"translatorID"' "$TRANSLATOR")
    case "$nIds" in
        1) return ;;
        0) err "Missing translatorID" ;;
        *) err "Too many translatorID"
    esac
    return 1
}

# Every translatorID must be unique
nonUniqueTranslatorID () {
    local dir id duplicateIds
    dir=$(dirname "$TRANSLATOR")
    id=$(grep -r '"translatorID"' "$TRANSLATOR" \
        | sed -e 's/[" ,]//g' -e 's/^.*://g')
    if [[ -n "$id" ]];then
      duplicateIds=$(grep -r '"translatorID"' "$dir"/*.js \
              | sed -e 's/[" ,]//g' -e 's/^.*://g' \
              | sort | uniq -d)
      if [[ $duplicateIds = *"$id"* ]];then
          err "Non unique ID $id"
          return 1
      fi
    fi
}

# Translators should not be executable
executableFile () {
    if [[ -x "$TRANSLATOR" ]];then
        err "Should not be executable"
        return 1
    fi
}

# Translators should not have <CR> as they do in dos, windows and on mac
withCarriageReturn () {
    if grep -qP '\x0d' "$TRANSLATOR";then
        err "Should not contain <CR> / \\x0d (windows/mac line endings)"
        return 1
    fi
}

deprecatedForEach () {
    if grep -qE 'for each *\(' "$TRANSLATOR";then
        err "Deprecated JavaScript 'for each' is used"
        return 1
    fi
}

badLicense () {
    if ! grep -q "GNU Affero General Public License" "$TRANSLATOR";then
        warn "Must be AGPL licensed"
        return 1
    fi
}

invalidJSON () {
    jsonerror=$(sed -ne  '1,/^}/p' "$TRANSLATOR" | jsonlint 2>&1)
    if (( $? > 0 ));then
      err "Parse error in JSON metadata part"
      err "$jsonerror"
      return 1
    fi
}

problematicJS () {
    local jshint_error
    jshint_error=$(sed '1,/^}/ s/.*//' "$TRANSLATOR" \
        | sed 's,/\*\* BEGIN TEST,\n\0,' \
        | sed '/BEGIN TEST/,$ d' \
        | jshint --config=jshintrc --reporter=unix -)
    if (( $? > 0 ));then
        warn "JSHint shows issues with this code"
        warn "$jshint_error"
        return 1
    fi
}

#-----------------------------------------------------------------------
# Helpers and main
#-----------------------------------------------------------------------

if [[ -t 1 && "$(tput colors)" -gt 0 ]]; then
    color_ok=$'\e[32;1m'
    color_notok=$'\e[31;1m'
    color_warn=$'\e[33m'
    color_err=$'\e[31m'
    color_reset=$'\e[0m'
fi
err () { echo -e "$*" | sed "s/^/# ${color_err}ERROR:${color_reset} $TRANSLATOR_BASENAME :/" >&2; }
warn () { echo -e "$*" | sed "s/^/# ${color_warn}WARN: ${color_reset} $TRANSLATOR_BASENAME :/" >&2; }
usage () { (( $# > 0 )) && err "$*"; err "Usage: $0 <translator.js>"; }

main() {

    # Add './node_modules/.bin to PATH for jsonlint
    PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"/node_modules/.bin:"$PATH"

    TRANSLATOR="$1"
    TRANSLATOR_BASENAME="$(basename "$TRANSLATOR")"
    [[ -z $TRANSLATOR ]]   && { usage; exit 1; }
    [[ ! -e $TRANSLATOR ]] && { usage "File/Directory not found."; exit 2; }
    [[ -d $TRANSLATOR ]]   && { usage "Must be a file not a directory."; exit 3; }

    declare -a errors=() warnings=()
    for check in "${ERROR_CHECKS[@]}";do $check || errors+=($check); done
    if [[ -z "$SKIP_WARN" ]];then
        for check in "${WARN_CHECKS[@]}";do $check || warnings+=($check); done
    fi
    if (( ${#errors[@]} == 0 ));then
        if (( ${#warnings[@]} == 0 ));then
            echo "${color_ok}ok${color_reset} - $TRANSLATOR"
        else
            echo "${color_ok}ok${color_reset} - $TRANSLATOR (Warnings: ${warnings[*]})"
        fi
    else
        if (( ${#warnings[@]} == 0 ));then
            echo "${color_notok}not ok${color_reset} - $TRANSLATOR (Failed checks: ${errors[*]})"
            exit 1
        else
            echo "${color_notok}not ok${color_reset} - $TRANSLATOR (Failed checks: ${errors[*]}; Warnings: ${warnings[*]})"
            exit 1
        fi
    fi
}

main "$@"
