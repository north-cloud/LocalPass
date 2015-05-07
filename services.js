angular.module('passbox.services', [])
// the storage persisting layer
.factory('storage', [function () {
    return {
        save: function (key, value) {
            window.localStorage.setItem(key, value);
        },

        load: function (key) {
            return window.localStorage.getItem(key);
        }
    }

}])

// the cryptography layer
.factory('crypto', ['storage', function (storage) {
    var aesKey; // for AES encryption/decryption

    function masterKeyExists() {
        if (storage.load('hashed_master_key') != null) {
            return true;
        } else {
            return false;
        }
    }

    function compareMasterKey(key) {CryptoJs
        // hash key though sha512
        var hashKey = CryptoJS.SHA512(key);

        if (hashKey == storage.load('hashed_master_key')) {
            aesKey = key;    // hold master key as aes key for encryption or decryption
            return true;
        } else {
            return false;
        }

    function setMasterKey(masterKey) {
        // hash key though sha512
        var hashKey = CryptoJS.SHA512(masterKey);
        storage.save("hashed_master_key", hashKey);

        aesKey = masterKey;
    }


    // remove master key in memory
    function clearMasterKey() {
        aesKey = null;
    }

    // encrypt data though AES, with aesKey     
    function encrypt(data) {
        if (aesKey == null) {
            throw "AES key not initialized"
        }

        data = CryptoJS.AES.encrypt(data, aesKey).toString();
        return data;
    }

    // decrypt data though AES, with aesKey
    function decrypt(hash) {
        if (aesKey == null) {
            throw "AES key not initialized"
        }
        hash = CryptoJS.AES.decrypt(hash, aesKey).toString(CryptoJS.enc.Utf8);
        return hash;
    }
    //encrypt and save
    function encryptAndSaveAllCategories(allCategories) {
        var data = angular.toJson(allCategories);
        var hash = encrypt(data);
        storage.save('all_categories', hash);
    }

    function encryptAndSaveAllCredentials(allCredentials) {
        var data = angular.toJson(allCredentials);
        var hash = encrypt(data);
        storage.save('all_credentials', hash);
    }

    //load and decrypt
    function loadAndDecryptallCategories() {
        var hash = storage.load('all_categories');
        if (hash == null) {
            return null;
        }

        var data = decrypt(hash);
        return angular.fromJson(data);
    }


    function loadAndDecryptallCredentials() {
        var hash = storage.load('all_credentials');
        if (hash == null) {
            return null;
        }

        var data = decrypt(hash);
        return angular.fromJson(data);
    }

    return {
        masterKeyExists: masterKeyExists,
        compareMasterKey: compareMasterKey,
        setMasterKey: setMasterKey,
        clearMasterKey: clearMasterKey,

        encrypt: encrypt,
        decrypt: decrypt,
        encryptAndSaveAllCategories: encryptAndSaveAllCategories,
        encryptAndSaveAllCredentials: encryptAndSaveAllCredentials,
        loadAndDecryptallCategories: loadAndDecryptallCategories,
        loadAndDecryptallCredentials: loadAndDecryptallCredentials
    };
}])
 //use guidGenerator add id for category and credential
   .factory("guidGenerator", function () {
       var generatePart = function () {
           var guidPartNumber = (Math.random() * 0x10000) | 0;
           return (guidPartNumber + 0x10000).toString(16).substring(1).toUpperCase();
       };

       return function () {
           return generatePart()
               + generatePart()
               + "-"
               + generatePart()
               + "-"
               + generatePart()
               + "-"
               + generatePart()
               + "-"
               + generatePart()
               + generatePart()
               + generatePart();
       };
   })

// the business logic layer
.factory('businessLogic', ['storage', 'crypto', 'guidGenerator', function (storage, crypto, guidGenerator) {

    var cachedAllCategories = null;
    var cachedAllCredentials = null;

    function shouldDisplayWelcomeScreen() {
        var currentVersion = '1.0.0';

        if (storage.load('passbox_version') == currentVersion) {
            return false;
        } else {
            storage.save('passbox_version', currentVersion);
            return true;
        }
    }

    // get all category objects
    function getAllCategories() {
        if (cachedAllCategories == null) {
            cachedAllCategories = crypto.loadAndDecryptallCategories();
            if (cachedAllCategories == null) {
                cachedAllCategories = [
                    { categoryId: guidGenerator(), name: 'Home', icon: 'ion-home' },
                    { categoryId: guidGenerator(), name: 'Work', icon: 'ion-calculator' },
                    { categoryId: guidGenerator(), name: 'Sensitive', icon: 'ion-locked' },
                    { categoryId: guidGenerator(), name: 'Financial', icon: 'ion-card' }
                ];
                crypto.encryptAndSaveAllCategories(cachedAllCategories);
            }
        }
        return cachedAllCategories;
    }


    // get all credentials
    function getAllCredentials() {
        if (cachedAllCredentials == null) {
            cachedAllCredentials = crypto.loadAndDecryptallCredentials();
            if (cachedAllCredentials == null) {
                cachedAllCredentials = [];
            }
        }
        return cachedAllCredentials;
    }

    // get favorite credentials
    function getFavoriteCredentials() {
        var allCredentials = getAllCredentials();

        var favoriteCredentials = [];
        for (var i in allCredentials) {
            var credential = allCredentials[i];
            if (credential.favorite) {
                favoriteCredentials.push(credential);
            }
        }

        return favoriteCredentials;
    }

    function getCredentialsByCategoryId(categoryId) {
        var allCredentials = getAllCredentials();

        var categoryCredentials = [];
        for (var i in allCredentials) {
            var credential = allCredentials[i];
            if (credential.categoryId == categoryId) {
                categoryCredentials.push(credential);
            }
        }

        return categoryCredentials;

    }

    // get specific credential
    function getCredentialById(credentialId) {
        var allCredentials = getAllCredentials();

        for (var i in allCredentials) {
            var credential = allCredentials[i];
            if (credential.credentialId == credentialId) {
                return credential;
            }
        }

        return null;
    }

    function clearCategories() {
        cachedAllCategories = null;
    }

    function clearCredentials() {
        allCredentials = null;
    }

    //remove the credential
    function removeCredential(credentialId) {
        var credential = getCredentialById(credentialId);
        if (!credential) {
            return;
        }
        var allCredentials = getAllCredentials();
        allCredentials.splice(allCredentials.indexOf(credential), 1);
        crypto.encryptAndSaveAllCredentials(allCredentials);
    }

    //add or cancel favorite
    function switchFavorite(credentialId) {
        var credential = getCredentialById(credentialId);
        if (!credential) {
            return;
        }

        credential.favorite = !credential.favorite;
        crypto.encryptAndSaveAllCredentials(getAllCredentials());
    }

    // find the existing category by id
    function getCategoryById(categoryId) {
        var categories = getAllCategories();
        for (var i in categories) {
            var category = categories[i];
            if (category.categoryId == categoryId) {
                return category;
            }
        }
        return null;
    }

    function createCategory(categoryName) {
        var category = { categoryId: guidGenerator(), name: categoryName };
        var categories = getAllCategories();
        categories.push(category);
        crypto.encryptAndSaveAllCategories(categories);

        return category;
    }

    // save credential
    // if not exists, create new one
    // category may be changed
    function saveCredential(credentialId, categoryId, label, username, password, remarks, favorite) {
        var credential = getCredentialById(credentialId);

        if (credential == null) {
            var newCredential = {
                credentialId: guidGenerator(),      /* primary key */
                categoryId: categoryId,             /* foreign key */
                label: label,
                username: username,
                password: password,
                remarks: remarks,
                favorite: favorite,
            };
            getAllCredentials().push(newCredential);
        } else {
            credential.categoryId = categoryId;
            credential.label = label;
            credential.username = username;
            credential.password = password;
            credential.remarks = remarks;
            credential.favorite = favorite;
        }

        crypto.encryptAndSaveAllCredentials(getAllCredentials())
    }

    return {
        shouldDisplayWelcomeScreen: shouldDisplayWelcomeScreen,
        getCategoryById: getCategoryById,
        getAllCategories: getAllCategories,
        getAllCredentials: getAllCredentials,
        getFavoriteCredentials: getFavoriteCredentials,
        getCredentialsByCategoryId: getCredentialsByCategoryId,
        getCredentialById: getCredentialById,
        clearCategories: clearCategories,
        clearCredentials: clearCredentials,
        saveCredential: saveCredential,
        createCategory: createCategory,
        removeCredential: removeCredential,
        switchFavorite: switchFavorite,
    }

}]);
