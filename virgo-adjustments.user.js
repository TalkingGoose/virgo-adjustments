// ==UserScript==
// @name         VIRGO Adjustments
// @version      1.3
// @description  Fixes the Virgo interface
// @author       Paul Watkinson
// @updateURL    https://raw.githubusercontent.com/TalkingGoose/virgo-adjustments/master/virgo-adjustments.meta.js
// @downloadURL  https://raw.githubusercontent.com/TalkingGoose/virgo-adjustments/master/virgo-adjustments.user.js
// @match        http://*/virgo/static/resources/index.html
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

Object.defineProperty(window, 'module', {
    get() {
        return (window._module = window._module || {});
    },

    set(value) {
        window._module = value;
    }
});

function loadScript(url, callback) {
    const script = document.createElement('script');

    script.setAttribute('src', url);
    script.addEventListener('load', function() {
        // Remove the script from the page
        document.body.removeChild(script);

        // Call our load callback
        callback();
    }, false);

    document.body.appendChild(script);
}

function loadModule(name, url, callback) {
    const script = document.createElement('script');

    script.setAttribute('src', url);
    script.addEventListener('load', function() {
        // Save the module elsewhere
        window[name] = window._module.exports;

        // Clear the reference from module
        delete window._module;

        // Remove the script from the page
        document.body.removeChild(script);

        // Call our load callback
        callback();
    }, false);

    document.body.appendChild(script);
}

const customStyle = `
    body {
        font-family: 'Roboto', sans-serif;
    }

    .panel-heading {
        cursor: pointer;
    }

    .navbar-brand {
        padding: 10px !important;
    }

    .navbar-brand > img {
        width: 40px !important;
        height: 30px !important;
    }

    .list-group {
        background: #FFF;
        margin-top: 5px;
    }

    .btn-default {
        margin: 4px;
    }

    #summary > .container-fluid > .row > .col-xs-6:nth-child(1) {
        padding-left: 0;
    }

    #summary > .container-fluid > .row > .col-xs-6:nth-child(2) {
        padding-right: 0;
    }

    #dashboard-playerList, #dashboard-gamesList {
        overflow-y: auto !important;
        margin: 0;
    }

    #dashboard-playerList > ul, #dashboard-gamesList > ul {
        width: 100%;
    }

    #dashboard-connectionList {
        margin: 0;
    }

    .dashboard-list-header > * {
        display: inline-block;
        vertical-align: middle;
    }

    .dashboard-list-header > h2 {
        margin: 0 8px 6px 0;
    }

    #players-table, #games-table {
        margin-bottom: 8px;
    }

    #players-table .btn {
        float: left;
    }

    #player-launch-externalUI-advanced {
        margin: 12px 0 0 0;
    }
`;

const customPanel = `
    <div class="panel panel-default" id="custom-panel">
        <div class="panel-heading">
            <h4 class="panel-title">
                <a data-toggle="collapse" href="#custom-panel-body" class="collapsed" aria-expanded="false">Quick Add</a>
            </h4>
        </div>
        <div id="custom-panel-body" class="panel-collapse collapse" aria-expanded="true">
            <div class="panel-body">
                <form class="form-inline">
                    <div class="form-group">
                        <label for="custom-game-name">Name: </label>
                        <input type="text" class="form-control" id="custom-game-name" name="name">
                    </div>
                    <div class="form-group">
                        <label for="custom-game-content">Content: </label>
                        <input type="text" class="form-control" id="custom-game-content" name="content" placeholder="${window.location.hostname}/games">
                    </div>
                    <div class="form-group">
                        <label for="custom-game-logic">Logic: </label>
                        <input type="text" class="form-control" id="custom-game-logic" name="logic" placeholder="${window.location.hostname}:8125">
                    </div>
                    <button id="custom-button" type="submit" class="btn btn-primary">Add</button>
                </form>
            </div>
        </div>
    </div>
`;

const customPlayerButtons = [
    [
        player => $(`<button class="btn btn-default">Add ${player.balance[0]}100.00</button>`),
        player => VIRGO_API.players.balance.increase(player.playerUID)
    ],

    [
        player => $(`<button class="btn btn-default">Empty Wallet</button>`),
        player => VIRGO_API.players.balance.set(player.playerUID, 0)
    ],

    [
        player => $(`<button class="btn btn-default">Push Wallet Update</button>`),
        player => VIRGO_API.players.balance.update(player.playerUID)
    ]
];

