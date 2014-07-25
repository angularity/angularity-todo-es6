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

  function hr(char, length, title) {
    var text = (title) ? (' ' + title.split('').join(' ').toUpperCase() + ' ') : '';
    while (text.length < length) {
      text = (char + text + char).slice(0, length);
    }
    return text;
  }

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

  function jsLibStream() {
    return combined.create()
      .append(gulp.src(JS_LIB_BOWER + '/**/*.js').pipe(plugins.semiflat(JS_LIB_BOWER)))  // bower lib first
      .append(gulp.src(JS_LIB_LOCAL + '/**/*.js').pipe(plugins.semiflat(JS_LIB_LOCAL))); // local lib may overwrite
  }

  function jsSrcStream() {
    return combined.create()
      .append(gulp.src(JS_SRC + '/**/*.js').pipe(plugins.semiflat(JS_SRC)));  // application js
  }
  
  function routes() {
  	var result = { };
	[ JS_LIB_LOCAL, BOWER, JS_BUILD ].forEach(function(path) {
	  var key = '/' + path;
	  if (!(key in routes)) {
		result[key] = path;
	  }
	});
	console.log(result);
	return result;
  }

  gulp.task('default', [ 'watch' ]);

  gulp.task('focus:start', function() {
    console.log(hr('\u25BC', 120));
  });

  gulp.task('focus:stop', function() {
    console.log(hr('\u25B2', 120));
  });

  gulp.task('build', function(done) {
    runSequence('js', 'html', done);
  });

  gulp.task('js', function(done) {
    console.log(hr('-', 120, 'javascript'));
    traceur = plugins.traceurOut(TEMP);
    runSequence(
      [ 'js:clean', 'tmp:clean' ],
      'focus:start',
      'js:init',
      'js:build',
      'focus:stop',
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
    return gulp.src(JS_BUILD + '/**/*.js', { read: false })
      .pipe(plugins.rimraf());
  });

  // init traceur libs and run linter
  gulp.task('js:init', function() {
    return combined.create()
      .append(jsLibStream().pipe(traceur.libraries()))
      .append(jsSrcStream().pipe(traceur.sources()))
      .pipe(plugins.jshint())
      .pipe(traceur.jsHintReporter());
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

  gulp.task('html', function(done) {
    console.log(hr('-', 120, 'html'));
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
      .pipe(traceur.injectAppJSCSS(JS_BUILD, CSS_BUILD))
      .pipe(wiredep.stream())
      .pipe(gulp.dest(HTML_BUILD));
  });

  // use browsersync for serving the application, its dependencies and is sources
  gulp.task('server', [ 'build' ], function() {
    browserSync({
      server: {
        baseDir: HTML_BUILD,
        routes: routes()
      },
      port: 8000,
      logLevel: 'silent',
      open: false
    });
  });

  // basic watch implementation
  gulp.task('watch', [ 'server' ], function() {

    // rebuild
    plugins.watch({
      emitOnGlob: false,
      glob: [
        JS_LIB_BOWER + '/**/*.js',
        JS_LIB_LOCAL + '/**/*.js',
        JS_SRC       + '/**/*.js',
        HTML_SRC     + '/**/*.html'
      ]
    }, [ 'build' ]);

    // rewire dependencies
    plugins.watch({
      emitOnGlob: false,
      glob: [
        BOWER + '/**/*'
      ]
    }, [ 'html' ]);

    // reload
    plugins.watch({
      glob: HTML_BUILD + '/**/*.html'
    }, function() {
      browserSync.reload();
      console.log(hr('-', 120, 'reload'));
    });
  });

}());
