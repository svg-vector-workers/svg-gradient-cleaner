// ===================================================
// Settin'
// ===================================================

var gulp            = require('gulp'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    $               = gulpLoadPlugins({
                        rename: {
                          'gulp-filter'      : 'filter',
                          'gulp-sourcemaps'  : 'sourcemaps',
                          'gulp-concat'      : 'concat',
                          'gulp-uglify'      : 'minjs',
                          'gulp-minify-css'  : 'mincss',
                          'gulp-minify-html' : 'minhtml',
                          'gulp-gh-pages'    : 'ghPages',
                          'gulp-foreach'     : 'foreach',
                          'gulp-mocha'       : 'mocha',
                          'gulp-if'          : 'if'
                        }
                      }),
    bowerFiles      = require('main-bower-files'),
    assemble        = require('assemble'),
    run             = require('run-sequence'),
    del             = require('del'),
    merge           = require('merge-stream'),
    basename        = require('path').basename,
    extname         = require('path').extname;

$.exec   = require('child_process').exec;
$.fs     = require('fs');


// ===================================================
// Configin'
// ===================================================

var env_flag = true;

var asset_dir = {
  site: 'site',
  templates : 'templates',
  data: 'data',
  dist: 'dist',
  js: 'js',
  css: 'css',
  sass: 'src'
};

var path = {
  site: asset_dir.site,
  data: asset_dir.data,
  templates: asset_dir.site + '/' + asset_dir.templates,
  dist: asset_dir.dist,
  js: asset_dir.site + '/' + asset_dir.js,
  css: asset_dir.site + '/' + asset_dir.css,
  sass: asset_dir.site + '/' + asset_dir.css + '/' + asset_dir.sass
};

var glob = {
  html: path.site + '/*.html',
  css: path.css + '/*.css',
  sass: path.sass + '/**/*.scss',
  js: path.js + '/src/**/*.js',
  layouts: path.templates + '/layouts/*.{md,hbs}',
  pages: path.templates + '/pages/**/*.{md,hbs}',
  includes: path.templates + '/includes/**/*.{md,hbs}',
  data: path.data + '/**/*.{json,yaml}',
  rootData: ['site.yaml', 'package.json']
};


// ===================================================
// Developin'
// ===================================================

gulp.task('serve', ['assemble'], function() {
  $.connect.server({
    root: [path.site],
    port: 5000,
    livereload: true,
    middleware: function(connect) {
      return [
        connect().use(connect.query())
      ];
    }
  });

  $.exec('open http://localhost:5000');
});


// ===================================================
// Previewin'
// ===================================================

gulp.task('preview', function() {
  $.connect.server({
    root: [path.dist],
    port: 5001
  });

  $.exec('open http://localhost:5001');
});


// ===================================================
// Testin'
// ===================================================

gulp.task('mocha', function () {
  return gulp.src('test/*.js', {read: false})
    .pipe($.mocha({ reporter: 'nyan' }));
});


// ===================================================
// Stylin'
// ===================================================

gulp.task('sass', function() {
  var stream = gulp.src(glob.sass)
    .pipe($.if(env_flag === false, $.sourcemaps.init()))
    .pipe($.sass({
      outputStyle: $.if(env_flag === false, 'expanded', 'compressed')
    }))
    .pipe($.if(env_flag === false,
      $.sourcemaps.write({
        debug: true,
        includeContent: false,
        sourceRoot: path.css
      })
    ))
    .pipe($.autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(gulp.dest(path.css))
    .pipe($.connect.reload());

  return stream;
});


// ===================================================
// Templatin'
// ===================================================

/**
 * Load data onto assemble cache.
 * This loads data from `glob.data` and `glob.rootData`.
 * When loading `glob.rootData`, use a custom namespace function
 * to return `pkg` for `package.json`.
 *
 * After all data is loaded, process the data to resolve templates
 * in values.
 * @doowb PR: https://github.com/grayghostvisuals/grayghostvisuals/pull/5
 */

function loadData() {
  assemble.data(glob.data);
  assemble.data(assemble.plasma(glob.rootData, {namespace: function (fp) {
    var name = basename(fp, extname(fp));
    if (name === 'package') return 'pkg';
    return name;
  }}));
  assemble.data(assemble.process(assemble.data()));
}

// Placing assemble setups inside the task allows
// live reloading/monitoring for files changes.
gulp.task('assemble', function() {
  assemble.option('production', env_flag);
  assemble.option('layout', 'default');
  assemble.layouts(glob.layouts);
  assemble.partials(glob.includes);
  loadData();

  var stream = assemble.src(glob.pages)
    .pipe($.extname())
    .pipe(assemble.dest(path.site))
    .pipe($.connect.reload());

  return stream;
});


// ===================================================
// Optimizin'
// ===================================================

gulp.task('svgstore', function() {
  return gulp
    .src(path.site + '/img/icons/linear/*.svg')
    .pipe($.svgmin({
      plugins: [{
        removeDoctype: true
      }]
    }))
    .pipe($.svgstore())
    .pipe($.cheerio(function($) {
      $('svg').attr('style', 'display:none');
    }))
    .pipe(gulp.dest(path.templates + '/includes/atoms/svg-sprite.svg'));
});


// ===================================================
// Buildin'
// ===================================================

/*
 * foreach is because usemin 0.3.11 won't manipulate
 * multiple files as an array.
 */

gulp.task('usemin', ['assemble', 'sass'], function() {
  return gulp.src(glob.html)
    .pipe($.foreach(function(stream, file) {
      return stream
        .pipe($.usemin({
          assetsDir: path.site,
          css: [ $.rev() ],
          //html: [ $.minhtml({ empty: false }) ],
          js: [ $.minjs(), $.rev() ]
        }))
        .pipe(gulp.dest(path.dist));
    }));
});


// ===================================================
// Duplicatin'
// ===================================================

gulp.task('copy', ['usemin'], function() {
  return merge(
    gulp.src([path.site + '/{img,js/lib}/**/*'])
        .pipe(gulp.dest(path.dist)),

    gulp.src([
        path.site + '/*.{ico,png,txt}',
        path.site + '/CNAME'
      ]).pipe(gulp.dest(path.dist))
  );
});


// ===================================================
// Releasin'
// ===================================================

gulp.task('deploy', function() {
  return gulp.src([path.dist + '/**/*'])
             .pipe($.ghPages(
                $.if(env_flag === false,
                { branch: 'staging' },
                { branch: 'gh-pages'})
             ));
});


// ===================================================
// Cleanin'
// ===================================================

gulp.task('clean', function(cb) {
  del([
    path.dist,
    glob.css,
    glob.html
  ], cb);
});


// ===================================================
// Monitorin'
// ===================================================

gulp.task('watch', function() {
  gulp.watch([
    glob.sass
  ], ['sass']);

  gulp.watch([
    glob.includes,
    glob.pages,
    glob.js,
    glob.layouts
  ], ['assemble']);
});


// ===================================================
// Taskin'
// ===================================================

gulp.task('build', [ 'copy','usemin' ]);
gulp.task('default', [ 'sass','assemble','serve','watch' ]);