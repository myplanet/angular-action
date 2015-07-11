var exampleApp = angular.module('ExampleApp', [
    'mp.action'
]);

exampleApp.controller('ExamplePage', function ($scope) {
    $scope.log = [];

    $scope.exampleAction = function (data) {
        $scope.log.push({
            message: 'called action function with: ' + JSON.stringify(data)
        });

        return 'result';
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
