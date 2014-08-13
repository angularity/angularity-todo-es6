/* globals angular, module, describe, beforeEach, inject, it, expect, jasmine */

import TodoController from 'todo/TodoController';
import MockStorage    from 'storage/MockStorage';

describe('@', function() {
  'use strict';

  var scope;
  var storage;
  var state;

  angular.module('@', [ ])
    .controller('TodoController', TodoController);

  beforeEach(function() {
    jasmine.addMatchers({
      toHaveProperty: function () {
        return {
          compare: function (actual, expected) {
            var pass = (typeof actual === 'object') && (typeof expected === 'string') && (expected in actual);
            return {
              pass: pass,
              message: 'given object ' + (pass ? 'contains' : 'does not contain') + ' property ' + expected
            };
          }
        };
      },
      toHaveMethod: function () {
        return {
          compare: function (actual, expected) {
            var pass = (typeof actual === 'object') && (typeof expected === 'string') && (expected in actual) &&
              (typeof actual[expected] === 'function');
            return {
              pass: pass,
              message: 'given object ' + (pass ? 'contains' : 'does not contain') + ' method ' + expected
            };
          }
        };
      }
    });
  });

  // our temporary module
  beforeEach(module('@'));

  // mock storage
  beforeEach(function () {
    storage = new MockStorage();
  });

  // mock state
  beforeEach(function () {
    state = {
      params: {}
    };
  });

  // create the scope
  beforeEach(inject(function ($rootScope, $controller, $filter) {
    scope = $rootScope.$new();
    $controller('TodoController', {
      '$scope':   scope,
      '$filter':  $filter,
      '$state':   state,
      'storage':  storage
    });
  }));

  describe('at initialisation', function() {
    it('should contain an empty todos list', function () {
      expect(scope).toHaveProperty('todos');
      expect(scope.todos).toEqual([ ]);
    });
    it('should have an empty string new todo', function () {
      expect(scope).toHaveProperty('newTodo');
      expect(scope.newTodo).toEqual('');
    });
    it('should have an undefined edited todo', function () {
      expect(scope).toHaveProperty('editedTodo');
      expect(scope.editedTodo).not.toBeDefined();
    });
    it('should have method addTodo()', function () {
      expect(scope).toHaveMethod('addTodo');
    });
    it('should have method editTodo()', function () {
      expect(scope).toHaveMethod('editTodo');
    });
    it('should have method doneEditing()', function () {
      expect(scope).toHaveMethod('doneEditing');
    });
    it('should have method revertEditing()', function () {
      expect(scope).toHaveMethod('revertEditing');
    });
    it('should have method testEditing()', function () {
      expect(scope).toHaveMethod('testEditing');
    });
    it('should have method removeTodo()', function () {
      expect(scope).toHaveMethod('removeTodo');
    });
    it('should have method clearCompletedTodos()', function () {
      expect(scope).toHaveMethod('clearCompletedTodos');
    });
    it('should have method markAll()', function () {
      expect(scope).toHaveMethod('markAll');
    });
    it('should NOT contain private properties', function () {
      expect(scope).not.toHaveProperty('todos_');
    });
  });

  // TODO more characterisation of the scope

});