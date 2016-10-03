describe('angular-action parameter directive', function () {
    var scope,
        paramScope;

    function compile(html, scopeProperties) {
        inject(function ($rootScope, $compile) {
            scope = $rootScope.$new();
            angular.extend(scope, scopeProperties);

            var dom = angular.element(html);

            $compile(dom)(scope);
            scope.$digest();

            paramScope = dom.children().eq(0).scope();
        });
    }

    beforeEach(module('mp.action'));

    describe('scope properties', function () {
        describe('when value attribute not specified', function () {
            beforeEach(function () {
                compile(
                    '<div parameter="TEST_PARAM" collect><span><!-- parameter scope --></span></div>'
                );
            });

            it('defines scope "$actionData" value as undefined', function () {
                expect(paramScope.$actionData.value).toBe(undefined);
            });

            it('defines scope "$actionData" error as null', function () {
                expect(paramScope.$actionData.error).toBe(null);
            });
        });

        describe('when value attribute specified', function () {
            beforeEach(function () {
                compile(
                    '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'" collect><span><!-- parameter scope --></span></div>'
                );
            });

            it('defines scope "$actionData" value using specified value', function () {
                expect(paramScope.$actionData.value).toBe('INIT_VALUE');
            });

            it('defines scope "$actionData" error as null', function () {
                expect(paramScope.$actionData.error).toBe(null);
            });
        });
    });

    describe('when $actionDataRequest event received', function () {
        var reportedObjectFieldName,
            reportedObjectFieldValue,
            reportedObjectFieldError;

        beforeEach(function () {
            compile(
                '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'" collect><span><!-- parameter scope --></span></div>'
            );

            reportedObjectFieldName = null;
            reportedObjectFieldValue = null;
            reportedObjectFieldError = null;

            scope.$on('$actionObjectFieldDataResponse', function (event, name, valuePromise) {
                reportedObjectFieldName = name;

                // @todo fix this synchronous inspection to work as proper then
                reportedObjectFieldValue = valuePromise.$$state && valuePromise.$$state.status === 1
                    ? valuePromise.$$state.value
                    : null;

                reportedObjectFieldError = valuePromise.$$state && valuePromise.$$state.status === 2
                    ? valuePromise.$$state.value
                    : null;
            });

            scope.$broadcast('$actionDataRequest');
        });

        it('reports the field name', function () {
            expect(reportedObjectFieldName).toBe('TEST_PARAM');
        });

        it('reports the current value', function () {
            expect(reportedObjectFieldValue).toBe('INIT_VALUE');
        });

        it('does not report error', function () {
            expect(reportedObjectFieldError).toBe(null);
        });

        it('defines scope "$actionData" error as null', function () {
            expect(paramScope.$actionData.error).toBe(null);
        });
    });

    describe('collect attribute', function () {
        describe('when a filter expression is supplied', function () {
            describe('when none of the filters cause an exception', function () {
                var reportedObjectFieldValue,
                    reportedObjectFieldError;

                beforeEach(function () {
                    compile(
                        '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'" collect="lowercase"><span><!-- parameter scope --></span></div>'
                    );

                    reportedObjectFieldValue = null;
                    reportedObjectFieldError = null;

                    scope.$on('$actionObjectFieldDataResponse', function (event, name, valuePromise) {
                        // @todo fix this synchronous inspection to work as proper then
                        reportedObjectFieldValue = valuePromise.$$state && valuePromise.$$state.status === 1
                            ? valuePromise.$$state.value
                            : null;

                        reportedObjectFieldError = valuePromise.$$state && valuePromise.$$state.status === 2
                            ? valuePromise.$$state.value
                            : null;
                    });

                    scope.$broadcast('$actionDataRequest');
                });

                it('reports the current value after passing it through the filters', function () {
                    expect(reportedObjectFieldValue).toBe('init_value');
                });

                it('does not report error', function () {
                    expect(reportedObjectFieldError).toBe(null);
                });

                it('defines scope "$actionData" error as null', function () {
                    expect(paramScope.$actionData.error).toBe(null);
                });
            });

            describe('when one of the filters causes an exception', function () {
                var reportedObjectFieldValue,
                    reportedObjectFieldError,
                    exception;

                beforeEach(function () {
                    exception = new Error('TEST');

                    angular.module('throwsException', []).filter('throwsException', function () {
                        return function () {
                            throw exception;
                        }
                    });

                    module('throwsException');

                    compile(
                        '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'" collect="lowercase | throwsException"><span><!-- parameter scope --></span></div>'
                    );

                    reportedObjectFieldValue = null;
                    reportedObjectFieldError = null;

                    scope.$on('$actionObjectFieldDataResponse', function (event, name, valuePromise) {
                        // @todo fix this synchronous inspection to work as proper then
                        reportedObjectFieldValue = valuePromise.$$state && valuePromise.$$state.status === 1
                            ? valuePromise.$$state.value
                            : null;

                        reportedObjectFieldError = valuePromise.$$state && valuePromise.$$state.status === 2
                            ? valuePromise.$$state.value
                            : null;
                    });

                    scope.$broadcast('$actionDataRequest');
                });

                it('does not report value', function () {
                    expect(reportedObjectFieldValue).toBe(null);
                });

                it('reports the error', function () {
                    expect(reportedObjectFieldError).toBe(exception);
                });

                it('defines scope "$actionData" error as the exception that was thrown', function () {
                    expect(paramScope.$actionData.error).toBe(exception);
                });
            });
        });
    });

    describe('when $actionReset event received', function () {
        beforeEach(function () {
            angular.module('throwsException', []).filter('throwsException', function () {
                return function () {
                    throw new Error('TEST');
                }
            });

            module('throwsException');

            compile(
                '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'" collect="throwsException"><span><!-- parameter scope --></span></div>'
            );

            paramScope.$actionData.value = 'NEW_VALUE';
            paramScope.$digest();

            scope.$broadcast('$actionCollecting', function () {}, function () {});

            scope.$broadcast('$actionReset');
        });

        it('defines scope "$actionData" value using initial value', function () {
            expect(paramScope.$actionData.value).toBe('INIT_VALUE');
        });

        it('defines scope "$actionData" error as null', function () {
            expect(paramScope.$actionData.error).toBe(null);
        });
    });
});
