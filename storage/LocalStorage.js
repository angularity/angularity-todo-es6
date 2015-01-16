/* globals localStorage */

import bind from 'examplelib/utility/bind';

/**
 * <p>Store a single value in HTML5 local storage.</p>
 */
export default class LocalStorage {

  /**
   * @constructor
   * @param {string} storageID An identifier for the value in local storage
   */
  constructor(storageID) {

    // bind and copy all prototype members
    bind(this);

    // private variables
    this.storageID_ = storageID;
  }

  /**
   * <p>Retrieve a value.</p>
   * @returns {*} The value in local storage, where defined
   */
  get() {
    var json  = localStorage.getItem(this.storageID_);
    var value = (json) ? JSON.parse(json) : undefined;
    return value;
  }

  /**
   * <p>Set a value.</p>
   * @param {*} value The value to storage in local storage
   */
  put(value) {
    localStorage.setItem(this.storageID_, JSON.stringify(value));
  }

}