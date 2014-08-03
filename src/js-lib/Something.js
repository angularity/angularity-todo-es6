/* global $:false */
/* global console:false */
export default class Something {

  constructor() {
    this.greet('Something(src)Constructor');
  }

  greet(message) {
    message = 'Something(lib) says : ' + message;
    $('body').append($('<div>').html(message));
    console.log(message);
  }

}