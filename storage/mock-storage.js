import bind from 'es6-class-util/bind';

export default class MockStorage {

  constructor() {

    // bind all prototype members
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