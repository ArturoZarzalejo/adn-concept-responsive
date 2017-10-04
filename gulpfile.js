
'use strict';

// Include Gulp & tools we'll use
var gulp         = require('gulp');
var fs           = require('fs');
var path         = require('path');
var del          = require('del');
var runSequence  = require('run-sequence');
var notify       = require('gulp-notify');
var cache        = require('gulp-cached');

var minifyHtml   = require('gulp-minify-html');
var cssmin       = require('gulp-cssmin');
var uglify       = require('gulp-uglify');
var polybuild    = require('gulp-vulcanize');
var autoprefixer = require('gulp-autoprefixer');
var jshint       = require('gulp-jshint');


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


// Compile and automatically prefix stylesheets
gulp.task('styles', function () {
  return gulp.src(['app/styles/**/*.css'], {base: './app'})
    .pipe(cache('styles'))
    .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(cssmin())
    .pipe(gulp.dest('dist/'))
    .pipe(notify("Estilos procesados y sincronizados"));
});


gulp.task('html', function () {
  return gulp.src(['app/**/*.html'], {base: './app'})
    .pipe(cache('html'))
     // Minify any HTML
    .pipe(minifyHtml({
      quotes: true,
      empty: true,
      spare: true
    }))
    .pipe(jshint.extract()) // Extract JS from .html files
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    // Output files
    .pipe(gulp.dest('dist/'));
});

gulp.task('images', function () {
  return gulp.src(['app/images/**/*'], {base: './app'})
    .pipe(cache('images'))
    .pipe(gulp.dest('dist/'))
    .pipe(notify("Imagenes procesadas y sincronizadas"));
});

gulp.task('copy_bower', function(){
  var bower = gulp.src([
      'bower_components/**/*'
    ], {base: './app'})
    .pipe(gulp.dest('dist/bower_components'));
})

gulp.task('copy', function(){

  var bower = gulp.src([
      'bower_components/**/*'
    ], {base: './app'})
    .pipe(gulp.dest('dist/bower_components'));

  var app_root = gulp.src([
      'app/*.*',
      'app/styles/**/*.eot',
      'app/styles/**/*.ttf', 
      'app/styles/**/*.woff',
      'app/assets/**/*',
      '!app/test',
      '!app/*.html',
      '!app/cache-config.json'
    ], {base: './app'})
    .pipe(gulp.dest('dist/'));

});

// Lint JavaScript
gulp.task('scripts', function () {
  return gulp.src([
      'app/**/*.js'
    ], {base: './app'})
    .pipe(jshint.extract()) // Extract JS from .html files
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(uglify())
    .pipe(gulp.dest('dist/'))
    .pipe(notify("Scripts procesados y sincronizados"));
});


gulp.task('watch', function(){
  gulp.watch(['app/styles/**/*.css'], ['styles']);
  gulp.watch(['app/**/*.html'], ['html']);
  gulp.watch(['app/**/*.js'], ['scripts']);
  gulp.watch(['app/images/**/*'], ['images']);
  
});

gulp.task('clean', function (cb) {
  del(['.tmp', 'dist'], cb);
});

gulp.task('default', ['clean'], function(cb){
  runSequence(
    'copy', 'styles', 'html', 'scripts', 'images', 'watch',
    cb);
});


gulp.task('vulcanize', function () {
  return gulp.src('dist/index.html')
    .pipe(polybuild({maximumCrush: true}))
    .pipe(gulp.dest('dist/'))
    
});


require('web-component-tester').gulp.init(gulp);


