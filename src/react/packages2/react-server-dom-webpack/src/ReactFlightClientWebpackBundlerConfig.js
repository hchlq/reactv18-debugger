/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// eslint-disable-next-line no-unused-vars

export function resolveModuleReference(bundlerConfig, moduleData) {
  if (bundlerConfig) {
    return bundlerConfig[moduleData.id][moduleData.name];
  }
  return moduleData;
}

// The chunk cache contains all the chunks we've preloaded so far.
// If they're still pending they're a thenable. This map also exists
// in Webpack but unfortunately it's not exposed so we have to
// replicate it in user space. null means that it has already loaded.
const chunkCache = new Map();

// Start preloading the modules since we might need them soon.
// This function doesn't suspend.
export function preloadModule(moduleData) {
  const chunks = moduleData.chunks;
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = chunks[i];
    const entry = chunkCache.get(chunkId);
    if (entry === undefined) {
      const thenable = __webpack_chunk_load__(chunkId);
      const resolve = chunkCache.set.bind(chunkCache, chunkId, null);
      const reject = chunkCache.set.bind(chunkCache, chunkId);
      thenable.then(resolve, reject);
      chunkCache.set(chunkId, thenable);
    }
  }
}

// Actually require the module or suspend if it's not yet ready.
// Increase priority if necessary.
export function requireModule(moduleData) {
  const chunks = moduleData.chunks;
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = chunks[i];
    const entry = chunkCache.get(chunkId);
    if (entry !== null) {
      // We assume that preloadModule has been called before.
      // So we don't expect to see entry being undefined here, that's an error.
      // Let's throw either an error or the Promise.
      throw entry;
    }
  }
  const moduleExports = __webpack_require__(moduleData.id);
  if (moduleData.name === '*') {
    // This is a placeholder value that represents that the caller imported this
    // as a CommonJS module as is.
    return moduleExports;
  }
  if (moduleData.name === '') {
    // This is a placeholder value that represents that the caller accessed the
    // default property of this if it was an ESM interop module.
    return moduleExports.__esModule ? moduleExports.default : moduleExports;
  }
  return moduleExports[moduleData.name];
}
