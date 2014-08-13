/* global angular:false */

import bind from 'utility/bind';
import extend from 'utility/extend';

export default class TodoController {

  /** @ngInject */
  constructor($scope, $filter, $state, storage) {

    // bind and copy all prototype members
    extend($scope, bind(this));

    // private variables
    this.todos_   = storage.get() || [ ];
    this.newTodo_ = '';
    this.$filter_ = $filter;
    this.$state_  = $state;
    this.storage_ = storage;

    // syncronise model with storage
    $scope.$watch('todos', $scope.watchTodos, true);

    // observe the current state for changes and adjust the filter
    $scope.$on('$stateChangeSuccess', $scope.onFilterChange);
  }

  get todos() {
    return this.todos_;
  }

  get newTodo() {
    return this.newTodo_;
  }
  set newTodo(value) {
    this.newTodo_ = value;
  }

  get editedTodo() {
    return this.editedTodo_;
  }

  addTodo() {
    var text = this.newTodo.trim();
    if (text.length) {
      this.todos.push({
        title:     text,
        completed: false
      });
      this.newTodo_ = '';
    }
  }

  editTodo(todo) {
    this.editedTodo_   = todo;
    this.originalTodo_ = angular.extend({}, todo); // Clone the original to restore it on demand.
  }

  doneEditing(todo) {
    this.editedTodo_ = null;
    todo.title = todo.title.trim();
    if (!todo.title) {
      this.removeTodo(todo);
    }
  }

  revertEditing(todo) {
    var index = this.todos.indexOf(todo);
    this.todos[index] = this.originalTodo_;
    this.doneEditing(this.originalTodo_);
  }

  testEditing(todo) {
    return (this.editedTodo_ === todo);
  }

  removeTodo(todo) {
    this.todos.splice(this.todos.indexOf(todo), 1);
  }

  clearCompletedTodos() {
    this._todos = this.todos.filter(function (val) {
      return !val.completed;
    });
  }

  markAll(completed) {
    this.todos.forEach(function (todo) {
      todo.completed = !completed;
    });
  }

  get remainingCount() {
    return this.remainingCount_;
  }

  get completedCount() {
    return this.completedCount_;
  }

  get allChecked() {
    return this.allChecked_;
  }

  get status() {
    return this.status_;
  }

  get statusFilter() {
    return this.statusFilter_;
  }

  watchTodos(newValue, oldValue) {
    this.remainingCount_ = this.$filter_('filter')(this.todos_, { completed: false }).length;
    this.completedCount_ = this.todos_.length - this.remainingCount_;
    this.allChecked_     = !this.remainingCount_;
    if (newValue !== oldValue) {
      this.storage_.put(this.todos);
    }
  }

  onFilterChange() {
    switch(this.$state_.params.status) {
      case 'active':
        this.status_       = 'active';
        this.statusFilter_ = { completed: false };
        break;
      case 'completed':
        this.status_       = 'completed';
        this.statusFilter_ = { completed: true };
        break;
      default:
        this.status_       = '';
        this.statusFilter_ = null;
        break;
    }
  }

}