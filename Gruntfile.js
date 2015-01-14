var testacular = require('testacular');

/*global module:false*/
module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-ngdocs');


  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/**\n' + ' * <%= pkg.description %>\n' +
      ' * @version v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      ' * @link <%= pkg.homepage %>\n' +
      ' * @license MIT License, http://www.opensource.org/licenses/MIT\n' + ' */'
    },
    clean: {
      src: ['dist', 'ngdocs']
    },
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        src: ['common/module.js', 'modules/directives/**/*.js', '!modules/**/test/*.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: ['<%= concat.dist.dest %>'],
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
     less: {
      options: {
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.css': ['modules/**/*.less', 'common/stylesheets/**/*.less']
        }
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        force: true
      },
      src: {
        src: ['modules/**/*.js', '!modules/**/test/*.js']
      },
      test: {
        src: ['modules/**/test/*.js']
      }
    },
    watch: {
      files: ['modules/**/*.js', 'modules/**/*.less', 'common/**/*.js', 'common/**/*.less',
              'doc/**/*.js', 'doc/**/*.css', 'doc/*.html', 'Gruntfile.js'],
      tasks: ['build'], //'test'
      options: {
        livereload: 35730
      }
    },
    //https://www.npmjs.org/package/grunt-ngdocs
    ngdocs: {
      src: 'modules/**/*.js',
      options: {
        dest: 'ngdocs',
        html5Mode: false,
        scripts: ['http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js',
          'components/angular/angular.js',
          'http://netdna.bootstrapcdn.com/twitter-bootstrap/2.3.0/js/bootstrap.min.js',
          'components/d3/d3.js',
          'components/d3-plugins/sankey/sankey.js',
          'components/moment/moment.js',
          'components/lodash/dist/lodash.js',
          'components/abstractquerylanguage/dist/aql.js',
          'components/d3-tip/index.js',
          'dist/angular-dataviz.js'],
        styles: [
          'dist/angular-dataviz.css'
        ]
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['build', 'test', 'watch']);

  grunt.registerTask('build', ['clean', 'jshint', 'concat', 'less:dist', 'ngdocs']);

  grunt.registerTask('server', 'start testacular server', function () {
    //Mark the task as async but never call done, so the server stays up
    var done = this.async();
    testacular.server.start({ configFile: 'test/test-config.js'});
  });

  grunt.registerTask('test', 'run tests (make sure server task is run first)', function () {
    var done = this.async();
    grunt.util.spawn({
      cmd: process.platform === 'win32' ? 'testacular.cmd' : 'testacular',
      args: process.env.TRAVIS ? ['start', 'test/test-config.js', '--single-run', '--no-auto-watch', '--reporters=dots', '--browsers=Firefox'] : ['run']
    }, function (error, result, code) {
      if (error) {
        grunt.warn("Make sure the testacular server is online: run `grunt server`.\n" +
          "Also make sure you have a browser open to http://localhost:8080/.\n" +
          error.stdout + error.stderr);
        //the testacular runner somehow modifies the files if it errors(??).
        //this causes grunt's watch task to re-fire itself constantly,
        //unless we wait for a sec
        setTimeout(done, 1000);
      } else {
        grunt.log.write(result.stdout);
        done();
      }
    });
  });
};
