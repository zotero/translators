#!/bin/bash

if [[ -t 1 && "$(tput colors)" -gt 0 ]]; then
    export color_ok=$'\e[32;1m'
    export color_notok=$'\e[31;1m'
    export color_warn=$'\e[33m'
    export color_err=$'\e[31m'
    export color_reset=$'\e[0m'
fi

grepTranslatorId () {
    if [[ -n "$1" ]];then
        grep -r '"translatorID"' "$@" | sed -e 's/[" ,]//g' -e 's/^.*://g'
    else
        while read line;do
            echo "$line"|grep '"translatorID"' | sed -e 's/[" ,]//g' -e 's/^.*://g'
        done
    fi
}

# vim: ft=sh
