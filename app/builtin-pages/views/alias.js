/* globals beaker */

const yo = require('yo-yo')
const moment = require('moment')

// globals
// =

// how many px from bottom till more is loaded?
const BEGIN_LOAD_OFFSET = 500

// visits, cached in memory
var aliases = []
var about = {}
var isAtEnd = false
var single = false
function fetch (cb) {
  var url = new URL(window.location.href)
  var author = url.searchParams.get('author')
  var done = false

  beaker.ssb.getAbout((err, val) => {
    about = val

    if(done) {
      cb()
    }
    done = true
  })

  if (author) {
    beaker.ssb.getAliases(author, (err, val) => {
      single = true
      aliases = [{
        author,
        aliases: Object.keys(val).map(name => {
          var entry = Object.assign({}, val[name], { name })
          return entry
        })
      }]

      if(done) {
        cb()
      }
      done = true
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

      if(done) {
        cb()
      }
      done = true
    })
  }
}

fetch(render)

// rendering
// =

function getAliasUrl(author, name) {
  return 'ssb://' + encodeURIComponent(author) + '~' + encodeURIComponent(name)
}

function getBlobUrl(hash) {
  return 'ssb-blob://' + encodeURIComponent(hash)
}

function getAbout(author) {
  var aboutAuthor = {}
  Object.keys(about[author]).forEach(key => {
    // Use only self-described characteristics
    if(about[author][key][author]) {
      aboutAuthor[key] = about[author][key][author][0]
    }
  })

  return aboutAuthor
}

function render () {
  var rowEls = []
  var lastDate = moment().startOf('day').add(1, 'day')

  aliases.forEach(author => {
    var aboutAuthor = getAbout(author.author)
    console.log(aboutAuthor)
    var authorEls = author.aliases.map(alias => yo`<div class="links-list"><a href="${getAliasUrl(author.author, alias.name)}">
        <strong>${alias.name}</strong> => ${alias.content.about} (${alias.content.description})
      </a></div>`)
    rowEls.push(yo`<div class="">
        <span class="user-row">
          <img class="profile" src="${getBlobUrl(aboutAuthor.image)}" />
          ${aboutAuthor.name} - ${author.author}
        </span>
        ${authorEls}
      </div>`)
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
