export class Something {

  constructor() {
    this.greet('Something(lib)Constructor');
  }

  greet(message) {
    debugger;
    window.console.log('Something(lib) says : ' + message);
  }

}