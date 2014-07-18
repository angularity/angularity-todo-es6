var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var through = require('through2');
var combined = require("combined-stream");
var minimatch = require("minimatch");
var child = require('child_process');
var runSequence = require('run-sequence');
var wiredep = require('wiredep');
var connect = require('connect');
var spigot = require('stream-spigot');
var fs = require('fs');

function getPathRegExp(source, flags) {
  var adjusted = source.replace(/([:.\\])/g, '\\$1');
  return new RegExp(adjusted, flags);
}

function modularise(outputPattern, errorFunc) {
  var output = [ ];
  return through.obj(function(file, encoding, done) {
    var stream = this;
    if (file.isNull()) {
      stream.push(file);
      done();
    } else {
      var filename = file.path.split(/\//).pop();
      var outPath  = outputPattern.replace('{filename}', filename);
	  var command  = [ 'traceur', '--source-maps', '--out', outPath, file.path ].join(' ');
      child.exec(command, { cwd: file.cwd }, function(error, stdout, stdin) {
        if (error) {
          var text     = error.toString();
          var analysis = /[^].*Specified as (.*)\.\nImported by \.{0,2}(.*)\.\n/m.exec(text);
          var message;
          if (analysis) {
            var specified = analysis[1];
            var filename  = analysis[2];
            message = filename + ': Import not found: ' + specified + '\n';
          } else {
            message = text.replace(/Error\:\s*Command failed\:\s*/g, '');
          }
          message = normalisePaths(message.replace(getPathRegExp(file.cwd, 'g'), ''));
          output.push(message);
          done();
        } else {
          gulp.src(outPath.replace('js', '*'))
		    .pipe(normalisePaths())
            .on('data', function(file) {
              stream.push(file);
            }).on('end', function() {
              done();
            });
        }
      });
    }
  }, function(done) {
    if (output.length) {
      var text = '\n' + output.join('\n').replace(/Error\:\s*Command failed\:\s*/g, '') + '\n';
      errorFunc(text);
    }
    done();
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
        var rootRelativeBefore = before[i].path.replace(before[i].cwd, '');
        generalBase.push(after[i].cwd, after[i].path.replace(after[i].relative, ''));
        text = text.replace(getPathRegExp(after[i].path, 'g'), rootRelativeBefore);
      }
      text = text .replace(getPathRegExp(generalBase.join('|'), 'g'), '');
      return text;
    }
  }
}

function terseReporter() {
  var output = '';
  var prevfile;
  return through.obj(function(file, encoding, done) {
    if (file.jshint && !file.jshint.success && !file.jshint.ignored) {
      (function reporter(results, data, opts) {
        results.forEach(function(result) {
          var filename = result.file.replace(getPathRegExp(file.cwd, 'g'), '');
          var error    = result.error;
          if (prevfile && prevfile !== filename) {
            output += "\n";
          }
          output  += filename + ': line ' + error.line + ', col ' +  error.character + ', ' + error.reason + '\n';
          prevfile = filename;
        });
      })(file.jshint.results, file.jshint.data);
    }
    this.push(file);
    done();
  }, function(done) {
    if (output) {
      process.stdout.write('\n' + output + '\n');
    }
    done();
  });
}

function adjustSourceMaps(replacer) {
  return through.obj(function(file, encoding, done) {
    var contents  = normalisePaths(file.contents.toString());
    var sourceMap = JSON.parse(replacer(contents));
    delete sourceMap.sourcesContent;
    var text = JSON.stringify(sourceMap, null, '  ');
    file.contents = new Buffer(text);
    this.push(file);
    done();
  });
}

function injectAppJS(htmlBase, jsBase) {
  return through.obj(function(file, encoding, done) {
    var stream   = this;
    var analysis = /^(.*)\/(.*)\.html$/.exec(file.path);
    var path     = analysis[1];
    var name     = analysis[2];
    var target   = path.replace(htmlBase, jsBase) + '/all.' + name + '.js';
    spigot.array({ objectMode: true }, [ file ])
      .pipe(plugins.inject(
	    gulp.src(target, { read: false })
		  .pipe(normalisePaths())
	  ))
      .on('data', function(file) {
        stream.push(file);
      })
      .on('end', function() {
        done();
      });
  })
}

function normalisePaths(text) {
  if (arguments.length > 0) {
	return text.replace(/\\/g, '/');
  } else {
    return through.obj(function(file, encoding, done) {
      [ 'path', 'cwd', 'base' ].forEach(function(field) {
	    if ((field in file) && !!(file[field])) {
	      file[field] = normalisePaths(file[field]);
	    }
	  });
	  this.push(file);
	  done();
    });
  }
}

var temp       = '.build'
var jsLibBower = 'bower_components/**/js-lib';
var jsLibSrc   = 'src/js-lib';
var jsSrc      = 'src/js';
var jsBuild    = 'build/js';
var htmlSrc    = 'src'
var htmlBuild  = 'build'

var sourceTracking;

gulp.task('default', [ 'server' ]);

gulp.task('build', function() {
  runSequence('js:hint', 'cleanbuild', 'cleantemp', 'js:copylibs', 'js:build', 'html:build');
});

// run js-hint on local sources
gulp.task('js:hint', function() {
  return combined.create()
    .append(gulp.src(jsLibSrc + '/**/*.js'))
    .append(gulp.src(jsSrc    + '/**/*.js'))
	.pipe(normalisePaths())
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(terseReporter());
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
  sourceTracking = trackSources();              // begin tracking
  return combined.create()
    .append(gulp.src(jsLibBower + '/**/*.js'))  // bower sources first
    .append(gulp.src(jsLibSrc   + '/**/*.js'))  // local sources overwrite them
	.pipe(normalisePaths())
    .pipe(sourceTracking.before())
    .pipe(rebaseTo(jsLibBower, jsLibSrc))
    .pipe(gulp.dest(temp))
	.pipe(normalisePaths())
    .pipe(sourceTracking.after());
});

// resolve all imports for the source files to give a single optimised js file
//  in the build directory with source map for each
gulp.task('js:build', function() {
  var selectSourceMaps = plugins.filter('**/*.map');
  return gulp.src(jsSrc + '/**/*.js')
	.pipe(normalisePaths())
    .pipe(modularise(temp + '/all.{filename}', function(errorText) {
      process.stdout.write(sourceTracking.replace(errorText) + '\n');
    }))
    .pipe(selectSourceMaps)
    .pipe(adjustSourceMaps(sourceTracking.replace))
    .pipe(selectSourceMaps.restore({ end: true }))
    .pipe(gulp.dest(jsBuild));
});

// inject dependencies into html and output to build directory
gulp.task('html:build', function() {
  return gulp.src(htmlSrc + '/**/*.html')
	.pipe(normalisePaths())
    .pipe(injectAppJS(htmlSrc, jsBuild))
    .pipe(wiredep.stream())
    .pipe(gulp.dest(htmlBuild));
});

gulp.task('server', [ 'build' ], function(next) {
  connect()
    .use('/build', connect.static('build'))
    .use('/bower_components', connect.static('bower_components'))
    .use('/src', connect.static('src'))
    .listen(8000, next);
});
