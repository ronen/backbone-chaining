var url = phantom.args[0];
var page = require('webpage').create();
// Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
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
    if (status !== "success") {
        console.log("Unable to load " + url + " : " + status);
        phantom.exit(1);
    }
});
