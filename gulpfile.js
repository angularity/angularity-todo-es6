var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var through = require('through2');
var combined = require("combined-stream");
var child = require('child_process');
var runSequence = require('run-sequence');
var wiredep = require('wiredep');
var path = require('path');
var browserSync = require('browser-sync');
var minimatch = require('minimatch');
var Readable = require('stream').Readable;

function streamSegment(method, inputs) {
  var readable = new Readable({ objectMode: true });
  var stream   = through.obj(function(file, encoding, done) {
    readable.push(file);
    done();
  });
  readable._read = function() {};
  (method && method(readable) || readable)
    .on('data', function(file) {
      stream.push(file);
    })
    .on('end', function() {
      stream.push(null);
    });
  return stream;
}

function gulpTraceurOut(temp) {
  var sourceTracking = trackSources();
  var outputPath     = temp;
  return {
    sources: function() {
      return streamSegment(function(readable) {
        return readable
          .pipe(plugins.slash())
          .pipe(sourceTracking.before())
          .pipe(gulp.dest(temp))
          .pipe(plugins.slash())
          .pipe(sourceTracking.after());
      });
    },
    transpile: function() {
      return transpileES6(outputPath);
    },
    jsHintReporter: jsHintReporter,
    traceurReporter: function() {
      return traceurErrorReporter(sourceTracking);
    },
    adjustSourceMaps: function() {
      return adjustSourceMaps(sourceTracking);
    },
    injectAppJS: injectAppJS
  }
}

function transpileES6(outputPath) {
  return through.obj(function(file, encoding, done) {
    var stream   = this;
    var cwd      = plugins.slash(file.cwd);
    var relative = plugins.slash(file.relative);
    var base     = plugins.slash(path.resolve(outputPath));
    var filename = plugins.slash(path.basename(file.path));
    var outFile  = base + '/' + filename;
    var outPath  = base + '/' + relative.replace(filename, '');
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
  });
}

function trackSources() {
  var before = [ ];
  var after  = [ ];
  return {
    before: function() {
      return through.obj(function(file, encode, done){
        before.push(file.path);
        this.push(file);
        done();
      });
    },
    after: function() {
      return through.obj(function(file, encode, done){
        after.push(file.path);
        this.push(file);
        done();
      });
    },
    replace: function(text) {
      var generalBase = [ ];
      for (var i = Math.min(before.length, after.length) - 1; i >= 0; i--) {
        var regexp = minimatch.makeRe(after[i], 'g');
        text = text.replace(regexp, before[i]);
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
    var errorText = file.traceurError;
    if (errorText) {
      var REGEXP   = /[^].*Specified as (.*)\.\nImported by \.{0,2}(.*)\.\n/m;
      var analysis = REGEXP.exec(errorText);
      var message;
      if (analysis) {
        var specified = analysis[1];
        var filename  = analysis[2] + '.js';
        var isSource  = minimatch.makeRe(filename + '$').test(file.path);
        var absolute  = (isSource) ? file.path : path.resolve(file.base + '/' + filename)
        message = absolute + ':0:0: Import not found: ' + specified + '\n';
      } else {
        message = errorText.replace(/Error\:\s*Command failed\:\s*/g, '');
      }
      var normalised = plugins.slash(message);
      var unmapped   = sourceTracker.replace(normalised);
      if (output.indexOf(unmapped) < 0) {
        output.push(unmapped);
      }
    } else {
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
    if (path.extname(file.path) === '.map') {
      function adjust(candidate) {
        var normalised = plugins.slash(candidate);
        var unmapped = sourceTracker.replace(normalised);
        var rootRelative = '/' + path.relative(file.cwd, unmapped);
        return plugins.slash(rootRelative);
      }
      var sourceMap = JSON.parse(file.contents.toString());
      delete sourceMap.sourcesContent;
      for (var key in sourceMap) {
        if (typeof sourceMap[key] == typeof '') {
          sourceMap[key] = adjust(sourceMap[key]);
        } else if (sourceMap[key] instanceof Array) {
          sourceMap[key].forEach(function (value, i, array) {
            array[i] = adjust(value);
          })
        }
      }
      var text = JSON.stringify(sourceMap, null, '  ');
      file.contents = new Buffer(text);
    }
    this.push(file);
    done();
  });
}

function injectAppJS(htmlBase, jsBase) {
  return through.obj(function(file, encoding, done) {
    var stream    = this;
    var jsFile    = plugins.slash(file.path).replace(htmlBase, jsBase).replace(/\.html?$/, '.js');
    var jsSources = gulp.src(jsFile, { read: false }).pipe(plugins.slash());
    streamSegment(function(readable) {
      return readable
        .pipe(plugins.inject(jsSources));
    })
    .on('data', function(file) {
      stream.push(file);
      done();
    })
    .unshift(file, null);
  })
}

var temp       = '.build'
var jsLibBower = 'bower_components/**/js-lib';
var jsLibSrc   = 'src/js-lib';
var jsSrc      = 'src/js';
var jsBuild    = 'build/js';
var htmlSrc    = 'src/html'
var htmlBuild  = 'build/html'

var traceur;

gulp.task('default', [ 'server' ]);

gulp.task('build', function() {
  traceur = gulpTraceurOut(temp);
  runSequence('cleanbuild', 'cleantemp', 'js:init', 'js:build', 'cleantemp', 'html:build');
});

// clean the temp directory
gulp.task('cleantemp', function() {
  return gulp.src(temp, { read: false })
    .pipe(plugins.rimraf());
});

// clean the build directory
gulp.task('cleanbuild', function() {
  return combined.create()
    .append(gulp.src(jsBuild,   { read: false }))
    .append(gulp.src(htmlBuild, { read: false }))
    .pipe(plugins.rimraf());
})

// run js-hint on sources and init traceur
gulp.task('js:init', function() {
  return combined.create()
    .append(gulp.src(jsLibBower + '/**/*.js').pipe(plugins.semiflat(jsLibBower))) // bower sources first
    .append(gulp.src(jsLibSrc   + '/**/*.js').pipe(plugins.semiflat(jsLibSrc)))   // local sources may overwrite
    .pipe(plugins.jshint())
    .pipe(traceur.jsHintReporter())
    .pipe(traceur.sources())
});

// resolve all imports for the source files to give a single optimised js file
//  in the build directory with source map for each
gulp.task('js:build', function() {
  return gulp.src(jsSrc + '/**/*.js', { read: false })
    .pipe(traceur.transpile())
    .pipe(traceur.traceurReporter())
    .pipe(traceur.adjustSourceMaps())
    .pipe(gulp.dest(jsBuild));
});

// inject dependencies into html and output to build directory
gulp.task('html:build', function() {
  return gulp.src(htmlSrc + '/**/*.html')
    .pipe(traceur.injectAppJS(htmlSrc, jsBuild))
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
