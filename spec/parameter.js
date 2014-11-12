describe('angular-action parameter directive', function () {
    var scope, contentScope, paramScope, setValueStub;

    beforeEach(module('mp.action'));

    beforeEach(inject(function ($rootScope, $compile) {
        scope = $rootScope.$new();

        setValueStub = scope.setValueStub = jasmine.createSpy('setValueStub');

        var dom = angular.element(
            '<div parameter="TEST_PARAM" value="\'INIT_VALUE\'"><span><!-- parameter scope --></span></div>'
        );

        $compile(dom)(scope);
        scope.$digest();

        paramScope = dom.children().eq(0).scope();
    }));

    it('defines scope "$actionData" value using initial value', function () {
        expect(paramScope.$actionData.value).toBe('INIT_VALUE');
    });

    it('defines scope "$actionData" error as null', function () {
        expect(paramScope.$actionData.error).toBe(null);
    });

    describe('when $actionCollect event is received', function () {

        it('calls the setValue callback with its name and current value', function () {
            scope.$broadcast('$actionCollect', setValueStub);

            expect(setValueStub).toHaveBeenCalledWith('TEST_PARAM', 'INIT_VALUE');
        });
    });
});
