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

function render(model, destination, config, options) {
  const request = createRequest(
    model,
    config,
    options ? options.onError : undefined,
    undefined, // not currently set up to supply context overrides
    options ? options.identifierPrefix : undefined,
  );
  startWork(request);
  startFlowing(request, destination);
}

export {render};
