/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var glob = require('glob');
var historyApiFallback = require('connect-history-api-fallback');
var packageJson = require('./package.json');
var crypto = require('crypto');
var polybuild = require('polybuild');
var sftp = require('gulp-sftp');
var notify     = require('gulp-notify');

var host       = 'dev01.server.cloudioo.net',
    key       = '/Users/'+__dirname.split('/')[2]+'/.ssh/azarzalejo',
    user      = 'root',
    remotePath = '/mnt/proyecto/proyecto_'+__dirname.split('/')[2]+__dirname.substr(__dirname.indexOf("/trunk/"))+'/';

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var styleTask = function (stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
      return path.join('app', stylesPath, src);
    }))
    .pipe($.changed(stylesPath, {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/' + stylesPath))
    .pipe($.cssmin())
    .pipe(gulp.dest('dist/' + stylesPath))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath+'dist/'+ stylesPath
    }))
    .pipe(notify("Estilos procesados y sincronizados"))
    .pipe($.size({title: stylesPath}));
};

var jshintTask = function (src) {
  return gulp.src(src)
    .pipe($.jshint.extract()) // Extract JS from .html files
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'));
};

var imageOptimizeTask = function (src, dest) {
  return gulp.src(src)
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest(dest))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + dest
    }))
    .pipe(notify("Imágenes procesados y sincronizados"))
    .pipe($.size({title: 'images'}));
};

var optimizeHtmlTask = function (src, dest) {
  var assets = $.useref.assets({searchPath: ['app']});

  return gulp.src(src)
    // Replace path for vulcanized assets
    //.pipe($.if('*.html', $.replace('elements/elements.html', 'elements/elements.vulcanized.html')))
    .pipe(assets)
    // Concatenate and minify JavaScript
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Concatenate and minify styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.cssmin()))
    .pipe(assets.restore())
    .pipe($.useref())
    // Minify any HTML
    .pipe($.if('*.html', $.minifyHtml({
      quotes: true,
      empty: true,
      spare: true
    })))
    // Output files
    .pipe(gulp.dest(dest))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + dest
    }))
    .pipe(notify("HTML procesados y sincronizados"))
    .pipe($.size({title: 'html'}));
};

// Compile and automatically prefix stylesheets
gulp.task('styles', function () {
  return styleTask('styles', ['**/*.css']);
});

gulp.task('elements', function () {
  return styleTask('elements', ['**/*.css']);
});

// Lint JavaScript
gulp.task('jshint', function () {
  return jshintTask([
      'app/scripts/**/*.js',
      'app/elements/**/*.js',
      'app/elements/**/*.html'
    ])
    .pipe($.jshint.extract()) // Extract JS from .html files
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'));
});

// Optimize images
gulp.task('images', function () {
  return imageOptimizeTask('app/images/**/*', 'dist/images');
});

// Copy all files at the root level (app)
gulp.task('copy', function () {
  var app = gulp.src([
    'app/*',
    '!app/test',
    '!app/cache-config.json'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'))
  .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist'
    }));

  var bower = gulp.src([
    'bower_components/**/*'
  ]).pipe(gulp.dest('dist/bower_components'));

  var elements = gulp.src(['app/elements/**/*.html',
                           'app/elements/**/*.css',
                           'app/elements/**/*.js'])
    .pipe(gulp.dest('dist/elements'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/elements'
    }));

  var swBootstrap = gulp.src(['bower_components/platinum-sw/bootstrap/*.js'])
    .pipe(gulp.dest('dist/elements/bootstrap'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/elements/bootstrap'
    }));

  var swToolbox = gulp.src(['bower_components/sw-toolbox/*.js'])
    .pipe(gulp.dest('dist/sw-toolbox'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/sw-toolbox'
    }));

  var vulcanized = gulp.src(['app/elements/elements.html'])
    .pipe($.rename('elements.vulcanized.html'))
    .pipe(gulp.dest('dist/elements'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/elements'
    }));

  return merge(app, bower, elements, vulcanized, swBootstrap, swToolbox)
    .pipe($.size({title: 'copy'}));
});

