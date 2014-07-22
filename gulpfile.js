var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var through = require('through2');
var combined = require("combined-stream");
var child = require('child_process');
var runSequence = require('run-sequence');
var wiredep = require('wiredep');
var spigot = require('stream-spigot');
var path = require('path');
var browserSync = require('browser-sync');
var minimatch = require('minimatch');

function transpileES6(outputPath) {
  return through.obj(function(file, encoding, done) {
    var stream = this;
    if (file.isNull()) {
      stream.push(file);
      done();
    } else {
      var cwd      = file.cwd;
      var base     = path.resolve(outputPath);
      var outFile  = base + '/' + path.basename(file.path);
      var outPath  = base + '/' + file.relative.split('/').slice(0, -1).join('/');
      var command  = [ 'traceur', '--source-maps', '--out', outFile, file.path ].join(' ');
      child.exec(command, { cwd: cwd }, function(error, stdout, stdin) {
        if (error) {
          var pending = new plugins.util.File()
          pending.cwd          = cwd;
          pending.base         = outputPath;
          pending.path         = outFile;
          pending.traceurError = error.toString();
          stream.push(pending);
          done();
        } else {
          gulp.src(outFile.replace(/\.js$/, '.*'))
            .pipe(gulp.dest(outPath))
            .pipe(plugins.slash())
            .pipe(plugins.semiflat(base))
            .on('data', function(file) {
              stream.push(file);
            }).on('end', function() {
              done();
            });
        }
      });
    }
  });
}

function trackSources() {
  var before = [ ];
  var after  = [ ];
  function copy(file) {
    return { path: file.path, cwd: file.cwd, relative: file.relative };
  }
  return {
    before: function() {
      return through.obj(function(file, encode, done){
        before.push(copy(file));
        this.push(file);
        done();
      });
    },
    after: function() {
      return through.obj(function(file, encode, done){
        after.push(copy(file));
        this.push(file);
        done();
      });
    },
    replace: function(text) {
      var generalBase = [ ];
      for (var i = Math.min(before.length, after.length) - 1; i >= 0; i--) {
        var regexp = minimatch.makeRe(after[i].path, 'g');
        text = text.replace(regexp, before[i].path);
      }
      return text;
    }
  }
}

function jsHintReporter() {
  var output = [ ];
  var item   = '';
  var prevfile;
  return through.obj(function(file, encoding, done) {
    if (file.jshint && !file.jshint.success && !file.jshint.ignored) {
      (function reporter(results, data, opts) {
        results.forEach(function(result) {
          var filename = result.file;
          var error    = result.error;
          if ((prevfile) && (prevfile !== filename) && (item) && (output.indexOf(item) < 0)) {
            output.push(item);
            item = '';
          }
          item    += filename + ':' + error.line + ':' +  error.character + ': ' + error.reason + '\n';
          prevfile = filename;
        });
      })(file.jshint.results, file.jshint.data);
    }
    this.push(file);
    done();
  }, function(done) {
    if ((item) && (output.indexOf(item) < 0)) {
      output.push(item);
    }
    if (output.length) {
      process.stdout.write('\n' + output.join('\n') + '\n');
    }
    done();
  });
}

function traceurErrorReporter(sourceTracker) {
  var output = [ ];
  return through.obj(function(file, encoding, done) {
    var text = file.traceurError;
    if (text) {
      var REGEXP   = /[^].*Specified as (.*)\.\nImported by \.{0,2}(.*)\.\n/m;
      var analysis = REGEXP.exec(text);
      var message;
      if (analysis) {
        var specified = analysis[1];
        var filename  = analysis[2] + '.js';
        var isSource  = minimatch.makeRe(filename + '$').test(file.path);
        var absolute  = (isSource) ? file.path : path.resolve(file.base + '/' + filename)
        message = absolute + ':0:0: Import not found: ' + specified + '\n';
      } else {
        message = text.replace(/Error\:\s*Command failed\:\s*/g, '');
      }
      var normalised = plugins.slash(message);
      var unmapped   = sourceTracker.replace(normalised);
      if (output.indexOf(unmapped) < 0) {
        output.push(unmapped);
      }
    }
    if (file.contents) {
      this.push(file);
    }
    done();
  }, function(done) {
    if (output.length) {
      process.stdout.write('\n' + output.join('\n') + '\n');
    }
    done();
  });
}

