/* global require:false */
/* global console:false */
/* global setTimeout:false */
(function() {
  'use strict';

  var gulp        = require('gulp');
  var plugins     = require('gulp-load-plugins')();
  var combined    = require('combined-stream');
  var runSequence = require('run-sequence');
  var wiredep     = require('wiredep');
  var browserSync = require('browser-sync');
  var path        = require('path');

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

  function cssLibStream() {
    return combined.create()
      .append(gulp.src(CSS_LIB_BOWER + '/**/*.scss').pipe(plugins.semiflat(CSS_LIB_BOWER)))  // bower lib first
      .append(gulp.src(CSS_LIB_LOCAL + '/**/*.scss').pipe(plugins.semiflat(CSS_LIB_LOCAL))); // local lib may overwrite
  }

  function cssSrcStream() {
    return combined.create()
      .append(gulp.src(CSS_SRC + '/**/*.scss').pipe(plugins.semiflat(CSS_SRC)));  // application css
  }

  function routes() {
  	var result = { };
  	[ JS_LIB_LOCAL, CSS_LIB_LOCAL, BOWER, JS_BUILD, CSS_BUILD ].forEach(function(path) {
   		result['/' + path] = path;
  	});
	  return result;
  }

  function hr(char, length, title) {
    var text = (title) ? (' ' + title.split('').join(' ').toUpperCase() + ' ') : '';
    while (text.length < length) {
      text = (char + text + char).slice(0, length);
    }
    return text;
  }

  // DEFAULT ---------------------------------
  gulp.task('default', [ 'watch' ]);

  gulp.task('build', function(done) {
    runSequence('js', 'css', 'html', done);
  });

  // JS ---------------------------------
  gulp.task('js', function(done) {
    console.log(hr('-', 80, 'javascript'));
    traceur = plugins.traceurOut(TEMP, 80);
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

  // HTML ---------------------------------
  gulp.task('html', function(done) {
    console.log(hr('-', 80, 'html'));
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

  // CSS ---------------------------------
  gulp.task('css', function(done) {
    console.log(hr('-', 80, 'css'));
    runSequence(
      'css:clean',
      'css:init',
      'css:build',
      done
    );
  });

  var cssLibs;

  // clean the css build directory
  gulp.task('css:clean', function() {
    return gulp.src(CSS_BUILD + '/**/*.css', { read: false })
      .pipe(plugins.rimraf());
  });

  // discover css libs
  gulp.task('css:init', function() {
    cssLibs = [ ];
    return cssLibStream()
      .on('data', function(file) {
        if (cssLibs.indexOf(file.base) < 0) {
          cssLibs.push(file.base);
        }
      });
  });

  // compile sass with the previously discovered lib paths
  gulp.task('css:build', function () {
    var current;
    function sassReporter(error) {
      var analysis = (/(.*)\:(\d+)\:\s*error:\s*(.*)/).exec(error);
      if (analysis) {
        var filename = (analysis[1] === 'source string') ? current.path : path.resolve(analysis[1] + '.scss');
        var message  = filename + ':' + analysis[2] + ':0: ' + analysis[3];
        console.log('\n' + message + '\n');
      } else {
        console.log('\n!!! TODO parse this error: ' + error + '\n');
      }
    }
    return gulp.src(CSS_SRC + '/**/*.scss').pipe(plugins.semiflat(CSS_SRC))
      .on('data', function(file) {
        current = file;
      })
      .pipe(plugins.plumber())
      .pipe(plugins.sass({
        includePaths: cssLibs,
//        sourceComments: 'map',
        onError: sassReporter
      }))
      .pipe(gulp.dest(CSS_BUILD));
  });

  // WATCH ---------------------------------
  // basic watch implementation
  gulp.task('watch', [ 'server' ], function() {

    // rebuild
    plugins.watch({
      name: 'JAVASCRIPT',
      emitOnGlob: false,
      glob: [
        JS_LIB_BOWER + '/**/*.js',
        JS_LIB_LOCAL + '/**/*.js',
        JS_SRC       + '/**/*.js'
      ]
    }, [ 'js' ]);
    plugins.watch({
      name: 'CSS',
      emitOnGlob: false,
      glob: [
        CSS_LIB_BOWER + '/**/*.scss',
        CSS_LIB_LOCAL + '/**/*.scss',
        CSS_SRC       + '/**/*.scss'
      ]
    }, [ 'css' ]);

    // rewire dependencies
    plugins.watch({
      name: 'HTML',
      emitOnGlob: false,
      glob: [
        HTML_SRC  + '/**/*.html',
        BOWER     + '/*',
        JS_BUILD  + '/**/*.js',
        CSS_BUILD + '/**/*.css'
      ]
    }, [ 'html' ]);

    // reload
    plugins.watch({
      name: 'RELOAD',
      emitOnGlob: true,
      glob: [
          HTML_BUILD + '/**/*.html'
      ]
    }, function() {
      browserSync.reload();
      console.log(hr('-', 80, 'reload'));
    });
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

}());