// Copy web fonts to dist
gulp.task('fonts', function () {
  return gulp.src(['app/fonts/**'])
    .pipe(gulp.dest('dist/fonts'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/fonts'
    }))
    .pipe($.size({title: 'fonts'}));
});

// Scan your HTML for assets & optimize them
gulp.task('html', function () {
  return optimizeHtmlTask(
    ['app/**/*.html', '!app/{elements,test}/**/*.html'],
    'dist');
});

// Polybuild will take care of inlining HTML imports,
// scripts and CSS for you.
gulp.task('vulcanize', function () {
  return gulp.src('dist/index.html')
    .pipe(polybuild({maximumCrush: true}))
    .pipe(gulp.dest('dist/'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/'
    }));
});

// If you require more granular configuration of Vulcanize
// than polybuild provides, follow instructions from readme at:
// https://github.com/PolymerElements/polymer-starter-kit/#if-you-require-more-granular-configuration-of-vulcanize-than-polybuild-provides-you-an-option-by

// Rename Polybuild's index.build.html to index.html
gulp.task('rename-index', function () {
  gulp.src('dist/index.build.html')
    .pipe($.rename('index.html'))
    .pipe(gulp.dest('dist/'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/'
    }));
  return del(['dist/index.build.html']);
});

// Generate config data for the <sw-precache-cache> element.
// This include a list of files that should be precached, as well as a (hopefully unique) cache
// id that ensure that multiple PSK projects don't share the same Cache Storage.
// This task does not run by default, but if you are interested in using service worker caching
// in your project, please enable it within the 'default' task.
// See https://github.com/PolymerElements/polymer-starter-kit#enable-service-worker-support
// for more context.
gulp.task('cache-config', function (callback) {
  var dir = 'dist';
  var config = {
    cacheId: packageJson.name || path.basename(__dirname),
    disabled: false
  };

  glob('{elements,scripts,styles}/**/*.*', {cwd: dir}, function(error, files) {
    if (error) {
      callback(error);
    } else {
      files.push('index.html', './', 'bower_components/webcomponentsjs/webcomponents-lite.min.js');
      config.precache = files;

      var md5 = crypto.createHash('md5');
      md5.update(JSON.stringify(config.precache));
      config.precacheFingerprint = md5.digest('hex');

      var configPath = path.join(dir, 'cache-config.json');
      fs.writeFile(configPath, JSON.stringify(config), callback);
    }
  });
});


gulp.task('elementsHTML', function(){
  return gulp.src(['app/elements/**/*.html',
                           'app/elements/**/*.css',
                           'app/elements/**/*.js'])
    .pipe(gulp.dest('dist/elements'))
    .pipe(sftp({
        host: host,
        user: user,
        key: key,
        remotePath: remotePath + 'dist/elements'
    }))
    .pipe(notify("Elementos procesados y sincronizados"));
});

// Clean output directory
gulp.task('clean', function (cb) {
  del(['.tmp', 'dist'], cb);
});

gulp.task('watch', function(){
  gulp.watch(['app/images/**/*'], ['images']);
  gulp.watch(['app/**/*.html', '!app/{elements,test}/**/*.html'], ['html']);
  gulp.watch(['app/**/*.css'], ['styles', 'elements']);
  gulp.watch(['app/elements/**/*.html','app/elements/**/*.css','app/elements/**/*.js'], ['elementsHTML']);
  
});




// Build production files, the default task
gulp.task('default', ['clean'], function (cb) {
  // Uncomment 'cache-config' after 'rename-index' if you are going to use service workers.
  runSequence(
    ['copy', 'styles'],
    'elements',
    ['jshint', 'images', 'fonts', 'html'],
    'vulcanize',//'rename-index',
    'watch', // 'cache-config',
    cb);

});



// Load tasks for web-component-tester
// Adds tasks for `gulp test:local` and `gulp test:remote`
require('web-component-tester').gulp.init(gulp);

// Load custom tasks from the `tasks` directory
try { require('require-dir')('tasks'); } catch (err) {}

