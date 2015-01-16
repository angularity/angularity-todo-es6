/* global angular:false */

import todoRoutes             from '../todo/todoRoutes';
import EscapeKeyDirective     from 'examplelib/interaction/EscapeKeyDirective';
import FocusElementDirective  from 'examplelib/interaction/FocusElementDirective';
import LocalStorage           from '../storage/LocalStorage';

angular.module('app', [ 'ui.router', 'ui.bootstrap' ])
  .config(todoRoutes)
  .directive('escape', EscapeKeyDirective.forAttribute('escape'))
  .directive('focus', FocusElementDirective.forAttribute('focus'))
  .value('storage', new LocalStorage('todos-angularjs'));