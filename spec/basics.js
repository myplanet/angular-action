describe('angular-action do/parameter directive', function () {
    var dom, scope, subScope;

    beforeEach(module('action'));

    beforeEach(inject(function($rootScope, $compile) {
        dom = angular.element('<div do="testAction(data)"><div ng-init="captureSubscope()"></div></div>');
        scope = $rootScope.$new();
        subScope = null; // clear and then capture on digest
        scope.captureSubscope = function () { subScope = this; };

        $compile(dom)(scope);
        scope.$digest();
    }));

    it('defines scope "$action" state properties', function () {
        expect(subScope.$actionIsPending).toBe(false);
        expect(subScope.$actionIsComplete).toBe(false);
        expect(subScope.$actionError).toBe(null);
        expect(subScope.$actionHasError).toBe(false);
        expect(subScope.$actionHasParameterErrors).toBe(false);
        expect(subScope.$actionInvoke).toEqual(jasmine.any(Function));
        expect(subScope.$actionReset).toEqual(jasmine.any(Function));
    });
});
