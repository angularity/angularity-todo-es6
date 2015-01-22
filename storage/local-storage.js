/* globals localStorage */

import MockStorage from './mock-storage';
import bind        from 'es6-class-util/bind';

/**
 * <p>Store a single value in HTML5 local storage.</p>
 */
export default class LocalStorage extends MockStorage {

  /**
   * @constructor
   * @param {string} storageID An identifier for the value in local storage
   */
  constructor(storageID) {

    // bind all prototype members
    bind(this);

    // private variables
    this.storageID_ = storageID;
  }

  /**
   * <p>Retrieve a value.</p>
   * @returns {*} The value in local storage, where defined
   */
  get() {
    var json  = localStorage && localStorage.getItem(this.storageID_);
    var value = (json) ? JSON.parse(json) : super.get();
    return value;
  }

  /**
   * <p>Set a value.</p>
   * @param {*} value The value to storage in local storage
   */
  put(value) {
    if (localStorage) {
      localStorage.setItem(this.storageID_, JSON.stringify(value));
    }
    super.put(value);
  }

}