describe('angular-action parameter-map directive', function () {
    var scope, contentScope, paramScope, actionStub, postActionStub;
    var ngQ;

    beforeEach(module('mp.action'));

    beforeEach(inject(function ($rootScope, $compile, $q) {
        ngQ = $q;

        scope = $rootScope.$new();

        actionStub = scope.actionStub = jasmine.createSpy('actionStub');

        // parameter and parameter-map directives are kept on same element intentionally
        // to test a common arrangement (parameter is "above" the map in
        // this case, collecting its data value)
        var dom = angular.element(
            '<div do="actionStub($data)">' +
            '<div parameter="TEST_PARENT_PARAM" parameter-map><span><!-- parameter scope --></span></div>' +
            '</div>'
        );

        $compile(dom)(scope);
        scope.$digest();

        contentScope = dom.scope();
        paramScope = dom.children().eq(0).children().eq(0).scope();
    }));

    it('passes collected parameter values to action expression', function () {
        paramScope.$emit('$actionDataObjectFieldCreated', 'TEST_SUB_PARAM_A');
        paramScope.$emit('$actionDataObjectFieldCreated', 'TEST_SUB_PARAM_B');

        paramScope.$on('$actionDataRequest', function (evt) {
            paramScope.$emit('$actionDataObjectFieldResponse', 'TEST_SUB_PARAM_A', ngQ.when('VALUE_A'));
            paramScope.$emit('$actionDataObjectFieldResponse', 'TEST_SUB_PARAM_B', ngQ.when('VALUE_B'));
        });

        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(actionStub).toHaveBeenCalledWith({
            TEST_PARENT_PARAM: {
                TEST_SUB_PARAM_A: 'VALUE_A',
                TEST_SUB_PARAM_B: 'VALUE_B'
            }
        });
    });

    it('passes an empty object when there are no sub-parameters', function () {
        contentScope.$apply(function () { contentScope.$action.invoke(); });

        expect(actionStub).toHaveBeenCalledWith({
            TEST_PARENT_PARAM: {}
        });
    });
});
