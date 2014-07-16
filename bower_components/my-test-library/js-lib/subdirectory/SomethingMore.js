import {Something} from 'Something';

export class SomethingMore extends Something {

  constructor() {
    greet('SomethingMore(lib)Constructor');
  }

  function greet(message) {
    super.greet(message);
    console.log('SomethingMore(lib) says : ' + message)
  }

}