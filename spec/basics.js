describe('angular-action do directive', function () {
    var scope, contentScope, paramAScope, paramBScope, testAction, testThen;

    beforeEach(module('mp.action'));

    beforeEach(inject(function ($rootScope, $compile) {
        scope = $rootScope.$new();

        testAction = scope.testAction = jasmine.createSpy('testAction');
        testThen = scope.testThen = jasmine.createSpy('testThen');

        var dom = angular.element(
            '<div do="testAction(data)" then="testThen(value)">' +
            '<span><!-- content scope outside of parameters --></span>' +
            '<div parameter="TEST_PARAM_A" value="\'INIT_VALUE\'"><span><!-- parameter scope --></span></div>' +
            '<div parameter="TEST_PARAM_B"><span><!-- parameter scope --></span></div>' +
            '</div>'
        );

        $compile(dom)(scope);
        scope.$digest();

        contentScope = dom.children().eq(0).scope();
        paramAScope = dom.children().eq(1).children().eq(0).scope();
        paramBScope = dom.children().eq(2).children().eq(0).scope();
    }));

    it('defines scope "$action" state properties', function () {
        expect(contentScope.$actionIsPending).toBe(false);
        expect(contentScope.$actionIsComplete).toBe(false);
        expect(contentScope.$actionError).toBe(null);
        expect(contentScope.$actionHasError).toBe(false);
        expect(contentScope.$actionInvoke).toEqual(jasmine.any(Function));
        expect(contentScope.$actionReset).toEqual(jasmine.any(Function));
    });

    it('invokes the action expression when "$actionInvoke" is called', function () {
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(testAction).toHaveBeenCalled();
    });

    it('handles non-thenable values returned by action expression', function () {
        testAction.andReturn('SIMPLE_VALUE');
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(contentScope.$actionIsPending).toBe(false);
        expect(contentScope.$actionIsComplete).toBe(true);
        expect(contentScope.$actionError).toBe(null);
        expect(contentScope.$actionHasError).toBe(false);

        expect(paramAScope.$actionParameter.error).toBe(null);
        expect(paramBScope.$actionParameter.error).toBe(null);
    });

    it('invokes "then" expression after success', function () {
        testAction.andReturn('TEST_RESULT');
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(testThen).toHaveBeenCalledWith('TEST_RESULT');
    });

    it('tracks individual parameter state objects separately', function () {
        expect(paramAScope.$actionParameter).not.toBe(paramBScope.$actionParameter);
    });

    it('passes initial parameter value to action expression', function () {
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(testAction).toHaveBeenCalledWith({ TEST_PARAM_A: 'INIT_VALUE' });
    });

    it('passes latest parameter value to action expression', function () {
        paramAScope.$actionParameter.value = 'LATEST_VALUE';
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(testAction).toHaveBeenCalledWith({ TEST_PARAM_A: 'LATEST_VALUE' });
    });

    it('defines scope "$actionParameter" value using initial value', function () {
        expect(paramAScope.$actionParameter.value).toBe('INIT_VALUE');
    });

    it('defines scope "$actionParameter" error as null', function () {
        expect(paramAScope.$actionParameter.error).toBe(null);
    });

    describe('invoked with a promised action', function () {
        var testActionResult;

        beforeEach(inject(function ($q) {
            testActionResult = $q.defer();
            testAction.andReturn(testActionResult.promise);

            contentScope.$apply(function () { contentScope.$actionInvoke(); });
        }));

        it('updates action pending state', function () {
            expect(contentScope.$actionIsPending).toBe(true);
            expect(contentScope.$actionIsComplete).toBe(false);
            expect(contentScope.$actionError).toBe(null);
            expect(contentScope.$actionHasError).toBe(false);
        });

        it('updates action error state on simple error', function () {
            contentScope.$apply(function () { testActionResult.reject('SIMPLE_ERROR'); });

            expect(contentScope.$actionIsPending).toBe(false);
            expect(contentScope.$actionIsComplete).toBe(false);
            expect(contentScope.$actionError).toBe('SIMPLE_ERROR');
            expect(contentScope.$actionHasError).toBe(true);

            expect(paramAScope.$actionParameter.error).toBe(null);
            expect(paramBScope.$actionParameter.error).toBe(null);
        });

        it('updates action error state on complex error', function () {
            contentScope.$apply(function () { testActionResult.reject({ error: 'COMPLEX_ERROR' }); });

            expect(contentScope.$actionIsPending).toBe(false);
            expect(contentScope.$actionIsComplete).toBe(false);
            expect(contentScope.$actionError).toEqual({ error: 'COMPLEX_ERROR' });
            expect(contentScope.$actionHasError).toBe(true);

            expect(paramAScope.$actionParameter.error).toBe(null);
            expect(paramBScope.$actionParameter.error).toBe(null);
        });

        it('updates action state on success, clearing old errors', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            scope.testAction = secondAction;
            contentScope.$apply(function () { contentScope.$actionInvoke(); });

            contentScope.$apply(function () { secondActionResult.resolve('SUCCESS'); });

            expect(secondAction).toHaveBeenCalled();

            expect(contentScope.$actionIsPending).toBe(false);
            expect(contentScope.$actionIsComplete).toBe(true);
            expect(contentScope.$actionError).toBe(null);
            expect(contentScope.$actionHasError).toBe(false);

            expect(paramAScope.$actionParameter.error).toBe(null);
            expect(paramBScope.$actionParameter.error).toBe(null);
        }));

        it('preserves old errors during resubmitting', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            scope.testAction = secondAction;
            contentScope.$apply(function () { contentScope.$actionInvoke(); });

            expect(secondAction).toHaveBeenCalled();

            expect(contentScope.$actionIsPending).toBe(true);
            expect(contentScope.$actionIsComplete).toBe(false);
            expect(contentScope.$actionError).toBe('ERROR');
            expect(contentScope.$actionHasError).toBe(true);

            expect(paramAScope.$actionParameter.error).toBe(null);
            expect(paramBScope.$actionParameter.error).toBe(null);
        }));
    });
});
