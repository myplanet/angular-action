describe('angular-action do directive', function () {
    var scope, contentScope, paramScope, actionStub, postActionStub;

    beforeEach(module('mp.action'));

    beforeEach(inject(function ($rootScope, $compile) {
        scope = $rootScope.$new();

        actionStub = scope.actionStub = jasmine.createSpy('actionStub');
        postActionStub = scope.postActionStub = jasmine.createSpy('postActionStub');

        var dom = angular.element(
            '<div do="actionStub($data)" then="postActionStub($data)">' +
            '<div><span><!-- parameter scope --></span></div>' +
            '</div>'
        );

        $compile(dom)(scope);
        scope.$digest();

        contentScope = dom.children().eq(0).scope();
        paramScope = dom.children().eq(0).children().eq(0).scope();
    }));

    it('defines scope "$action" state properties', function () {
        expect(contentScope.$actionIsPending).toBe(false);
        expect(contentScope.$actionFailed).toBe(false);
        expect(contentScope.$actionInvoke).toEqual(jasmine.any(Function));
        expect(contentScope.$actionReset).toEqual(jasmine.any(Function));
    });

    it('invokes the action expression when "$actionInvoke" is called', function () {
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(actionStub).toHaveBeenCalled();
    });

    it('handles non-thenable values returned by action expression', function () {
        actionStub.andReturn('SIMPLE_VALUE');
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(contentScope.$actionIsPending).toBe(false);
        expect(contentScope.$actionFailed).toBe(false);
    });

    it('invokes "then" expression after success', function () {
        actionStub.andReturn('TEST_RESULT');
        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(postActionStub).toHaveBeenCalledWith('TEST_RESULT');
    });

    it('passes collected parameter values to action expression', function () {
        paramScope.$on('$actionCollecting', function (evt, reportValue, reportError) {
            reportValue('TEST_PARAM_A', 'VALUE_A');
            reportValue('TEST_PARAM_B', 'VALUE_B');
        });

        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(actionStub).toHaveBeenCalledWith({
            TEST_PARAM_A: 'VALUE_A',
            TEST_PARAM_B: 'VALUE_B'
        });
    });

    it('does not invoke the action expression when parameter collection encounters an error', function () {
        paramScope.$on('$actionCollecting', function (evt, reportValue, reportError) {
            reportValue('TEST_PARAM_A', 'VALUE_A');
            reportError();
        });

        contentScope.$apply(function () { contentScope.$actionInvoke(); });

        expect(actionStub).not.toHaveBeenCalled();
    });

    describe('invoked with a promised action', function () {
        var testActionResult;

        beforeEach(inject(function ($q) {
            testActionResult = $q.defer();
            actionStub.andReturn(testActionResult.promise);

            contentScope.$apply(function () { contentScope.$actionInvoke(); });
        }));

        it('updates action pending state', function () {
            expect(contentScope.$actionIsPending).toBe(true);
            expect(contentScope.$actionFailed).toBe(false);
        });

        it('updates action error state on error', function () {
            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            expect(contentScope.$actionIsPending).toBe(false);
            expect(contentScope.$actionFailed).toBe(true);
        });

        it('updates action state on success, clearing old errors', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            scope.actionStub = secondAction;
            contentScope.$apply(function () { contentScope.$actionInvoke(); });

            contentScope.$apply(function () { secondActionResult.resolve('SUCCESS'); });

            expect(secondAction).toHaveBeenCalled();

            expect(contentScope.$actionIsPending).toBe(false);
            expect(contentScope.$actionFailed).toBe(false);
        }));

        it('preserves old errors during resubmitting', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            scope.actionStub = secondAction;
            contentScope.$apply(function () { contentScope.$actionInvoke(); });

            expect(secondAction).toHaveBeenCalled();

            expect(contentScope.$actionIsPending).toBe(true);
            expect(contentScope.$actionFailed).toBe(true);
        }));
    });
});
