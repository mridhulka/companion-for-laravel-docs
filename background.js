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
        searchOnGoogle(selectedText)
    }
    else {
        if (getMatchingProperties(selectedText).length !== 0) {
            let endpoint = getMatchingProperties(selectedText)[0].description
            openInLaravelDocs(endpoint)
        } else {
            searchOnGoogle(selectedText)
        }
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


/*
List of endpoints/ titles in the latest version of Laravel docs
*/
const titles = [
    "artisan",
    "authentication",
    "authorization",
    "billing",
    "blade",
    "broadcasting",
    "cache",
    "cashier-paddle",
    "collections",
    "configuration",
    "console-tests",
    "container",
    "contracts",
    "contributions",
    "controllers",
    "csrf",
    "database-testing",
    "database",
    "deployment",
    "documentation",
    "dusk",
    "eloquent-collections",
    "eloquent-factories",
    "eloquent-mutators",
    "eloquent-relationships",
    "eloquent-resources",
    "eloquent-serialization",
    "eloquent",
    "encryption",
    "envoy",
    "errors",
    "events",
    "facades",
    "filesystem",
    "fortify",
    "frontend",
    "hashing",
    "helpers",
    "homestead",
    "horizon",
    "http-client",
    "http-tests",
    "installation",
    "license",
    "lifecycle",
    "localization",
    "logging",
    "mail",
    "middleware",
    "migrations",
    "mix",
    "mocking",
    "notifications",
    "octane",
    "packages",
    "pagination",
    "passport",
    "passwords",
    "pennant",
    "pint",
    "precognition",
    "processes",
    "providers",
    "queries",
    "queues",
    "rate-limiting",
    "readme",
    "redirects",
    "redis",
    "releases",
    "requests",
    "responses",
    "routing",
    "sail",
    "sanctum",
    "scheduling",
    "scout",
    "seeding",
    "session",
    "socialite",
    "starter-kits",
    "structure",
    "telescope",
    "testing",
    "upgrade",
    "urls",
    "valet",
    "validation",
    "verification",
    "views",
    "vite"
];


function getMatchingProperties(input) {
    input = input.toLowerCase()
    console.log(input)
    const result = [];
    for (const title of titles) {
        if (title.startsWith(input)) {
            //console.log(title);
            const suggestion = {
                content: `${laravelDocsUrl}${title}`,
                description: title
            };
            result.push(suggestion);
        } else if (result.length !== 0) {
            return result;
        }
    }
    return result;
}

chrome.omnibox.onInputChanged.addListener((input, suggest, text) => {
    suggestion = getMatchingProperties(input);
    if (suggestion.length !== 0) {
        chrome.omnibox.setDefaultSuggestion({ description: suggestion[0].description });

        suggestion.shift();

        suggest(suggestion);
    } else {
        let suggestion = []
        suggestion.push(
            {
                content: googleSearchUrl + text,
                deletable: true,
                description: "Search " + `${input}` + " in Google"
            }
        )
        chrome.omnibox.setDefaultSuggestion({ description: suggestion[0].description });

        suggestion.shift();

        suggest(suggestion);

    }

});

chrome.omnibox.onInputEntered.addListener((text, url, disposition) => {
    console.log(getMatchingProperties(text).length)
    if (text.substr(0, 4) != 'http') {
        if (getMatchingProperties(text).length !== 0) {
            let endpoint = getMatchingProperties(text)[0].description
            console.log(endpoint)
            chrome.tabs.create({ url: laravelDocsUrl + endpoint });
        } else {
            chrome.tabs.create({ url: googleSearchUrl + text.toLowerCase() });
        }
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

function searchOnGoogle(query) {
    chrome.tabs.create({ url: googleSearchUrl + query });
}

function openInLaravelDocs(title) {
    chrome.tabs.create({ url: laravelDocsUrl + title });
}