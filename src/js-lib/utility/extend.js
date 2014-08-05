export default function extend(destination, ...sources) {
  'use strict';
  for (var source of sources) {
    var proto         = Object.getPrototypeOf(source);
    var isConstructor = (proto) && (source instanceof proto.constructor);
    var actualSource  = isConstructor ? proto : source;
    for (var key of Object.getOwnPropertyNames(actualSource)) {
      if (key !== 'constructor') {
        var descriptor = Object.getOwnPropertyDescriptor(actualSource, key);
        if (descriptor) {
          for (var field of [ 'get', 'set', 'value' ]) {
            if (typeof descriptor[field] === 'function') {
              descriptor[field] = descriptor[field].bind(source);
            }
          }
          Object.defineProperty(destination, key, descriptor);
        }
      }
    }
  }
}