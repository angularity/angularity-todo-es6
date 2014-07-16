export class Something {

  constructor() {
    greet('Something(lib)Constructor');
  }

  function greet(message) {
    console.log('Something(lib) says : ' + message)
  }

}