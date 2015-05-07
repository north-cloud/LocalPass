angular.module('passbox.controllers', ['passbox.controllers'])

// validate master key
    .controller('validateMasterKey', ['$scope', '$state', '$ionicHistory', 'crypto', 'businessLogic', function ($scope, $state, $ionicHistory, crypto, businessLogic) {

        // can NOT go back to welcome screen
        $ionicHistory.clearHistory();

        //必须初始化
        $scope.master = {
            password: ""
        };

        $scope.displayErrorMessage = false;

        $scope.validateMasterKey = function (password) {
            if (crypto.compareMasterKey(password)) {
                $scope.displayErrorMessage = false;
                $state.go('main');
            } else {
                $scope.displayErrorMessage = true;
                $scope.message = "incorrect master key"
                $scope.master.password = "";
            }
        }
    }])

// set master key
    .controller('setMasterKey', ['$scope', '$state', '$ionicHistory', 'crypto', 'businessLogic', function ($scope, $state, $ionicHistory, crypto, businessLogic) {

        // can NOT go back to welcome screen
        $ionicHistory.clearHistory();

        //必须初始化
        $scope.master = {
            password: "",
            confirm: ""
        };
        $scope.displayErrorMessage = false;
        $scope.setMasterKey = function (password, confirm) {
            if ($scope.master.password.length < 6) {
                $scope.displayErrorMessage = true;
                $scope.message = "Must contain 6 characters at least"
            }
            else if ($scope.master.confirm != $scope.master.password) {
                $scope.displayErrorMessage = true;
                $scope.messages = "Password do not match. "
            } else {
                crypto.setMasterKey(password);
                $scope.displayErrorMessage = false;
                $state.go('main');
            }
        }

    }])

// main page
    .controller('main', ['$scope', '$rootScope', '$state', '$stateParams', '$ionicHistory', '$ionicPopover', '$ionicModal', '$cordovaClipboard', '$ionicListDelegate', 'crypto', 'businessLogic'
        , function ($scope, $rootScope, $state, $stateParams, $ionicHistory, $ionicPopover, $ionicModal, $cordovaClipboard, $ionicListDelegate, crypto, businessLogic) {

            // can NOT go back to pervious pages
            $ionicHistory.clearHistory();

            $scope.editCredential = function (credential) {
                $state.go('edit', {categoryId: credential.categoryId, credentialId: credential.credentialId});
            };


            $scope.categories = businessLogic.getAllCategories();

            $scope.changeCategory = function (categoryId, categoryName) {
                $scope.categoryId = categoryId;
                $scope.categoryName = categoryName;

                if ($scope.categoryId == '__all') {
                    $scope.credentials = businessLogic.getAllCredentials();
                } else if ($scope.categoryId == '__favorite') {
                    $scope.credentials = businessLogic.getFavoriteCredentials();
                } else {
                    $scope.credentials = businessLogic.getCredentialsByCategoryId(categoryId);
                }
            }

            $scope.changeCategory('__all', 'All');


            //logoff
            $scope.logoff = function () {
                crypto.clearMasterKey();
                businessLogic.clearCategories();
                businessLogic.clearCredentials();
                $scope.dropdownMenus.hide();
                $state.go('validateMasterKey'); b
            }

            // copy
            $scope.copyCredential = function (credential) {
                $ionicListDelegate.closeOptionButtons();
                var content = ('[label]:' + credential.label + '\n[username]: ' + credential.username + '\n[password]: ' + credential.password);
                if (credential.remarks) {
                    content = content + '\n[remarks]: ' + credential.remarks;
                }

                $cordovaClipboard.copy(content).then(function () {
                    alert('copied to clipboard');
                }, function () {
                    alert('copy failed');
                });
            }

            // remove
            $scope.removeCredential = function (credentialId) {
                businessLogic.removeCredential(credentialId);
            }

            // switch favorite
            $scope.switchFavorite = function (clickEvent, credentialId) {
                businessLogic.switchFavorite(credentialId);
                clickEvent.stopPropagation();
            }

            //install dropdown_menu
            $ionicPopover.fromTemplateUrl('templates/dropdown_menu.html', {
                scope: $scope,
            }).then(function (popover) {
                $scope.dropdownMenus = popover;
            });
            $scope.openPopover = function ($event) {
                $scope.dropdownMenus.show($event);
            };

            $scope.closePopover = function () {
                $scope.dropdownMenus.hide();
            };

            $scope.$on('$destroy', function () {
                $scope.dropdownMenus.remove();
            });

            // feedback modal
            $ionicModal.fromTemplateUrl('templates/feedback.html', function (modal) {
                $scope.feedbackModal = modal;
            }, {
                scope: $scope,
                animation: 'slide-in-up'
            });

            $scope.openFeedbackModal = function () {
                $scope.dropdownMenus.hide();
                $scope.feedbackModal.show();
            };

            $scope.closeFeedbackModal = function () {
                $scope.feedbackModal.hide();
            };

            // about modal
            $ionicModal.fromTemplateUrl('templates/about.html', function (modal) {
                $scope.aboutModal = modal;
            }, {
                scope: $scope,
                animation: 'slide-in-up'
            });
            $scope.openAboutModal = function () {
                $scope.dropdownMenus.hide();
                $scope.aboutModal.show();
            };
            $scope.closeAboutModal = function () {
                $scope.aboutModal.hide();
            };

        }]
)

// edit credential page
    .controller('edit', ['$scope', '$rootScope', '$state', '$stateParams', 'crypto', 'businessLogic', function ($scope, $rootScope, $state, $stateParams, crypto, businessLogic) {
        $scope.newCategory = {
            name: "",
            require: false,
        }

        var lastCategory = null;

        // items of category selector
        var allCategories = businessLogic.getAllCategories();
        var options = [];
        for (var i in allCategories) {
            var category = allCategories[i];
            var option = {categoryId: category.categoryId, name: category.name};
            options.push(option);
            if (category.categoryId == $stateParams.categoryId) {
                $scope.currentCategory = option;
                lastCategory = category;
            }
        }
        options.push({categoryId: "__create", name: "Create new category"});
        $scope.options = options;


        // credential object to be edit
        var credentialId = $stateParams.credentialId;
        var credential = businessLogic.getCredentialById(credentialId);
        if (credential) {
            $scope.credential = credential;
        } else {
            $scope.credential = {};
        }

        $scope.saveCredential = function (createForm, currentCategory, credential) {

            if (!currentCategory) {
                $scope.newCategory.require = true;
                createForm.displayErrorMessage = true;
                return;
            }

            if (currentCategory.categoryId == '__create' && $scope.newCategory.name == "") {
                $scope.newCategory.require = true;
                createForm.displayErrorMessage = true;
                return;
            }

            if (createForm.$invalid) {
                createForm.displayErrorMessage = true;
                return;
            }

            var categoryId = currentCategory.categoryId;

            if (categoryId == '__create') {
                var category = businessLogic.createCategory($scope.newCategory.name);
                categoryId = category.categoryId;
            }

            businessLogic.saveCredential(credentialId, categoryId, credential.label, credential.username, credential.password, credential.remarks, credential.favorite);
            //credential Object Serialization and encrypt to hash
            var hash = crypto.encrypt(angular.toJson(credential));
            $state.go('saveresult', {
                'hash': hash
            });
            $rootScope.hash = hash;
        }

    }])
//save success credential page
    .controller('saveresult', ['$scope', '$rootScope', function ($scope, $rootScope) {

        $scope.hash = $rootScope.hash;
    }])
