/* global angular:false */

import todoRoutes             from '../todo/todo-routes';
import EscapeKeyDirective     from 'examplelib/interaction/escape-key-directive';
import FocusElementDirective  from 'examplelib/interaction/focus-element-directive';
import LocalStorage           from '../storage/local-storage';

angular.module('app', [ 'ui.router', 'ui.bootstrap' ])
  .config(todoRoutes)
  .directive('escape', EscapeKeyDirective.forAttribute('escape'))
  .directive('focus', FocusElementDirective.forAttribute('focus'))
  .value('storage', new LocalStorage('todos-angularjs'));