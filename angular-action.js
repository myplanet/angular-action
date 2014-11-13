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
            return {
                restrict: 'A',
                scope: true,

                // @todo eliminate the "then" attribute and just chain promises elsewhere
                controller: [ '$scope', '$element', '$attrs', '$q', function (childScope, $element, $attr, $q) {
                    var doExpr = $attr['do'],
                        thenExpr = $attr.then;

                    childScope.$actionIsPending = false;
                    childScope.$actionIsComplete = false;
                    childScope.$actionError = null;
                    childScope.$actionHasError = false;

                    childScope.$actionInvoke = function () {
                        childScope.$actionIsPending = true;
                        childScope.$actionIsComplete = false; // reset back if reusing the form

                        var valueMap = {};

                        // broadcast to collect values from parameters
                        childScope.$broadcast('$actionCollecting', function (key, value) {
                            valueMap[key] = value;
                        }, function () {
                            childScope.$actionHasError = true;
                        });

                        return $q.when(childScope.$eval(doExpr, { $data: valueMap })).then(function (data) {
                            childScope.$actionIsComplete = true;
                            childScope.$actionError = null;
                            childScope.$actionHasError = false;

                            childScope.$eval(thenExpr, { $data: data });
                        }, function (data) {
                            childScope.$actionError = data;
                            childScope.$actionHasError = true;
                        })['finally'](function () {
                            childScope.$actionIsPending = false;
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
                        },
                        collectExpr = $attr.collect,
                        onChangeExpr = $attr.onParameterChange;

                    childScope.$actionData = state;

                    if (onChangeExpr) {
                        childScope.$watch(function () {
                            return state.value;
                        }, function (newVal, oldVal) {
                            if (newVal !== oldVal) {
                                childScope.$eval(onChangeExpr, { $value: state.value });
                            }
                        });
                    }

                    // report latest value before submitting
                    childScope.$on('$actionCollecting', function (event, reportValue, reportError) {
                        state.error = null;

                        var collectValue;

                        if (collectExpr) {
                            try {
                                collectValue = childScope.$parent.$eval('$value | ' + collectExpr, { $value: state.value });
                            } catch (e) {
                                state.error = e;
                                reportError();
                                return;
                            }
                        } else {
                            collectValue = state.value;
                        }

                        reportValue(name, collectValue);
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
