/* globals describe, beforeEach, afterEach, it, expect, jasmine, localStorage */

import LocalStorage from 'storage/LocalStorage';

var randomStrings = [ ];
function randomString() {
  'use strict';
  function randomChar() {
    return String.fromCharCode(32 + Math.floor(Math.random() * 95));
  }
  function randomChars(length) {
    var result = '';
    for (var i = length; i > 0; i--) {
      result += randomChar();
    }
    return result;
  }
  var result;
  do {
    result = randomChars(1 + Math.floor(Math.random() * 10));
  } while (randomStrings.indexOf(result) >= 0);
  randomStrings.push(result);
  return result;
}

describe('@', function() {
  'use strict';

  var TESTS = [
    [ 'null',   randomString(), null                           ],
    [ 'text',   randomString(), 'a'                            ],
    [ 'zero',   randomString(), 0                              ],
    [ 'int',    randomString(), 10                             ],
    [ 'float',  randomString(), 12.2                           ],
    [ 'array',  randomString(), [ 'a', 0, { } ]                ],
    [ 'object', randomString(), { 'a': 'a', 'b': 0, 'c': { } } ]
  ];

  // create a description for each value
  function describeTest(title, key, value, index) {
    describe('.. and for ' + title, function () {
      if (index === 0) {
        it('should be initially undefined', function() {
          expect(this.instance.get(key)).toBeUndefined();
        });
      }
      it('should be set without a return value', function() {
        expect(this.instance.put(key, value)).toBeUndefined();
      });
      it('should have the value when required', function() {
        expect(this.instance.put(key)).toBeUndefined(value);
      });
    });
  }

  // create a description for each key
  function describeForKey(storageKey) {
    describe('for key "' + storageKey + '"', function() {

      beforeEach(function() {
        this.instance = new LocalStorage(storageKey);
      });

      it('should be an instance', function() {
        expect(this.instance).toEqual(jasmine.any(LocalStorage));
      });

      TESTS.forEach(function (args, i) {
        describeTest.apply(this, args.concat(i));
      });

      afterEach(function() {
        localStorage.clear();
      });
   });
  }

  // attempt 3 random keys
  for (var i = 0; i < 3; i++) {
    describeForKey(randomString());
  }

});