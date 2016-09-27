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


#list all commits where files are deleted
commits=$(git --no-pager log --diff-filter=D --pretty="%H")
first=true
for c in $commits; do
  echo "$c"
  #check that a JavaScript file (i.e. a translator) is deleted
  jsdeleted=$(git show --name-status $c | grep ^D.*\.js | sed 's/^D\s*//')
  if [[ -n "$jsdeleted" ]];then
    if [ "$first" = true ];then
      before=$(git log -n 2 $c --pretty=format:"%H" | tail -1)
      # number increased
      oldrevision=$(git show "$before":deleted.txt | awk 'NR<2 { print $1 }')
      newrevision=$(awk 'NR<2 { print $1 }' deleted.txt)
      if [ $newrevision -ne $(($oldrevision + 1)) ];then
        echo "Error: translators are deleted but the number in deleted.txt is not increased by 1 (compared to commit $before)."
        echo "$newrevision (newrevision) =/= $oldrevision (oldrevision) + 1"
        exit 1
      fi
      first=false
    fi
    
    # all deleted translator ids must be listed in deleted.txt
    #echo $jsdeleted
    #git show "$c" --diff-filter=D | grep '"translatorID"'
    delids=$(git show "$c" --diff-filter=D | grep '"translatorID"' | awk -F: '{print $2}' | sed 's/[", ]//g')
    listed=$(echo $delids | xargs -i grep -c {} deleted.txt | awk '$1!="1" {print "Error"}')
    rename=$(cat *.js | grep -c $delids | awk '$1!="1" {print "Error"}')
    if [[ (-n "$listed") && (-n "$rename") ]];then
      echo "Error: translators are deleted but not listed in deleted.txt."
      echo "Commit: $c"
      echo "Deleted translator: $jsdeleted ; with id $delids"
      echo $delids | xargs -i grep -c {} *.js
      exit 1
    fi
    
  fi
done


staged=$(git diff origin/master --name-only --diff-filter=ACM -- '*.js*')
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