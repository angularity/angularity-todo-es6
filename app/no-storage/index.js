/* global angular:false */

import '../index.js';

import MockStorage from '../../storage/mock-storage';

angular.module('app')
  .service('storage', MockStorage);