const VIRGO_API = {
    'getJSON': function(url) {
        return new Promise((resolve, reject) => {
            $.getJSON(
                `${window.location.origin}/virgo/sdk-api/${url}`,
                response => resolve(response),
                error => reject(error)
            );
        });
    },

    'post': function(url, data = {}) {
        return new Promise((resolve, reject) => {
            const request = $.post(`${window.location.origin}/virgo/sdk-api/${url}`, data, () => resolve(true));
            request.fail(() => resolve(false));
        });
    },

    'get': function(url) {
        return new Promise((resolve, reject) => {
            $.get(
                `${window.location.origin}/virgo/sdk-api/${url}`,
                () => resolve(true)
            ).fail(() => resolve(false));
        });
    },

    'games': {
        'getAll': function() {
            return VIRGO_API.getJSON('games');
        },

        'add': function(name, content, logic) {
            return VIRGO_API.post('games/add', {
                'gamePath': name,
                'clientMode': 'realClient',
                'contentUrl': `http://${content}/${name}/static/descriptor.xml`,
                'logicMode': 'realLogic',
                'logicUrl': `http://${logic}/`,
                'gameName': '',
                'gameId': '',
                'gameType': 'LATE_PAY_SLOT',
                'protocol': 'JSON',
                'progressive': 'NONE'
            });
        },

        'remove': function(uid) {
            return VIRGO_API.get(`games/remove?id=${uid}`);
        }
    },

    'players': {
        'getAll': function() {
            return VIRGO_API.getJSON('players');
        },

        'get': function(id) {
            return VIRGO_API.getJSON(`player/${id}`);
        },

        'add': function(id, currency) {
            return VIRGO_API.post('players/add', {id, currency});
        },

        'remove': function(id) {
            return VIRGO_API.post('players/remove', {id});
        },

        'balance': {
            'set': function(id, amount) {
                return VIRGO_API.post(`player/${id}/balance/set`, {amount});
            },

            'increase': function(id) {
                return VIRGO_API.get(`player/${id}/balance/increment`);
            },

            'update': function(id) {
                return VIRGO_API.get(`player/${id}/balanceUpdate`);
            }
        }
    }
};

function addCustomPanel() {
    const $panel = $(customPanel);

    $('#summary').append($panel);

    const $form = $panel.find('form');
    const $content = $panel.find('#custom-game-content');
    const $logic = $panel.find('#custom-game-content');

    // Override default submit
    $form.submit(function(event) {
        // Prevent default functionality
        event.preventDefault();

        // Extract the name and port
        let [{value: name}, {value: content}, {value: logic}] = $(this).serializeArray();

        const {hostname} = window.location;

        content = content || `${hostname}/games`;
        logic = (/^\d+$/.test(logic) ? `${hostname}:${logic}` : logic || `${hostname}:8125`);

        // Add the game
        VIRGO_API.games.add(name, content, logic);
    });
}

async function onQuickLaunch(event) {
    // Prevent default functionality
    event.preventDefault();

    const $form = $('#quicklaunch-form');
    const player = $form.find('#quicklaunch-player').val();
    const game = $form.find('#quicklaunch-game').val();

    const data = await VIRGO_API.players.get(player);
    const {currency} = data.playerLocalization;

    // Open the game
    window.open(`${window.location.origin}/virgo/game/${game}?playerId=${player}&currency=${currency}`);
}

function fixQuickLaunch() {
    const $oldButton = $('#quicklaunch-button');
    const $newButton = $('<button id="custom-launch-button" type="submit" class="btn btn-primary">Launch</button>');

    // Grab the parent element (the form)
    const $form = $oldButton.parent();

    // Remove useless items
    $form.find('#quicklaunch-device').parent().remove();
    $form.find('#quicklaunch-externalUI').parent().remove();

    // Prevent the default functionality
    $form.submit(onQuickLaunch);

    // Replace the quick launch button
    $oldButton.remove();
    $form.append($newButton);

    // Add id
    $form.attr('id', 'quicklaunch-form');
}

function fixHeaders() {
    $('.panel-heading > .panel-title > a').each(function() {
        const self = $(this);
        const target = self.parent().parent();

        // Fix header clicking thing
        target.on('click', event => {
            // Cancel the previous event
            event.preventDefault();

            // Click the actual title
            if (event.target !== this) {
                self.click();
            }
        });
    });
}

function fixManageButtons() {
    $('#summary > .container-fluid > .row > .col-xs-6').each(function() {
        const self = $(this);
        const anchor = self.find('a').first();

        anchor.addClass('btn btn-default btn-xs');
    });
}

