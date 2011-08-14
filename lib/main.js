const widgets = require("widget");
const tabs = require("tabs");
const data = require("self").data;


var panel = require("panel").Panel({
    contentURL: data.url("panel.html"),
    contentScriptFile: [data.url("jquery.js"), data.url("panel.js")]
});

panel.port.on("providerSelected", function(name) {
    console.log("selected provider: " + name);
});

require("widget").Widget({
      id: "hello-display",
      label: "My Hello Widget",
      content: "Hello!",
      width: 50,
    panel: panel
});

console.log("The add-on is running.");
