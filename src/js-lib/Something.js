export class Something {

  constructor() {
    this.greet('Something(src)Constructor')
  }

  greet(message) {
    window.console.log('Something(src) says : ' + message);
  }

}