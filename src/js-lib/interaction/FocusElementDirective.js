/* global FocusElementDirective:false */

import bind from 'utility/bind';

export default class FocusElementDirective {

  static getInstance($timeout) {
    return new FocusElementDirective($timeout);
  }

  constructor($timeout) {
    bind(this);
    this.$timeout_ = $timeout;
  }

  link(scope, elem, attrs) {
    var that = this;
    scope.$watch(attrs.focus, function (value) {
      if (value) {
        that.$timeout_(function () {
          elem[0].focus();
        }, 0, false);
      }
    });
  }

}