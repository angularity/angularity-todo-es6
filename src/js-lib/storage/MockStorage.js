/* global localStorage:false */

import bind from 'utility/bind';

export default class MockStorage {

  constructor() {

    // bind and copy all prototype members
    bind(this);

    // private variables
    this.value_ = undefined;
  }

  get() {
    return this.value_;
  }

  put(value) {
    this.value_ = value;
  }

}