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

function renderToReadableStream(model, webpackMap, options) {
  const request = createRequest(
    model,
    webpackMap,
    options ? options.onError : undefined,
    options ? options.context : undefined,
    options ? options.identifierPrefix : undefined,
  );
  if (options && options.signal) {
    const signal = options.signal;
    if (signal.aborted) {
      abort(request, signal.reason);
    } else {
      const listener = () => {
        abort(request, signal.reason);
        signal.removeEventListener('abort', listener);
      };
      signal.addEventListener('abort', listener);
    }
  }
  const stream = new ReadableStream(
    {
      type: 'bytes',
      start(controller) {
        startWork(request);
      },
      pull(controller) {
        startFlowing(request, controller);
      },
      cancel(reason) {},
    },
    // $FlowFixMe size() methods are not allowed on byte streams.
    {highWaterMark: 0},
  );
  return stream;
}

export {renderToReadableStream};
