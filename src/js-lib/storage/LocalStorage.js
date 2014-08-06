/* global localStorage:false */

import bind from 'utility/bind';

export default class LocalStorage {

  constructor(storageID) {

    // bind and copy all prototype members
    bind(this);

    // private variables
    this.storageID_ = storageID;
  }

  get() {
    var json  = localStorage.getItem(this.storageID_);
    var value = (json) ? JSON.parse(json) : undefined;
    return value;
  }

  put(value) {
    localStorage.setItem(this.storageID_, JSON.stringify(value));
  }

}