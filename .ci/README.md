# Continuous integration tests

The tests here are automatically used by travis
see [.travis.yml](../.travis.yml).


## Requirements

Testing works also locally. The only requirements should be
an (recent) installation of nodejs. Then, for the dependencies you can
simply type
```
npm install
```
 
## Using the npm bindings

You can use the npm bindings to run tests on all translators:
* `npm start` to run check for all errors and warnings with verbose output
(slow, because only one core is used, such that the output will stay in alphabetical order)
* `npm test` to run check for errors only with terse output
(faster, because up to 8 cores are used, such that output will not stay in alphabetical order)


## Using the scripts directly

You can use the bash script `checkTranslator.sh` directly to
run tests on a single translator, e.g.
```
# in .ci directory:
./checkTranslator.sh ../Amazon.js

# in translators directory:
.ci/checkTranslator.sh Amazon.js
```
Moreover, you can skip the warnings by using the `--skip-warn`
option and reference the translators just by their label, e.g.
```
./checkTranslator.sh --skip-warn Amazon
```

You can also check the `deleted.txt` when deleting translators by
```
./checkDeletedTxt.sh
```

(This does a comparison with the master branch, which must be there but
currently not checked out. Otherwise the test is skipped.)

