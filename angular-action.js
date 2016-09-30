(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([ 'module', 'angular' ], function (module, angular) {
            module.exports = factory(angular);
        });
    } else if (typeof module === 'object') {
        module.exports = factory(require('angular'));
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
                    var name = null;

                    // @todo use in-time eval
                    $attr.$observe('parameter', function (value) {
                        name = value;
                    });

                    // report latest value before submitting
                    childScope.$on('$actionCollecting', function (event, reportValue, reportError) {
                        var requestEvent = childScope.$broadcast('$actionDataRequest');
                        var responsePromise = requestEvent.$actionDataPromiseResponse;

                        // ensure we got at least something
                        if (!responsePromise) {
                            reportError(name, new Error('no value collected'));
                            return;
                        }

                        // check for presence of completed promise, per http://stackoverflow.com/a/24091953
                        // @todo support async (this is hacky anyway!)
                        if (!responsePromise.$$state || (responsePromise.$$state.status !== 1 && responsePromise.$$state.status !== 2)) {
                            reportError(name, new Error('expecting completed value promise'));
                            return;
                        }

                        responsePromise.then(function (value) {
                            reportValue(name, value);
                        }, function (error) {
                            reportError(name, error);
                        });
                    });
                } ]
            };
        })
        .directive('collect', function () {
            return {
                restrict: 'A',
                scope: true,

                controllerAs: '$actionData',

                controller: [ '$scope', '$element', '$attrs', '$q', function (childScope, $element, $attr, $q) {
                    var state = this;

                    // public properties
                    this.value = childScope.$parent.$eval($attr.value);
                    this.error = null;

                    // track the collection filter expression
                    var collectExpr;

                    // @todo use in-time eval
                    $attr.$observe('collect', function (value) {
                        collectExpr = value;
                    });

                    // error tracking
                    var currentTrackedErrorPromise = null;

                    function trackError(promise) {
                        currentTrackedErrorPromise = promise;
                        state.error = null;

                        promise['catch'](function (e) {
                            if (promise !== currentTrackedErrorPromise) {
                                return;
                            }

                            state.error = e;
                        });
                    }

                    // report latest value before submitting
                    childScope.$on('$actionDataRequest', function (event) {
                        // avoid handling ancestor events
                        if (event.defaultPrevented) {
                            return;
                        }

                        // set up to report future result
                        var deferred = $q.defer();

                        event.$actionDataPromiseResponse = deferred.promise;
                        event.preventDefault();

                        // report any error, synchronous or not
                        trackError(deferred.promise);

                        // resolve the value promise
                        if (collectExpr) {
                            try {
                                deferred.resolve(childScope.$parent.$eval('$value | ' + collectExpr, { $value: state.value }));
                            } catch (e) {
                                deferred.reject(e);
                            }
                        } else {
                            deferred.resolve(state.value);
                        }
                    });

                    // re-evaluate source value
                    // @todo deprecate? too specific to this directive
                    childScope.$on('$actionReset', function () {
                        state.value = childScope.$parent.$eval($attr.value);
                        state.error = null;
                    });
                } ]
            };
        })
        .name; // pass back as dependency name
}));
