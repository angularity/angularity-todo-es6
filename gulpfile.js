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

function modularise(outputPattern, errorFunc) {
  var output = [ ];
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
          message = message.replace(new RegExp(file.cwd, 'g'), '');
          output.push(message);
        } else {
          gulp.src(outPath.replace('js', '*'))
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
      var text = '\n' + output.join('\n')
        .replace(/Error\:\s*Command failed\:\s*/g, '');
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
        text = text.replace(new RegExp(after[i].path, 'g'), rootRelativeBefore);
      }
      text = text .replace(new RegExp(generalBase.join('|'), 'g'), '');
      return text;
    }
  }
}

function terseReporter(replacer) {
  var output = '';
  var prevfile;
  return through.obj(function(file, encoding, done) {
    if (file.jshint && !file.jshint.success && !file.jshint.ignored) {
      (function reporter(results, data, opts) {
        results.forEach(function(result) {
          var filename = result.file.replace(new RegExp(file.cwd, 'g'), '');
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
      console.log('\n' + output);
    }
    done();
  });
}

function adjustSourceMaps(replacer) {
  return through.obj(function(file, encoding, done) {
    var sourceMap = JSON.parse(replacer(file.contents.toString()));
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
    var analysis = /^(.*)[\\\/](.*)\.html$/.exec(file.path);
    var path     = analysis[1];
    var name     = analysis[2];
    var target   = path.replace(htmlBase, jsBase) + '/all.' + name + '.js';
    spigot.array({ objectMode: true }, [ file ])
      .pipe(plugins.inject(gulp.src(target, { read: false })))
      .on('data', function(file) {
        stream.push(file);
      })
      .on('end', function() {
        done();
      });
  })
}

var temp       = '.build'
var jsLibBower = 'bower_components/*/js-lib';
var jsLibSrc   = 'src/js-lib';
var jsSrc      = 'src/js';
var jsBuild    = 'build/js';
var htmlSrc    = 'src'
var htmlBuild  = 'build'

var sourceTracking;

gulp.task('default', function() {
  runSequence('js:hint', 'js:cleantemp', 'js:copylibs', 'js:transpile', 'js:cleantemp', 'html', 'server');
});

// run js-hint on local sources
gulp.task('js:hint', function() {
  return combined.create()
    .append(gulp.src(jsLibSrc + '/**/*.js'))
    .append(gulp.src(jsSrc    + '/**/*.js'))
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(terseReporter());
})

// clean the temp directory
gulp.task('js:cleantemp', function() {
  return gulp.src(temp)
    .pipe(plugins.clean());
})

// copy libraries from both local and bower sources into the temp directory
//  keep track of their original location
gulp.task('js:copylibs', function() {
  sourceTracking = trackSources();              // begin tracking
  return combined.create()
    .append(gulp.src(jsLibBower + '/**/*.js'))  // bower sources first
    .append(gulp.src(jsLibSrc   + '/**/*.js'))  // local sources overwrite them
    .pipe(sourceTracking.before())
    .pipe(rebaseTo(jsLibBower, jsLibSrc))
    .pipe(gulp.dest(temp))
    .pipe(sourceTracking.after());
});

// resolve all imports for the source files to give a single optimised js file
//  and source map for each
gulp.task('js:transpile', function() {
  var selectSourceMaps = plugins.filter('**/*.map');
  return gulp.src(jsSrc + '/**/*.js')
    .pipe(modularise(temp + '/all.{filename}', function(errorText) {
      console.log(sourceTracking.replace(errorText));
    }))
    .pipe(selectSourceMaps)
    .pipe(adjustSourceMaps(sourceTracking.replace))
    .pipe(selectSourceMaps.restore({ end: true }))
    .pipe(gulp.dest(jsBuild));
});

gulp.task('html', function() {
  return gulp.src(htmlSrc + '/**/*.html')
    .pipe(injectAppJS(htmlSrc, jsBuild))
    .pipe(wiredep.stream())
    .pipe(gulp.dest(htmlBuild));
});

gulp.task('server', function(next) {
  connect()
    .use('/build', connect.static('build'))
    .use('/bower_components', connect.static('bower_components'))
    .use('/src', connect.static('src'))
    .listen(8000, next);
});
