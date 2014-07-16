System.register("Something", [], function() {
  "use strict";
  var __moduleName = "Something";
  var Something = function Something() {
    greet('Something(src)Constructor');
  };
  ($traceurRuntime.createClass)(Something, {greet: function(message) {
      console.log('Something(src) says : ' + message);
    }}, {});
  return {get Something() {
      return Something;
    }};
});
System.register("subdirectory/SomethingMore", [], function() {
  "use strict";
  var __moduleName = "subdirectory/SomethingMore";
  var Something = $traceurRuntime.assertObject(System.get("Something")).Something;
  var SomethingMore = function SomethingMore() {
    greet('SomethingMore(lib)Constructor');
  };
  var $SomethingMore = SomethingMore;
  ($traceurRuntime.createClass)(SomethingMore, {greet: function(message) {
      $traceurRuntime.superCall(this, $SomethingMore.prototype, "greet", [message]);
      console.log('SomethingMore(lib) says : ' + message);
    }}, {}, Something);
  return {get SomethingMore() {
      return SomethingMore;
    }};
});
System.register("../src/js/app2", [], function() {
  "use strict";
  var __moduleName = "../src/js/app2";
  var SomethingMore = $traceurRuntime.assertObject(System.get("subdirectory/SomethingMore")).SomethingMore;
  new SomethingMore();
  return {};
});
System.get("../src/js/app2" + '');

//# sourceMappingURL=all.app2.map
