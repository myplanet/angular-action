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

    function installObjectFieldRegistry($q, ownerScope, isOptional) {
        var fieldScopeMap = {};
        var fieldDeferredValueMap = {};

        ownerScope.$on('$actionDataObjectFieldCreated', function (event, name) {
            // consume the data response
            event.stopPropagation();

            var fieldScope = event.targetScope;

            if (fieldScopeMap[name]) {
                // @todo might be over-zealous in case of dynamic field replacement
                throw new Error('duplicate field name');
            }

            fieldScopeMap[name] = fieldScope;

            fieldScope.$on('$destroy', function () {
                if (fieldScopeMap[name] === fieldScope) {
                    delete fieldScopeMap[name];
                }
            });
        });

        ownerScope.$on('$actionDataRequest', function (event) {
            var valuePromiseMap = {};
            var hasAnyFields = false;

            for (var name in fieldScopeMap) {
                var deferred = $q.defer();

                valuePromiseMap[name] = deferred.promise;
                fieldDeferredValueMap[name] = deferred;

                hasAnyFields = true;
            }

            if (isOptional && !hasAnyFields) {
                return;
            }

            ownerScope.$emit('$actionDataResponse', $q.all(valuePromiseMap));
        });

        ownerScope.$on('$actionObjectFieldDataResponse', function (event, name, valuePromise) {
            // consume the data response
            event.stopPropagation();

            var deferred = fieldDeferredValueMap[name];

            if (!deferred) {
                throw new Error('unexpected field data');
            }

            if (fieldScopeMap[name] !== event.targetScope) {
                throw new Error('mismatching parameter scope');
            }

            deferred.resolve(valuePromise);
        });
    }

    // @todo on-demand interim validation
    return angular.module('mp.action', [])
        .directive('do', function () {
            return {
                restrict: 'A',
                scope: true,

                controllerAs: '$action',

                // @todo eliminate the "then" attribute and just chain promises elsewhere
                controller: [ '$scope', '$element', '$attrs', '$q', function (childScope, $element, $attr, $q) {
                    var doExpr = $attr['do'],
                        thenExpr = $attr.then,
                        action = this;

                    action.isPending = false;
                    action.error = null;

                    installObjectFieldRegistry($q, childScope, true);

                    // @todo use a deferred?
                    var currentValuePromiseCollection = null;

                    childScope.$on('$actionDataResponse', function (event, valuePromise) {
                        // consume the data response
                        event.stopPropagation();

                        if (!currentValuePromiseCollection) {
                            return;
                        }

                        currentValuePromiseCollection.push(valuePromise);
                    });

                    function collectDataPromise() {
                        // listen to data and issue a collection request
                        var valuePromiseCollection = currentValuePromiseCollection = [];

                        childScope.$broadcast('$actionDataRequest');

                        // stop collecting
                        currentValuePromiseCollection = null;

                        if (valuePromiseCollection.length > 1) {
                            throw new Error('expecting to collect at most one value, got ' + valuePromiseCollection.length);
                        }

                        return valuePromiseCollection[0] || $q.when();
                    }

                    this.invoke = function () {
                        action.isPending = true;
                        action.error = null;

                        // resolve field data
                        // (converting field errors into null overall error)
                        var whenDataReady = collectDataPromise()['catch'](function () {
                            return $q.reject(null);
                        });

                        // run the main action if data collected OK
                        var whenActionFinished = whenDataReady.then(function (valueMap) {
                            return childScope.$eval(doExpr, { $data: valueMap });
                        });

                        // run "then" or report errors
                        whenActionFinished.then(function (data) {
                            childScope.$eval(thenExpr, { $data: data });
                        }, function (error) {
                            action.error = error;
                        })['finally'](function () {
                            action.isPending = false;
                        });
                    };

                    this.reset = function () {
                        // only reset if not already pending
                        if (action.isPending) {
                            throw new Error('cannot reset pending action');
                        }

                        action.error = null;

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
                    // @todo dynamic param!
                    var name = $attr.parameter;

                    childScope.$emit('$actionDataObjectFieldCreated', name);

                    childScope.$on('$actionDataResponse', function (event, valuePromise) {
                        // consume the data response
                        event.stopPropagation();

                        childScope.$emit('$actionObjectFieldDataResponse', name, valuePromise);
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

                        function onError(e) {
                            if (promise !== currentTrackedErrorPromise) {
                                return;
                            }

                            state.error = e;
                        }

                        // for synchronously resolved promises, report immediately
                        // @todo remove this hacky workaround eventually
                        if (promise.$$state && promise.$$state.status === 2) {
                            onError(promise.$$state.value);
                        } else {
                            promise['catch'](onError);
                        }
                    }

                    // report latest value before submitting
                    childScope.$on('$actionDataRequest', function (event) {
                        // set up to report future result
                        var deferred = $q.defer();

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

                        // report any local error, synchronous or not
                        trackError(deferred.promise);

                        // report data up the chain
                        childScope.$emit('$actionDataResponse', deferred.promise);
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
