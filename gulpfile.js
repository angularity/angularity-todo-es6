/* global require:false */
/* global console:false */
/* global setTimeout:false */
/* global clearTimeout:false */
/* global Buffer:false */
(function() {
  'use strict';

  var gulp        = require('gulp');
  var plugins     = require('gulp-load-plugins')();
  var combined    = require('combined-stream');
  var runSequence = require('run-sequence');
  var wiredep     = require('wiredep');
  var browserSync = require('browser-sync');
  var path        = require('path');
  var sass        = require('node-sass');
  var through     = require('through2');

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

  // UTILITY ---------------------------------
  function hr(char, length, title) {
    var text = (title) ? (' ' + title.split('').join(' ').toUpperCase() + ' ') : '';
    while (text.length < length) {
      text = (char + text + char).slice(0, length);
    }
    return text;
  }

  function mergeSequences() {
    var lists = Array.prototype.slice.call(arguments).map(function(candidate) {
      return (candidate instanceof Array) ? candidate.concat() : [ ];
    });
    var methods = [ ];
    var results = [ function() {
      methods.forEach(function(method) {
        method.call();
      });
    }];
    function eachList(list) {
      if (list.length) {
        var item   = list.pop();
        var target = (typeof item === 'function') ? methods : (item) ? results : null;
        if ((target) && (target.indexOf(item) < 0)) {
          target.unshift(item);
        }
        return true;
      } else {
        return false;
      }
    }
    while (lists.length) {
      lists = lists.filter(eachList);
    }
    return results;
  }

  // DEFAULT ---------------------------------
  gulp.task('default', [ 'watch' ]);

  gulp.task('build', function(done) {
    console.log(hr('-', CONSOLE_WIDTH, 'build'));
    runSequence('js', 'css', 'html', done);
  });

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
    traceur = plugins.traceurOut(TEMP, CONSOLE_WIDTH);
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

  // CSS ---------------------------------
  gulp.task('css', function(done) {
    console.log(hr('-', CONSOLE_WIDTH, 'css'));
    runSequence(
      [ 'css:clean', 'css:init' ],
      'css:build',
      done
    );
  });

  var cssLibs;

  // clean the css build directory
  gulp.task('css:clean', function() {
    return gulp.src(CSS_BUILD + '/**/*.css*', { read: false })
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
    return cssSrcStream()
      .pipe(plugins.plumber())
      .pipe(through.obj(function(file, encoding, done) {
        var mapPath = path.basename(file.path).replace(/\.scss$/, '.css.map');
        var stream  = this;
        var stats   = { };
        function pushResult(contents, ext) {
          var pending      = new plugins.util.File();
          pending.cwd      = file.cwd;
          pending.base     = file.base;
          pending.path     = file.path.replace(path.extname(file.path), ext);
          pending.contents = new Buffer(contents);
          stream.push(pending);
        }
        sass.render({
          file: file.path,
          success: function(css, map) {
            var sourceMap = JSON.parse(map);
            delete sourceMap.file;
            delete sourceMap.sourcesContent;
            sourceMap.sources.forEach(function(source, i, array) {
              array[i] = plugins.slash(path.resolve('/' + source)); // ensure root relative
            });
            pushResult(css, '.css');
            pushResult(JSON.stringify(sourceMap, null, '  '), '.css.map');
            done();
          },
          error: function(error) {
            var analysis = (/(.*)\:(\d+)\:\s*error:\s*(.*)/).exec(error);
            if (analysis) {
              var filename = (analysis[1] === 'source string') ? file.path : path.resolve(analysis[1] + '.scss');
              var message  = filename + ':' + analysis[2] + ':0: ' + analysis[3];
              console.log('\n' + message + '\n');
            } else {
              console.log('\n!!! TODO parse this error: ' + error + '\n');
            }
          },
          includePaths: cssLibs,
          outputStyle: 'compressed',
          stats: stats,
          sourceMap: mapPath
        });
      }))
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
      .pipe(traceur.injectAppJSCSS(JS_BUILD, CSS_BUILD))
      .pipe(wiredep.stream())
      .pipe(gulp.dest(HTML_BUILD));
  });

  // WATCH ---------------------------------
  gulp.task('watch', [ 'server' ], function() {

    // enqueue actions to avoid multiple trigger
    var timeout;
    var queue;
    function enqueue() {
      queue = mergeSequences(queue, Array.prototype.slice.call(arguments));
      clearTimeout(timeout);
      timeout = (queue.length < 2) ? 0 : setTimeout(function() {
        console.log(hr('\u2591', CONSOLE_WIDTH));
        runSequence.apply(null, queue);
        queue = null;
      }, 500); // this needs to be at least 250ms
    }

    // watch statements
    plugins.watch({
      name: 'JS LIB',
      emitOnGlob: false,
      glob: [
        JS_LIB_BOWER + '/**/*.js',
        JS_LIB_LOCAL + '/**/*.js'
      ]
    }, function(files, done) {
      enqueue('js', 'html', 'reload', done); // html will be needed in case previous injection failed
    });

    plugins.watch({
      name: 'CSS LIB',
      emitOnGlob: false,
      glob: [
        CSS_LIB_BOWER + '/**/*.scss',
        CSS_LIB_LOCAL + '/**/*.scss'
      ]
    }, function(files, done) {
      enqueue('css', 'html', 'reload', done); // html will be needed in case previous injection failed
    });

    plugins.watch({
      name: 'JS',
      emitOnGlob: false,
      glob: [
        JS_SRC + '/**/*.js'
      ]
    }, function(files, done) {
      enqueue('js', 'html', 'reload', done);
    });

    plugins.watch({
      name: 'CSS',
      emitOnGlob: false,
      glob: [
        CSS_SRC + '/**/*.scss'
      ]
    }, function(files, done) {
      enqueue('css', 'html', 'reload', done);
    });

    plugins.watch({
      name: 'HTML | BOWER',
      emitOnGlob: false,
      glob: [
        BOWER + '/**/*',
        HTML_SRC + '/**/*.html'
      ]
    }, function(files, done) {
      enqueue('html', 'reload', done);
    });
  });

}());
