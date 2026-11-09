# Snyk's (try) require

## Maintenance status

This package is no longer maintained and will not receive further releases.
Snyk's remaining consumers moved the functionality into their own code; see
[snyk/policy#222](https://github.com/snyk/policy/pull/222) for the policy implementation.

This package tries to load and parse a `package.json` file. This does *not* load the package into memory (as per `require`).

What snyk-try-require does:

- Returns a promise
- Does *not* throw if the `package.json` can't be found, but fulfills with `null`
- Uses `debug` module under the `snyk:resolve:try-require` key
- Uses lru-cache for caching for 100 objects for 1 hour
- Adds `dependencies` and `devDependencies` if they're missing
- Adds `__filename` containing the full original path to the package
- If a Snyk policy is present, will add the path of the policy to the `snyk` property
- If the package uses `npm-shrinkwrap.json` will include a `shrinkwrap` boolean property
- Returns the `leading` and `trailing` whitespace of the original `package.json` file as a `leading` and `trailing` property respectively
