sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/Switch",
    "sap/m/MessageBox",
    "sap/ui/comp/smartvariants/PersonalizableInfo",
    "sap/ui/core/BusyIndicator",
    "com/xcaret/regactivosfijosoff/model/indexedDBService"
], (Controller, Dialog, Label, Button, Input, Switch, MessageBox, PersonalizableInfo, BusyIndicator, indexedDBService) => {
    "use strict";
    var vInitialDate, vFinalDate, currentDate = new Date();
    let sUserID = "DEFAULT_USER", sFName, sLName, sEmail;
    var bURL;
    let host = "https://experiencias-xcaret-parques-s-a-p-i-de-c-v--xc-btpdev-15aca4ac6.cfapps.us10-001.hana.ondemand.com";
    let aIdEBELN = [], aIdPSPNR = [], aIdCONTRA = [], aIdUSER = [];
    var oSkip = 0, oTop = 10;
    var sSelectedTab = "All";
    return Controller.extend("com.xcaret.regactivosfijosoff.controller.Main", {
        onInit: function () {

            var sHost = window.location.hostname;

            if (sHost.includes("btpdev")) {
                host = "https://experiencias-xcaret-parques-s-a-p-i-de-c-v--xc-btpdev-15aca4ac6.cfapps.us10-001.hana.ondemand.com";
            } else if (sHost.includes("qas-btp")) {
                host = "https://node.cfapps.us10-001.hana.ondemand.com";
            } else if (sHost.includes("prd") || sHost.includes("prod")) {
                host = "https://node-api-prd.cfapps.us10-001.hana.ondemand.com";
            } else if (sHost.includes("-workspaces-")) {
                host = "https://experiencias-xcaret-parques-s-a-p-i-de-c-v--xc-btpdev-15aca4ac6.cfapps.us10-001.hana.ondemand.com";
            }

            this.getCurrentUserName();
            this.onPutUserInformation();
            this.onCalculateDatesBefore(60);
            let oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel, "serviceModel");
            this.multiQuery();

            this.oSmartVariantManagement = this.getView().byId("svm");
            this.currentVariantJson = "";
            this.oFilterBar = this.getView().byId("filterbar");
            let oPersInfo = new PersonalizableInfo({
                type: "filterBar",
                keyName: "persistencyKey",
                control: this.oFilterBar
            });
            this.oSmartVariantManagement.addPersonalizableControl(oPersInfo);
            this.oSmartVariantManagement.initialise(this._onVariantLoad.bind(this), this.oFilterBar);
            this.oSmartVariantManagement.attachSelect(this._onVariantChange.bind(this));

            this.bIsLoading = false;
            this.iTotalItems = null;
            var oEventBus = sap.ui.getCore().getEventBus();
            sSelectedTab = "All";
            oEventBus.subscribe("MainChannel", "onInitialMainPage", this.onInitialMainPage, this);
            this.onGetGeneralData();

            // Detectar conexión al iniciar
            this.bIsOnline = indexedDBService.isOnline();
            window.addEventListener("online", this._handleOnline.bind(this));
            window.addEventListener("offline", this._handleOffline.bind(this));

            BusyIndicator.hide();
        },

        // Offline
        _handleOnline: function () {
            this.bIsOnline = true;
            // Aquí podrías sincronizar datos pendientes si lo deseas
            sap.m.MessageToast.show("Conectado. Sincronizando datos...");
            // indexedDBService.syncPendingOps(processFn);
            
            // ✅ SINCRONIZACIÓN INTELIGENTE - EVITAR DUPLICACIÓN
            this._syncAllPendingData();
        },

        // Offline
        _handleOffline: function () {
            this.bIsOnline = false;
            sap.m.MessageToast.show("Sin conexión. Trabajando en modo offline.");
        },

        // Offline
        /*
        syncPendingOps: async function () {
            sap.ui.require(["com/xcaret/regactivosfijosoff/model/indexedDBService"], async function (indexedDBService) {
                let pendingOps = await indexedDBService.getPendingOps();
                let successCount = 0, errorCount = 0;

                for (let op of pendingOps) {
                    try {
                        if (op.opType === "create" || op.opType === "update") {
                            let url = host + `/FixedAsset`;
                            if (op.opType === "update" && op.id) {
                                url += "/" + op.id;
                            }
                            let response = await fetch(url, {
                                method: op.opType === "create" ? "POST" : "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(op.data)
                            });
                            let responseData = await response.json();
                            if (response.ok && responseData) {
                                await indexedDBService.deletePendingOp(op.id);
                                successCount++;
                            } else {
                                errorCount++;
                                console.error("Error al sincronizar pendiente:", responseData);
                            }
                        }
                    } catch (err) {
                        errorCount++;
                        console.error("Error al sincronizar pendiente:", err);
                    }
                }

                // Muestra un resumen al usuario
                if (successCount || errorCount) {
                    let msg = `Sincronización finalizada. ${successCount} exitosas, ${errorCount} con error.`;
                    sap.m.MessageToast.show(msg);
                }
            });
        },
        */
        /*
        syncPendingOps: async function () {
            sap.ui.require(["com/xcaret/regactivosfijosoff/model/indexedDBService"], async function (indexedDBService) {
                let pendingOps = await indexedDBService.getPendingOps();
                let successCount = 0, errorCount = 0;

                // Helper para fecha actual en formato YYYY-MM-DD
                function getTodayStr() {
                    const d = new Date();
                    return d.getFullYear() + "-" +
                        String(d.getMonth() + 1).padStart(2, "0") + "-" +
                        String(d.getDate()).padStart(2, "0");
                }

                for (let op of pendingOps) {
                    try {
                        if (op.opType === "create" || op.opType === "update") {
                            // Forzar BUDAT a la fecha de sincronización
                            if (op.data && typeof op.data === "object") {
                                // Si tu payload es un array (por ejemplo, en create): [{...}]
                                if (Array.isArray(op.data) && op.data.length > 0) {
                                    op.data[0].BUDAT = getTodayStr();
                                    // Y si hay un campo Items, y cada item debe tener BUDAT, opcionalmente:
                                    if (op.data[0].Items) {
                                        op.data[0].Items.forEach(item => item.BUDAT = getTodayStr());
                                    }
                                } else if (op.data.BUDAT !== undefined) {
                                    // Para update, si es un objeto simple
                                    op.data.BUDAT = getTodayStr();
                                }
                            }

                            let url = host + `/FixedAsset`;
                            if (op.opType === "update" && op.id) {
                                url += "/" + op.id;
                            }
                            let response = await fetch(url, {
                                method: op.opType === "create" ? "POST" : "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(op.data)
                            });
                            let responseData = await response.json();
                            if (response.ok && responseData) {
                                await indexedDBService.deletePendingOp(op.id);
                                successCount++;
                            } else {
                                errorCount++;
                                console.error("Error al sincronizar pendiente:", responseData);
                            }
                        }
                    } catch (err) {
                        errorCount++;
                        console.error("Error al sincronizar pendiente:", err);
                    }
                }

                // Muestra un resumen al usuario
                if (successCount || errorCount) {
                    let msg = `Sincronización finalizada. ${successCount} exitosas, ${errorCount} con error.`;
                    sap.m.MessageToast.show(msg);
                }
            });
        },
        */
        syncPendingOps: async function () {
            sap.ui.require(["com/xcaret/regactivosfijosoff/model/indexedDBService"], async function (indexedDBService) {
                let pendingOps = await indexedDBService.getPendingOps();
                
                // ✅ FILTRAR OPERACIONES - EXCLUIR IMÁGENES (ya se procesan en syncPendingImages)
                let nonImageOps = pendingOps.filter(op => op.type !== "Image");
                
                if (!nonImageOps || nonImageOps.length === 0) {
                    console.log("📋 No hay operaciones pendientes (excluyendo imágenes)");
                    return;
                }
                
                console.log("🔄 Procesando operaciones pendientes (excluyendo imágenes):", nonImageOps.length);
                
                let successCount = 0, errorCount = 0;
        
                // Helper para fecha actual en formato YYYY-MM-DD
                function getTodayStr() {
                    const d = new Date();
                    return d.getFullYear() + "-" +
                        String(d.getMonth() + 1).padStart(2, "0") + "-" +
                        String(d.getDate()).padStart(2, "0");
                }
        
                for (let op of nonImageOps) {
                    try {
                        if (op.opType === "create" || op.opType === "update" || op.opType === "delete") {
                            // Forzar BUDAT a la fecha de sincronización si corresponde
                            if (op.data && typeof op.data === "object") {
                                if (Array.isArray(op.data) && op.data.length > 0) {
                                    if (op.data[0].BUDAT !== undefined) op.data[0].BUDAT = getTodayStr();
                                    if (op.data[0].Items) {
                                        op.data[0].Items.forEach(item => {
                                            if (item.BUDAT !== undefined) item.BUDAT = getTodayStr();
                                        });
                                    }
                                } else if (op.data.BUDAT !== undefined) {
                                    op.data.BUDAT = getTodayStr();
                                }
                            }
        
                            // --- Construcción de la URL según el tipo de operación ---
                            let url = '';
                            let method = op.opType === "create" ? "POST" : (op.opType === "delete" ? "DELETE" : "PUT");
                            let payload = op.data;
        
                            if (op.type === "MaterialDocumentItems") {
                                url = host + "/MaterialDocumentItems/";
                            } else if (op.type === "FixedAsset") {
                                url = host + "/FixedAsset";
                                if (method === "PUT" && op.id) {
                                    url += "/" + op.id;
                                }
                            } else if (op.type === "Signature") {
                                url = host + "/ImageSignItem";
                            } else if (op.type === "Image") {
                                // ✅ LAS IMÁGENES YA SE SINCRONIZAN EN syncPendingImages
                                // NO procesar aquí para evitar duplicación
                                console.log("🔄 Saltando operación de imagen (ya se sincroniza en syncPendingImages):", op.id);
                                continue;
                            } else {
                                url = host + "/" + op.type;
                            }
        
                            let fetchOptions = {
                                method: method,
                                headers: { "Content-Type": "application/json" }
                            };
        
                            // Para firmas (Signature) en create, puede ser FormData
                            if (op.type === "Signature" && method === "POST" && payload && payload.image) {
                                let sign = payload;
                                let byteString = atob(sign.image);
                                let ab = new ArrayBuffer(byteString.length);
                                let ia = new Uint8Array(ab);
                                for (let i = 0; i < byteString.length; i++) {
                                    ia[i] = byteString.charCodeAt(i);
                                }
                                let blob = new Blob([ab], { type: sign.mimeType || "image/jpeg" });
        
                                let formData = new FormData();
                                formData.append("image", blob, "signature.jpeg");
                                formData.append("metadata", JSON.stringify([{
                                    DOCID: sign.DOCID,
                                    ID: sign.ID,
                                    PROCESS: sign.PROCESS,
                                    SUBPROCESS: sign.SUBPROCESS
                                }]));
                                fetchOptions.body = formData;
                                delete fetchOptions.headers; // Deja que el navegador setee el multipart boundary
                            } else {
                                fetchOptions.body = JSON.stringify(payload);
                            }
        
                            let response = await fetch(url, fetchOptions);
                            let responseData = await (response.headers.get("content-type") && response.headers.get("content-type").includes("application/json") ? response.json() : Promise.resolve(null));
        
                            if (response.ok) {
                                await indexedDBService.deletePendingOp(op.id);
                                successCount++;
                            } else {
                                // MODIFICACIÓN: Si es un delete de firma y el error es 404, bórralo igual de pendingOps (firma ya no existe en backend)
                                if (
                                    op.type === "Signature" &&
                                    method === "DELETE" &&
                                    response.status === 404
                                ) {
                                    await indexedDBService.deletePendingOp(op.id);
                                    successCount++;
                                    console.warn("Firma ya inexistente en backend, eliminando operación pendiente local.");
                                } else {
                                    errorCount++;
                                    console.error("Error al sincronizar pendiente:", responseData);
                                }
                            }
                        }
                    } catch (err) {
                        errorCount++;
                        console.error("Error al sincronizar pendiente:", err);
                    }
                }
        
                // Muestra un resumen al usuario
                if (successCount || errorCount) {
                    let msg = `Sincronización finalizada. ${successCount} exitosas, ${errorCount} con error.`;
                    sap.m.MessageToast.show(msg);
                }
            });
        },

        // ✅ SINCRONIZACIÓN INTELIGENTE - COORDINA TODAS LAS OPERACIONES PENDIENTES
        _syncAllPendingData: async function () {
            console.log("🚀 _syncAllPendingData iniciado");
            sap.ui.require(["com/xcaret/regactivosfijosoff/model/indexedDBService"], async function (indexedDBService) {
                try {
                    // 1. Obtener todas las operaciones pendientes
                    let pendingOps = await indexedDBService.getPendingOps();
                    let pendingImages = await indexedDBService.getPendingImages();
                    
                    console.log("🔄 Iniciando sincronización inteligente...");
                    console.log("📋 Operaciones pendientes:", pendingOps.length);
                    console.log("📸 Imágenes pendientes:", pendingImages.length);
                    
                    // 2. SINCRONIZAR IMÁGENES PRIMERO (con URL correcta)
                    if (pendingImages && pendingImages.length > 0) {
                        console.log("🔄 Sincronizando imágenes...");
                        await this.syncPendingImages();
                    }
                    
                    // 3. SINCRONIZAR OTRAS OPERACIONES (excluyendo imágenes)
                    let nonImageOps = pendingOps.filter(op => op.type !== "Image");
                    if (nonImageOps && nonImageOps.length > 0) {
                        console.log("🔄 Sincronizando otras operaciones:", nonImageOps.length);
                        await this.syncPendingOps();
                    }
                    
                    // 4. SINCRONIZAR FIRMAS SI ES NECESARIO
                    let signatureOps = pendingOps.filter(op => op.type === "Signature");
                    if (signatureOps && signatureOps.length > 0) {
                        console.log("🔄 Sincronizando firmas:", signatureOps.length);
                        await this.syncPendingSignatures();
                    }
                    
                    console.log("✅ Sincronización inteligente completada");
                    
                } catch (error) {
                    console.error("❌ Error en sincronización inteligente:", error);
                }
            }.bind(this));
        },

        // Offline
        syncPendingImages: async function () {
            sap.ui.require(["com/xcaret/regactivosfijosoff/model/indexedDBService"], async function (indexedDBService) {
                // 1. Obtener imágenes pendientes en IndexedDB
                let pendingImages = await indexedDBService.getPendingImages();
                if (!pendingImages || pendingImages.length === 0) {
                    sap.m.MessageToast.show("No hay imágenes pendientes por sincronizar.");
                    return;
                }

                let successCount = 0, errorCount = 0;
                for (let img of pendingImages) {
                    try {
                        // 2. Convierte base64 a Blob
                        let byteString = atob(img.data);
                        let ab = new ArrayBuffer(byteString.length);
                        let ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        let blob = new Blob([ab], { type: img.mimeType });

                        // 3. Asegúrate que el campo INDEX esté presente
                        let indexValue = img.index !== undefined ? img.index : img.INDEX;
                        if (indexValue === undefined) {
                            console.warn("Imagen pendiente sin INDEX, saltando:", img);
                            errorCount++;
                            continue;
                        }

                        // 4. Arma FormData igual que en onUploadPhotos
                        let formData = new FormData();
                        formData.append("image", blob, img.IMAGE_NAME);
                        formData.append("metadata", JSON.stringify([{
                            MBLRN: img.MBLRN,
                            LINE_ID: img.LINE_ID,
                            INDEX: indexValue,
                            IMAGE_NAME: img.IMAGE_NAME
                        }]));

                        // 5. Sube la imagen al backend
                        let response = await fetch(host + "/ImageMaterialReceptionItem", {
                            method: "POST",
                            body: formData
                        });

                        if (response.ok) {
                            await indexedDBService.markImageAsSynced(img.id || img.IMAGE_NAME);
                            
                            // ✅ ELIMINAR OPERACIÓN PENDIENTE CORRESPONDIENTE
                            // Buscar y eliminar la operación pendiente de tipo "Image" para esta imagen
                            let pendingOps = await indexedDBService.getPendingOps();
                            let imageOp = pendingOps.find(op => 
                                op.type === "Image" && 
                                op.data && 
                                op.data.IMAGE_NAME === img.IMAGE_NAME
                            );
                            if (imageOp) {
                                await indexedDBService.deletePendingOp(imageOp.id);
                                console.log("🗑️ Operación pendiente eliminada para imagen:", img.IMAGE_NAME);
                            }
                            
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (err) {
                        errorCount++;
                    }
                }

                sap.m.MessageToast.show(`Sincronización de imágenes finalizada. ${successCount} exitosas, ${errorCount} con error.`);
            });
        },

        // Offline
        syncPendingSignatures: async function () {
            sap.ui.require(["com/xcaret/regactivosfijosoff/model/indexedDBService"], async function (indexedDBService) {
                let pendingOps = await indexedDBService.getPendingOps();
                // Filtra solo operaciones de firmas
                let signatureOps = pendingOps.filter(op => op.type === "Signature");
                if (!signatureOps || signatureOps.length === 0) {
                    sap.m.MessageToast.show("No hay firmas pendientes por sincronizar.");
                    return;
                }

                let successCount = 0, errorCount = 0;

                for (let op of signatureOps) {
                    try {
                        if (op.opType === "create") {
                            // 1. Convierte base64 a Blob
                            let sign = op.data;
                            let byteString = atob(sign.image);
                            let ab = new ArrayBuffer(byteString.length);
                            let ia = new Uint8Array(ab);
                            for (let i = 0; i < byteString.length; i++) {
                                ia[i] = byteString.charCodeAt(i);
                            }
                            let blob = new Blob([ab], { type: sign.mimeType || "image/jpeg" });

                            // 2. Arma FormData igual que uploadSignature
                            let formData = new FormData();
                            formData.append("image", blob, "signature.jpeg");
                            formData.append("metadata", JSON.stringify([{
                                DOCID: sign.DOCID,
                                ID: sign.ID,
                                PROCESS: sign.PROCESS,
                                SUBPROCESS: sign.SUBPROCESS
                            }]));

                            // 3. Sube la firma al backend
                            let response = await fetch(host + "/ImageSignItem", {
                                method: "POST",
                                body: formData
                            });

                            if (response.ok) {
                                // Marca como sincronizada y elimina de pendientes
                                await indexedDBService.markSignatureAsSynced(sign.id);
                                await indexedDBService.deletePendingOp(op.id);
                                successCount++;
                            } else {
                                errorCount++;
                            }
                        } else if (op.opType === "delete") {
                            // 1. Elimina la firma en backend
                            let delItem = op.data;
                            let res = await fetch(host + "/ImageSignItem", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify([{
                                    DOCID: delItem.DOCID,
                                    ID: delItem.ID,
                                    PROCESS: delItem.PROCESS,
                                    SUBPROCESS: delItem.SUBPROCESS
                                }])
                            });
                            if (res.ok) {
                                await indexedDBService.deletePendingOp(op.id);
                                // También podrías eliminarla localmente si no lo has hecho antes
                                await indexedDBService.deleteSignature(delItem.DOCID + "_" + delItem.ID + "_" + sEmail);
                                successCount++;
                            } else {
                                errorCount++;
                            }
                        }
                    } catch (err) {
                        errorCount++;
                        console.error("Error al sincronizar firma pendiente:", err);
                    }
                }

                sap.m.MessageToast.show(`Sincronización de firmas finalizada. ${successCount} exitosas, ${errorCount} con error.`);
            });
        },

        onCalculateDatesBefore: function (days) {
            let vCurrentDate = currentDate.toISOString().split("T")[0];
            var oFinalDate = new Date(vCurrentDate);
            oFinalDate.setDate(oFinalDate.getDate() - 60);
            vFinalDate = vCurrentDate;
            vInitialDate = oFinalDate.toISOString().split("T")[0];
            var oDateRange = this.byId("idCreationDateRange");
            oDateRange.setDateValue(oFinalDate);
            oDateRange.setSecondDateValue(currentDate);
        },

        onDateRangeChange: function (oEvent) {
            var oDateRange = oEvent.getSource();
            var aDates = oDateRange.getDateValue(); // Get selected start date
            var oStartDate = oDateRange.getDateValue();
            var oEndDate = oDateRange.getSecondDateValue();
            if (oStartDate !== null) {
                vInitialDate = oStartDate.toISOString().split("T")[0];
            } else {
                vInitialDate = null;
            }
            if (oEndDate !== null) {
                vFinalDate = oEndDate.toISOString().split("T")[0];
            } else {
                vFinalDate = null;
            }
        },

        onInitialMainPage: function () {
            BusyIndicator.hide();
            oSkip = 0;
            this.iTotalItems = null;
            this.bIsLoading = false;
            let oModel = this.getView().getModel("serviceModel");
            oModel.setProperty("/generalData", []);
            this.onGetGeneralData();
        },

        onUpdateStarted: function (oEvent) {
            const oTable = this.byId("progrAlmacenTable");
            const iDisplayedItems = oTable.getItems().length;
            const sReason = oEvent.getParameter("reason");
            if (sReason === "Growing" && !this.bIsLoading && (this.iTotalItems === null || oSkip + oTop <= this.iTotalItems)) {
                this.bIsLoading = true;
                oSkip += oTop;
                this.onGetGeneralData(true); // Obtener más datos
            }
        },

        getCurrentUserName: function () {
            if (sap.ushell && sap.ushell.Container) {
                const oUser = sap.ushell.Container.getUser();
                sUserID = oUser.getId();
                sFName = oUser.getFirstName();
                sLName = oUser.getLastName();
                sEmail = oUser.getEmail();
            } else {


                /*
                sUserID = '53d6512a-591a-4961-a37f-0c670af2cb00';
                sFName = 'Eric Alejandro';
                sLName = 'Medina';
                sEmail = 'eric.medina@celeritech.biz';
                */

                //only test -- jc -- borrar al deployar
            }
        },

        onPutUserInformation: function (oEvent) {
            try {
                const sBaseUrl = host + "/User/" + sUserID;
                var xhr = new XMLHttpRequest();
                // Open the request (synchronous)
                xhr.open("PUT", sBaseUrl, false);  // false means synchronous request
                xhr.setRequestHeader("Content-Type", "application/json");
                var data = JSON.stringify({
                    NAME: sFName,
                    LNAME: sLName,
                    EMAIL: sEmail
                });
                // Send the request
                xhr.send(data);

                // Process the response after the request completes
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    console.log("Success:", response);
                } else {
                    console.error("Error:", xhr.status, xhr.statusText);
                }
            } catch (error) {
                console.error("Request failed:", error);
            }
        },
        // Initial Get Data ######################### Read----- #########################
        //
        buildNewQueryUrl: function (base, aIdEBELN, aIdPSPNR, aIdCONTRA, aIdUSER) {
            let conditions = [];

            // Función auxiliar para construir OR con un mismo parámetro
            function addCondition(field, values) {
                if (values && values.length > 0) {
                    let condition = values.map(value => `${field} EQ '${value}'`).join(" OR ");
                    conditions.push(`${condition}`); // Agrupa con paréntesis
                }
            }

            addCondition("EBELN", aIdEBELN);
            addCondition("ID_PEP", aIdPSPNR);
            addCondition("ID_CON", aIdCONTRA);
            //addCondition("ERNAM", aIdUSER);
            addCondition("RESP", aIdUSER);

            // Une todas las condiciones con AND
            let query = conditions.join(" AND ");

            // Retorna la URL final
            return query ? `${base}${query}` : base;
        },

        createUrl: function () {
            const sBaseUrl = `${host}/ScheduleLine?$filter=`;
            let sUrl = sBaseUrl;

            var sFinalUrl = this.buildNewQueryUrl(sBaseUrl, aIdEBELN, aIdPSPNR, aIdCONTRA, aIdUSER);
            // Regex to remove parameters with "undefined" as the value
            sUrl = sFinalUrl.replace(/([&?])([^&=]+)=undefined/g, '$1');
            // Remove trailing '&' or '?' if no parameters remain
            sUrl = sUrl.replace(/[?&]$/, '');

            return sUrl;
        },
        //#region Integration Services
        // Query

        _getBaseURL() {
            let appId = this.getOwnerComponent().getManifestEntry("/sap.app/id"),
                appPath = appId.replaceAll(".", "/"),
                appModulePath = jQuery.sap.getModulePath(appPath)
            return appModulePath;
        },

        onIconTabFilterSelect: function (oEvent) {
            sSelectedTab = oEvent.getParameter("selectedKey");
            this.onInitialMainPage();
        },
        /*
        onGetGeneralData: async function (bAppend = false) {
            try {
                let url;
                let sTop = "";
                const oController = this;
                var bFilter = false;
                var sDates = "";

                if ([aIdEBELN, aIdPSPNR, aIdCONTRA, aIdUSER].every(val => val?.length === 0)) {
                    url = `${host}/ScheduleLine`;
                } else {
                    url = this.createUrl();
                    bFilter = true;
                }

                var sTypeProg = this.byId("idTipoSelect").getSelectedKey();
                if (sSelectedTab !== "All") {
                    var sTabInd = this._getFilterTabIndicator(sSelectedTab);
                    if (bFilter) {
                        url = url + " AND (RE_TYPE EQ '" + sTypeProg + "')";
                    } else {
                        url = url + "?$filter=(RE_TYPE EQ '" + sTypeProg + "')";
                    }
                    url = url + "&$virtualFilter=GENERAL_STATUS EQ '" + sTabInd + "'";
                    bFilter = true;
                } else {
                    if (bFilter) {
                        url = url + " AND (RE_TYPE EQ '" + sTypeProg + "')";
                    } else {
                        url = url + "?$filter=(RE_TYPE EQ '" + sTypeProg + "')";
                        bFilter = true;
                    }
                }


                if ((oTop !== "" || oTop !== undefined) && (oSkip !== "" || oSkip !== undefined)) {
                    sTop = "$top=" + oTop + "&$skip=" + oSkip;
                }

                if (vInitialDate && vFinalDate) {
                    sDates = "(CREATED_AT BETWEEN '" + vInitialDate + "' AND '" + vFinalDate + "')"
                }

                if (bFilter && sDates) {
                    url = url + " AND " + sDates;
                } else {
                    if (sDates) {
                        url = url + "?$filter=" + sDates;
                        bFilter = true;
                    }
                }

                if (sTop) {
                    if (bFilter) {
                        url = url + "&" + sTop;
                    } else {
                        url = url + "?" + sTop;
                    }
                }

                let response = await fetch(url, { method: "GET" });
                if (!response.ok) throw new Error(`${response.error}`);
                let responseData = await response.json();
                let oModel = this.getView().getModel("serviceModel");

                if (response.status === 200) {
                    if (responseData.error === undefined) {
                        if (oController.iTotalItems === null) {
                            oController.iTotalItems = responseData.result.length;
                        } else {
                            oController.iTotalItems = oController.iTotalItems + responseData.result.length;
                        }
                        const aCurrentData = oModel.getProperty("/generalData") || [];
                        const aUpdatedData = bAppend ? aCurrentData.concat(responseData.result) : responseData.result;
                        this.onUpdateFinishedTable(aUpdatedData.length);
                        oModel.setProperty("/generalData", this._getFormatData(aUpdatedData));
                        oController.bIsLoading = false;
                    } else {
                        const aDataResult = [];
                        this.onUpdateFinishedTable(aDataResult.length);
                        oModel.setProperty("/generalData", aDataResult);
                        oController.iTotalItems = aDataResult.length;
                        oController.bIsLoading = false;
                        sap.m.MessageToast.show(responseData.error);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        },
        */
        // Offline
        /*
        onGetGeneralData: async function (bAppend = false) {
            try {
                let oModel = this.getView().getModel("serviceModel");
                if (indexedDBService.isOnline()) {
                    // --- Modo ONLINE: Obtener del backend y guardar en IndexedDB ---
                    let url;
                    let sTop = "";
                    const oController = this;
                    var bFilter = false;
                    var sDates = "";

                    if ([aIdEBELN, aIdPSPNR, aIdCONTRA, aIdUSER].every(val => val?.length === 0)) {
                        url = `${host}/ScheduleLine`;
                    } else {
                        url = this.createUrl();
                        bFilter = true;
                    }

                    var sTypeProg = this.byId("idTipoSelect").getSelectedKey();
                    if (sSelectedTab !== "All") {
                        var sTabInd = this._getFilterTabIndicator(sSelectedTab);
                        if (bFilter) {
                            url = url + " AND (RE_TYPE EQ '" + sTypeProg + "')";
                        } else {
                            url = url + "?$filter=(RE_TYPE EQ '" + sTypeProg + "')";
                        }
                        url = url + "&$virtualFilter=GENERAL_STATUS EQ '" + sTabInd + "'";
                        bFilter = true;
                    } else {
                        if (bFilter) {
                            url = url + " AND (RE_TYPE EQ '" + sTypeProg + "')";
                        } else {
                            url = url + "?$filter=(RE_TYPE EQ '" + sTypeProg + "')";
                            bFilter = true;
                        }
                    }

                    if ((oTop !== "" || oTop !== undefined) && (oSkip !== "" || oSkip !== undefined)) {
                        sTop = "$top=" + oTop + "&$skip=" + oSkip;
                    }

                    if (vInitialDate && vFinalDate) {
                        sDates = "(CREATED_AT BETWEEN '" + vInitialDate + "' AND '" + vFinalDate + "')";
                    }

                    if (bFilter && sDates) {
                        url = url + " AND " + sDates;
                    } else {
                        if (sDates) {
                            url = url + "?$filter=" + sDates;
                            bFilter = true;
                        }
                    }

                    if (sTop) {
                        if (bFilter) {
                            url = url + "&" + sTop;
                        } else {
                            url = url + "?" + sTop;
                        }
                    }

                    let response = await fetch(url, { method: "GET" });
                    if (!response.ok) throw new Error(`${response.error}`);
                    let responseData = await response.json();

                    if (response.status === 200) {
                        if (responseData.error === undefined) {
                            // ========= 1. Guardar ScheduleLine principal =========
                            const payload = responseData.result.map(obj => ({
                                ...obj,
                                id: obj.EBELN // IndexedDB necesita un campo 'id' único
                            }));
                            await indexedDBService.saveBulk(indexedDBService.STORE_NAMES.scheduleLine, payload);

                            // ========= 2. Precarga masiva de detalles =========
                            let maxItemsToPreload = 50; // ajusta este número si lo requieres
                            let itemsToPreload = responseData.result.slice(0, maxItemsToPreload);
                            let detailsToSave = [];
                            for (const item of itemsToPreload) {
                                try {
                                    let ebeln = item.EBELN;
                                    let detailUrl = `${host}/ScheduleLine/${ebeln}`;
                                    let detailResponse = await fetch(detailUrl, { method: "GET" });
                                    let detailData = await detailResponse.json();
                                    // Guarda el detalle en IndexedDB
                                    detailsToSave.push({ id: ebeln, ...detailData.response });
                                } catch (err) {
                                    // Si falla, continúa con el siguiente
                                    console.warn(`No se pudo precargar el detalle para EBELN ${item.EBELN}:`, err);
                                }
                            }
                            // Guarda todos los detalles en IndexedDB
                            if (detailsToSave.length > 0) {
                                await indexedDBService.saveBulk(indexedDBService.STORE_NAMES.scheduleLineDetail, detailsToSave);
                            }
                            // ========= 3. Fin precarga masiva =========

                            if (oController.iTotalItems === null) {
                                oController.iTotalItems = responseData.result.length;
                            } else {
                                oController.iTotalItems = oController.iTotalItems + responseData.result.length;
                            }
                            const aCurrentData = oModel.getProperty("/generalData") || [];
                            const aUpdatedData = bAppend ? aCurrentData.concat(responseData.result) : responseData.result;
                            this.onUpdateFinishedTable(aUpdatedData.length);
                            oModel.setProperty("/generalData", await this._getFormatData(aUpdatedData));
                            oController.bIsLoading = false;
                        } else {
                            const aDataResult = [];
                            this.onUpdateFinishedTable(aDataResult.length);
                            oModel.setProperty("/generalData", aDataResult);
                            oController.iTotalItems = aDataResult.length;
                            oController.bIsLoading = false;
                            sap.m.MessageToast.show(responseData.error);
                        }
                    }
                } else {
                    // --- Modo OFFLINE: Cargar desde IndexedDB ---
                    let localData = await indexedDBService.getAll(indexedDBService.STORE_NAMES.scheduleLine);
                    oModel.setProperty("/generalData", await this._getFormatData(localData));
                    this.onUpdateFinishedTable(localData.length);
                    this.bIsLoading = false;
                    sap.m.MessageToast.show("Datos cargados en modo offline");
                }
            } catch (error) {
                console.error(error);
                sap.m.MessageToast.show("Error al cargar datos (offline/online)");
            }
        },
        */

        onGetGeneralData: async function (bAppend = false) {
            try {
                let oModel = this.getView().getModel("serviceModel");
                const oTable = this.byId("progrAlmacenTable");

                // Usa window.navigator.onLine para detectar estado de red consistente
                if (window.navigator.onLine) {
                    // --- Modo ONLINE: Obtener del backend y guardar en IndexedDB ---
                    let url;
                    let sTop = "";
                    const oController = this;
                    var bFilter = false;
                    var sDates = "";

                    if ([aIdEBELN, aIdPSPNR, aIdCONTRA, aIdUSER].every(val => val?.length === 0)) {
                        url = `${host}/ScheduleLine`;
                    } else {
                        url = this.createUrl();
                        bFilter = true;
                    }

                    var sTypeProg = this.byId("idTipoSelect").getSelectedKey();
                    if (sSelectedTab !== "All") {
                        var sTabInd = this._getFilterTabIndicator(sSelectedTab);
                        if (bFilter) {
                            url = url + " AND (RE_TYPE EQ '" + sTypeProg + "')";
                        } else {
                            url = url + "?$filter=(RE_TYPE EQ '" + sTypeProg + "')";
                        }
                        url = url + "&$virtualFilter=GENERAL_STATUS EQ '" + sTabInd + "'";
                        bFilter = true;
                    } else {
                        if (bFilter) {
                            url = url + " AND (RE_TYPE EQ '" + sTypeProg + "')";
                        } else {
                            url = url + "?$filter=(RE_TYPE EQ '" + sTypeProg + "')";
                            bFilter = true;
                        }
                    }

                    if ((oTop !== "" || oTop !== undefined) && (oSkip !== "" || oSkip !== undefined)) {
                        sTop = "$top=" + oTop + "&$skip=" + oSkip;
                    }

                    if (vInitialDate && vFinalDate) {
                        sDates = "(CREATED_AT BETWEEN '" + vInitialDate + "' AND '" + vFinalDate + "')";
                    }

                    if (bFilter && sDates) {
                        url = url + " AND " + sDates;
                    } else {
                        if (sDates) {
                            url = url + "?$filter=" + sDates;
                            bFilter = true;
                        }
                    }

                    if (sTop) {
                        if (bFilter) {
                            url = url + "&" + sTop;
                        } else {
                            url = url + "?" + sTop;
                        }
                    }

                    let response = await fetch(url, { method: "GET" });
                    if (!response.ok) throw new Error(`${response.error}`);
                    let responseData = await response.json();

                    if (response.status === 200) {
                        if (responseData.error === undefined) {
                            // ========= 1. Guardar ScheduleLine principal =========
                            const payload = responseData.result.map(obj => ({
                                ...obj,
                                id: obj.EBELN // IndexedDB necesita un campo 'id' único
                            }));
                            await indexedDBService.saveBulk(indexedDBService.STORE_NAMES.scheduleLine, payload);

                            // ========= 2. Precarga masiva de detalles: CARGA TODOS LOS DETALLES =========
                            let itemsToPreload = responseData.result;
                            let detailsToSave = [];
                            for (const item of itemsToPreload) {
                                try {
                                    let ebeln = item.EBELN;
                                    let detailUrl = `${host}/ScheduleLine/${ebeln}`;
                                    let detailResponse = await fetch(detailUrl, { method: "GET" });
                                    let detailData = await detailResponse.json();
                                    // Guarda el detalle en IndexedDB
                                    detailsToSave.push({ id: ebeln, ...detailData.response });
                                } catch (err) {
                                    // Si falla, continúa con el siguiente
                                    console.warn(`No se pudo precargar el detalle para EBELN ${item.EBELN}:`, err);
                                }
                            }
                            if (detailsToSave.length > 0) {
                                await indexedDBService.saveBulk(indexedDBService.STORE_NAMES.scheduleLineDetail, detailsToSave);
                            }
                            // ========= 3. Fin precarga masiva =========

                            if (oController.iTotalItems === null) {
                                oController.iTotalItems = responseData.result.length;
                            } else {
                                oController.iTotalItems = oController.iTotalItems + responseData.result.length;
                            }
                            const aCurrentData = oModel.getProperty("/generalData") || [];
                            const aUpdatedData = bAppend ? aCurrentData.concat(responseData.result) : responseData.result;
                            this.onUpdateFinishedTable(aUpdatedData.length);
                            oModel.setProperty("/generalData", await this._getFormatData(aUpdatedData));
                            oController.bIsLoading = false;
                        } else {
                            const aDataResult = [];
                            this.onUpdateFinishedTable(aDataResult.length);
                            oModel.setProperty("/generalData", aDataResult);
                            oController.iTotalItems = aDataResult.length;
                            oController.bIsLoading = false;
                            sap.m.MessageToast.show(responseData.error);
                        }
                    }
                    // Activa growing en modo online
                    /*
                    if (oTable) {
                        oTable.setGrowing(true);
                    }
                    */
                } else {
                    // --- Modo OFFLINE: Cargar desde IndexedDB ---
                    let localData = await indexedDBService.getAll(indexedDBService.STORE_NAMES.scheduleLine);
                    oModel.setProperty("/generalData", await this._getFormatData(localData));
                    this.onUpdateFinishedTable(localData.length);
                    this.bIsLoading = false;
                    sap.m.MessageToast.show("Datos cargados en modo offline");
                    // Desactiva growing en modo offline
                    /*
                    if (oTable) {
                        oTable.setGrowing(false);
                    }
                    */
                }
            } catch (error) {
                console.error(error);
                sap.m.MessageToast.show("Error al cargar datos (offline/online)");
            }
        },

        /*
        _getFilterTabIndicator: function (sTab) {
            var sRet = "";
            switch (sTab) {
                case "Active":
                    sRet = "1";
                    break;
                case "Deleted":
                    sRet = "2";
                    break;
                case "Partial":
                    sRet = "3";
                    break;
                case "Total":
                    sRet = "4";
                    break;
                default:
                    break;
            }
            return sRet;
        },
        */

        //24.06.2025
        _getFilterTabIndicator: function (sTab) {
            var sRet = "";
            switch (sTab) {
                case "Active":
                    sRet = "0";
                    break;
                case "Deleted":
                    sRet = "3";
                    break;
                case "Partial":
                    sRet = "1";
                    break;
                case "Total":
                    sRet = "2";
                    break;
                default:
                    break;
            }
            return sRet;
        },
        /*
        _getFormatData: function (aData) {
            var that = this;
            let conditions = [];

            // Función auxiliar para construir OR con un mismo parámetro
            function addCondition(field, values) {
                if (values && values.length > 0) {
                    let condition = values.map(value => `${field} EQ '${value}'`).join(" OR ");
                    conditions.push(`${condition}`); // Agrupa con paréntesis
                }
            }

            var aEBELN = [];
            aData.forEach(function (oItem) {
                //let iStat = parseInt(oItem.STATUS);
                aEBELN.push(oItem.EBELN);
            });
            addCondition("XBLNR", aEBELN);

            var aFixedData = [];
            if (conditions.length > 0) {
                var sFilter = "/FixedAsset?$filter=" + conditions[0];
                var sUrl = `${host}` + sFilter;
                var aResult = this.getDataRangesSynchronously(sUrl);
                if (aResult.result) {
                    aFixedData = aResult.result;
                }
            }

            const i18 = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            aData.forEach(function (oItem) {
                //let iStat = parseInt(oItem.STATUS);
                let iStat = parseInt(oItem.GENERAL_STATUS); //24.06.2025
                let oObj = that._getStatusObj(iStat);
                oItem["STATUS_TEXT"] = oObj.STATUS_TEXT;
                oItem["STATUS_ICON"] = oObj.STATUS_ICON;
                oItem["STATUS_STATE"] = oObj.STATUS_STATE;
                var sDate = "";
                if (oItem.CREATED_AT) {
                    sDate = that.getStringDate(new Date(oItem.CREATED_AT));
                }
                oItem["CREATED_AT_DATE"] = sDate;

                //Fixed Asset Status
                var sFixStatusText = "";
                var oFixed = aFixedData.filter(oFix => oFix.XBLNR === oItem.EBELN);
                var iFixId;
                if (oFixed) {
                    if (oFixed.length > 0) {
                        if (oFixed[0].STATUS === "2" || oFixed[0].STATUS === 2) {
                            sFixStatusText = i18.getText("REC_PARCIAL");
                            iFixId = 1;
                        }
                        if (oFixed[0].STATUS === "3" || oFixed[0].STATUS === 3) {
                            sFixStatusText = i18.getText("REC_TOTAL");
                            iFixId = 2;
                        }
                    }
                }
                if (sFixStatusText) {
                    var oFixObj = that._getStatusObj(iFixId);
                    oItem["FIXED_TEXT"] = sFixStatusText;
                    oItem["FIXED_ICON"] = oFixObj.STATUS_ICON;
                    oItem["FIXED_STATE"] = oFixObj.STATUS_STATE;
                } else {
                    var oFixObj = that._getStatusObj();
                    oItem["FIXED_TEXT"] = sFixStatusText;
                    oItem["FIXED_ICON"] = oFixObj.STATUS_ICON;
                    oItem["FIXED_STATE"] = oFixObj.STATUS_STATE;
                }
            });
            return aData;
        },
        */
        // Offline
        _getFormatData: async function (aData) {
            var that = this;
            let conditions = [];

            function addCondition(field, values) {
                if (values && values.length > 0) {
                    let condition = values.map(value => `${field} EQ '${value}'`).join(" OR ");
                    conditions.push(`${condition}`);
                }
            }

            var aEBELN = [];
            aData.forEach(function (oItem) {
                aEBELN.push(oItem.EBELN);
            });
            addCondition("XBLNR", aEBELN);

            var aFixedData = [];
            if (conditions.length > 0) {
                if (window.navigator.onLine) {
                    var sFilter = "/FixedAsset?$filter=" + conditions[0];
                    var sUrl = `${host}` + sFilter;
                    var aResult = this.getDataRangesSynchronously(sUrl);
                    if (aResult && aResult.result) {
                        aFixedData = aResult.result;
                    }
                } else {
                    // OFFLINE: busca los FixedAsset en IndexedDB
                    const indexedDBService = await sap.ui.require("com/xcaret/regactivosfijosoff/model/indexedDBService");
                    // Obtén todos los ScheduleLineDetail (o el store adecuado de FixedAsset si lo tienes)
                    let allFixed = await indexedDBService.getAll(indexedDBService.STORE_NAMES.scheduleLineDetail);
                    // Filtra los que correspondan a los EBELN de aData
                    aFixedData = allFixed.filter(item => aEBELN.includes(item.XBLNR));
                }
            }

            const i18 = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            aData.forEach(function (oItem) {
                let iStat = parseInt(oItem.GENERAL_STATUS);
                let oObj = that._getStatusObj(iStat);
                oItem["STATUS_TEXT"] = oObj.STATUS_TEXT;
                oItem["STATUS_ICON"] = oObj.STATUS_ICON;
                oItem["STATUS_STATE"] = oObj.STATUS_STATE;
                var sDate = "";
                if (oItem.CREATED_AT) {
                    sDate = that.getStringDate(new Date(oItem.CREATED_AT));
                }
                oItem["CREATED_AT_DATE"] = sDate;

                //Fixed Asset Status
                var sFixStatusText = "";
                var oFixed = aFixedData.filter(oFix => oFix.XBLNR === oItem.EBELN);
                var iFixId;
                if (oFixed && oFixed.length > 0) {
                    if (oFixed[0].STATUS === "2" || oFixed[0].STATUS === 2) {
                        sFixStatusText = i18.getText("REC_PARCIAL");
                        iFixId = 1;
                    }
                    if (oFixed[0].STATUS === "3" || oFixed[0].STATUS === 3) {
                        sFixStatusText = i18.getText("REC_TOTAL");
                        iFixId = 2;
                    }
                }
                if (sFixStatusText) {
                    var oFixObj = that._getStatusObj(iFixId);
                    oItem["FIXED_TEXT"] = sFixStatusText;
                    oItem["FIXED_ICON"] = oFixObj.STATUS_ICON;
                    oItem["FIXED_STATE"] = oFixObj.STATUS_STATE;
                } else {
                    var oFixObj = that._getStatusObj();
                    oItem["FIXED_TEXT"] = sFixStatusText;
                    oItem["FIXED_ICON"] = oFixObj.STATUS_ICON;
                    oItem["FIXED_STATE"] = oFixObj.STATUS_STATE;
                }
            });
            return aData;
        },

        getDataRangesSynchronously: function (sUrl) {
            let oData = null;
            const xhr = new XMLHttpRequest();
            xhr.open("GET", sUrl, false);
            try {
                xhr.send();
                if (xhr.status === 200) {
                    // Parse the response as JSON
                    oData = JSON.parse(xhr.responseText);
                } else {
                    console.error(`Error: ${xhr.status} - ${xhr.statusText}`);
                }
            } catch (error) {
                console.error("Synchronous Ranges request failed:", error);
            }
            return oData; // Return the fetched data
        },



        getStringDate: function (oDate) {
            var day = String(oDate.getDate()).padStart(2, '0');
            var month = String(oDate.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
            var year = oDate.getFullYear();
            return year + "-" + month + "-" + day;
        },

        /*
       _getStatusObj: function (iStat) {
           var i18 = this.getOwnerComponent().getModel("i18n").getResourceBundle();
           var oObj = {
               STATUS_TEXT: "Unknown",
               STATUS_ICON: "",
               STATUS_STATE: "None"
           };
           switch (iStat) {
               case 1:
                   oObj.STATUS_TEXT = i18.getText("STATUS_ACTIVE");
                   oObj.STATUS_ICON = "sap-icon://sys-enter-2";
                   oObj.STATUS_STATE = "Success";
                   break;
               case 2:
                   oObj.STATUS_TEXT = i18.getText("STATUS_DELETED");
                   oObj.STATUS_ICON = "sap-icon://error";
                   oObj.STATUS_STATE = "Error";
                   break;
               case 3:
                   oObj.STATUS_TEXT = i18.getText("STATUS_PARTIAL");
                   oObj.STATUS_ICON = "sap-icon://alert";
                   oObj.STATUS_STATE = "Warning";
                   break;
               case 4:
                   oObj.STATUS_TEXT = i18.getText("STATUS_TOTAL");
                   oObj.STATUS_ICON = "sap-icon://information";
                   oObj.STATUS_STATE = "Information";
                   break;
               default:
                   break;
           }
           return oObj;
       },
       */


        //24.06.2025
        _getStatusObj: function (iStat) {
            var i18 = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oObj = {
                STATUS_TEXT: "Unknown",
                STATUS_ICON: "",
                STATUS_STATE: "None"
            };
            switch (iStat) {
                case 0:
                    oObj.STATUS_TEXT = i18.getText("STATUS_ACTIVE");
                    oObj.STATUS_ICON = "sap-icon://sys-enter-2";
                    oObj.STATUS_STATE = "Success";
                    break;
                case 3:
                    oObj.STATUS_TEXT = i18.getText("STATUS_DELETED");
                    oObj.STATUS_ICON = "sap-icon://error";
                    oObj.STATUS_STATE = "Error";
                    break;
                case 1:
                    oObj.STATUS_TEXT = i18.getText("STATUS_PARTIAL");
                    oObj.STATUS_ICON = "sap-icon://alert";
                    oObj.STATUS_STATE = "Warning";
                    break;
                case 2:
                    oObj.STATUS_TEXT = i18.getText("STATUS_TOTAL");
                    oObj.STATUS_ICON = "sap-icon://information";
                    oObj.STATUS_STATE = "Information";
                    break;
                default:
                    break;
            }
            return oObj;
        },

        multiQuery: async function () {
            try {
                let urls = [
                    `${host}/Provider/query?BLOCKED=null`,
                    `${host}/User`,
                    `${host}/Rol?$filter=ID EQ 007 AND EMAIL EQ '${sEmail}'`,
                    `${host}/Projects/Project/query?&ID_STA=1`,
                    `${host}/Contract`

                ];

                let responses = await Promise.all(
                    urls.map(url => fetch(url).then(res => {
                        if (!res.ok) throw new Error(`Error fetching ${url}`);
                        return res.json();
                    }))
                );
                // Assuming each response has a `result` property
                let structuredData = {
                    scheduleLine: responses[0].data,
                    user: responses[1].result,
                    rol: responses[2].result,
                    projects: responses[3].data,
                    contract: responses[4].result
                };

                let oModel = this.getView().getModel("serviceModel");
                oModel.setProperty("/generalProvider", responses[0].data);
                oModel.setProperty("/generalUser", this._getUserCollection(responses[1].result));
                oModel.setProperty("/generalRol", responses[2].result);
                if ([responses[2].result].every(val => val?.length !== 0)) { this.validateRol(responses[2].result); }
                oModel.setProperty("/generalProjects", responses[3].data);
                oModel.setProperty("/generalContract", responses[4].result);
                //this.showUserDialog();
            } catch (error) {
                console.error(error);
            }
        },

        showUserDialog: function () {
            this.byId("IdUSER").fireValueHelpRequest();
        },

        _getUserCollection: function (aData) {
            var aResult = [];
            aData.forEach(function (oItem) {
                var oItem = {
                    UserId: oItem.ERNAM,
                    UserText: oItem.NAME + " " + oItem.LNAME,
                    ERNAM: oItem.ERNAM,
                    NAME: oItem.NAME,
                    LNAME: oItem.LNAME,
                    EMAIL: oItem.EMAIL
                }
                aResult.push(oItem);
            });
            return aResult;
        },
        //
        // End Get Data ######################### Read----- #########################

        // Page Events ######################### ----- #########################
        // Page Header ######################### ----- #########################

        // Filters
        valueHelpFilter: function (oEvent) {
            let aData;
            const i18 = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            // Get Model
            let oModel = this.getView().getModel("serviceModel");
            // Save MultiInput which executes the event
            this._oMultiInput = oEvent.getSource();

            // Get ID of MultiInput
            let id = oEvent.getSource().getId();
            let shortId = id.split("--").pop();
            let filterId, filterDescr, title, textAdded;

            if (id.includes("IdEBELN")) {
                filterId = "EBELN";
                filterDescr = "EBELN";
                aData = oModel.getProperty("/generalData") || [];
                title = i18.getText("EBELN");

            } else if (id.includes("IdPSPNR")) {
                filterId = "ID_PEP";
                filterDescr = "NAME1";
                aData = oModel.getProperty("/generalProjects") || [];
                title = i18.getText("PSPNR");

            } else if (id.includes("ID_CON")) {
                filterId = "ID_CON";
                filterDescr = "CONAM";
                aData = oModel.getProperty("/generalContract") || [];
                title = i18.getText("ID_CON");

            } else if (id.includes("IdUSER")) {
                filterId = "ERNAM";
                //filterDescr = "NAME";
                filterDescr = "UserText";
                aData = oModel.getProperty("/generalUser") || [];
                title = i18.getText("ERNAM");
            }

            // Get tokens of MultiInput
            let aTokens = this._oMultiInput.getTokens().map(token => ({
                key: token.getKey(),
                text: token.getText()
            }));


            let oTemplate;
            var bMultiSelect = true;
            if (id.includes("IdUSER")) {
                bMultiSelect = false;
                oTemplate = new sap.m.StandardListItem({
                    title: `{${filterDescr}}`
                });
            } else {
                oTemplate = new sap.m.StandardListItem({
                    title: `{${filterId}}`,
                    description: `{${filterDescr}}`
                })
            }

            // Creation of Dialog
            if (!this._oSelectDialog) {
                this._oSelectDialog = new sap.m.SelectDialog({
                    title: title,
                    multiSelect: bMultiSelect,
                    items: {
                        path: "/filters",
                        template: oTemplate
                    },
                    confirm: function (oEvent) { // Confirm Button
                        let selectedItems = oEvent.getParameter("selectedItems");
                        if (!selectedItems) return;
                        if (selectedItems.length == 0) { this._oMultiInput.removeAllTokens(); return; }
                        this._oMultiInput.removeAllTokens();
                        selectedItems.forEach(item => {

                            if (id.includes("IdUSER")) {
                                this._oMultiInput.removeAllTokens();
                                var oObj = item.getBindingContext().getObject()
                                let token = new sap.m.Token({
                                    key: oObj.UserId,
                                    text: oObj.UserText
                                });
                                this._oMultiInput.addToken(token);
                                textAdded = oObj.UserId;
                            } else {
                                let token = new sap.m.Token({
                                    key: item.getTitle(),
                                    text: item.getDescription()
                                });
                                this._oMultiInput.addToken(token);
                                textAdded = item.getTitle();
                            }

                            if (id.includes("IdEBELN")) {
                                aIdEBELN.push(textAdded);
                            } else if (id.includes("IdPSPNR")) {
                                aIdPSPNR.push(textAdded);
                            } else if (id.includes("ID_CON")) {
                                aIdEBELN.push(textAdded);
                            } else if (id.includes("IdUSER")) {
                                aIdUSER = [];
                                aIdUSER.push(textAdded);
                            }
                        });

                        this._oSelectDialog.destroy();
                        this._oSelectDialog = null;

                        if (id.includes("IdUSER")) {
                            this.onInitialMainPage();
                        }
                    }.bind(this),
                    search: function (oEvent) { // Search Event
                        let sValue = oEvent.getParameter("value");
                        let oFilter = new sap.ui.model.Filter(`${filterDescr}`, sap.ui.model.FilterOperator.Contains, sValue);
                        oEvent.getSource().getBinding("items").filter([oFilter]);
                    },
                    cancel: function (oEvent) { // Cancel Button
                        this._oSelectDialog.destroy();
                        this._oSelectDialog = null;
                    }.bind(this)
                });
                this.getView().addDependent(this._oSelectDialog);
            }
            // Set Items of Model
            let oTempModel = new sap.ui.model.json.JSONModel({ filters: aData });
            this._oSelectDialog.setModel(oTempModel);
            // Add previous tokens
            this._oSelectDialog.attachEventOnce("updateFinished", function () {
                let oList = this._oSelectDialog.getItems();
                oList.forEach(item => {
                    if (aTokens.includes(item.getTitle())) {
                        item.setSelected(true);
                    }
                });
            }.bind(this));
            this._oSelectDialog.open("");
        },

        onUpdateFinishedTable: function (iTotal) {
            let oModel = this.getView().getModel("serviceModel");
            oModel.setProperty("/titleCount", iTotal);
            oModel.refresh();
            this.byId("progrAlmacenTable").removeSelections(true);
            this._setIconTabCount(iTotal);
        },

        _setIconTabCount: function (iTotal) {
            var oIconTabBar = this.byId("iconTabBar");
            var aItems = oIconTabBar.getItems();

            //reset all counts
            aItems.forEach(function (oItem, iIndex, aList) {
                if (aList[iIndex].getId().includes("filter") && aList[iIndex].getKey() !== "All") {
                    oItem.setCount("");
                }
            });

            //Set total
            if (iTotal > 0) {
                aItems.forEach(function (oItem, iIndex, aList) {
                    if (aList[iIndex].getId().includes("filter") && aList[iIndex].getKey() !== "All") {
                        if (oItem.getKey() === sSelectedTab) {
                            oItem.setCount(iTotal);
                        }
                    }
                });
            }
        },

        updateTokenIdClear: function (oEvent) {
            var oSource = oEvent.getSource(); // The UI control that triggered the event
            let id = oEvent.getSource().getId();
            let shortId = id.split("--").pop();

            if (oEvent.getParameter("removedTokens")[0]) {
                var text = oEvent.getParameter("removedTokens")[0].getKey();        //getText();
                switch (shortId) {
                    case "IdEBELN":
                        aIdEBELN = aIdEBELN.filter(function (linea) {
                            return linea !== text;
                        });
                        break;
                    case "IdPSPNR":
                        aIdPSPNR = aIdPSPNR.filter(function (linea) {
                            return linea !== text;
                        });
                        break;
                    case "ID_CON":
                        aIdEBELN = aIdEBELN.filter(function (linea) {
                            return linea !== text;
                        });
                        break;
                    case "IdUSER":
                        aIdUSER = aIdUSER.filter(function (linea) {
                            return linea !== text;
                        });
                    default:
                        // Code to execute if no cases match
                        break;
                }

            }
            if (oEvent.getParameter("addedTokens")[0]) {
                var textAdded = oEvent.getParameter("addedTokens")[0].getKey();
                switch (shortId) {
                    case "IdEBELN":
                        aIdEBELN.push(textAdded);
                        break;
                    case "IdPSPNR":
                        aIdPSPNR.push(textAdded);
                        break;
                    case "ID_CON":
                        aIdEBELN.push(textAdded);
                        break;
                    case "IdUSER":
                        aIdUSER.push(textAdded);
                    default:
                        // Code to execute if no cases match
                        break;
                }

            }

        },

        onClearQuery: function () {
            this.byId("multiInEmail").removeAllTokens();
            this.byId("multiInAppId").removeAllTokens();
            this._query();
        },

        validateRol: function (aJsonRol) {
            aJsonRol.forEach((oItem) => {
                if (oItem.CREATE === "X") {
                    //this.getView().byId("idBtnCreate").setVisible(true);
                }

            });
        },
        /// Set Cloumns
        onOpenColumnSettings: function () {
            this.byId("columnSettingsDialog").open();
        },
        onCloseColumnSettings: function () {
            this.byId("columnSettingsDialog").close();
        },
        onToggleColumnVisibility: function (oEvent) {
            let sColumn = oEvent.getSource().getTitle();
            let oModel = this.getView().getModel("settingsModel");
            let bCurrentValue = oModel.getProperty("/" + sColumn);
            oModel.setProperty("/" + sColumn, !bCurrentValue);
        },
        ///

        //################### -------------------------------- Begin Variant
        _onVariantLoad: function () {
            var oFilterBar = this.getView().byId("filterbar");
            var oSmartVariant = this.getView().byId("svm");
            var oVariantData = oSmartVariant.getVariantContent();
            var sNewVariantId = oSmartVariant.getCurrentVariantId();
            if (sNewVariantId === "") {
                sNewVariantId = "PROG_ALMACEN_VARIANT";
            } else { sNewVariantId = "PROG_ALMACEN_VARIANT_" + sNewVariantId; }

            var sSavedVariant = localStorage.getItem(sNewVariantId);
            if (sSavedVariant) {
                var oVariantData = JSON.parse(sSavedVariant);
                this.getView().byId("IdEBELN").setTokens(oVariantData.filterData.IdEBELN.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this.getView().byId("IdPSPNR").setTokens(oVariantData.filterData.IdPSPNR.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this.getView().byId("ID_CON").setTokens(oVariantData.filterData.IdBANFN.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this.getView().byId("IdUSER").setTokens(oVariantData.filterData.IdUSER.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this._applyTableSettings(oVariantData.tableSettings);
            }
        },

        onVariantSave: function (oEvent) {
            var oFilterBar = this.getView().byId("filterbar"); // Obtener la referencia del FilterBar
            var oSmartVariant = this.getView().byId("svm");
            var oVariantData = oSmartVariant.getVariantContent();
            var sVariantId = oSmartVariant.getCurrentVariantId();
            if (sVariantId === "") {
                sVariantId = "VARIANT_1";
            }
            var oFilterData = {
                variantId: sVariantId,
                IdEBELN: this.getView().byId("IdEBELN").getTokens().map(token => ({
                    key: token.getKey(),
                    text: token.getText()
                })),
                IdPSPNR: this.getView().byId("IdPSPNR").getTokens().map(token => ({
                    key: token.getKey(),
                    text: token.getText()
                })),
                ID_CON: this.getView().byId("ID_CON").getTokens().map(token => ({
                    key: token.getKey(),
                    text: token.getText()
                })),
                IdUSER: this.getView().byId("IdUSER").getTokens().map(token => ({
                    key: token.getKey(),
                    text: token.getText()
                }))
            };
            var oTableSettings = this._getTableSettings();
            var oVariantData = {
                filterData: oFilterData,
                tableSettings: oTableSettings
            };
            this.currentVariantJson = JSON.stringify(oVariantData);
            localStorage.setItem("PROG_ALMACEN_VARIANT_" + sVariantId, this.currentVariantJson);
            this.executeAfterDelay();
            //MessageToast.show("Page Variant Saved!");
        },
        _onVariantChange: function (oEvent) {
            var oSmartVariant = this.getView().byId("svm");
            this.onResetParameters();
            var sNewVariantId = oSmartVariant.getCurrentVariantId();
            var sSavedVariant = localStorage.getItem("PROG_ALMACEN_VARIANT_" + sNewVariantId);
            if (sSavedVariant) {
                var oVariantData = JSON.parse(sSavedVariant);
                this.getView().byId("IdEBELN").setTokens(oVariantData.filterData.IdLIFNR.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this.getView().byId("IdPSPNR").setTokens(oVariantData.filterData.IdPSPNR.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this.getView().byId("ID_CON").setTokens(oVariantData.filterData.IdEBELN.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this.getView().byId("IdUSER").setTokens(oVariantData.filterData.IdUSER.map(value => new sap.m.Token({ key: value.key, text: value.text })));
                this._applyTableSettings(oVariantData.tableSettings);
                //MessageToast.show("Page Variant Loaded!");
            }
        },
        executeAfterDelay: function () {
            var delayTime = 1500;
            var that = this;
            setTimeout(function () {
                var oSmartVariant = that.getView().byId("svm");
                if (oSmartVariant) {
                    if (that.currentVariantJson !== "") {
                        var sVariantId = oSmartVariant.getCurrentVariantId();
                        localStorage.setItem("PROG_ALMACEN_VARIANT_" + sVariantId, that.currentVariantJson);
                    }
                }
            }, delayTime);
            // Verificar si el control SmartVariantManagement está listo

        },
        _getTableSettings: function () {
            var oTable = this.getView().byId("progrAlmacenTable");
            return {
                visibleColumns: oTable.getColumns().length // Example: Capture visible columns
            };
        },

        // Apply Table Settings
        _applyTableSettings: function (oSettings) {
            var oTable = this.getView().byId("progrAlmacenTable");
            console.log("Applying Table Settings:", oSettings);
        },
        //##########End Variant
        //##########
        // Initial Navigations ######################### Create, Copy & Read ----- #########################
        // 
        navigateToCreate: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            BusyIndicator.show(0);
            oRouter.navTo("ObjectPage", {
                mode: "a",
                objectId: "New"
            });
        },
        navigateToCreateandCopy: function () {
            const oTable = this.byId("progrAlmacenTable"); // Obtiene la tabla
            const aSelectedIndices = oTable.getSelectedItems(); // Obtiene las filas seleccionadas
            const i18 = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            let msgElemt = i18.getText("valCopy");
            let msgMoreElm = i18.getText("valMele");
            if (aSelectedIndices.length === 0) {
                MessageToast.show(msgElemt);
                return;
            }

            if (aSelectedIndices.length > 1) {
                MessageToast.show(msgMoreElm);
                return;
            }

            // Si hay exactamente un elemento seleccionado, toma el primero
            const oSelectedContext = aSelectedIndices[0].getBindingContext("serviceModel");
            const oSelectedData = oSelectedContext.getObject();
            var sIdEBELN = oSelectedData.EBELN; // Ajusta la propiedad según tu modelo

            // Navigate to the ObjectPage
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            BusyIndicator.show(0);
            oRouter.navTo("ObjectPage", {
                mode: "c",
                objectId: sIdEBELN
            });
        },

        getDetailReadSpecificPos: function (oEvent) {
            var sIdEBELN = oEvent.getSource().getBindingContext("serviceModel").getProperty("EBELN");

            // Navigate to the ObjectPage
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            BusyIndicator.show(0);
            oRouter.navTo("ObjectPage", {
                mode: "r",
                objectId: sIdEBELN
            });

        },
        //
        // End Navigations ######################### Create, Copy & Read ----- #########################
        //////////////////////////////////////////////////
        /////////////////////////////////////////////////

    });
});