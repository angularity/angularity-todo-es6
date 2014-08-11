/* globals angular, module, describe, beforeEach, inject, it, expect, spyOn */

import EscapeKeyDirective from 'interaction/EscapeKeyDirective';

describe('@', function() {
  'use strict';

  var scope;
  var element;

  var moduleName = Math.random().toString(16);
  angular.module(moduleName, [ ])
    .directive('escape', EscapeKeyDirective.createFactory('escape'));

  // our temporary module
  beforeEach(module(moduleName));

  // create the scope
  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
    scope.handler = function() {};
    spyOn(scope, 'handler');
  }));

  beforeEach(inject(function($compile) {
    var form = $compile('<form id="form"><input escape="handler()"/></form>')(scope);
    element = form.find('input');
  }));

  it('should have the given scope', function() {
    expect(element.scope()).toBe(scope);
  });

  it('should hook ESC keydown on the element', function() {
    element.trigger({
      type:    'keydown',
      keyCode: 27,
      witch:   String.fromCharCode(27)
    });
    expect(scope.handler).toHaveBeenCalled();
  });

});