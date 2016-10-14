describe('angular-action do directive', function () {
    var scope, contentScope, paramScope, actionStub, postActionStub;
    var ngQ;

    beforeEach(module('mp.action'));

    beforeEach(inject(function ($rootScope, $compile, $q) {
        ngQ = $q;

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
        expect(contentScope.$action.isPending).toBe(false);
        expect(contentScope.$action.error).toBe(null);
        expect(contentScope.$action.invoke).toEqual(jasmine.any(Function));
        expect(contentScope.$action.reset).toEqual(jasmine.any(Function));
    });

    it('invokes the action expression when "$actionInvoke" is called', function () {
        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(actionStub).toHaveBeenCalled();
    });

    it('handles non-thenable values returned by action expression', function () {
        actionStub.andReturn('SIMPLE_VALUE');
        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(contentScope.$action.isPending).toBe(false);
        expect(contentScope.$action.error).toBe(null);
    });

    it('invokes "then" expression after success', function () {
        actionStub.andReturn('TEST_RESULT');
        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(postActionStub).toHaveBeenCalledWith('TEST_RESULT');
    });

    it('passes collected single data value to action expression', function () {
        paramScope.$on('$actionDataRequest', function (evt) {
            paramScope.$emit('$actionDataResponse', ngQ.when([ 'MAIN_VALUE' ]));
        });

        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(actionStub).toHaveBeenCalledWith([ 'MAIN_VALUE' ]);
    });

    it('passes collected parameter values to action expression', function () {
        paramScope.$emit('$actionDataObjectFieldCreated', 'TEST_PARAM_A');
        paramScope.$emit('$actionDataObjectFieldCreated', 'TEST_PARAM_B');

        paramScope.$on('$actionDataRequest', function (evt) {
            paramScope.$emit('$actionDataObjectFieldResponse', 'TEST_PARAM_A', ngQ.when('VALUE_A'));
            paramScope.$emit('$actionDataObjectFieldResponse', 'TEST_PARAM_B', ngQ.when('VALUE_B'));
        });

        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(actionStub).toHaveBeenCalledWith({
            TEST_PARAM_A: 'VALUE_A',
            TEST_PARAM_B: 'VALUE_B'
        });
    });

    it('does not invoke the action expression when parameter collection encounters an error', function () {
        paramScope.$emit('$actionDataObjectFieldCreated', 'TEST_PARAM_A');
        paramScope.$emit('$actionDataObjectFieldCreated', 'TEST_PARAM_B');

        paramScope.$on('$actionDataRequest', function (evt) {
            paramScope.$emit('$actionDataObjectFieldResponse', 'TEST_PARAM_A', ngQ.when('VALUE_A'));
            paramScope.$emit('$actionDataObjectFieldResponse', 'TEST_PARAM_B', ngQ.reject(''));
        });

        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(actionStub).not.toHaveBeenCalled();
    });

    describe('invoked with a promised action', function () {
        var testActionResult;

        beforeEach(inject(function ($q) {
            testActionResult = $q.defer();
            actionStub.andReturn(testActionResult.promise);

            contentScope.$apply(function () { contentScope.$action.invoke(); });
        }));

        it('updates action pending state', function () {
            expect(contentScope.$action.isPending).toBe(true);
            expect(contentScope.$action.error).toBe(null);
        });

        it('updates action error state on error', function () {
            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            expect(contentScope.$action.isPending).toBe(false);
            expect(contentScope.$action.error).toBe('ERROR');
        });

        it('updates action state on success, clearing old errors', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            scope.actionStub = secondAction;
            contentScope.$apply(function () { contentScope.$action.invoke(); });

            contentScope.$apply(function () { secondActionResult.resolve('SUCCESS'); });

            expect(secondAction).toHaveBeenCalled();

            expect(contentScope.$action.isPending).toBe(false);
            expect(contentScope.$action.error).toBe(null);
        }));

        it('resets old errors during resubmitting', inject(function ($q) {
            var secondActionResult = $q.defer();
            var secondAction = jasmine.createSpy('second action').andReturn(secondActionResult.promise);

            contentScope.$apply(function () { testActionResult.reject('ERROR'); });

            scope.actionStub = secondAction;
            contentScope.$apply(function () { contentScope.$action.invoke(); });

            expect(secondAction).toHaveBeenCalled();

            expect(contentScope.$action.isPending).toBe(true);
            expect(contentScope.$action.error).toBe(null);
        }));
    });
});
