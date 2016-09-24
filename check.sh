#!/bin/bash
#
# LICENSE: Public Domain


echo "CHECK that All translator have a translatorID"
haveid=$(grep -c '"translatorID"' *.js | awk -F: '$2!="1" {print $1,"found",$2,"translatorID"}')
if [[ -n "$haveid" ]];then
  echo "Error: no translatorID or multiple translatorIDs"
  echo "$haveid"
  exit 1
fi

echo "CHECK that all translatorIDs are unique"
noduplicate=$( { (grep '"translatorID"' *.js | awk -F: '{print $3}') & (awk -F# 'NR>2 { print $1 }' deleted.txt) } | sed 's/[", ]//g' | sort | uniq -cd)
echo "$noduplicate"
if [[ -n "$noduplicate" ]];then
  echo "Error: duplicate translatorID found"
  echo "$noduplicate"
  exit 1
fi

echo "CHECK that deleted translator are added to deleted.txt and number is increased"
deleted=$(git diff --cached --name-only --diff-filter=D -- '*.js*')
if [[ -n "$deleted" ]];then
  # number increased
  oldrevision=$(git show HEAD:deleted.txt | awk 'NR<2 { print $1 }')
  newrevision=$(awk 'NR<2 { print $1 }' deleted.txt)
  if [ $newrevision -ne $(($oldrevision + 1)) ];then
    echo "Error: translators are deleted but the number in deleted.txt is not increased by 1."
    echo "$newrevision (newrevision) =/= $oldrevision (oldrevision) + 1"
    exit 1
  fi
  # all deleted translator ids must be now listed in deleted.txt
  listed=$(git diff --cached --diff-filter=D -- '*.js*' | grep '"translatorID"' | awk -F: '{print $2}' | sed 's/[", ]//g' | xargs -i grep -c {} deleted.txt | awk '$1!="1" {print "Error"}')
  if [[ -n "$listed" ]];then
    echo "Error: translators are deleted but not listed in deleted.txt."
    exit 1
  fi
fi


staged=$(git diff --cached --name-only --diff-filter=ACM -- '*.js*')
if [[ -n "$staged" ]];then
  echo "Staged"
  echo "$staged"
  # Metadata must be parsable JSON
  # Javascript
  # JSON.parse

  # Javascript must be parsable Javascript
  # https://github.com/UB-Mannheim/zotkat/blob/master/jshint.sh
  for f in "$staged"; do
    sed '1,/^}/ s/.*//' $f \
    | sed 's,/\*\* BEGIN TEST,\n\0,' \
    | sed '/BEGIN TEST/,$ d' \
    | jshint --filename=$f - 
  done;
fi



# If we pass all test so far, then we exit with success code.
exit 0