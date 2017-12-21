/* globals beaker */

const yo = require('yo-yo')
const moment = require('moment')

// globals
// =

// how many px from bottom till more is loaded?
const BEGIN_LOAD_OFFSET = 500

// visits, cached in memory
var aliases = []
var isAtEnd = false

function fetch (cb) {
  var author = ''
  var url = new URL(window.location.href)
  if (author) {
    beaker.ssb.getAliases(author, (err, val) => {
      cb()
    })
  } else {
    beaker.ssb.getAliases((err, entries) => {
      aliases = Object.keys(entries).map(author => {
        return {
          author,
          aliases: Object.keys(entries[author]).map(name => {
            var entry = Object.assign({}, entries[author][name], { name })
            return entry
          })
        }
      })

      cb()
    })
  }
}

fetch(render)

// rendering
// =

function render () {
  var rowEls = []
  var lastDate = moment().startOf('day').add(1, 'day')

  aliases.forEach(author => {
    var authorEls = author.aliases.map(alias => yo`<div class="">${alias.name} => ${alias.content.about} (${alias.content.description})</div>`)
    rowEls.push(yo`<div class="">${author.author} ${authorEls}</div>`)
  })


  // empty state
  if (rowEls.length == 0) {
    rowEls.push(yo`<div class="ll-help">
      <span class="icon icon-info-circled"></span> There are no pages here
    </div>`)
  }

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content" onscroll=${onScrollContent}>
    <h1>User's saved pages</h1>
    <div class="page-toolbar">

    </div>

    <div class="links-list">
      ${rowEls}
    </div>
  </div>`)
}

// event handlers
// =

function onScrollContent (e) {
  if (isAtEnd) { return }

  var el = e.target
  if (el.offsetHeight + el.scrollTop + BEGIN_LOAD_OFFSET >= el.scrollHeight) {
    // hit bottom
    fetchMore(render)
  }
}

// internal methods
// =

function ucfirst (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function niceDate (ts, opts) {
  const endOfToday = moment().endOf('day')
  if (typeof ts == 'number') { ts = moment(ts) }
  if (ts.isSame(endOfToday, 'day')) {
    if (opts && opts.noTime) { return 'today' }
    return ts.fromNow()
  } else if (ts.isSame(endOfToday.subtract(1, 'day'), 'day')) { return 'yesterday' } else if (ts.isSame(endOfToday, 'month')) { return ts.fromNow() }
  return ts.format('ll')
}