function fixSummaryPanels() {
    // Fix Games + Players panels
    for (const id of ['#dashboard-playerList', '#dashboard-gamesList']) {
        const section = $(id).parent();
        const items = section.children().not('ul');
        const div = $('<div class="dashboard-list-header panel-heading"></div>');

        // Add the new div
        section.prepend(div);

        // Move items to the new div
        items.detach().appendTo(div);

        const outer = div.parent();
        const content = outer.children();
        const panel = $('<div class="panel panel-default"></div>');

        // Add panel div
        outer.prepend(panel);

        // Move content to panel
        content.detach().appendTo(panel);
    }

    const connections = $('#dashboard-connectionList');
    const panelBody = connections.parent();
    const panelDiv = panelBody.parent();

    connections.detach().appendTo(panelDiv);

    panelBody.remove();
}

function fixPlayerDetails() {
    const left = $('#playerLeftPanel');
    const right = $('#playerRightPanel');

    // Clear style
    left.removeAttr('style');
    right.removeAttr('style');

    // Create parent row element
    const row = $('<div class="row"></div>');

    // Create parent panels
    const leftPanel = $('<div class="col-xs-6"></div>');
    const rightPanel = $('<div class="col-xs-6"></div>');
    const panels = [leftPanel, rightPanel];

    $(window).on('resize', () => {
        for (const panel of panels) {
            if (row.width() < 768) {
                panel
                    .removeClass('col-xs-6')
                    .addClass('col-xs-12');
            } else {
                panel
                    .removeClass('col-xs-12')
                    .addClass('col-xs-6');
            }
        }
    });

    // Add row into details
    row.insertAfter('#playerDetail-heading');

    // Add panels into row
    leftPanel.appendTo(row);
    rightPanel.appendTo(row);

    // Move left & right panel into details
    left.detach().appendTo(leftPanel);
    right.detach().appendTo(rightPanel);

    // Make advanced button actually styled
    $('#player-launch-externalUI-advanced')
        .addClass('btn')
        .addClass('btn-default');
}

function fixPlayerOrder() {
    tinysort('#dashboard-playerList > li', {'data': 'playerid'});
    tinysort('#players-table > tbody > tr', {'data': 'playerid'});
    tinysort('#quicklaunch-player > option', {'data': 'playerid'});
    $('#quicklaunch-player option')[0].selected = true;
}

function fixGamesHeadings() {
    $('#games-table')
        .find('th')
        .each(function() {
            const heading = $(this);
            const text = heading.text();
            const split = text.split(' ');

            for (let i = 0; i < split.length; ++i) {
                split[i] = `${split[i][0].toUpperCase()}${split[i].slice(1)}`;
            }

            // Set the correct text
            heading.text(split.join(' '));
        });
}

function removeProgressive() {
    $('.nav.navbar-nav').children().last().remove();
    $('#summary > .container-fluid > .row').children().last().remove();
    $('#summary > .container-fluid > .row').children().each(function() {
        $(this)
            .removeClass('col-xs-4')
            .addClass('col-xs-6');
    });
}

function addPlayerButtons() {
    $('#players > #players-table')
        .find('tr')
        .each(async function() {
            const row = $(this);
            const balance = $(row.children()[2]);
            const actions = $(row.children()[3]);

            const player = await VIRGO_API.players.get(row.data('playerid'));
            const currencySymbol = player.balance[0];

            for (const [getButton, callback] of customPlayerButtons) {
                // Create button
                const button = getButton(player);

                // Listen to click event
                button.on('click', () => callback(player));

                // Append to buttons
                actions.append(button);
            }
        });
}

function addHistory() {
    History.Adapter.bind(window, 'statechange', function() {
        const state = History.getState();
        const title = state.title;

        console.log(state);

        switch (title) {
            case 'Dashboard':
            case 'Games':
            case 'Players':
            case 'Operators':
                UI[`show${title}`]();
                break;

            default:
                console.log(`Unknown location '${title}'!`);
                break;
        }
    });

    $('.nav.navbar-nav a').each(function() {
        const anchor = $(this);

        anchor.click(event => {
            History.pushState(null, anchor.text(), $(this).attr('href'));
        });
    });
}

const CURRENCIES = [
    'ARS', 'BGN', 'BRL', 'CAD', 'CHF', /*'CLP',*/
    'CZK', 'DKK', 'EUR', 'GBP', /*'GEL',*/ /*'HRK',*/
    'HUF', 'JPY', /*'LTL',*/ /*'LVL',*/ 'MXN', 'NOK',
    'PLN', 'RON', /*'RUB',*/ 'SEK', /*'TRY',*/ 'USD'
];

