/* global angular:false */

import '../index.js';

import MockStorage from '../../storage/MockStorage';

angular.module('app')
  .service('storage', MockStorage);
