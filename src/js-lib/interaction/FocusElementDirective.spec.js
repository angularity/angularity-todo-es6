/* globals angular, describe, beforeEach, afterEach, inject, it, expect, document */
/* jshint sub:true */

import FocusElementDirective from 'interaction/FocusElementDirective';

describe('@', function() {
  'use strict';

  var scope;
  var element;
  var timeout;

  // mappings
  angular.module('@', [ 'ngMock' ])
    ['directive']('focus', FocusElementDirective.forAttribute('focus'));

  beforeEach(angular.mock.module('@'));

  // create the scope
  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
    scope.value = false;
  }));

  beforeEach(inject(function($compile, $timeout) {
    var form = $compile('<form id="form"><input focus="value"/></form>')(scope);
    element = form.find('input');
    timeout = $timeout;
    form.appendTo(document.body);
  }));

  afterEach(function() {
    element.remove();
    timeout = null;
    scope   = null;
    element = null;
  });

  it('should have the given scope', function() {
    expect(element.scope()).toBe(scope);
  });

  it('should receive focus following assertion of the attributed value', function() {
    scope.value = true;
    scope.$digest();
    timeout.flush();
    expect(document.activeElement.tagName).toBe('INPUT');
  });

});
