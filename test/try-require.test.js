const { test } = require('tap');
const tryRequire = require('../lib/try-require');
const path = require('path');

test('try failure require', async (t) => {
  const res = await tryRequire('./unknown');
  t.equal(res, null, 'unknown require does not throw');
});

test('try bare package require', async (t) => {
  const res = await tryRequire(__dirname + '/fixtures/bare-package.json');
  t.notEqual(res, null, 'loaded the package');
  t.equal(res.name, 'fixtures', 'name was inferred from directory name');
  t.notEqual(res.dependencies, undefined, 'has dependencies property');
});

test('try utf8 package require with BOM', async (t) => {
  const res = await tryRequire(__dirname + '/fixtures/utf8bom-package.json');
  t.notEqual(res, null, 'loaded the package');
  t.equal(res.name, 'fixtures', 'name was inferred from directory name');
  t.notEqual(res.dependencies, undefined, 'has dependencies property');
  t.equal(res.leading[0], '\ufeff', 'BOM captured as a leading first char');
});

test('try npm-shrinkwrap detect', async (t) => {
  const filename = path.resolve(
    __dirname,
    'fixtures',
    'shrink-test-v1',
    'package.json',
  );
  const res = await tryRequire(filename);
  t.notEqual(res, null, 'package was found');
  t.equal(res.shrinkwrap, true, 'has and knows about shrinkwrap');
});

test('try package with no leading, newline trailing', async (t) => {
  const filename = path.resolve(
    __dirname,
    'fixtures',
    'shrink-test-v1',
    'package.json',
  );
  const res = await tryRequire(filename);
  t.notEqual(res, null, 'package was found');
  t.equal(res.leading, '', 'leading is empty string');
  t.equal(res.trailing, '\n', 'trailing is newline');
});

test('try successful require and cached response', async (t) => {
  const filename = path.resolve(
    __dirname,
    'fixtures',
    'with-policy',
    'package.json',
  );

  let pkg = await tryRequire(filename);
  t.ok(pkg, 'package loaded');
  t.ok(pkg.snyk, 'detected policy file');
  t.notEqual(pkg.shrinkwrap, true, 'this package is not shrinkwrap');

  // once the load is complete, then try to hit the cache. otherwise the
  // tryRequire function happens in parallel and the cache isn't warmed up
  pkg = await tryRequire(filename);
  t.ok(pkg.__cached, 'package loaded (and hit cache)');
});
