import {Something} from 'Something';

export class SomethingMore extends Something {

  constructor() {
    this.greet('SomethingMore(lib)Constructor');
  }

  greet(message) {
    super.greet(message);
    window.console.log('SomethingMore(lib) says : ' + message)
  }

}