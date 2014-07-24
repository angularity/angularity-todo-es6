var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var combined = require("combined-stream");
var runSequence = require('run-sequence');
var wiredep = require('wiredep');
var browserSync = require('browser-sync');

const TEMP         = '.build';
const JS_LIB_BOWER = 'bower_components/**/js-lib';
const JS_LIB_LOCAL = 'src/js-lib';
const JS_SRC       = 'src/js';
const JS_BUILD     = 'build/js';
const HTML_SRC     = 'src/html';
const HTML_BUILD   = 'build/html';

var traceur;

gulp.task('default', [ 'server' ]);

gulp.task('build', function() {
  traceur = plugins.traceurOut(TEMP);
  runSequence('cleanbuild', 'cleantemp', 'js:init', 'js:build', 'cleantemp', 'html:build');
});

// clean the temp directory
gulp.task('cleantemp', function() {
  return gulp.src(TEMP, { read: false })
    .pipe(plugins.rimraf());
});

// clean the build directory
gulp.task('cleanbuild', function() {
  return combined.create()
    .append(gulp.src(JS_BUILD,   { read: false }))
    .append(gulp.src(HTML_BUILD, { read: false }))
    .pipe(plugins.rimraf());
})

// run js-hint on sources and init traceur
gulp.task('js:init', function() {
  return combined.create()
    .append(gulp.src(JS_LIB_BOWER + '/**/*.js').pipe(plugins.semiflat(JS_LIB_BOWER))) // bower sources first
    .append(gulp.src(JS_LIB_LOCAL + '/**/*.js').pipe(plugins.semiflat(JS_LIB_LOCAL))) // local sources may overwrite
    .pipe(plugins.jshint())
    .pipe(traceur.jsHintReporter())
    .pipe(traceur.sources())
});

// resolve all imports for the source files to give a single optimised js file
//  in the build directory with source map for each
gulp.task('js:build', function() {
  return gulp.src(JS_SRC + '/**/*.js', { read: false })
    .pipe(traceur.transpile())
    .pipe(traceur.traceurReporter())
    .pipe(traceur.adjustSourceMaps())
    .pipe(gulp.dest(JS_BUILD));
});

// inject dependencies into html and output to build directory
gulp.task('html:build', function() {
  return gulp.src(HTML_SRC + '/**/*.html')
    .pipe(traceur.injectAppJS(HTML_SRC, JS_BUILD))
    .pipe(wiredep.stream())
    .pipe(gulp.dest(HTML_BUILD));
});

// use browsersync for serving the application, its dependencies and is sources
gulp.task('server', [ 'build' ], function(next) {
  browserSync({
    server: {
      baseDir: 'build/html',
      routes: {
        '/build': 'build',
        '/src': 'src',
        '/bower_components': 'bower_components'
      }
    },
    port: 8000,
    logLevel: 'silent',
    open: false
  });
});
