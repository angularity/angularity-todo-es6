/* global describe:false */
/* global beforeEach:false */
/* global it:false */
/* global jasmine:false */
/* global expect:false */

import Something from 'Something';

describe('@', function() {
  'use strict';

  beforeEach(function() {
  });

  it('has greet method', function() {
    var instance = new Something();
    expect(instance.greet).toEqual(jasmine.any(Function));
    expect(false).toBe(true);
  });

});