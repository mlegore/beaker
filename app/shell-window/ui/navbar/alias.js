/* globals beakerSitedata */

import * as yo from 'yo-yo'
import * as pages from '../../pages'
import { findParent } from '../../../lib/fg/event-handlers'
import { ucfirst, getPermId, getPermParam } from '../../../lib/strings'

export class AliasNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    this.siteInfo = false
    this.protocolInfo = false
    this.alias = ''
    this.name = ''
    this.description = ''

    window.addEventListener('click', e => this.onClickAnywhere(e)) // close dropdown on click outside
    pages.on('set-active', e => this.closeDropdown()) // close dropdown on tab change
  }

  render () {
    if (this.protocolInfo && (this.protocolInfo.scheme === 'beaker:')) {
      return ''
    }

    // pull details
    var icon = ''
    var protocolLabel = ''
    this.title = this.getTitle() || this.getHostname() || this.getUrl()

    // render btn
    var iconEl = (icon) ? yo`<i class="fa fa-bookmark-o"></i>` : ''
    var aliasEl = (protocolLabel) ? yo`<span class="title">${protocolLabel}</span>` : ''
    return yo`<div class="toolbar-alias">
      <button onclick=${e => this.toggleDropdown(e)}><i class="fa fa-bookmark-o"></i> ${aliasEl}</button>
      ${this.renderDropdown()}
    </div>`
  }

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.description = e.target.value
  }

  onChangeAlias (e) {
    this.alias = e.target.value
  }

  renderDropdown () {
    if (!this.isDropdownOpen) {
      return ''
    }

    var ti = `<!--<label for="title">Title</label>
    <input name="title" type="text" onchange=${e => this.onChangeTitle(e)} value=${this.title} />-->`

    var responseEl = ''

    if (this.siteInfo && this.siteInfo.aliasPending) {
      responseEl = yo`<span class="pending">Pending...</span>`
    } else if (this.siteInfo && this.siteInfo.aliasSuccess) {
      responseEl = yo`<span class="success-result">Saved!</span>`
    } else if (this.siteInfo && this.siteInfo.aliasError && this.siteInfo.aliasError.message) {
      responseEl = yo`<span class="failure">${this.siteInfo.aliasError.message}</span>`
    }

    // dropdown
    return yo`
      <div class="toolbar-dropdown dropdown toolbar-alias-dropdown">
        <div class="dropdown-items visible with-triangle right">
          <div class="details">
            <div class="details-title">
              Publish Alias
            </div>
            <p class="alias-form">
              <label for="alias">Name</label>
              <input name="alias" type="text" onchange=${e => this.onChangeAlias(e)} />
              <label for="description">Description</label>
              <input name="description" type="text" onchange=${e => this.onChangeDescription(e)} />
              <div class="form-actions">
                ${responseEl}
                <button class="btn cancel alias-button" onclick=${e => this.closeDropdown()}>Cancel</button>
                <button class="btn success alias-button" onclick=${e => this.onSubmit(e)}>Publish</button>
              </div>
            </p>
          </div>
        </div>
      </div>`
  }

  onSubmit (e) {
    if (this.siteInfo) {
      this.siteInfo.aliasPending = true
      this.siteInfo.aliasSuccess = false
      this.siteInfo.aliasError = false
    }

    this.update()

    beaker.ssb.publishAlias({name: this.alias, description: this.description, about: this.getUrl()}, (err, val) => {
      this.siteInfo.aliasPending = false
      if (err) {
        this.siteInfo.aliasError = err
        this.siteInfo.aliasSuccess = false
      } else {
        this.siteInfo.aliasError = null
        this.siteInfo.aliasSuccess = true
      }

      this.update()
    })

  }

  getTitle () {
    var title = ''
    if (this.siteInfoOverride && this.siteInfoOverride.title) {
      title = this.siteInfoOverride.title
    } else if (this.siteInfo && this.siteInfo.title) {
      title = this.siteInfo.title
    } else if (this.protocolInfo && this.protocolInfo.scheme === 'dat:') {
      title = 'Untitled'
    }
    return title
  }

  getUrl () {
    return (this.protocolInfo) ? this.protocolInfo.url : ''
  }

  getHostname () {
    return (this.protocolInfo) ? this.protocolInfo.hostname : ''
  }

  onClickAnywhere (e) {
    if (!this.isDropdownOpen) return
    // close the dropdown if not a click within the dropdown
    if (findParent(e.target, 'toolbar-alias-dropdown')) return
    if (findParent(e.target, 'alias-button')) return
    this.closeDropdown()
  }

  onClickRefresh () {
    pages.getActive().reload()
    this.closeDropdown()
  }

  closeDropdown () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
    }

    this.update()
  }

  toggleDropdown (e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    this.isDropdownOpen = !this.isDropdownOpen
    this.update()
  }

  update () {
    Array.from(document.querySelectorAll('.toolbar-alias')).forEach(el => yo.update(el, this.render()))
  }
}
