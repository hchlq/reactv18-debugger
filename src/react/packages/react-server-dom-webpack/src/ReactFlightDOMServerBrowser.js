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
} from 'react-server/src/ReactFlightServer';

function renderToReadableStream(model, webpackMap, options, context) {
  const request = createRequest(
    model,
    webpackMap,
    options ? options.onError : undefined,
    context,
  );
  const stream = new ReadableStream({
    type: 'bytes',
    start(controller) {
      startWork(request);
    },
    pull(controller) {
      startFlowing(request, controller);
    },
    cancel(reason) {},
  });
  return stream;
}

export {renderToReadableStream};
