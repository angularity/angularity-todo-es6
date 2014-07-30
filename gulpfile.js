/* global require:false */
/* global console:false */
(function() {
  'use strict';

  var gulp        = require('gulp');
  var plugins     = require('gulp-load-plugins')();
  var combined    = require('combined-stream');
  var runSequence = require('run-sequence');
  var wiredep     = require('wiredep');
  var browserSync = require('browser-sync');

  var HTTP_PORT     = 8000;
  var CONSOLE_WIDTH = 80;

  var TEMP          = '.build';
  var BOWER         = 'bower_components';

  var JS_LIB_BOWER  = 'bower_components/**/js-lib';
  var JS_LIB_LOCAL  = 'src/js-lib';
  var JS_SRC        = 'src/target';
  var JS_BUILD      = 'build';

  var CSS_LIB_BOWER = 'bower_components/**/css-lib';
  var CSS_LIB_LOCAL = 'src/css-lib';
  var CSS_SRC       = 'src/target';
  var CSS_BUILD     = 'build';

  var HTML_SRC      = 'src/target';
  var HTML_BUILD    = 'build';

  var traceur;
  var sass;

  function jsLibStream(opts) {
    return combined.create()
      .append(gulp.src(JS_LIB_BOWER + '/**/*.js', opts).pipe(plugins.semiflat(JS_LIB_BOWER)))  // bower lib first
      .append(gulp.src(JS_LIB_LOCAL + '/**/*.js', opts).pipe(plugins.semiflat(JS_LIB_LOCAL))); // lib may overwrite
  }

  function jsSrcStream(opts) {
    return combined.create()
      .append(gulp.src(JS_SRC + '/**/*.js', opts).pipe(plugins.semiflat(JS_SRC)));  // application js
  }

  function cssLibStream(opts) {
    return combined.create()
      .append(gulp.src(CSS_LIB_BOWER + '/**/*.scss', opts).pipe(plugins.semiflat(CSS_LIB_BOWER)))  // bower lib first
      .append(gulp.src(CSS_LIB_LOCAL + '/**/*.scss', opts).pipe(plugins.semiflat(CSS_LIB_LOCAL))); // lib may overwrite
  }

  function cssSrcStream(opts) {
    return combined.create()
      .append(gulp.src(CSS_SRC + '/**/*.scss', opts).pipe(plugins.semiflat(CSS_SRC)));  // application css
  }

  function routes() {
  	var result = { };
  	[ JS_LIB_LOCAL, CSS_LIB_LOCAL, BOWER, JS_BUILD, CSS_BUILD ].forEach(function(path) {
   		result['/' + path] = path;
  	});
	  return result;
  }

  // DEFAULT ---------------------------------
  gulp.task('default', [ 'watch' ]);

  gulp.task('build', function(done) {
    console.log(hr('-', CONSOLE_WIDTH, 'build'));
    runSequence('js', 'css', 'html', done);
  });

  function hr(char, length, title) {
    var text = (title) ? (' ' + title.split('').join(' ').toUpperCase() + ' ') : '';  // double spaced title text
    while (text.length < length) {
      text = char + text + char;  // centre title between the given character
    }
    return text.slice(0, length); // enforce length, left justified
  }

  // SERVER ---------------------------------
  gulp.task('server', [ 'build' ], function() {
    console.log(hr('-', CONSOLE_WIDTH, 'server'));
    browserSync({
      server: {
        baseDir: HTML_BUILD,
        routes: routes()
      },
      port: HTTP_PORT,
      logLevel: 'silent',
      open: false
    });
  });

  gulp.task('reload', function() {
    console.log(hr('-', CONSOLE_WIDTH, 'reload'));
    browserSync.reload();
  });

  // JS ---------------------------------
  gulp.task('js', function(done) {
    console.log(hr('-', CONSOLE_WIDTH, 'javascript'));
    traceur = plugins.traceurOut(TEMP);
    runSequence(
      [ 'js:clean', 'tmp:clean' ],
      'js:init',
      'js:build',
      'tmp:clean',
      done
    );
  });

  // clean the temp directory
  gulp.task('tmp:clean', function() {
    return gulp.src(TEMP, { read: false })
      .pipe(plugins.rimraf());
  });

  // clean the js build directory
  gulp.task('js:clean', function() {
    return gulp.src(JS_BUILD + '/**/*.js*', { read: false })
      .pipe(plugins.rimraf());
  });

  // init traceur libs and run linter
  gulp.task('js:init', function() {
    return combined.create()
      .append(jsLibStream().pipe(traceur.libraries()))
      .append(jsSrcStream().pipe(traceur.sources()))
      .pipe(plugins.jshint())
      .pipe(traceur.jsHintReporter(CONSOLE_WIDTH));
  });

  // resolve all imports for the source files to give a single optimised js file
  //  in the build directory with source map for each
  gulp.task('js:build', function() {
    return jsSrcStream({ read: false })
      .pipe(traceur.transpile())
      .pipe(traceur.traceurReporter(CONSOLE_WIDTH))
      .pipe(traceur.adjustSourceMaps())
      .pipe(gulp.dest(JS_BUILD));
  });

  // CSS ---------------------------------
  gulp.task('css', function(done) {
    console.log(hr('-', CONSOLE_WIDTH, 'css'));
    runSequence(
      [ 'css:clean', 'css:init' ],
      'css:build',
      done
    );
  });

  // clean the css build directory
  gulp.task('css:clean', function() {
    return gulp.src(CSS_BUILD + '/**/*.css*', { read: false })
      .pipe(plugins.rimraf());
  });

  // discover css libs
  gulp.task('css:init', function() {
    sass = plugins.sassAlt();
    return cssLibStream({ read: false })
      .pipe(sass.libraries());
  });

  // compile sass with the previously discovered lib paths
  gulp.task('css:build', function () {
    return cssSrcStream({ read: false })
      .pipe(sass.transpile())
      .pipe(sass.sassReporter(CONSOLE_WIDTH))
      .pipe(gulp.dest(CSS_BUILD));
  });

  // HTML ---------------------------------
  gulp.task('html', function(done) {
    console.log(hr('-', CONSOLE_WIDTH, 'html'));
    runSequence(
      'html:clean',
      'html:build',
      done
    );
  });

  // clean the html build directory
  gulp.task('html:clean', function() {
    return gulp.src(HTML_BUILD + '/**/*.html', { read: false })
      .pipe(plugins.rimraf());
  });

  // inject dependencies into html and output to build directory
  gulp.task('html:build', function() {
    return gulp.src(HTML_SRC + '/**/*.html').pipe(plugins.semiflat(HTML_SRC))
      .pipe(plugins.plumber())
      .pipe(traceur.injectAppJS(JS_BUILD))
      .pipe(sass.injectAppCSS(CSS_BUILD))
      .pipe(wiredep.stream())
      .pipe(gulp.dest(HTML_BUILD));
  });

  // WATCH ---------------------------------
  gulp.task('watch', [ 'server' ], function() {

    // enqueue actions to avoid multiple trigger
    var queue = plugins.watchSequence(500, function() {
      console.log(hr('\u2591', CONSOLE_WIDTH));
    });

    // watch statements
    plugins.watch({
      name: 'JS',
      emitOnGlob: false,
      glob: [
        JS_LIB_BOWER + '/**/*.js',
        JS_LIB_LOCAL + '/**/*.js',
        JS_SRC       + '/**/*.js'
      ]
    }, queue.getHandler('js', 'html', 'reload')); // html will be needed in case previous injection failed

    plugins.watch({
      name: 'CSS',
      emitOnGlob: false,
      glob: [
        CSS_LIB_BOWER + '/**/*.scss',
        CSS_LIB_LOCAL + '/**/*.scss',
        CSS_SRC       + '/**/*.scss'
      ]
    }, queue.getHandler('css', 'html', 'reload')); // html will be needed in case previous injection failed

    plugins.watch({
      name: 'HTML | BOWER',
      emitOnGlob: false,
      glob: [
        BOWER    + '/**/*',
        HTML_SRC + '/**/*.html'
      ]
    }, queue.getHandler('html', 'reload'));
  });

}());
