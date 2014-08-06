export default function todoRoutes($stateProvider, $urlRouterProvider) {
  'use strict';
  $urlRouterProvider.otherwise('/');
  $stateProvider
    .state('home', {
      url:         '/:status',
      templateUrl: 'partials/todo.html',
      controller:  'TodoController'
    });
}