const { execFile } = require('child_process');
const { promisify } = require('util');

const test = require('tap-only');
const tryRequire = require('../lib/try-require');
const path = require('path');

const run = promisify(execFile);

test('install assets', async (t) => {
  await run('npm', ['--prefix', 'test/fixtures/shrink-test-v1', 'install']);
  await run('npm', ['--prefix', 'test/fixtures/with-policy', 'install']);
  t.end();
});

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

test('try utf8 package require with BOM', function (t) {
  tryRequire(__dirname + '/fixtures/utf8bom-package.json').then(function (res) {
    t.notEqual(res, null, 'loaded the package');
    t.equal(res.name, 'fixtures', 'name was inferred from directory name');
    t.notEqual(res.dependencies, undefined, 'has dependencies property');
    t.equal(res.leading[0], '\ufeff', 'BOM captured as a leading first char');
  }).catch(t.threw).then(t.end);
});

test('try npm-shrinkwrap detect', function (t) {
  const filename = path.resolve(__dirname, 'fixtures', 'shrink-test-v1', 'package.json');
  tryRequire(filename).then(function (res) {
    t.notEqual(res, null, 'package was found');
    t.equal(res.shrinkwrap, true, 'has and knows about shrinkwrap');
  }).catch(t.threw).then(t.end);
});

test('try package with no leading, newline trailing', function (t) {
  const filename = path.resolve(__dirname, 'fixtures', 'shrink-test-v1', 'package.json');
  tryRequire(filename).then(function (res) {
    t.notEqual(res, null, 'package was found');
    t.equal(res.leading, '', 'leading is empty string');
    t.equal(res.trailing, '\n', 'trailing is newline');
  }).catch(t.threw).then(t.end);
});


test('try successful require and cached response', function (t) {
  const filename = path.resolve(__dirname, 'fixtures', 'with-policy', 'package.json');
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
  }).catch(t.threw).then(t.end);

});
