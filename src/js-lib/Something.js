export class Something {

  constructor() {
    this.greet('Something(src)Constructor');
  }

  greet(message) {
    message = 'Something(lib) says : ' + message;
    $('body').append($('<div>').html(message));
    window.console.log(message);
  }

}