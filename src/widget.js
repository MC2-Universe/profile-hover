import dom, { Fragment } from 'jsx-render';
import { getProfile, getVerifiedAccounts } from '3box/lib/api';
import { getAddressDisplay, formatProfileData, addToClipboard } from './utils';
import store from 'store'
import makeBlockie from 'ethereum-blockies-base64';
const { BaseTemplate, LoadingTemplate } = require('./html')({ dom, Fragment });

import style from './style.less';
const css = style.toString()

// local store settings, cache for profile requests
const expirePlugin = require('store/plugins/expire')
store.addPlugin(expirePlugin)
const ttl = 1000 * 60 * 15
const expireAt = () => new Date().getTime() + ttl

 // Plugin
const injectCSS = () => {
  const sheet = document.createElement('style')
  sheet.type = 'text/css';
  sheet.appendChild(document.createTextNode(css));
  document.body.appendChild(sheet);
}

const initPlugins = (buttonArray) => {
  for (let i = 0; i < buttonArray.length; i++) {
    let { address, display, theme } = buttonArray[i].dataset
    theme = !(theme === 'none')
    const addressDisplay = getAddressDisplay(address, display)
    const html = theme ? undefined : buttonArray[i].innerHTML
    setProfileContent(buttonArray[i], LoadingTemplate({
      data: {address, addressDisplay, imgSrc: makeBlockie(address)},
      opts: {html}
    }))
  }
}

const loadPluginData = async (buttonArray) => {
  store.removeExpiredKeys()
  for (let i = 0; i < buttonArray.length; i++) {
    // get address, maybe do map instead, add other options here after
    let { address, display, theme } = buttonArray[i].dataset
    theme = !(theme === 'none')
    const addressDisplay = getAddressDisplay(address, display)

    const profile = await retrieveProfile(address)
    const verified = profile.verified
    const data = formatProfileData(profile, verified, address, addressDisplay);
    const html = theme ? undefined : buttonArray[i].querySelector("#orginal_html_f1kx").innerHTML

    if (profile.status === 'error') {
      setProfileContent(buttonArray[i], BaseTemplate({ data }))
    } else {
      setProfileContent(buttonArray[i], BaseTemplate({ data, opts: {html} }))
    }
  }
}

const retrieveProfile = async (address) => {
  const cacheProfile = await store.get(address)
  if (profile) {
    return JSON.parse(cacheProfile)
  }

  const profile = await getProfile(address)
  const verified = await getVerifiedAccounts(profile)
  const setCacheProfile = Object.assign(profile, { verified })
  store.set(address, JSON.stringify(setCacheProfile), expireAt())

  return profile
}

const copyAddress = (target, address) => {
  addToClipboard(address)
  copyToCheck(target)
  setTimeout(() => checkToCopy(target), 2000)
}

const copyToCheck = (target) => {
  target.querySelector('.check').style = 'display: block;'
}

const checkToCopy = (target) => {
  target.querySelector('.check').style = 'display: none;'
}

const createPlugins = () => {
  injectCSS()

  window['boxCopyAddress_f1kx'] = copyAddress

  document.addEventListener("DOMContentLoaded", function(event) {
    const buttonArray = document.getElementsByTagName("mc3-address")
    initPlugins(buttonArray)
    window.addEventListener('load', async () => {
      loadPluginData(buttonArray)
    })
  })
}

const pluginAddedListener = () => {
  const target = document.body
  const config = {
    childList: true,
  }
  function subscriber(mutations) {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        const newElements = Array.from(mutation.addedNodes)
        const addressTags = newElements.filter(el => el.tagName === 'THREEBOX-ADDDRESS')
        initPlugins(addressTags)
        loadPluginData(addressTags)
      }
    })
  }

  const observer = new MutationObserver(subscriber);

  observer.observe(target, config);
}

const setProfileContent = (element, newChild) => {
  element.childNodes.forEach(child => child.remove());
  element.appendChild(newChild);
}

pluginAddedListener()

createPlugins()
