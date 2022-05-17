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

function createDrainHandler(destination, request) {
  return () => startFlowing(request);
}

function pipeToNodeWritable(
  model            ,
  destination          ,
  webpackMap               ,
)       {
  const request = createRequest(model, destination, webpackMap);
  destination.on('drain', createDrainHandler(destination, request));
  startWork(request);
}

export {pipeToNodeWritable};
