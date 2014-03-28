/*global angular */

angular.module('action', [
]).directive('do', function () {
    'use strict';

    return {
        restrict: 'A',
        priority: 100,
        transclude: 'element', // @todo instead of transclusion, just introduce an inherited child scope!

        $$tlb: true, // hacky "I know how to transclude" flag

        // @todo eliminate the "then" attribute and just chain promises elsewhere
        link: {
            pre: function ($scope, element, $attr, ctrl, $transclude) {
                var childScope = $scope.$new(),
                    doExpr = $attr['do'],
                    thenExpr = $attr.then;

                childScope.$actionIsPending = false;
                childScope.$actionIsComplete = false;
                childScope.$actionError = null;
                childScope.$actionHasError = false;
                childScope.$actionHasParameterErrors = false;
                childScope.$actionInvoke = function () {
                    var valueMap = {};

                    childScope.$actionIsPending = true;
                    childScope.$actionIsComplete = false; // reset back if reusing the form

                    // broadcast submit to collect values from parameters
                    childScope.$broadcast('$actionSubmitting', valueMap);

                    $scope.$eval(doExpr, { data: valueMap }).then(function (data) {
                        childScope.$actionIsPending = false;
                        childScope.$actionIsComplete = true;
                        childScope.$actionError = null;
                        childScope.$actionHasError = false;
                        childScope.$actionHasParameterErrors = false;

                        childScope.$broadcast('$actionSubmitted', null);

                        childScope.$eval(thenExpr, { value: data });
                    }, function (data) {
                        var isValidationError = data && (!!data.$parameterErrors);

                        childScope.$actionIsPending = false;
                        childScope.$actionError = isValidationError ? null : data;
                        childScope.$actionHasError = !isValidationError;
                        childScope.$actionHasParameterErrors = isValidationError;

                        childScope.$broadcast('$actionSubmitted', isValidationError ? data.$parameterErrors : null);
                    });
                };

                childScope.$actionReset = function () {
                    // only reset if successfully complete
                    // @todo cancel the ongoing action instead?
                    if (!childScope.$actionIsComplete) {
                        return;
                    }

                    childScope.$actionIsPending = false;
                    childScope.$actionIsComplete = false; // reset back if reusing the form
                    childScope.$actionError = null;
                    childScope.$actionHasError = false;
                    childScope.$actionHasParameterErrors = false;

                    childScope.$broadcast('$actionReset');
                };

                $transclude(childScope, function (clone) {
                    element.replaceWith(clone);
                });
            }
        }
    };
}).directive('parameter', function () {
    'use strict';

    return {
        restrict: 'A',
        transclude: 'element',
        priority: 100,

        $$tlb: true, // hacky "I know how to transclude" flag

        link: function postLink($scope, $element, $attr, ctrl, $transclude) {
            var name = $attr.parameter,
                state = {
                    value: $scope.$eval($attr.value),
                    error: null
                },
                childScope = $scope.$new();

            childScope.$actionParameter = state;

            // @todo remove legacy state
            childScope.$actionParameterValue = state.value;
            childScope.$actionParameterError = null;
            childScope.$watch('$actionParameterValue', function (v) {
                state.value = v;
            });

            // report latest value before submitting
            $scope.$on('$actionSubmitting', function (event, valueMap) {
                valueMap[name] = state.value;
            });

            // copy per-parameter error on submit result
            $scope.$on('$actionSubmitted', function (event, errorMap) {
                var hasError = errorMap !== null && errorMap[name] !== undefined, // @todo does this work in IE8?
                    errorValue = hasError ? errorMap[name] : null;

                state.error = errorValue;
                childScope.$actionParameterError = errorValue; // @todo remove
            });

            // re-evaluate source value
            $scope.$on('$actionReset', function () {
                state.value = $scope.$eval($attr.value);
                state.error = null;

                // @todo remove legacy state
                childScope.$actionParameterValue = state.value;
                childScope.$actionParameterError = null;
            });

            $transclude(childScope, function (clone) {
                $element.replaceWith(clone);
            });
        }
    };
});
