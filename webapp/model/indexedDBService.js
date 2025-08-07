sap.ui.define([], function () {
    "use strict";

    // NOMBRE Y VERSIÓN DE LA BASE DE DATOS
    var DB_NAME = "XcaretRegActivFijosDB";
    var DB_VERSION = 1;

    // DEFINICIÓN DE LAS TABLAS (object stores)
    var STORE_NAMES = {
        scheduleLine: "ScheduleLine",          // Listado general de ScheduleLines
        scheduleLineDetail: "ScheduleLineDetail", // Detalle por EBELN
        contract: "Contract",
        user: "User",
        projects: "Projects",
        images: "Images",                      // Imágenes asociadas a documentos/items
        signatures: "Signatures",              // Firmas electrónicas
        pendingOps: "PendingOps"               // Operaciones pendientes de sincronización
    };

    var dbInstance = null;

    // ABRE O CREA LA BASE DE DATOS
    function openDB() {
        return new Promise(function (resolve, reject) {
            if (dbInstance) return resolve(dbInstance);
            var request = window.indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function (event) {
                var db = event.target.result;
                Object.keys(STORE_NAMES).forEach(function (key) {
                    var store = STORE_NAMES[key];
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: "id", autoIncrement: false });
                    }
                });
            };
            request.onsuccess = function (event) {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };
            request.onerror = function (event) {
                reject(event.target.error);
            };
        });
    }

    // GUARDA UN REGISTRO
    function saveData(store, data) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(store, "readwrite");
                var objStore = tx.objectStore(store);
                objStore.put(data);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    // GUARDA UN ARRAY DE REGISTROS (bulk insert/update)
    function saveBulk(store, dataArr) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(store, "readwrite");
                var objStore = tx.objectStore(store);
                dataArr.forEach(function (data) {
                    objStore.put(data);
                });
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    // OBTIENE TODOS LOS REGISTROS DE UN STORE
    function getAll(store) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(store, "readonly");
                var objStore = tx.objectStore(store);
                var req = objStore.getAll();
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    // OBTIENE REGISTRO POR ID
    function getById(store, id) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(store, "readonly");
                var objStore = tx.objectStore(store);
                var req = objStore.get(id);
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    // ELIMINA REGISTRO POR ID
    function deleteById(store, id) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(store, "readwrite");
                var objStore = tx.objectStore(store);
                var req = objStore.delete(id);
                req.onsuccess = function () { resolve(); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    // LIMPIA TODO EL STORE
    function clearStore(store) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(store, "readwrite");
                var objStore = tx.objectStore(store);
                var req = objStore.clear();
                req.onsuccess = function () { resolve(); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    // ESTADO DE CONECTIVIDAD
    function isOnline() {
        return window.navigator.onLine;
    }

    // FUNCIONES PARA OPERACIONES PENDIENTES
    function addPendingOp(op) {
        return saveData(STORE_NAMES.pendingOps, op);
    }

    function getPendingOps() {
        return getAll(STORE_NAMES.pendingOps);
    }

    function deletePendingOp(id) {
        return deleteById(STORE_NAMES.pendingOps, id);
    }

    function syncPendingOps(processFn) {
        window.addEventListener("online", async function () {
            var ops = await getPendingOps();
            for (var i = 0; i < ops.length; i++) {
                await processFn(ops[i]);
                await deletePendingOp(ops[i].id);
            }
        });
    }

    // FUNCIONES ESPECÍFICAS PARA ScheduleLine y detalle
    function saveDetailDoc(EBELN, data) {
        return saveData(STORE_NAMES.scheduleLineDetail, {
            id: EBELN,
            ...data
        });
    }

    function getDetailDoc(EBELN) {
        return getById(STORE_NAMES.scheduleLineDetail, EBELN);
    }

    // --- FUNCIONES PARA IMÁGENES OFFLINE ---
    function saveImage(img) {
        const id = img.id || (img.MBLRN + "_" + img.LINE_ID + "_" + img.IMAGE_NAME);
        const indexValue = (typeof img.index !== "undefined") ? img.index : img.INDEX;
        return saveData(STORE_NAMES.images, {
            ...img,
            id,
            index: indexValue,
            INDEX: indexValue
        });
    }

    function getAllImages() {
        return getAll(STORE_NAMES.images);
    }

    function getPendingImages() {
        return getAllImages().then(imgs => imgs.filter(img => img.pending));
    }

    function markImageAsSynced(id) {
        return getById(STORE_NAMES.images, id).then(function (img) {
            if (!img) return;
            img.pending = false;
            return saveData(STORE_NAMES.images, img);
        });
    }

    function deleteImage(id) {
        return deleteById(STORE_NAMES.images, id);
    }

    // --- FUNCIONES PARA FIRMAS OFFLINE ---
    function saveSignature(signature) {
        const id = signature.id || (signature.DOCID + "_" + signature.ID + "_" + signature.EMAIL);
        return saveData(STORE_NAMES.signatures, { ...signature, id });
    }

    function getAllSignatures() {
        return getAll(STORE_NAMES.signatures);
    }

    function getPendingSignatures() {
        return getAllSignatures().then(signs => signs.filter(sign => sign.pending));
    }

    function markSignatureAsSynced(id) {
        return getById(STORE_NAMES.signatures, id).then(function (sign) {
            if (!sign) return;
            sign.pending = false;
            return saveData(STORE_NAMES.signatures, sign);
        });
    }

    function deleteSignature(id) {
        return deleteById(STORE_NAMES.signatures, id);
    }

    // EXPORTA EL SERVICIO PARA USO EN LOS CONTROLADORES
    return {
        DB_NAME: DB_NAME,
        DB_VERSION: DB_VERSION,
        STORE_NAMES: STORE_NAMES,
        openDB: openDB,
        saveData: saveData,
        saveBulk: saveBulk,
        getAll: getAll,
        getById: getById,
        deleteById: deleteById,
        clearStore: clearStore,
        isOnline: isOnline,
        addPendingOp: addPendingOp,
        getPendingOps: getPendingOps,
        deletePendingOp: deletePendingOp,
        syncPendingOps: syncPendingOps,
        saveDetailDoc: saveDetailDoc,
        getDetailDoc: getDetailDoc,
        // Funciones para imágenes offline:
        saveImage: saveImage,
        getAllImages: getAllImages,
        getPendingImages: getPendingImages,
        markImageAsSynced: markImageAsSynced,
        deleteImage: deleteImage,
        // Funciones para firmas offline:
        saveSignature: saveSignature,
        getAllSignatures: getAllSignatures,
        getPendingSignatures: getPendingSignatures,
        markSignatureAsSynced: markSignatureAsSynced,
        deleteSignature: deleteSignature
    };
});