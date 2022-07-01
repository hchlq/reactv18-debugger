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
  startFlowing,
  abort,
} from 'react-server/src/ReactFlightServer';

function createDrainHandler(destination, request) {
  return () => startFlowing(request, destination);
}

function renderToPipeableStream(model, webpackMap, options) {
  const request = createRequest(
    model,
    webpackMap,
    options ? options.onError : undefined,
    options ? options.context : undefined,
    options ? options.identifierPrefix : undefined,
  );
  let hasStartedFlowing = false;
  startWork(request);
  return {
    pipe(destination) {
      if (hasStartedFlowing) {
        throw new Error(
          'React currently only supports piping to one writable stream.',
        );
      }
      hasStartedFlowing = true;
      startFlowing(request, destination);
      destination.on('drain', createDrainHandler(destination, request));
      return destination;
    },
    abort(reason) {
      abort(request, reason);
    },
  };
}

export {renderToPipeableStream};
