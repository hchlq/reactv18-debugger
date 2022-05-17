/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                   

export function scheduleWork(callback            ) {
  callback();
}

export function flushBuffered(destination             ) {
  // WHATWG Streams do not yet have a way to flush the underlying
  // transform streams. https://github.com/whatwg/streams/issues/960
}

export function beginWriting(destination             ) {}

export function writeChunk(
  destination             ,
  buffer            ,
)          {
  destination.enqueue(buffer);
  return destination.desiredSize > 0;
}

export function completeWriting(destination             ) {}

export function close(destination             ) {
  destination.close();
}

const textEncoder = new TextEncoder();

export function convertStringToBuffer(content        )             {
  return textEncoder.encode(content);
}
