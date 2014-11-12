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
                    '<div parameter="TEST_PARAM"><span><!-- parameter scope --></span></div>'
                );
            });

            it('defines scope "$actionData" value as undefined', function () {
                expect(paramScope.$actionData.value).toBe(undefined);
            });
        });

        describe('when value attribute specified', function () {
            beforeEach(function () {
                compile(
                    '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'"><span><!-- parameter scope --></span></div>'
                );
            });

            it('defines scope "$actionData" value using specified value', function () {
                expect(paramScope.$actionData.value).toBe('INIT_VALUE');
            });
        });

        it('defines scope "$actionData" error as null', function () {
            expect(paramScope.$actionData.error).toBe(null);
        });
    });

    describe('when $actionCollecting event received with a callback as the payload', function () {
        var callbackStub;

        beforeEach(function () {
            callbackStub = jasmine.createSpy('callbackStub');

            compile(
                '<div parameter="TEST_PARAM"><span><!-- parameter scope --></span></div>'
            );
        });

        it('calls the callback with its name and current value', function () {
            paramScope.$actionData.value = 'CURRENT_VALUE';

            scope.$broadcast('$actionCollecting', callbackStub);

            expect(callbackStub).toHaveBeenCalledWith('TEST_PARAM', 'CURRENT_VALUE');
        });
    });

    describe('collect attribute', function () {
        describe('when a filter expression is supplied', function () {
            var callbackStub;

            beforeEach(function () {
                callbackStub = jasmine.createSpy('callbackStub');

                compile(
                    '<div parameter="TEST_PARAM" collect="lowercase"><span><!-- parameter scope --></span></div>'
                );
            });

            it('calls the callback with its name and current value after passing it through the filters', function () {
                paramScope.$actionData.value = 'CURRENT_VALUE';

                scope.$broadcast('$actionCollecting', callbackStub);

                expect(callbackStub).toHaveBeenCalledWith('TEST_PARAM', 'current_value');
            });
        });
    });

    describe('on-parameter-change attribute', function () {
        describe('when an expression is supplied', function () {
            var onParameterChangeStub;

            beforeEach(function () {
                compile(
                    '<div parameter="TEST_PARAM" on-parameter-change="onParameterChangeStub($value)"><span><!-- parameter scope --></span></div>',
                    {
                        onParameterChangeStub: onParameterChangeStub = jasmine.createSpy('onParameterChangeStub')
                    }
                );
            });

            it('the expression in the attribute value is evaluated with local variable $value having the new value when the parameter value changes', function () {
                expect(onParameterChangeStub).not.toHaveBeenCalled();

                paramScope.$actionData.value = 'CURRENT_VALUE';
                paramScope.$digest();

                expect(onParameterChangeStub).toHaveBeenCalledWith('CURRENT_VALUE');
            });
        });
    });
});
