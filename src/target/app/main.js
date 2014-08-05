/* global angular:false */
/* global localStorage: false */

import TodoController from 'todo/TodoController';

(function () {
  'use strict';
  angular.module('app', [ 'ui.router', 'ui.bootstrap', 'templates' ])

    // routes
    .config(function($stateProvider, $urlRouterProvider) {
      $urlRouterProvider.otherwise('/');
      $stateProvider
        .state('home', {
          url:         '/:status',
          templateUrl: 'partials/todo.html',
          controller:  'TodoController as controller'
        });
    })

    .directive('todoEscape', function () {
      var ESCAPE_KEY = 27;
      return function (scope, elem, attrs) {
        elem.bind('keydown', function (event) {
          if (event.keyCode === ESCAPE_KEY) {
            scope.$apply(attrs.todoEscape);
          }
        });
      };
    })

    .directive('todoFocus', function todoFocus($timeout) {
      return function (scope, elem, attrs) {
        scope.$watch(attrs.todoFocus, function (newVal) {
          if (newVal) {
            $timeout(function () {
              elem[0].focus();
            }, 0, false);
          }
        });
      };
    })

    .factory('todoStorage', function () {
      var STORAGE_ID = 'todos-angularjs';
      return {
        get: function () {
          return JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
        },
        put: function (todos) {
          localStorage.setItem(STORAGE_ID, JSON.stringify(todos));
        }
      };
    })

    .controller('TodoController', TodoController);
//    .controller('TodoCtrl', function TodoCtrl($scope, $filter, $stateParams, todoStorage) {
//      var todos = $scope.todos = todoStorage.get();
//
//      $scope.newTodo = '';
//      $scope.editedTodo = null;
//
//      $scope.$watch('todos', function (newValue, oldValue) {
//        $scope.remainingCount = $filter('filter')(todos, { completed: false }).length;
//        $scope.completedCount = todos.length - $scope.remainingCount;
//        $scope.allChecked = !$scope.remainingCount;
//        if (newValue !== oldValue) { // This prevents unneeded calls to the local storage
//          todoStorage.put(todos);
//        }
//      }, true);
//
//      // Monitor the current route for changes and adjust the filter accordingly.
//      $scope.$on('$routeChangeSuccess', function () {
//        var status = $scope.status = $stateParams.status || '';
//
//        $scope.statusFilter = (status === 'active') ?
//          { completed: false } : (status === 'completed') ?
//          { completed: true } : null;
//      });
//
//      $scope.addTodo = function () {
//        var newTodo = $scope.newTodo.trim();
//        if (!newTodo.length) {
//          return;
//        }
//        todos.push({
//          title: newTodo,
//          completed: false
//        });
//        $scope.newTodo = '';
//      };
//
//      $scope.editTodo = function (todo) {
//        $scope.editedTodo = todo;
//        $scope.originalTodo = angular.extend({}, todo); // Clone the original to restore it on demand.
//      };
//
//      $scope.doneEditing = function (todo) {
//        $scope.editedTodo = null;
//        todo.title = todo.title.trim();
//        if (!todo.title) {
//          $scope.removeTodo(todo);
//        }
//      };
//
//      $scope.revertEditing = function (todo) {
//        todos[todos.indexOf(todo)] = $scope.originalTodo;
//        $scope.doneEditing($scope.originalTodo);
//      };
//
//      $scope.removeTodo = function (todo) {
//        todos.splice(todos.indexOf(todo), 1);
//      };
//
//      $scope.clearCompletedTodos = function () {
//        $scope.todos = todos = todos.filter(function (val) {
//          return !val.completed;
//        });
//      };
//
//      $scope.markAll = function (completed) {
//        todos.forEach(function (todo) {
//          todo.completed = !completed;
//        });
//      };
//    });

})();
