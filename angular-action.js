(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([ 'module', 'angular' ], function (module, angular) {
            module.exports = factory(angular);
        });
    } else {
        if (!root.mp) {
            root.mp = {};
        }

        root.mp.action = factory(root.angular);
    }
}(this, function (angular) {
    'use strict';

    return angular.module('mp.action', [])
        .directive('do', function () {
            function thenify(v) {
                if (v && typeof v.then === 'function') {
                    return v;
                }

                return { then: function (callback) { callback(v); } };
            }

            return {
                restrict: 'A',
                scope: true,

                // @todo eliminate the "then" attribute and just chain promises elsewhere
                controller: [ '$scope', '$element', '$attrs', function (childScope, $element, $attr) {
                    var doExpr = $attr['do'],
                        thenExpr = $attr.then;

                    childScope.$actionIsPending = false;
                    childScope.$actionIsComplete = false;
                    childScope.$actionError = null;
                    childScope.$actionHasError = false;
                    childScope.$actionInvoke = function () {
                        var valueMap = {};

                        childScope.$actionIsPending = true;
                        childScope.$actionIsComplete = false; // reset back if reusing the form

                        // broadcast submit to collect values from parameters
                        childScope.$broadcast('$actionSubmitting', valueMap);

                        thenify(childScope.$eval(doExpr, { data: valueMap })).then(function (data) {
                            childScope.$actionIsPending = false;
                            childScope.$actionIsComplete = true;
                            childScope.$actionError = null;
                            childScope.$actionHasError = false;

                            childScope.$eval(thenExpr, { value: data });
                        }, function (data) {
                            childScope.$actionIsPending = false;
                            childScope.$actionError = data;
                            childScope.$actionHasError = true;
                        });
                    };

                    childScope.$actionReset = function () {
                        // only reset if not already pending
                        if (childScope.$actionIsPending) {
                            throw new Error('cannot reset pending action');
                        }

                        childScope.$actionIsPending = false;
                        childScope.$actionIsComplete = false; // reset back if reusing the form
                        childScope.$actionError = null;
                        childScope.$actionHasError = false;

                        childScope.$broadcast('$actionReset');
                    };
                } ]
            };
        })
        .directive('parameter', function () {
            return {
                restrict: 'A',
                scope: true,

                controller: [ '$scope', '$element', '$attrs', function (childScope, $element, $attr) {
                    var name = $attr.parameter,
                        state = {
                            value: childScope.$parent.$eval($attr.value),
                            error: null
                        };

                    childScope.$actionParameter = state;

                    // expose live changes to parameter value
                    var onChangeExpr = $attr.onParameterChange;

                    if (onChangeExpr) {
                        childScope.$watch(function () { return state.value; }, function (value) {
                            childScope.$eval(onChangeExpr, { value: value });
                        });
                    }

                    // report latest value before submitting
                    childScope.$on('$actionSubmitting', function (event, valueMap) {
                        valueMap[name] = state.value;
                    });

                    // re-evaluate source value
                    childScope.$on('$actionReset', function () {
                        state.value = childScope.$parent.$eval($attr.value);
                        state.error = null;
                    });
                } ]
            };
        });
}));
