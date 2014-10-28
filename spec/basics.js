describe('angular-action do directive', function () {
    var scope, subScopeMap, testAction, testThen;

    beforeEach(module('mp.action'));

    beforeEach(inject(function ($rootScope, $compile) {
        scope = $rootScope.$new();

        testAction = scope.testAction = jasmine.createSpy('testAction');
        testThen = scope.testThen = jasmine.createSpy('testThen');

        subScopeMap = {}; // clear and then capture on digest
        scope.captureSubscope = function (n) { subScopeMap[n] = this; };

        var dom = angular.element(
            '<div do="testAction(data)" then="testThen(value)">' +
            '<div ng-init="captureSubscope(\'MAIN\')"></div>' +
            '<div parameter="TEST_PARAM_A" value="\'INIT_VALUE\'"><div ng-init="captureSubscope(\'A\')"></div></div>' +
            '<div parameter="TEST_PARAM_B"><div ng-init="captureSubscope(\'B\')"></div></div>' +
            '</div>'
        );

        $compile(dom)(scope);
        scope.$digest();
    }));

    it('defines scope "$action" state properties', function () {
        expect(subScopeMap.MAIN.$actionIsPending).toBe(false);
        expect(subScopeMap.MAIN.$actionIsComplete).toBe(false);
        expect(subScopeMap.MAIN.$actionError).toBe(null);
        expect(subScopeMap.MAIN.$actionHasError).toBe(false);
        expect(subScopeMap.MAIN.$actionHasParameterErrors).toBe(false);
        expect(subScopeMap.MAIN.$actionInvoke).toEqual(jasmine.any(Function));
        expect(subScopeMap.MAIN.$actionReset).toEqual(jasmine.any(Function));
    });

    it('invokes the action expression when "$actionInvoke" is called', function () {
        subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });

        expect(testAction).toHaveBeenCalled();
    });

    it('handles non-thenable values returned by action expression', function () {
        testAction.andReturn('SIMPLE_VALUE');
        subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });

        expect(subScopeMap.MAIN.$actionIsPending).toBe(false);
        expect(subScopeMap.MAIN.$actionIsComplete).toBe(true);
        expect(subScopeMap.MAIN.$actionError).toBe(null);
        expect(subScopeMap.MAIN.$actionHasError).toBe(false);
        expect(subScopeMap.MAIN.$actionHasParameterErrors).toBe(false);

        expect(subScopeMap.A.$actionParameter.error).toBe(null);
        expect(subScopeMap.B.$actionParameter.error).toBe(null);
    });

    it('invokes "then" expression after success', function () {
        testAction.andReturn('TEST_RESULT');
        subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });

        expect(testThen).toHaveBeenCalledWith('TEST_RESULT');
    });

    it('tracks individual parameter state objects separately', function () {
        expect(subScopeMap.A.$actionParameter).not.toBe(subScopeMap.B.$actionParameter);
    });

    it('passes initial parameter value to action expression', function () {
        subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });

        expect(testAction).toHaveBeenCalledWith({ TEST_PARAM_A: 'INIT_VALUE' });
    });

    it('passes latest parameter value to action expression', function () {
        subScopeMap.A.$actionParameter.value = 'LATEST_VALUE';
        subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });

        expect(testAction).toHaveBeenCalledWith({ TEST_PARAM_A: 'LATEST_VALUE' });
    });

    it('defines scope "$actionParameter" value using initial value', function () {
        expect(subScopeMap.A.$actionParameter.value).toBe('INIT_VALUE');
    });

    it('defines scope "$actionParameter" error as null', function () {
        expect(subScopeMap.A.$actionParameter.error).toBe(null);
    });

    describe('invoked with a promised action', function () {
        var testActionResult;

        beforeEach(inject(function ($q) {
            testActionResult = $q.defer();
            testAction.andReturn(testActionResult.promise);

            subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });
        }));

        it('updates action pending state', function () {
            expect(subScopeMap.MAIN.$actionIsPending).toBe(true);
            expect(subScopeMap.MAIN.$actionIsComplete).toBe(false);
            expect(subScopeMap.MAIN.$actionError).toBe(null);
            expect(subScopeMap.MAIN.$actionHasError).toBe(false);
            expect(subScopeMap.MAIN.$actionHasParameterErrors).toBe(false);
        });

        it('updates action error state on simple error', function () {
            subScopeMap.MAIN.$apply(function () { testActionResult.reject('SIMPLE_ERROR'); });

            expect(subScopeMap.MAIN.$actionIsPending).toBe(false);
            expect(subScopeMap.MAIN.$actionIsComplete).toBe(false);
            expect(subScopeMap.MAIN.$actionError).toBe('SIMPLE_ERROR');
            expect(subScopeMap.MAIN.$actionHasError).toBe(true);
            expect(subScopeMap.MAIN.$actionHasParameterErrors).toBe(false);

            expect(subScopeMap.A.$actionParameter.error).toBe(null);
            expect(subScopeMap.B.$actionParameter.error).toBe(null);
        });

        it('updates action error state on parameter error', function () {
            subScopeMap.MAIN.$apply(function () { testActionResult.reject({ TEST_PARAM_B: 'PARAM_ERROR' }); });

            expect(subScopeMap.MAIN.$actionIsPending).toBe(false);
            expect(subScopeMap.MAIN.$actionIsComplete).toBe(false);
            expect(subScopeMap.MAIN.$actionError).toBe(null);
            expect(subScopeMap.MAIN.$actionHasError).toBe(false);
            expect(subScopeMap.MAIN.$actionHasParameterErrors).toBe(true);

            expect(subScopeMap.A.$actionParameter.error).toBe(null);
            expect(subScopeMap.B.$actionParameter.error).toBe('PARAM_ERROR');
        });

        it('updates action state on success, clearing old errors', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            subScopeMap.MAIN.$apply(function () { testActionResult.reject({ TEST_PARAM_B: 'PARAM_ERROR' }); });

            scope.testAction = secondAction;
            subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });

            subScopeMap.MAIN.$apply(function () { secondActionResult.resolve('SUCCESS'); });

            expect(secondAction).toHaveBeenCalled();

            expect(subScopeMap.MAIN.$actionIsPending).toBe(false);
            expect(subScopeMap.MAIN.$actionIsComplete).toBe(true);
            expect(subScopeMap.MAIN.$actionError).toBe(null);
            expect(subScopeMap.MAIN.$actionHasError).toBe(false);
            expect(subScopeMap.MAIN.$actionHasParameterErrors).toBe(false);

            expect(subScopeMap.A.$actionParameter.error).toBe(null);
            expect(subScopeMap.B.$actionParameter.error).toBe(null);
        }));

        it('preserves old errors during resubmitting', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            subScopeMap.MAIN.$apply(function () { testActionResult.reject({ TEST_PARAM_B: 'PARAM_ERROR' }); });

            scope.testAction = secondAction;
            subScopeMap.MAIN.$apply(function () { subScopeMap.MAIN.$actionInvoke(); });

            expect(secondAction).toHaveBeenCalled();

            expect(subScopeMap.MAIN.$actionIsPending).toBe(true);
            expect(subScopeMap.MAIN.$actionIsComplete).toBe(false);
            expect(subScopeMap.MAIN.$actionError).toBe(null);
            expect(subScopeMap.MAIN.$actionHasError).toBe(false);
            expect(subScopeMap.MAIN.$actionHasParameterErrors).toBe(true);

            expect(subScopeMap.A.$actionParameter.error).toBe(null);
            expect(subScopeMap.B.$actionParameter.error).toBe('PARAM_ERROR');
        }));
    });
});
