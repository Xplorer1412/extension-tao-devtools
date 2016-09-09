/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2016 (original work) Open Assessment Technologies SA ;
 */
/**
 * @author Jean-Sébastien Conan <jean-sebastien.conan@vesperiagroup.com>
 */
define([
    'jquery',
    'core/store',
    'layout/actions/binder',
    'ui/hider',
    'util/shortcut',
    'json!taoDevTools/controller/KeyChecker/shortcuts.json',
    'css!taoDevToolsCss/keychecker.css'
], function ($, store, binder, hider, shortcutHelper, listOfKeys) {
    'use strict';

    /**
     * The root CSS class name
     * @type {String}
     */
    var rootCls = '.keychecker';

    /**
     * Detect the platform to only display the shortcuts that are relevant to check
     * @type {String}
     */
    var platformType = navigator.platform.indexOf('Mac') < 0 ? 'win' : 'mac';

    /**
     * Browser detection
     * @type {Boolean}
     */
    // Opera 8.0+
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== 'undefined';
    // At least Safari 3+: "[object HTMLElementConstructor]"
    var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
    // Internet Explorer 6-11
    var isIE = !!document.documentMode;
    // Edge 20+
    var isEdge = !isIE && !!window.StyleMedia;
    // Chrome 1+
    var isChrome = !!window.chrome && !!window.chrome.webstore;

    var browserType = isFirefox ? 'firefox' : isIE || isEdge ? 'ie' : isChrome ? 'chrome' : isSafari ? 'safari' : isOpera ? 'opera' : 'unknown';

    /**
     * A translation map to present the right name of the key regarding the current platform
     * @type {Object}
     */
    var specialKeys = {
        mac: {
            '<Shift>': 'Shift',
            '<Ctrl>': 'Ctrl',
            '<Meta>': 'Cmd',
            '<Alt>': 'Option'
        },
        win: {
            '<Shift>': 'Shift',
            '<Ctrl>': 'Ctrl',
            '<Meta>': 'Win',
            '<Alt>': 'Alt'
        }
    };

    /**
     * Starts the application
     */
    function start() {
        /**
         * Root element of the component
         * @type {jQuery}
         */
        var $container = $(rootCls);

        /**
         * The browser storage used to keep results locally
         * @type {store}
         */
        var keycheckStorage;

        /**
         * The index of the current shortcut to check
         * @type {Number}
         */
        var current = -1;

        /**
         * The currently checked shortcut
         * @type {Object}
         */
        var currentShortcut = null;

        /**
         * True if the current shortcut has been caught
         * @type {Boolean}
         */
        var shortcutCaught = false;

        /**
         * The list of results that are already done
         * @type {Array}
         */
        var shortcutsResults = [];

        /**
         * The data to export at the end of the check
         * @type {Object}
         */
        var resultData = {
            platform: navigator.platform,
            browser: navigator.userAgent,
            browserType: browserType,
            shortcuts: shortcutsResults
        };

        /**
         * A list of actions that are mapped to UI controls
         * @type {Object}
         */
        var actions = {
            /**
             * Go to section "Shortcuts"
             */
            showShortcuts: function showShortcuts() {
                displaySection('shortcuts');
            },

            /**
             * Go to section "Results"
             */
            showResults: function showResults() {
                displaySection('results');
            },

            /**
             * Select the whole results set and copy it to the clipboard
             */
            selectResults: function selectResults() {
                selectText($container.find('.results pre').get(0));
                try {
                    document.execCommand('copy');
                } catch (err) {
                    alert('Oops, unable to copy');
                }
            },

            /**
             * Reset all the results and restart the check session
             */
            resetAll: function resetAll() {
                shortcutHelper.clear();
                current = -1;
                currentShortcut = null;
                shortcutsResults = [];
                setResults();
                actions.nextShortcut();
            },

            /**
             * Move backward to the previous check in the list of shortcuts
             */
            previousShortcut: function previousShortcut() {
                removeShortcut();
                getPreviousShortcut();
                updateKeyChecker();
            },

            /**
             * Move forward to the next check in the list of shortcuts
             */
            nextShortcut: function () {
                removeShortcut();
                if (!getNextShortcut()) {
                    hider.hide($container.find('.desk'));
                    hider.show($container.find('.end'));
                    actions.showResults();
                } else {
                    updateKeyChecker();
                }
            }
        };

        /**
         * Returns the previous shortcut to check. Move the cursor.
         * @returns {Object}
         */
        function getPreviousShortcut() {
            currentShortcut = null;
            while (!currentShortcut) {
                currentShortcut = listOfKeys[--current];
                if (currentShortcut) {
                    if (currentShortcut.platform && currentShortcut.platform !== 'all' && currentShortcut.platform.indexOf(platformType) < 0) {
                        currentShortcut = null;
                    }
                    else if (currentShortcut.browser && currentShortcut.browser !== 'all' && currentShortcut.browser.indexOf(browserType) < 0) {
                        currentShortcut = null;
                    }
                }
                if (current < 0) {
                    current = 0;
                    currentShortcut = null;
                    break;
                }
            }
            return currentShortcut;
        }

        /**
         * Returns the next shortcut to check. Move the cursor.
         * @returns {Object}
         */
        function getNextShortcut() {
            currentShortcut = null;
            while (!currentShortcut) {
                currentShortcut = listOfKeys[++current];
                if (currentShortcut) {
                    if (currentShortcut.platform && currentShortcut.platform !== 'all' && currentShortcut.platform.indexOf(platformType) < 0) {
                        currentShortcut = null;
                    }
                    else if (currentShortcut.browser && currentShortcut.browser !== 'all' && currentShortcut.browser.indexOf(browserType) < 0) {
                        currentShortcut = null;
                    }
                }
                if (current >= listOfKeys.length) {
                    currentShortcut = null;
                    break;
                }
            }
            return currentShortcut;
        }

        /**
         * Update the displayed results set
         */
        function setResults() {
            function done() {
                resultData.shortcuts = _.compact(shortcutsResults);
                $container.find('.results pre').html(JSON.stringify(resultData, null, 2));
            }

            keycheckStorage.setItem('state', {
                current: current,
                results: shortcutsResults
            })
                .then(done)
                .catch(done);
        }

        /**
         * Update the displayed results set with the result of the currently checked shortcut
         */
        function updateCurrentResult() {
            var defaultPrevented = $container.find('input[name="default_prevented"][value="1"]').is(':checked');
            var comment = $container.find('.comment textarea').val();
            if (currentShortcut) {
                shortcutsResults[current] = {
                    shortcut: formatShortcut(currentShortcut.label),
                    shortcutCaught: shortcutCaught,
                    defaultPrevented: defaultPrevented
                };

                $container.find('.prevented label[for="default_prevented_yes"]').css('color', defaultPrevented ? 'green' : null);
                $container.find('.prevented label[for="default_prevented_no"]').css('color', defaultPrevented ? null : 'red');

                if (comment) {
                    shortcutsResults[current].comment = comment;
                } else {
                    delete shortcutsResults[current].comment;
                }

                setResults();
            }
        }

        /**
         * Update the test bed of the shortcut
         */
        function updateKeyChecker() {
            $container.find('.prevented input[value="0"]').click();
            $container.find('.caught .value').html('No').css('color', 'red');
            $container.find('.comment textarea').val('');

            shortcutCaught = false;
            addShortcut();
            updateCurrentResult();
            hider.hide($container.find('.prevented'));
            hider.hide($container.find('.end'));
            hider.show($container.find('.desk'));
        }

        /**
         * Registers the current shortcut to be checked
         */
        function addShortcut() {
            if (currentShortcut) {
                shortcutHelper.add(currentShortcut.shortcut, function (event, keystroke) {
                    console.log('caught keystroke', keystroke);
                    shortcutCaught = true;
                    $container.find('.caught .value').html('Yes').css('color', 'green');
                    hider.show($container.find('.prevented'));
                    updateCurrentResult();
                });

                $container.find('.key .value').html(formatShortcut(currentShortcut.label));
                $container.find('.description .value').html(formatShortcut(currentShortcut.description));
                $container.find('.playground textarea').val('The quick brown fox jumps over the lazy dog');
                $container.find('.playground').toggle(!!currentShortcut.playground);
            }
        }

        /**
         * Unregisters the current shortcut after a check
         */
        function removeShortcut() {
            if (currentShortcut) {
                shortcutHelper.remove(currentShortcut.shortcut);
            }
        }

        /**
         * Format a shortcut to be displayed with the right key names
         * @param {String} label
         * @returns {String}
         */
        function formatShortcut(label) {
            _.forEach(specialKeys[platformType], function (spec, code) {
                label = label.replace(code, spec);
            });
            return label;
        }

        /**
         * Display a particular section
         * @param {String} name
         */
        function displaySection(name) {
            hider.hide($container.find('.section'));
            hider.show($container.find('.section.' + name));
        }

        /**
         * Select the full text contained by a particular element
         * @param {HTMLElement} element
         * @returns {HTMLElement}
         */
        function selectText(element) {
            var range;
            if (document.selection) {
                range = document.body.createTextRange();
                range.moveToElementText(element);
                range.select();
            } else if (window.getSelection) {
                range = document.createRange();
                range.selectNode(element);
                window.getSelection().addRange(range);
            }
            return element;
        }

        /**
         * Loads the locally stored results
         */
        function loadResults() {
            keycheckStorage.getItem('state')
                .then(function (data) {
                    shortcutHelper.clear();
                    current = data.current || -1;
                    shortcutsResults = data.results || {};
                    if (current >= 0) {
                        // the current position will be moved forward
                        current--;
                    }
                    displaySection('shortcuts');
                    actions.nextShortcut();
                })
                .catch(function () {
                    displaySection('shortcuts');
                    actions.resetAll();
                });
            displaySection('shortcuts');
        }

        $(document).on('click', 'button', function (e) {
            var $btn = $(e.target);
            var control = $btn.data('control');
            actions[control] && actions[control]();
        });
        $container.find('.prevented input').on('change', updateCurrentResult);
        $container.find('.comment textarea').on('change', updateCurrentResult).on('blur', updateCurrentResult);


        /** Get info from the platform and the browser **/
        $container.find('.platform .value').html(resultData.platform);
        $container.find('.browser .value').html(resultData.browser);

        /** Start the tester **/
        store('keycheck')
            .then(function (storage) {
                keycheckStorage = storage;
                loadResults();
            })
            .catch(function () {
                displaySection('shortcuts');
                actions.resetAll();
            });

        binder.register('showShortcuts', actions.showShortcuts);
        binder.register('showResults', actions.showResults);
    }

    return {
        start: start
    };
});