import dereference from 'utility/dereferenceConstructor';

function extendSingle(destInstance, sourceInstance) {
  'use strict';
  var names = Object.getOwnPropertyNames(sourceInstance);
  for (var name of names) {
    if ((name !== 'constructor') && !(name in destInstance)) {
      var descriptor = Object.getOwnPropertyDescriptor(sourceInstance, name);
      if (descriptor) {
        Object.defineProperty(destInstance, name, descriptor);
      }
    }
  }
}

export default function extend(destination, ...sources) {
  'use strict';
  var destInstance = dereference(destination);
  if (destInstance) {
    for (var source of sources) {
      var sourceInstance = dereference(source);
      if (sourceInstance) {
        extendSingle(destInstance, sourceInstance);
      }
    }
  }
}
