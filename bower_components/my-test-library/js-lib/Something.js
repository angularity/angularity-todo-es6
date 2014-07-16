export class Something {

  constructor() {
    greet('Something(lib)Constructor');
  }

  greet(message) {
    console.log('Something(lib) says : ' + message);
  }

}