(function () {
    'use strict';

    var url, page, timeout,
        args = require('system').args;

    // arg[0]: scriptName, args[1...]: arguments
    if (args.length < 2) {
        console.error('Usage:\n  phantomjs [phantom arguments] runner.js [url-of-your-plain-testsuite] [timeout-in-seconds] [page-properties]');
        exit(1);
    }

    url = args[1];

    if (args[2] !== undefined) {
        timeout = parseInt(args[2], 10);
    }

    page = require('webpage').create();

    if (args[3] !== undefined) {
        try {
            var pageProperties = JSON.parse(args[3]);

            if (pageProperties) {
                for (var prop in pageProperties) {
                    if (pageProperties.hasOwnProperty(prop)) {
                        page[prop] = pageProperties[prop];
                    }
                }
            }
        } catch(e) {
            console.error('Error parsing "' + args[3] + '": ' + e);
        }
    }

    // Route `console.log()` calls from within the Page context to the main Phantom context (i.e. current `this`)
    page.onConsoleMessage = function (msg) {
        console.log(msg);
        if (msg.indexOf("Error") == 0) {
            phantom.exit(1);
        }
        if (msg.indexOf("Done") == 0) {
            phantom.exit(0);
        }
    };

    page.onError = function(msg, trace) {
        console.log("Error: " + msg);
        phantom.exit(1);
    }

    page.open(url, function (status) {
        if (status !== 'success') {
            console.error('Unable to access network: ' + status);
            exit(1);
        } else {

            // Set a default timeout value if the user does not provide one
            if (typeof timeout === 'undefined') {
                timeout = 5;
            }

            // Set a timeout on the test running, otherwise tests with async problems will hang forever
            setTimeout(function () {
                console.error('The specified timeout of ' + timeout + ' seconds has expired. Aborting...');
                exit(1);
            }, timeout * 1000);

            // Do nothing... the callback mechanism will handle everything!
        }
    });

    function exit(code) {
        if (page) {
            page.close();
        }
        setTimeout(function () {
            phantom.exit(code);
        }, 0);
    }
})();
