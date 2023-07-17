/*
|----------------------------------------------------------------------------
|   Send notifications
|----------------------------------------------------------------------------
|
|   Notifications are sent only if the link is clicked on a domain other than
|   laravel.com or opened in a new tab. They will also be sent when you
|   "open in a new tab" from context menu, regardless of the domain.
|
*/

let tabIdToPreviousUrl = {};

const currentLaravelVersion = '10.x'
const googleSearchUrl = "https://www.google.com/search?q=" + 'site:laravel.com/docs/' + currentLaravelVersion + ' '
const laravelDocsUrl = "https://laravel.com/docs/" + currentLaravelVersion + "/"


chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {

    if (changeInfo.url && changeInfo.url.match(/laravel\.com\/docs/)) {
        let previousUrl = "";

        previousUrl = tabIdToPreviousUrl[tabId];

        function domainIsLaravel(url) {
            const regex = /^https?:\/\/(?:www\.)?laravel\.com/i;
            return regex.test(url);
        }

        function getLaravelVersion(url) {
            const regex = /\/docs\/([^/]+)/;
            const match = url.match(regex);
            if (match && match[1]) {
                return match[1];
            }
            return null;
        }

        function sendNotification(laravelVersion) {
            let options = {
                type: 'basic',
                title: `Viewing ${laravelVersion}`,
                message: 'Laravel Docs',
                iconUrl: 'icon.png'
            };
            chrome.notifications.create(options);
        }

        function isOtherVersion(laravelVersion) {
            const oldVersions = ['4.2', '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '6.x', '7.x', '8.x', '9.x', 'master']

            return oldVersions.includes(laravelVersion)
        }

        let laravelVersion = getLaravelVersion(changeInfo.url)

        if (!domainIsLaravel(previousUrl) && isOtherVersion(laravelVersion)) {
            console.log(isOtherVersion(laravelVersion))
            sendNotification(laravelVersion)
        }

        // Add the current url as previous url
        tabIdToPreviousUrl[tabId] = changeInfo.url;
    }
});


/*
|----------------------------------------------------------------------------
|   Search using context menu
|----------------------------------------------------------------------------
|
|   Adds an option to search the selected text in laravel docs using google.
|
*/



chrome.contextMenus.onClicked.addListener(genericOnClick);

function searchOnNewTab(selectedText) {
    if (hasBlankSpaces(selectedText)) {
        chrome.tabs.create({ url: googleSearchUrl + selectedText });
    }
    else {
        endpointExist(selectedText)
            .then(function (isValid) {
                if (isValid) {
                    chrome.tabs.create({ url: laravelDocsUrl + selectedText.toLowerCase() });
                } else {
                    chrome.tabs.create({ url: googleSearchUrl + selectedText });
                }
            });
    }
}

// A generic onclick callback function.
function genericOnClick(info) {
    searchOnNewTab(info.selectionText);
}

chrome.runtime.onInstalled.addListener(function () {
    let context = 'selection'
    let title = 'Search Laravel docs for "%s"';
    chrome.contextMenus.create({
        title: title,
        contexts: [context],
        id: context,
    });
});



/*
|----------------------------------------------------------------------------
|   Omnibox
|----------------------------------------------------------------------------
|
|   Go to omnibox & type the keyword "ll" to interact with the extension.
|
*/


chrome.omnibox.onInputEntered.addListener((text) => {
    if (hasBlankSpaces(text)) {
        chrome.tabs.create({ url: googleSearchUrl + text });
    }
    else {
        endpointExist(text)
            .then(function (isValid) {
                if (isValid) {
                    chrome.tabs.create({ url: laravelDocsUrl + text.toLowerCase() });
                } else {
                    chrome.tabs.create({ url: googleSearchUrl + text });
                }
            });
    }
});


function endpointExist(text) {
    return fetch(laravelDocsUrl + text.toLowerCase())
        .then(function (response) {
            if (response.status === 200) {
                return true
            } else {
                return false
            }
        })
}

function hasBlankSpaces(string) {
    const hasBlankSpaces = /\s/.test(string);
    return hasBlankSpaces;
}