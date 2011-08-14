$("input").click(function() {
    self.port.emit("providerSelected", $(this).prop("id"));
})