function adjustSourceMaps(sourceTracker) {
  return through.obj(function(file, encoding, done) {
    function adjust(candidate) {
      var normalised   = plugins.slash(candidate);
      var unmapped     = sourceTracker.replace(normalised);
      var rootRelative = '/' + path.relative(file.cwd, unmapped);
      return plugins.slash(rootRelative);
    }
    var sourceMap = JSON.parse(file.contents.toString());
    delete sourceMap.sourcesContent;
    for (var key in sourceMap) {
      if (typeof sourceMap[key] == typeof '') {
        sourceMap[key] = adjust(sourceMap[key]);
      } else if (sourceMap[key] instanceof Array) {
        sourceMap[key].forEach(function(value, i, array) {
          array[i] = adjust(value);
        })
      }
    }
    var text = JSON.stringify(sourceMap, null, '  ');
    file.contents = new Buffer(text);
    this.push(file);
    done();
  });
}

function injectAppJS(htmlBase, jsBase) {
  return through.obj(function(file, encoding, done) {
    var stream  = this;
    var target  = file.path.replace(htmlBase, jsBase).replace(/\.html?$/, '.js');
    var sources = gulp.src(target, { read: false }).pipe(plugins.slash());
    spigot.array({ objectMode: true }, [ file ])
      .pipe(plugins.inject(sources))
      .on('data', function(file) {
        stream.push(file);
      })
      .on('end', function() {
        done();
      });
  })
}

var temp       = '.build'
var jsLibBower = 'bower_components/**/js-lib';
var jsLibSrc   = 'src/js-lib';
var jsSrc      = 'src/js';
var jsBuild    = 'build/js';
var htmlSrc    = 'src/html'
var htmlBuild  = 'build/html'

var sourceTracking;

function jsSrcLibStream() {
  return combined.create()
    .append(    // bower sources first
      gulp.src(jsLibBower + '/**/*.js')
        .pipe(plugins.slash())
        .pipe(plugins.semiflat(jsLibBower))
    )
    .append(    // local sources overwrite them
      gulp.src(jsLibSrc + '/**/*.js')
        .pipe(plugins.slash())
        .pipe(plugins.semiflat(jsLibSrc))
    );
}

gulp.task('default', [ 'server' ]);

gulp.task('build', function() {
  runSequence('js:hint', 'cleanbuild', 'cleantemp', 'js:copylibs', 'js:build', 'cleantemp', 'html:build');
});

// run js-hint on local sources
gulp.task('js:hint', function() {
  return jsSrcLibStream()
    .pipe(plugins.jshint())
    .pipe(jsHintReporter());
})

// clean the temp directory
gulp.task('cleantemp', function() {
  return gulp.src(temp)
    .pipe(plugins.clean());
});

// clean the build directory
gulp.task('cleanbuild', function() {
  return combined.create()
    .append(gulp.src(jsBuild))
    .append(gulp.src(htmlBuild))
    .pipe(plugins.clean());
})

// copy libraries from both local and bower sources into the temp directory
//  keep track of their original location
gulp.task('js:copylibs', function() {
  sourceTracking = trackSources();   // begin tracking
  return jsSrcLibStream()
    .pipe(sourceTracking.before())
    .pipe(gulp.dest(temp))
	  .pipe(plugins.slash())
    .pipe(sourceTracking.after());
});

// resolve all imports for the source files to give a single optimised js file
//  in the build directory with source map for each
gulp.task('js:build', function() {
  var selectSourceMaps = plugins.filter('**/*.map');
  return gulp.src(jsSrc + '/**/*.js')
      .pipe(plugins.slash())
      .pipe(transpileES6(temp))
      .pipe(traceurErrorReporter(sourceTracking))
      .pipe(selectSourceMaps)
      .pipe(adjustSourceMaps(sourceTracking))
      .pipe(selectSourceMaps.restore({ end: true }))
      .pipe(gulp.dest(jsBuild))
});

// inject dependencies into html and output to build directory
gulp.task('html:build', function() {
  return gulp.src(htmlSrc + '/**/*.html')
	  .pipe(plugins.slash())
    .pipe(injectAppJS(htmlSrc, jsBuild))
    .pipe(wiredep.stream())
    .pipe(gulp.dest(htmlBuild));
});

// use browsersync for serving the application, its dependencies and is sources
gulp.task('server', [ 'build' ], function(next) {
  browserSync({
    server: {
      baseDir: 'build',
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
