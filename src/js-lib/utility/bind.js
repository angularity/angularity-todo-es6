import dereference from 'utility/dereferenceConstructor';

/**
 * <p>Bind any method or accessors in the given descriptor to the given target.</p>
 * @param {object} descriptor Descriptor as returned by <code>Object.getOwnPropertyDescriptor()</code>
 * @param {object} target The object that methods will be bound to
 */
function bindDescriptor(descriptor, target) {
  'use strict';
  var FIELDS = [ 'get', 'set', 'value' ];
  for (var field of FIELDS) {
    if ((field in descriptor) && (typeof descriptor[field] === 'function')) {
      descriptor[field] = descriptor[field].bind(target);
    }
  }
}

/**
 * <p>Bind all methods and accessors of the given candidate to itself (in-place) and return the candidate.</p>
 * <p>Where a constructor is given the members of the constructor's instance are bound to the constuctor.</p>
 * @param {object} candidate An instance or its constructor
 * @returns {object} The given candidate
 */
export default function bind(candidate) {
  'use strict';
  if (typeof candidate === 'object') {
    var instance = dereference(candidate);
    var names    = Object.getOwnPropertyNames(instance);
    for (var name of names) {
      if (name !== 'constructor') {
        var descriptor = Object.getOwnPropertyDescriptor(instance, name);
        if (descriptor) {
          bindDescriptor(descriptor, candidate);
          Object.defineProperty(instance, name, descriptor);
        }
      }
    }
  }
  return candidate;
}