async function setup() {
    // Add custom style
    $('body').prepend(`<style>${customStyle}</style>`);

    // Add custom fonts
    $('head').append('<link href="https://fonts.googleapis.com/css?family=Roboto:100,100italic,300,300italic,400,400italic,500,500italic,700,700italic,900,900italic" rel="stylesheet" type="text/css">');

    // Add our custom panel
    addCustomPanel();

    // Replace the quick launch functionality
    fixQuickLaunch();

    // Fix the collapsible headers
    fixHeaders();

    // Fix the player details panels
    fixPlayerDetails();

    // Remove progressive stuff
    removeProgressive();

    // Fix manage buttons
    fixManageButtons();

    // Fix summary panels
    fixSummaryPanels();

    // Fix the wrong case in the games page
    fixGamesHeadings();

    // Add player buttons
    addPlayerButtons();

    $('#custom-panel > .panel-heading').click();

    // Add version visibly
    $('#virgo-version').parent().after(`<div class="small text-center">Virgo Adjustments Version: <strong id="adjustments-version">${GM_info.script.version}</strong></span>`);

    // Add history to navigation
    addHistory();

    // Get the current games
    const games = await VIRGO_API.games.getAll();

    for (const data of games) {
        const {gameUID} = data.GameIdentifier;

        // Get rid of useless sandbox game
        if (gameUID === 'SANDBOX-VIRGO-GAME') {
			try {
                await VIRGO_API.games.remove('SANDBOX-VIRGO-GAME');
			} catch (e) {
				console.log(e);
			}
        }
    }

    // Get the current players
    const players = await VIRGO_API.players.getAll();
    const byUID = {};

    for (const data of players) {
        const {playerUID} = data;

        // Get rid of terribly named player
        if (playerUID === 'SDKVirgoAdapter-Fake-Player') {
            VIRGO_API.players.remove(playerUID);
        } else {
            byUID[playerUID] = data;
        }
    }

    for (const currency of CURRENCIES) {
        const name = `PLAYER-${currency}`;
        if ($.type(byUID[name]) === 'undefined') {
            // Add the new player
            await VIRGO_API.players.add(name, currency);

            // Set the player's balance to 1000 currency
            await VIRGO_API.players.balance.set(name, 100000);
        }
    }

    // Ensure the players are in order
    setTimeout(() => {
        fixPlayerOrder();
    }, 500);
}

function notify() {
    // $('.navbar-brand > img')[0].src = 'https://i.giphy.com/media/sIIhZliB2McAo/200.webp';

    window.INSPIRED.UI.showSuccessMessage('UI successfully modified!');
}

async function onLoad() {
    let $panel = $('#custom-panel');

    if ($.type($panel[0]) === 'undefined' || $panel[0] === null) {
        await setup();

        notify();
    }
}

let interval;

function poll() {
    if (!window.location.pathname.match('/virgo/static/resources/index.html')) {
        clearInterval(interval);

        return;
    }

    // Wait until the inspired stuff is there
    const isValid =
        $.type(window.INSPIRED) !== 'undefined' &&
        $.type(window.INSPIRED.UI) !== 'undefined';

    if (isValid) {
        onLoad();

        clearInterval(interval);
    }
}

loadScript('https://cdnjs.cloudflare.com/ajax/libs/tinysort/3.2.2/tinysort.min.js', function onLoad() {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/history.js/1.8/bundled-uncompressed/html4+html5/jquery.history.js', function onLoad() {
        interval = setInterval(poll, 1);
    });
});

loadModule('JSONFormatter', 'https://cdn.jsdelivr.net/npm/json-formatter-js@2.2.0/dist/json-formatter.min.js', function onLoad() {
    // Move default to top
    window.JSONFormatter = window.JSONFormatter.default;

    const $target = $('#data-inspect');
    const $parent = $($target[0].parentNode);

    $parent.append('<div></div>');

    let raf = null;

    function onChange() {
        if (raf !== null) {
            cancelAnimationFrame(raf);
            raf = null;
        }

        requestAnimationFrame(handleChange);
    }

    const observer = new MutationObserver(onChange);

    function observe() {
        observer.observe($target[0], {'childList': true});
    }

    function unobserve() {
        observer.disconnect();
    }

    function handleChange() {
        let json;

        try {
            json = JSON.parse($target.text() || '{}');
        } catch (e) {
            return;
        }

        // Render the content
        const content = (new JSONFormatter(json, 2, {
            'hoverPreviewEnabled': true,
            'hoverPreviewArrayCount': 100,
            'hoverPreviewFieldCount': 5,
            'animateOpen': true,
            'animateClose': true,
            'useToJSON': true
        })).render();

        // Stop observing changes
        unobserve();

        // Make our own changes
        $target
            .empty()
            .append(content)
            .append('<hr/>')
            .append(`<pre>${JSON.stringify(json, null, 4)}</pre>`);

        // Start observing changes
        observe();
    }

    // Start initially observing changes
    observe();
});
})();
