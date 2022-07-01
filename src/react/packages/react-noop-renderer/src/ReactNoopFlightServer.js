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

import {saveModule} from 'react-noop-renderer/flight-modules';

import ReactFlightServer from 'react-server/flight';

const ReactNoopFlightServer = ReactFlightServer({
  scheduleWork(callback) {
    callback();
  },
  beginWriting(destination) {},
  writeChunk(destination, chunk) {
    destination.push(chunk);
  },
  writeChunkAndReturn(destination, chunk) {
    destination.push(chunk);
    return true;
  },
  completeWriting(destination) {},
  close(destination) {},
  closeWithError(destination, error) {},
  flushBuffered(destination) {},
  stringToChunk(content) {
    return content;
  },
  stringToPrecomputedChunk(content) {
    return content;
  },
  isModuleReference(reference) {
    return reference.$$typeof === Symbol.for('react.module.reference');
  },
  getModuleKey(reference) {
    return reference;
  },
  resolveModuleMetaData(config, reference) {
    return saveModule(reference.value);
  },
});

function render(model, options) {
  const destination = [];
  const bundlerConfig = undefined;
  const request = ReactNoopFlightServer.createRequest(
    model,
    bundlerConfig,
    options ? options.onError : undefined,
    options ? options.context : undefined,
    options ? options.identifierPrefix : undefined,
  );
  ReactNoopFlightServer.startWork(request);
  ReactNoopFlightServer.startFlowing(request, destination);
  return destination;
}

export {render};
