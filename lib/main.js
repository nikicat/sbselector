function updateTables() {
    dbService.getTables(function(info) {
        panel.port.emit("updateTables", info);
    });
}

function providerSelected(id) {
    console.log("providerSelected(" + id + ")");
    dbService.cancelUpdate();
//    dbService.resetDatabase();
    if (id == "0") {
        prefs.reset(prefix + "provider.0.updateURL");
        prefs.reset(prefix + "malware.reportURL");
        prefs.reset(prefix + "warning.infoURL");
    } else {
        var providerPrefix = prefix + "provider." + id + ".";
        prefs.set(prefix + "provider.0.updateURL", prefs.get(providerPrefix + "updateURL"));
        prefs.set(prefix + "malware.reportURL", prefs.get(providerPrefix + "malwareInfoURL"));
        prefs.set(prefix + "warning.infoURL", prefs.get(providerPrefix + "phishInfoURL"));
    }
    prefs.set(prefix + "dataProvider", parseInt(id));
    // registerTables() must be called AFTER changing update url because pref change handler drops all current tables
    registerTables();
}

function setProviders() {
    console.log("setProviders");
    var id = 0;
    for (var id=0; prefs.has(prefix + "provider." + id + ".name"); id++) {
        console.log("adding provider " + id);
        panel.port.emit("addProvider", {
            "id": id,
            "name": prefs.get(prefix + "provider." + id + ".name"),
            "favicon": prefs.get(prefix + "provider." + id + ".favicon")
        });
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

        // There are no such prefs by default in Firefox, so we add them for provider
        // switching capability
        provider(1, "malwareInfoURL", prefs.get("browser.safebrowsing.malware.reportURL"));
        provider(1, "phishInfoURL", prefs.get("browser.safebrowsing.warning.infoURL"));

        // Favicons
        provider(0, "favicon", "http://google.com/favicon.ico");
        provider(1, "favicon", "http://yandex.ru/favicon.ico");

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

function enableDebug() {
    lib.G_debugService.loggifier.loggify(listManager.__proto__);
    lib.G_debugService.loggifier.loggify(lib.RequestBackoff.prototype.reset);
}

// This is needed for URL changer to work
function patchRequestBackoff() {
    lib.RequestBackoff.prototype.reset = function() {
        this.numErrors_ = 0;
        this.errorTimeout_ = 0;
        this.nextRequestTime_ = 0;
        this.requestTimes_ = [];
    }
}

function checkForUpdates() {
    console.log("checking tables for updates");
    listManager.checkForUpdates();
}

function notifyStreamUpdater() {
    console.log("notifying stream updater");
    streamUpdater.QueryInterface(Ci.nsITimerCallback).notify(null);
}

exports.main = function() {
    console.log("The add-on is running.");
    console.log("lib: " + type.source(lib));
    console.log("listManager: " + type.source(listManager));
    console.log("streamUpdater: " + type.source(streamUpdater));
//    enableDebug();

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
    panel.port.on("checkForUpdates", checkForUpdates);
    panel.port.on("notifyStreamUpdater", notifyStreamUpdater);
    panel.port.on("berserk", function(enable) {
        if (enable) {
            console.log("enabled berserk mode");
            berserker = timer.setInterval(function() {
                checkForUpdates();
                notifyStreamUpdater();
            }, 5000);
        } else {
            timer.clearInterval(berserker);
            console.log("disabled berserk mode");
        }
    });
}

const widgets = require("widget");
const tabs = require("tabs");
const data = require("self").data;
const prefs = require("preferences-service");
const unload = require("unload");
const {Cc,Ci,Cr} = require("chrome");
const streamUpdater = Cc["@mozilla.org/url-classifier/streamupdater;1"].getService(Ci.nsIUrlClassifierStreamUpdater);
const dbService = Cc["@mozilla.org/url-classifier/dbservice;1"].getService(Ci.nsIUrlClassifierDBService);
const lib = Cc["@mozilla.org/url-classifier/jslib;1"].getService().wrappedJSObject;
// HACK
patchRequestBackoff();
// We need to instantiate this object to achieve it later
const listManager = Cc["@mozilla.org/url-classifier/listmanager;1"].getService(Ci.nsIUrlListManager);
const type = require("type");
const timer = require("timer");
const prefix = "browser.safebrowsing.";

var tablesUpdater = null;
var berserker = null;

var panel = require("panel").Panel({
    contentURL: data.url("panel.html"),
    contentScriptFile: [data.url("jquery.js"), data.url("panel.js")],
    width: 500,
    height: 300,
    onShow: function() {
        updateTables();
        tablesUpdater = timer.setInterval(updateTables, 1000);
    },
    onHide: function() {
        timer.clearInterval(tablesUpdater);
    }
});

unload.when(function(what) {
    console.log("unload(" + what + ")");
});

