/* globals angular, module, describe, beforeEach, inject, it, expect, spyOn */

import EscapeKeyDirective from 'interaction/EscapeKeyDirective';

angular.module('test', [ ])
  .directive('escape', EscapeKeyDirective.createFactory('escape'));

describe('@', function() {
  'use strict';

  var scope;
  var element;

  // our temporary module
  beforeEach(module('test'));

  // create the scope
  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
    scope.handler = function() {};
    spyOn(scope, 'handler');
  }));

  beforeEach(inject(function($compile) {
    var form = $compile('<form name="form"><input escape="handler()"/></form></tpl>')(scope);
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