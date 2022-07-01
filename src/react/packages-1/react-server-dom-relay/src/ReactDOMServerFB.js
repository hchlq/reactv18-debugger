/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  createRequest,
  startWork,
  performWork,
  startFlowing,
  abort,
} from 'react-server/src/ReactFizzServer';

import {
  createResponseState,
  createRootFormatContext,
} from 'react-server/src/ReactServerFormatConfig';

function renderToStream(children, options) {
  const destination = {
    buffer: '',
    done: false,
    fatal: false,
    error: null,
  };
  const request = createRequest(
    children,
    createResponseState(
      options ? options.identifierPrefix : undefined,
      undefined,
      options ? options.bootstrapScriptContent : undefined,
      options ? options.bootstrapScripts : undefined,
      options ? options.bootstrapModules : undefined,
    ),
    createRootFormatContext(undefined),
    options ? options.progressiveChunkSize : undefined,
    options.onError,
    undefined,
    undefined,
  );
  startWork(request);
  if (destination.fatal) {
    throw destination.error;
  }
  return {
    destination,
    request,
  };
}

function abortStream(stream) {
  abort(stream.request);
}

function renderNextChunk(stream) {
  const {request, destination} = stream;
  performWork(request);
  startFlowing(request, destination);
  if (destination.fatal) {
    throw destination.error;
  }
  const chunk = destination.buffer;
  destination.buffer = '';
  return chunk;
}

function hasFinished(stream) {
  return stream.destination.done;
}

function debug(stream) {
  // convert to any to silence flow errors from opaque type
  const request = stream.request;
  return {
    pendingRootTasks: request.pendingRootTasks,
    clientRenderedBoundaries: request.clientRenderedBoundaries.length,
    completedBoundaries: request.completedBoundaries.length,
    partialBoundaries: request.partialBoundaries.length,
    allPendingTasks: request.allPendingTasks,
    pingedTasks: request.pingedTasks.length,
  };
}

export {renderToStream, renderNextChunk, hasFinished, abortStream, debug};
