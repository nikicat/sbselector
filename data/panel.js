function setHandlers() {
    $(".provider").unbind();
    $(".provider").click(function() {
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
$("#berserk").change(function() {
    self.port.emit("berserk", $(this).prop("checked"));
});

self.port.on("addProvider", function(provider) {
    console.log("addProvider(" + provider.id + ", " + provider.name + ")");
    $("#providers").append("<input type=radio name='group1' class='provider' id='" + provider.id + "'><img src='" + provider.favicon + "'></img>" + provider.name + "</input><br>");
    setHandlers();
});

self.port.on("selectProvider", function(provider) {
    console.log("selectProvider(" + provider + ")");
    $("#" + provider).prop("checked", true);
});

self.port.on("updateTables", function(info) {
    $("#tables").text(info);
});
