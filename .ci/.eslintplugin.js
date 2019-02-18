const fs = require('fs')

const deleted = new Set(
  fs.readFileSync('../deleted.txt', 'utf-8')
  .split('\n')
  .map(line => line.split(' ')[0])
  .filter(id => id && id.indexOf('-') > 0)
)
const headers = {}

const translators = new Set([])
    "withCarriageReturn"
    "deprecatedForEach"


function isExecutable(filename) {
  try {
    fs.accessSync(filename, fs.constants.X_OK)
    return true
  } catch (err) {
    return false
  }
}

module.exports = {
  processors: {
    // assign to the file extension you want (.js, .jsx, .html, etc.)
    ".js": {
      // takes text of the file and filename
      preprocess: function(text, filename) {
        headers[filename] = {
          raw: '',
          errors: [],
        }

        if (isExecutable(filename)) {
          headers[filename].errors.push({
            ruleId: 'header/executableFile',
            severity: 2,
            message: 'Translator should not be executable',
            line: 1,
            column: 1,
            source: filename,
          })
        }

        // capture header
        headers[filename].raw = text.replace(/\n}\n[\S\s]*/, '\n}')

        try {
          headers[filename].json = JSON.parse(headers[filename].raw)

        } catch (err) {
          console.log(headers[filename].raw, err)

          headers[filename].errors.push({
            ruleId: 'header/invalidJSON',
            severity: 2,
            message: err.message,
            line: 1,
            column: 1,
            source: headers[filename].raw,
          })
        }

        const h = headers[filename].json
        if (h) {
          if (!h.translatorID) {
            headers[filename].errors.push({
              ruleId: 'header/notOneTranslatorID',
              severity: 2,
              message: 'No translator ID',
              line: 1,
              column: 1,
              source: headers[filename].raw,
            })

          } else if (translators.has(h.translatorID)) {
            headers[filename].errors.push({
              ruleId: 'header/nonUniqueTranslatorID',
              severity: 2,
              message: 'Duplicate translator ID',
              line: 1,
              column: 1,
              source: headers[filename].raw,
            })

          } else if (deleted.has(h.translatorID)) {
            headers[filename].errors.push({
              ruleId: 'header/reusingDeletedID',
              severity: 2,
              message: 'Uses deleted translator ID',
              line: 1,
              column: 1,
              source: headers[filename].raw,
            })

          } 

          if (h.translatorID) translators.add(h.translatorID)

          const stats = fs.statSync(filename)
          if (!h.lastUpdated) {
            headers[filename].errors.push({
              ruleId: 'header/noLastUpdated',
              severity: 2,
              message: 'No lastUpdated field',
              line: 1,
              column: 1,
              source: headers[filename].raw,
            })
          
          // git doesn't retain file modification dates, and it's too involved to hit the github API all the time
          /* } else if (stats.mtime > (new Date(h.lastUpdated))) {
            headers[filename].errors.push({
              ruleId: 'header/lastUpdatedNotUpdated',
              severity: 2,
              message: 'lastUpdated field is older than file modification time',
              line: 1,
              column: 1,
              source: headers[filename].raw,
            })

          */
          }
        }

        text.split('\n').forEach((line, lineno) => {
          const cr = line.indexOf('\r') + 1
          if (cr) {
            headers[filename].errors.push({
              ruleId: 'withCarriageReturn',
              severity: 2,
              message: 'No carriage returns',
              line: lineno + 1,
              column: cr,
              source: headers[filename].raw,
            })
          }
        })

        text = `var __${filename.replace(/[^a-z]/gi, '')} = ${text.replace('\n', ' // eslint-disable-line no-unused-vars \n')}`
        // fs.writeFileSync('tt.js', text, 'utf-8')
        return [text]
      },

      // takes a Message[][] and filename
      postprocess: function(messages, filename) {
        return headers[filename].errors.concat(messages[0])
      },

      supportsAutofix: false // (optional, defaults to false)
    }
  }
};

