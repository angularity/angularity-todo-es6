var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var through = require('through2');
var combined = require("combined-stream");
var minimatch = require("minimatch");
var child = require('child_process');
var runSequence = require('run-sequence');

function modularise(outputPattern, errorFunc) {
  errorFunc = errorFunc || function(value) { return value };
  return through.obj(function(file, encoding, done) {
    var stream = this;
    if (file.isNull()) {
      stream.push(file);
      done();
    } else {
      var filename = file.path.split(/[\\\/]/).pop();
      var outPath  = outputPattern.replace('{filename}', filename);
      child.execFile('traceur', [ '--sourcemap', '--out', outPath, file.path ], function(error, stdout, stdin) {
        if (error) {
          var content = error.toString().replace('Error: Command failed: ', '')
          console.log('------------------\n' + errorFunc(content));
          done();
        } else {
          gulp.src(outPath.replace('js', '*'))
            .on('data', function(file) {
              stream.push(file);
            })
            .on('end', function() {
              done();
            });
        }
      });
    }
  });
}

function rebaseTo() {
  var sources = [ ];
  for (var i = 0; i < arguments.length; i++) {
    sources.push(minimatch.makeRe(arguments[i]).source.replace('$', ''));
  }
  var pattern = new RegExp(sources.join('|'));
  return through.obj(function(file, encoding, done) {
    var relative = file.path.replace(file.cwd + '/', '');
    var base     = file.cwd + '/' + pattern.exec(relative)[0];
    file.base = base;
    this.push(file);
    done();
  });
}

function locateMapSources() {
  return {
    before: function() {
      return through.obj(function(file, encode, done){
        this.push(file); done();
      });
    },
    after: function() {
      return through.obj(function(file, encode, done){
        this.push(file); done();
      });
    },
    replace: function(value) {
      return value;
    },
    process: function() {
      return through.obj(function(file, encode, done){
        this.push(file); done();
      });
    }
  }
}

var temp       = '.build'
var jsLibBower = 'bower_components/*/js-lib';
var jsLibSrc   = 'src/js-lib';
var jsSrc      = 'src/js';
var jsBuild    = 'build/js';

var sourceMapFix;

gulp.task('default', function() {
  runSequence('js:cleantemp', 'js:copylibs', 'js:transpile', 'js:cleantemp');
});

// clean the temp directory
gulp.task('js:cleantemp', function() {
  return gulp.src(temp)
    .pipe(plugins.clean());
})

// copy libraries from both local and bower sources into the temp directory
//  keep track of their original location
gulp.task('js:copylibs', function() {
  sourceMapFix = locateMapSources();
  return combined.create()
    .append(gulp.src(jsLibBower + '/**/*.js'))
    .append(gulp.src(jsLibSrc   + '/**/*.js'))
    .pipe(sourceMapFix.before())
    .pipe(rebaseTo(jsLibBower, jsLibSrc))
    .pipe(gulp.dest(temp))
    .pipe(sourceMapFix.after());
});

// resolve all imports for the source files to give a single optimised js file
//  and source map for each
gulp.task('js:transpile', function() {
  var selectSourceMaps = plugins.filter('**/*.map');
  sourceMapFix = sourceMapFix || locateMapSources();
  gulp.src(jsSrc + '/**/*.js')
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(plugins.jshint.reporter('default'))
    .pipe(modularise(temp + '/all.{filename}', sourceMapFix.replace.bind(sourceMapFix)))
    .pipe(gulp.dest(jsBuild))
    .pipe(selectSourceMaps)
    .pipe(sourceMapFix.process());

  // returned stream needs an end which the filter removed
  return selectSourceMaps.restore({ end: true });
});
