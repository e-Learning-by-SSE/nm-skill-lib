# Semantic Versioning Spec of nm-skill-lib

This library is still in _alpha_ state as we still explore the
core functionality needed for the two projects SEARCH and Selflearn.
As long as the library is still in _alpha_ state we use the following
versioning schema based on semantic versioning (MAJOR.MINOR.PATCH):

1. MAJOR will be fixed to 0 as long the library is in _alpha_ state
1. MINOR when we add new functions or make incompatible API changes.
1. PATCH version when you make backward compatible bug fixes and
   performance improvements.

After the release of 1.0.0 (when we treat this library as minimal
feature complete w.r.t. the SEARCH and Selflearn projects), we will
switch to the following versioning scheme:

1. MAJOR version when you make incompatible API changes.
1. MINOR version when you add functionality in a backward compatible
   manner
1. PATCH version when you make backward compatible bug fixes

# Releasing

Run the following commands

```
git tag <version>
nx release version
nx release changelog <version> --from <old-tagged-version>
nx release publish --registry=https://npm.pkg.github.com
```

you can always use the `--dry-run` option to test. See https://nx.dev/core-features/manage-releases
