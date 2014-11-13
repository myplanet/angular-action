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

    describe('when $actionCollecting event received', function () {
        var reportValueStub,
            reportErrorStub;

        beforeEach(function () {
            reportValueStub = jasmine.createSpy('reportValueStub');
            reportErrorStub = jasmine.createSpy('reportErrorStub');

            compile(
                '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'" collect><span><!-- parameter scope --></span></div>'
            );

            scope.$broadcast('$actionCollecting', reportValueStub, reportErrorStub);
        });

        it('calls the setter callback with the parameter name and current value', function () {
            expect(reportValueStub).toHaveBeenCalledWith('TEST_PARAM', 'INIT_VALUE');
        });

        it('does not call the error callback', function () {
            expect(reportErrorStub).not.toHaveBeenCalled();
        });

        it('defines scope "$actionData" error as null', function () {
            expect(paramScope.$actionData.error).toBe(null);
        });
    });

    describe('collect attribute', function () {
        describe('when not present', function () {
            it('causes an exception to be thrown', function () {
                expect(function () {
                    compile(
                        '<div parameter="TEST_PARAM"><span><!-- parameter scope --></span></div>'
                    );
                }).toThrow();
            });
        });

        describe('when a filter expression is supplied', function () {
            describe('when none of the filters cause an exception', function () {
                var reportValueStub,
                    reportErrorStub;

                beforeEach(function () {
                    reportValueStub = jasmine.createSpy('reportValueStub');
                    reportErrorStub = jasmine.createSpy('reportErrorStub');

                    compile(
                        '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'" collect="lowercase"><span><!-- parameter scope --></span></div>'
                    );

                    scope.$broadcast('$actionCollecting', reportValueStub, reportErrorStub);
                });

                it('calls the setter callback with the current value after passing it through the filters', function () {
                    expect(reportValueStub).toHaveBeenCalledWith('TEST_PARAM', 'init_value');
                });

                it('does not call the error callback', function () {
                    expect(reportErrorStub).not.toHaveBeenCalled();
                });

                it('defines scope "$actionData" error as null', function () {
                    expect(paramScope.$actionData.error).toBe(null);
                });
            });

            describe('when one of the filters causes an exception', function () {
                var reportValueStub,
                    reportErrorStub,
                    exception;

                beforeEach(function () {
                    reportValueStub = jasmine.createSpy('reportValueStub');
                    reportErrorStub = jasmine.createSpy('reportErrorStub');
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

                    scope.$broadcast('$actionCollecting', reportValueStub, reportErrorStub);
                });

                it('does not call the setter callback', function () {
                    expect(reportValueStub).not.toHaveBeenCalled();
                });

                it('calls the error callback with the parameter name and the exception', function () {
                    expect(reportErrorStub).toHaveBeenCalled();
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
