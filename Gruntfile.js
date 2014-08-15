/*global module:false*/
module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      js: {
        files: ['src/**/*.js', 'wrapper/**/*.js'],
        tasks: ['clean:tmp', 'requirejs'],
        options: {
          interrupt: true,
          force: true
        }
      }
    },
    requirejs: {
      'observe': {
        options: {
          baseUrl: 'src/',
          name: 'index',
          out: 'tmp/observe.js',
          optimize: 'none',
          findNestedDependencies: true,
          onBuildWrite: function(name, path, contents) {
            return require('amdclean').clean({
              code: contents,
              wrap: {
                'start': '',
                'end': ''
              }
            });
          },
          // wrap: true
          wrap: {
            startFile: 'wrapper/intro.js',
            endFile: 'wrapper/outro.js'
          }
        }
      }
    },
    concat: {
      options: {
        banner: grunt.file.read('wrapper/banner.js'),
        process: {
          data: {
            version: '<%= pkg.version %>'
          }
        }
      },
      'observe': {
        src: ['tmp/observe.js'],
        dest: 'build/observe.js'
      }
    },
    clean: {
      tmp: ['tmp/'],
      build: ['build/']
    },
    jshint: {
      files: ['src/**/*.js'],
      options: {
        jshintrc: 'jshint.rc'
      }
    },
    uglify: {
      'observe': {
        src: ['<%= concat["observe"].dest %>'],
        dest: 'build/observe.min.js'
      }
    },
    copy: {
      release: {
        files: [{
          expand: true,
          cwd: 'build/',
          src: ['**/*'],
          dest: 'release/<%= pkg.version %>/'
        }]
      },
      link: {
        files: {
          'observe.js': 'build/observe.js'
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  grunt.registerTask('build', ['clean', 'requirejs', 'concat']);

  grunt.registerTask('default', [ /*'test',*/ 'build', 'uglify']);
  grunt.registerTask('test', ['jshint' /*, 'mocha'*/ ]);

  grunt.registerTask('release', ['default', 'copy:release', 'copy:link']);
};