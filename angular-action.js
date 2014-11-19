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
                        thenExpr = $attr.then,
                        action;

                    childScope.$action = action = {
                        isPending: false,
                        error: null,

                        invoke: function () {
                            action.isPending = true;
                            action.error = null;

                            var valueMap = {},
                                collectionFailed = false;

                            // broadcast to collect values from parameters
                            childScope.$broadcast('$actionCollecting', function (key, value) {
                                valueMap[key] = value;
                            }, function () {
                                collectionFailed = true;
                            });

                            if (collectionFailed) {
                                action.isPending = false;
                                return;
                            }

                            $q.when(childScope.$eval(doExpr, { $data: valueMap })).then(function (data) {
                                childScope.$eval(thenExpr, { $data: data });
                            }, function (error) {
                                action.error = error;
                            })['finally'](function () {
                                action.isPending = false;
                            });
                        },

                        reset: function () {
                            // only reset if not already pending
                            if (action.isPending) {
                                throw new Error('cannot reset pending action');
                            }

                            action.error = null;

                            childScope.$broadcast('$actionReset');
                        }
                    };
                } ]
            };
        })
        .directive('parameter', function () {
            return {
                restrict: 'A',
                scope: true,

                controller: [ '$scope', '$element', '$attrs', function (childScope, $element, $attr) {
                    if (!$attr.hasOwnProperty('collect')) {
                        throw new Error('The collect attribute is mandatory');
                    }

                    var name = $attr.parameter,
                        state = {
                            value: childScope.$parent.$eval($attr.value),
                            error: null
                        },
                        collectExpr = $attr.collect;

                    childScope.$actionData = state;

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
