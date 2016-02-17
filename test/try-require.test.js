var test = require('tap-only');
var tryRequire = require('../lib/try-require');
var path = require('path');
var fs = require('fs');

test('try failure require', function (t) {
  tryRequire('./unknown').then(function (res) {
    t.equal(res, null, 'unknown require does not throw');
  }).catch(t.threw).then(t.end);
});

test('try bare package require', function (t) {
  tryRequire(__dirname + '/fixtures/bare-package.json').then(function (res) {
    t.notEqual(res, null, 'loaded the package');
    t.equal(res.name, 'fixtures', 'name was inferred from directory name');
    t.notEqual(res.dependencies, undefined, 'has dependencies property');
  }).catch(t.threw).then(t.end);
});

test('try npm-shrinkwrap detect', function (t) {
  var location = 'node_modules/@remy/snyk-shrink-test';

  var exists = fs.existsSync(location);

  if (!exists) {
    location = 'node_modules/snyk-resolve-deps-fixtures/node_modules/@remy/snyk-shrink-test';
  }

  var filename = path.resolve(__dirname, '..', location, 'package.json');
  tryRequire(filename).then(function (res) {
    t.notEqual(res, null, 'package was found');
    t.equal(res.shrinkwrap, true, 'has and knows about shrinkwrap');
  }).catch(t.threw).then(t.end);
});


test('try successful require and cached response', function (t) {
  var filename = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package/package.json');
  t.plan(4);

  tryRequire(filename).then(function (pkg) {
    t.ok(pkg, 'package loaded');
    t.ok(pkg.snyk, 'detected policy file');
    t.notEqual(pkg.shrinkwrap, true, 'this package is not shrinkwrap');
  }).then(function () {
    // once the load is complete, then try to hit the cache. otherwise the
    // tryRequire function happens in parallel and the cache isn't warmed up
    return tryRequire(filename).then(function (pkg) {
      t.ok(pkg.__cached, 'package loaded (and hit cache)');
    });
  }).then(t.threw);

});