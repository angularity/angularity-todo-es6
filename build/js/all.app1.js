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
System.register("../src/js/app1", [], function() {
  "use strict";
  var __moduleName = "../src/js/app1";
  var Something = $traceurRuntime.assertObject(System.get("Something")).Something;
  new Something();
  return {};
});
System.get("../src/js/app1" + '');

//# sourceMappingURL=all.app1.map
