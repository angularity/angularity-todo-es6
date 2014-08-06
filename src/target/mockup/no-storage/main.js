/* global angular:false */

import todoRoutes             from 'todo/todoRoutes';
import EscapeKeyDirective     from 'interaction/EscapeKeyDirective';
import FocusElementDirective  from 'interaction/FocusElementDirective';
import TodoController         from 'todo/TodoController';
import MockStorage            from 'storage/MockStorage';

angular.module('app', [ 'ui.router', 'ui.bootstrap', 'templates' ])
  .config(todoRoutes)
  .directive('escape', EscapeKeyDirective.createFactory('escape'))
  .directive('focus', FocusElementDirective.createFactory('focus'))
  .controller('TodoController', TodoController)
  .value('storage', new MockStorage());
