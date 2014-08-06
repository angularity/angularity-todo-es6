/**
 * <p>Find the instance where a constructor is given.</p>
 * <p>Non objects imply <code>null</code>. Non constructors are returned as is.</p>
 * @param {object} candidate The object to test
 * @returns {object|null} The instance where given a constructor, else the given value as object
 */
export default function dereferenceConstructor(candidate) {
  'use strict';
  if (typeof candidate === 'object') {
    var prototype     = Object.getPrototypeOf(candidate);
    var isConstructor = (prototype) && (prototype.constructor) && (candidate instanceof prototype.constructor);
    var result        = isConstructor ? prototype : candidate;
    return result;
  } else {
    return null;
  }
}