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

                        var validationList = [];

                        // broadcast to validate parameter values
                        childScope.$broadcast('$actionValidating', function (validation) {
                            validationList.push(validation);
                        });

                        $q.all(validationList).then(function () {
                            var valueMap = {};

                            // broadcast to collect values from parameters
                            childScope.$broadcast('$actionSubmitting', function (key, value) {
                                valueMap[key] = value;
                            });

                            return $q.when(childScope.$eval(doExpr, { data: valueMap })).then(function (data) {
                                childScope.$actionIsComplete = true;
                                childScope.$actionError = null;
                                childScope.$actionHasError = false;

                                childScope.$eval(thenExpr, { value: data });
                            }, function (data) {
                                childScope.$actionError = data;
                                childScope.$actionHasError = true;
                            });
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

                controller: [ '$scope', '$element', '$attrs', '$q', function (childScope, $element, $attr, $q) {
                    var name = $attr.parameter,
                        state = {
                            value: childScope.$parent.$eval($attr.value),
                            error: null
                        },
                        validate = childScope.$parent.$eval($attr.validate);

                    childScope.$actionParameter = state;

                    // expose live changes to parameter value
                    var onChangeExpr = $attr.onParameterChange;

                    if (onChangeExpr) {
                        childScope.$watch(function () { return state.value; }, function (value) {
                            childScope.$eval(onChangeExpr, { value: value });
                        });
                    }

                    // validate value before submitting
                    childScope.$on('$actionValidating', function (event, reportValidation) {
                        if (validate) {
                            state.error = null;

                            var validation;

                            try {
                                validation = $q.when(validate.call(null, state.value));
                            } catch (e) {
                                validation = $q.reject(e);
                            }

                            validation.catch(function (error) {
                                state.error = error;
                            });

                            reportValidation(validation);
                        }
                    });

                    // report latest value before submitting
                    childScope.$on('$actionSubmitting', function (event, reportValue) {
                        reportValue(name, state.value);
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
