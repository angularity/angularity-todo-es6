/* globals angular, describe, beforeEach, inject, it, expect, spyOn */
/* jshint sub:true */

import EscapeKeyDirective from 'examplelib/interaction/EscapeKeyDirective';

describe('@', function() {
  'use strict';

  var scope;
  var element;

  // mappings
  angular.module('@', [ ])
    ['directive']('escape', EscapeKeyDirective.forAttribute('escape'));

  // our temporary module
  beforeEach(angular.mock.module('@'));

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