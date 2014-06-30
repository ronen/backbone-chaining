try {
    var Chaining = require('../backbone-chaining');
    if (typeof Chaining.Model === "undefined") { throw Error("Error: Backbone.Chaining not properly loaded") }
} catch (e) {
    console.log(e);
    phantom.exit(1);
}

console.log("Backbone.Chaining and dependencies loaded OK");
console.log("Done");
phantom.exit(0);
