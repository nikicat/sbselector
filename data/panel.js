function setHandlers() {
    $("input").unbind();
    $("input").click(function() {
        self.port.emit("providerSelected", $(this).prop("id"));
        return true;
    });
}

setHandlers();
$("#update").click(function() {
    self.port.emit("checkForUpdates");
});
$("#notify").click(function() {
    self.port.emit("notifyStreamUpdater");
});

self.port.on("addProvider", function(provider) {
    console.log("addProvider(" + provider.id + ", " + provider.name + ")");
    $("#providers").append("<input type=radio name='group1' id='" + provider.id + "'>" + provider.name + "</input><br>");
    setHandlers();
});

self.port.on("selectProvider", function(provider) {
    console.log("selectProvider(" + provider + ")");
    $("#" + provider).prop("checked", true);
});

self.port.on("updateTables", function(info) {
    console.log("updateTables(" + info + ")");
    $("#tables").text(info);
});
