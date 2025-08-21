sap.ui.define([
    "com/xcaret/regactivosfijosoff/utils/Users"
], function (Users) {
    "use strict";

    return {
        CreateSession: function(oController, sDocumentId){
            let oUser = Users.getUserInfo();
            
            // Validar que se proporcione el ID del documento
            if (!sDocumentId) {
                console.error("❌ CreateSession: ID del documento no proporcionado");
                return null;
            }
            
            // Validar que el usuario tenga ID
            if (!oUser || !oUser.sUserId) {
                console.error("❌ CreateSession: Usuario o sUserId no encontrado");
                console.log("🔍 Usuario completo:", oUser);
                return null;
            }
            
            let oSessions = [];
            let oSession = { 
                TABLE_NAME: "FIXEDASSET",
                INT_ID: sDocumentId,
                LAST_TIME: Date.now(),
                ERNAM: this._createHybridERNAM(oUser.sUserId, oUser.sFirstName, oUser.sLastName),
                ACTIVE: "X"
            }
            
            oSessions.push(oSession);
            console.log("✅ CreateSession - Sesión creada exitosamente:", oSession);
            return oSessions;
        },

        UpdateSession: function(oController, sDocumentId){
            let oUser = Users.getUserInfo();
            
            // Validar que se proporcione el ID del documento
            if (!sDocumentId) {
                console.error("❌ UpdateSession: ID del documento no proporcionado");
                return null;
            }
            
            // Validar que el usuario tenga ID
            if (!oUser || !oUser.sUserId) {
                console.error("❌ UpdateSession: Usuario o sUserId no encontrado");
                return null;
            }
            
            let oSessions = [];
            let oSession = { 
                TABLE_NAME: "FIXEDASSET",
                INT_ID: sDocumentId,
                LAST_TIME: Date.now().toString(),
                ERNAM: this._createHybridERNAM(oUser.sUserId, oUser.sFirstName, oUser.sLastName),
                ACTIVE: "X"
            }
            
            oSessions.push(oSession);
            return oSessions;
        },

        /**
         * Crea un ERNAM híbrido con formato: "8charsUUID_NOMBRE_APELLIDO"
         * @param {string} sUserId - ID completo del usuario
         * @param {string} sFirstName - Nombre del usuario
         * @param {string} sLastName - Apellido del usuario
         * @returns {string} ERNAM híbrido limitado a 36 caracteres
         */
        _createHybridERNAM: function(sUserId, sFirstName, sLastName) {
            // Extraer solo los primeros 8 caracteres del UUID
            const shortUserId = sUserId ? sUserId.substring(0, 8) : "";
            
            // Crear nombre completo
            const fullName = `${sFirstName || ""} ${sLastName || ""}`.trim();
            
            // Crear ERNAM híbrido
            let hybridERNAM = `${shortUserId}_${fullName}`;
            
            // Limitar a 36 caracteres si es necesario
            if (hybridERNAM.length > 36) {
                // Calcular cuántos caracteres podemos usar para el nombre
                const availableForName = 36 - shortUserId.length - 1; // -1 por el guión bajo
                
                if (availableForName > 0) {
                    // Truncar el nombre completo a los caracteres disponibles
                    hybridERNAM = `${shortUserId}_${fullName.substring(0, availableForName)}`;
                } else {
                    // Si no hay espacio para nombre, usar solo el ID corto
                    hybridERNAM = shortUserId;
                }
            }
            
            console.log("✅ ERNAM híbrido creado:", hybridERNAM, "Longitud:", hybridERNAM.length);
            return hybridERNAM;
        }
    };
});
