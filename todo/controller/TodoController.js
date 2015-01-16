/* global angular:false */

import bind from 'examplelib/utility/bind';
import extend from 'examplelib/utility/extend';

/**
 * <p>Controller for the to-do application.</p>
 * @ngInject
 */
export default class TodoController {

  /**
   * @constructor
   */
  constructor($scope, $filter, $state, storage) {

    // bind and copy all prototype members
    extend($scope, bind(this));

    // private variables
    this.todos_   = storage.get() || [ ];
    this.newTodo_ = '';
    this.$filter_ = $filter;
    this.$state_  = $state;
    this.storage_ = storage;

    // synchronise model with storage
    $scope.$watch('todos', this.watchTodos, true);

    // observe the current state for changes and adjust the filter
    $scope.$on('$stateChangeSuccess', this.onFilterChange);
  }

  /**
   * <p>The current list of to-do objects.</p>
   * @returns {Array.<object>}
   */
  get todos() {
    return this.todos_;
  }

  /**
   * <p>A pending to-do object.</p>
   * @returns {string}
   */
  get newTodo() {
    return this.newTodo_;
  }

  /**
   * @param {string} value
   */
  set newTodo(value) {
    this.newTodo_ = value;
  }

  /**
   * <p>A to-do object that is currently being edited.</p>
   * @returns {object}
   */
  get editedTodo() {
    return this.editedTodo_;
  }

  /**
   * <p>Commit the to-do object currently assigned to <code>newTodo</code>.</p>
   */
  addTodo() {
    var text = this.newTodo_.trim();
    if (text.length) {
      this.todos_.push({
        title:     text,
        completed: false
      });
      this.newTodo_ = '';
    }
  }

  /**
   * <p>Mark the given to-do object as being edited.</p>
   * <p>This will make it the <code>editedTodo</code> that may be reinstated on cancelation of editing.</p>
   * @param {object} value The to-do object that is being edited
   */
  editTodo(value) {
    this.editedTodo_   = value;
    this.originalTodo_ = angular.extend({}, value); // Clone the original to restore it on demand.
  }

  /**
   * <p>Commit the to-do currently being edited.</p>
   * <p>If the <code>title</code> is empty the value will be removed.</p>
   * @param {object} value The to-do object that is being edited
   */
  doneEditing(value) {
    this.editedTodo_ = null;
    value.title = value.title.trim();
    if (!value.title) {
      this.removeTodo(value);
    }
  }

  /**
   * <p>Cancel editing the given to-do and reinstate the pre-edit state.</p>
   * @param {object} value The to-do object that is being edited
   */
  revertEditing(value) {
    var index = this.todos_.indexOf(value);
    this.todos_[index] = this.originalTodo_;
    this.doneEditing(this.originalTodo_);
  }

  /**
   * <p>Test whether the given to-do value is being edited.</p>
   * @param {object} value The to-do object to query
   * @returns {boolean} True where the given to-do is being edited
   */
  testEditing(value) {
    return (this.editedTodo_ === value);
  }

  /**
   * <p>Remove the given to-do value from the collection.</p>
   * @param {object} value The to-do object to remove
   */
  removeTodo(value) {
    this.todos_.splice(this.todos_.indexOf(value), 1);
  }

  /**
   * <p>Remove all to-do values that are marked as completed.</p>
   */
  clearCompletedTodos() {
    this.todos_ = this.todos_.filter(function (val) {
      return !val.completed;
    });
  }

  /**
   * <p>Mark all to-do values with the given completion value.</p>
   * @param {boolean} completed The completed status to assign to all to-do values
   */
  markAll(completed) {
    this.todos_.forEach(function (todo) {
      todo.completed = !completed;
    });
  }

  /**
   * <p>The number of to-do values that are incomplete.</p>
   * @returns {number} The number incomplete
   */
  get remainingCount() {
    return this.remainingCount_;
  }

  /**
   * <p>The number of to-do values that are complete.</p>
   * @returns {number} The number complete
   */
  get completedCount() {
    return this.completedCount_;
  }

  /**
   * <p>Indicates whether all to-do values are completed.</p>
   * @returns {boolean} True where all are complete, else False
   */
  get allChecked() {
    return this.allChecked_;
  }

  /**
   * The current filter setting, either <code>'active'</code>, <code>'completed'</code>, or <code>''</code>.</p>
   * @returns {string} The filter setting
   */
  get status() {
    return this.status_;
  }

  /**
   * <p>Parameters for an object filter.</p>
   * @returns {object} An object whose fields define filter requirements
   */
  get statusFilter() {
    return this.statusFilter_;
  }

  /**
   * <p>Watch handler that commits the to-do list to storage when it changes.</p>
   * @param {Array.<object>} newValue The new value of the list
   * @param {Array.<object>} oldValue The previous value of the list
   */
  watchTodos(newValue, oldValue) {
    this.remainingCount_ = this.$filter_('filter')(this.todos_, { completed: false }).length;
    this.completedCount_ = this.todos_.length - this.remainingCount_;
    this.allChecked_     = !this.remainingCount_;
    if (newValue !== oldValue) {
      this.storage_.put(this.todos_);
    }
  }

  /**
   * <p>State change handler that implements a filter based on state parameters.</p>
   */
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