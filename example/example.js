var exampleApp = angular.module('ExampleApp', [
    'mp.action'
]);

exampleApp.controller('ExamplePage', function ($scope) {
    $scope.exampleAction = function (data) {
        console.log('submitting', data);

        return 'result';
    };

    $scope.examplePostAction = function (value) {
        console.log('post', value);
    };
});
