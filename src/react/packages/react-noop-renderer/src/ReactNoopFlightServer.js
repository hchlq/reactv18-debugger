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
  scheduleWork(callback            ) {
    callback();
  },
  beginWriting(destination             )       {},
  writeChunk(destination             , buffer            )       {
    destination.push(Buffer.from((buffer     )).toString('utf8'));
  },
  completeWriting(destination             )       {},
  close(destination             )       {},
  flushBuffered(destination             )       {},
  convertStringToBuffer(content        )             {
    return Buffer.from(content, 'utf8');
  },
  formatChunkAsString(type        , props        )         {
    return JSON.stringify({type, props});
  },
  formatChunk(type        , props        )             {
    return Buffer.from(JSON.stringify({type, props}), 'utf8');
  },
  resolveModuleMetaData(config      , renderFn          ) {
    return saveModule(renderFn);
  },
});

function render(model            )              {
  const destination              = [];
  const bundlerConfig = undefined;
  const request = ReactNoopFlightServer.createRequest(
    model,
    destination,
    bundlerConfig,
  );
  ReactNoopFlightServer.startWork(request);
  return destination;
}

export {render};
