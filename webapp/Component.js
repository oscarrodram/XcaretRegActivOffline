sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/xcaret/regactivosfijosoff/model/models",
    "com/xcaret/regactivosfijosoff/model/SettingsModel"
], (UIComponent, models, SettingsModel) => {
    "use strict";

    return UIComponent.extend("com.xcaret.regactivosfijosoff.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
            // Set the column settings model
            this.setModel(SettingsModel.createSettingsModelTable(), "settingsModel");
            this.setModel(SettingsModel.createSettingsModelItem(), "createSettingsModelItem");
            // enable routing
            this.getRouter().initialize();
        }
    });
});