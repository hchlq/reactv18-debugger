/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

/**
 * This is a renderer of React that doesn't have a render target output.
 * It is useful to demonstrate the internals of the reconciler in isolation
 * and for testing semantics of reconciliation separate from the host
 * environment.
 */

import {readModule} from 'react-noop-renderer/flight-modules';

import ReactFlightClient from 'react-client/flight';

const {createResponse, processStringChunk, close} = ReactFlightClient({
  supportsBinaryStreams: false,
  resolveModuleReference(bundlerConfig, idx) {
    return idx;
  },
  preloadModule(idx) {},
  requireModule(idx) {
    return readModule(idx);
  },
  parseModel(response, json) {
    return JSON.parse(json, response._fromJSON);
  },
});

function read(source) {
  const response = createResponse(source, null);
  for (let i = 0; i < source.length; i++) {
    processStringChunk(response, source[i], 0);
  }
  close(response);
  return response.readRoot();
}

export {read};
