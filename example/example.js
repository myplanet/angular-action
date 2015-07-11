var exampleApp = angular.module('ExampleApp', [
    'mp.action'
]);

exampleApp.controller('ExamplePage', function ($scope, $q) {
    $scope.log = [];

    $scope.exampleAction = function (data) {
        var deferred = $q.defer();

        $scope.log.push({
            message: 'called action function with: ' + JSON.stringify(data),
        });

        $scope.log.push({
            message: 'waiting for promised response (e.g. AJAX)',
            collectInput: function (value) {
                this.collectInput = null; // no need for more input

                $scope.log.push({
                    message: 'promised response was: ' + JSON.stringify(value)
                });

                deferred.resolve(value);
            }
        });

        return deferred.promise;
    };

    $scope.examplePostAction = function (value) {
        $scope.log.push({
            message: 'called post-action function with: ' + JSON.stringify(value)
        });
    };

    $scope.startLog = function () {
        $scope.log = [];

        $scope.log.push({
            message: 'submitted form'
        });
    };
});
