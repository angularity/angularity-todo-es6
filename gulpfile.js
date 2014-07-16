var plugins = require('gulp-load-plugins')();

gulp.task('js:lib', function() {
  var jsFiles = filter('lib_test/js/**/*.js');
  bower()
    .pipe(jsFiles)
    .pipe(rename(function(path) {
      path.dirname = path.dirname.replace(/^.*[\\\/]js(?:[\\\/])?/, '');
    }))
    .pipe(gulp.dest(files.js.buildDest))
  return jsFiles.restore({ end: true });
});

function myTraceur(out) {
  var path  = require('path');
  var gutil = require('gulp-util');
  var shell = require('shelljs');
  var transform = new stream.Transform({
    objectMode: true
  });
  transform._transform = function(file, encoding, done) {
    if (file.isNull()) {
      transform.push(file);
      done();
    } else {
      var outPath = file.path.replace(/^.*[\\\/]/, out);
      var cmd     = 'traceur --sourcemap --out ' + outPath + ' ' + file.path;
      var fileOut;
      shell.exec(cmd, { }, function() {
        gulp.src(outPath.replace('js', '*'))
          .on('data', function(file) {
            if (!fileOut) {
              fileOut = file;
            } else {
              fileOut.sourceMap = JSON.parse(file.contents.toString());
            }
          })
          .on('end', function() {
            transform.push(fileOut);
            done();
          });
      });
    }
  }
  return transform;
}

gulp.task('js:app', function() {
  return gulp.src('src/app/app*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(myTraceur('build/js/all.'));
});