module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],

    files: [
        'bower_components/angular/angular.js',
        'bower_components/angular-mocks/angular-mocks.js',
        'angular-action.js',
        'spec/**/*.js'
    ],

    exclude: [
    ],

    reporters: ['progress'],
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,

    port: 9876,
    browsers: ['PhantomJS'],
    captureTimeout: 60000,

    singleRun: false
  });
};
