/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                           
                                                     

import {
  scheduleWork,
  beginWriting,
  writeChunk,
  completeWriting,
  flushBuffered,
  close,
} from './ReactServerStreamConfig';
import {formatChunk} from './ReactServerFormatConfig';
import {REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';

                      
                           
                          
                                     
                   
     
  

export function createRequest(
  children               ,
  destination             ,
)                {
  return {destination, children, completedChunks: [], flowing: false};
}

function performWork(request               )       {
  const element = (request.children     );
  request.children = null;
  if (element && element.$$typeof !== REACT_ELEMENT_TYPE) {
    return;
  }
  const type = element.type;
  const props = element.props;
  if (typeof type !== 'string') {
    return;
  }
  request.completedChunks.push(formatChunk(type, props));
  if (request.flowing) {
    flushCompletedChunks(request);
  }

  flushBuffered(request.destination);
}

function flushCompletedChunks(request               ) {
  const destination = request.destination;
  const chunks = request.completedChunks;
  request.completedChunks = [];

  beginWriting(destination);
  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      writeChunk(destination, chunk);
    }
  } finally {
    completeWriting(destination);
  }
  close(destination);
}

export function startWork(request               )       {
  request.flowing = true;
  scheduleWork(() => performWork(request));
}

export function startFlowing(request               )       {
  request.flowing = false;
  flushCompletedChunks(request);
}
