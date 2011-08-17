const widgets = require("widget");
const tabs = require("tabs");
const data = require("self").data;
const prefs = require("preferences-service");
const unload = require("unload");
const {Cc,Ci,Cr} = require("chrome");
const listManager = Cc["@mozilla.org/url-classifier/listmanager;1"].getService(Ci.nsIUrlListManager);
const dbService = Cc["@mozilla.org/url-classifier/dbservice;1"].getService(Ci.nsIUrlClassifierDBService);
//const safeBrowsing = Cc["@mozilla.org/safebrowsing/application;1"].getService(Ci.nsISupports);
const type = require("type");
const prefix = "browser.safebrowsing.";

function updateTables() {
    console.log("updating tables info");
    dbService.getTables(function(info) {
        console.log("updated tables info: " + info);
        panel.port.emit("updateTables", info);
    });
}

var panel = require("panel").Panel({
    contentURL: data.url("panel.html"),
    contentScriptFile: [data.url("jquery.js"), data.url("panel.js")],
    onShow: updateTables
});

function providerSelected(id) {
    console.log("providerSelected(" + id + ")");
    dbService.cancelUpdate();
    dbService.resetDatabase();
    registerTables();
    if (id == "0") {
        prefs.reset(prefix + "provider.0.updateURL");
    } else {
        prefs.set(prefix + "provider.0.updateURL", prefs.get(prefix + "provider." + id + ".updateURL"));
    }
    prefs.set(prefix + "dataProvider", parseInt(id));
    
    listManager.checkForUpdates();
}

function setProviders() {
    console.log("setProviders");
    var id = 0;
    for (var id=0; prefs.has(prefix + "provider." + id + ".name"); id++) {
        console.log("adding provider " + id);
        panel.port.emit("addProvider", {"id": id, "name": prefs.get(prefix + "provider." + id + ".name")});
    }
    selectProvider(prefs.get(prefix + "dataProvider"));
}

function selectProvider(id) {
    panel.port.emit("selectProvider", id);
}

function setDefaultPrefs() {
    function provider(id, name, value) {
        var fullName = prefix + "provider." + id + "." + name;
        if (!prefs.has(fullName)) {
            if (value == null) {
                value = prefs.get(prefix + "provider.0." + name);
            }
            prefs.set(fullName, value);
        }
    }
    prefs.setBranch("Default");
    try {
        provider(1, "gethashURL", "http://sba.yandex.net/gethash?client={moz:client}&appver={moz:version}&pver=2.2");
        provider(1, "keyURL", "https://sba.yandex.net/newkey?client={moz:client}&appver={moz:version}&pver=2.2");
        provider(1, "name", "Yandex");
        provider(1, "reportErrorURL", null);
        provider(1, "reportGenericURL", null);
        provider(1, "reportMalwareErrorURL", null);
        provider(1, "reportMalwareURL", null);
        provider(1, "reportPhishURL", "http://webmaster.yandex.ru/delspam.xml?l10n=ru&request=Page%20looks%20like%20phishing&");
        provider(1, "reportURL", "http://sba.yandex.net/report?");
        provider(1, "updateURL", "http://sba.yandex.net/downloads?client={moz:client}&appver={moz:version}&pver=2.2");
        prefs.set("urlclassifier.gethashtables", prefs.get("urlclassifier.gethashtables") + ",ydx-phish-shavar,ydx-malware-shavar");
    } finally {
        prefs.setBranch("");
    }
}

function registerTables() {
    listManager.registerTable("ydx-malware-shavar", false);
    listManager.registerTable("ydx-phish-shavar", false);
    listManager.registerTable("goog-malware-shavar", false);
    listManager.registerTable("goog-phish-shavar", false);
    listManager.enableUpdate("ydx-malware-shavar");
    listManager.enableUpdate("ydx-phish-shavar");
    listManager.enableUpdate("goog-malware-shavar");
    listManager.enableUpdate("goog-phish-shavar");
}

exports.main = function() {
    console.log("The add-on is running.");

    setDefaultPrefs();
    setProviders();
    registerTables();

    widgets.Widget({
        id: "sbselector",
        label: "SafeBrowsing provider selector",
        width: 30,
        content: "SB",
        panel: panel
    });

    prefs.watch(prefix + "dataProvider", function(name, value) {selectProvider(value);});
    panel.port.on("providerSelected", providerSelected);
}

unload.when(function(what) {
    console.log("unload(" + what + ")");
});
