function checkTab(tab) {
  return tab &&
    tab.url &&
    tab.url.startsWith('https://app.hubspot.com') &&
    !tab.url.startsWith('https://app.hubspot.com/login') &&
    !tab.url.startsWith('https://app.hubspot.com/myaccounts-beta') &&
    !tab.url.startsWith('https://app.hubspot.com/developer')
}

async function cb(tabId) {
  let tab = tabId.id
    ? tabId
    : await new Promise((resolve) => {
      chrome.tabs.get(tabId, resolve)
    })
  if (
    checkTab(tab)
  ) {
    chrome.pageAction.show(tab.id)
    return
  }
}

chrome.tabs.onCreated.addListener(cb)
chrome.tabs.onUpdated.addListener(cb)

chrome.pageAction.onClicked.addListener(function (tab) {
  chrome.pageAction.show(tab.id)
  if (
    checkTab(tab)
  ) {
    // send message to content.js to to open app window.
    chrome.tabs.sendMessage(tab.id, { action: 'openAppWindow' }, function(response) {
      console.log(response)
    })
    return
  }
})


function parseQuery(queryString) {
  let query = {}
  let pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&')
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=')
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '')
  }
  return query
}

function oauth(data) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(data, (url) => {
      let q = url.split('?')[1]
      q = parseQuery(q)
      let {
        code,
        error,
        error_description
      } = q
      if (code) {
        resolve(code)
      } else if (error) {
        reject(`${error}:${error_description}`)
      }
    })
  })
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  let {
    data,
    action
  } = request
  if (action === 'oauth') {
    oauth(data)
      .then(res => {
        res = res && res.message
          ? {
            error: res.message
          }
          : res
        sendResponse(res)
      })
      .catch(e => {
        return e
      })
    return true
  }
})
