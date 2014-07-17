import {Something} from 'Something';

export class SomethingMore extends Something {

  constructor() {
    this.greet('SomethingMore(lib)Constructor');
  }

  greet(message) {
    super.greet(message);
    message = 'SomethingMore(lib) says : ' + message;
      $('body').append($('<div>').html(message));
    window.console.log(message)
  }

}