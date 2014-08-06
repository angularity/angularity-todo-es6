/* global EscapeKeyDirective:false */

import bind from 'utility/bind';

export default class EscapeKeyDirective {

  static getInstance() {
    return new EscapeKeyDirective();
  }

  constructor() {
    bind(this);
  }

  link(scope, elem, attrs) {
    var ESCAPE_KEY = 27;
    elem.bind('keydown', function (event) {
      if (event.keyCode === ESCAPE_KEY) {
        scope.$apply(attrs.escape);
      }
    });
  }

}