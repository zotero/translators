#!/bin/bash

SCRIPT_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
. "$SCRIPT_DIR/helper.sh"
cd "$SCRIPT_DIR"

MASTER="master"
BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ "$BRANCH" = "$MASTER" ]];then
    echo "ok - Can only check deleted.txt when not on '$MASTER' branch"
    exit 0
fi

main() {
    local IFS=$'\n'
    declare -a deletions=()
    local failed=0
    # Find all deleted js files
    deletions+=($(git diff-index --diff-filter=D --name-only $MASTER))
    if (( ${#deletions[@]} > 0 ));then
        for f in "${deletions[@]}";do
            local id=$(git show $MASTER:"$f"|grepTranslatorId)
            if ! grep -F "$id" '../deleted.txt';then
                echo "not ok - $id ($f) should be added to deleted.txt"
                (( failed += 1))
            fi
        done
        curVersion=$(head -n1 "../deleted.txt"|grep -o '[0-9]\+')
        origVersion=$(git show "$MASTER:deleted.txt"|head -n1|grep -o '[0-9]\+')
        if (( curVersion <= origVersion ));then
            echo "not ok - version in deleted.txt needs to be increased"
            (( failed += 1))
        fi
    fi
    exit $failed
}
main
