/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

export function scheduleWork(callback) {
  callback();
}

export function flushBuffered(destination) {
  // WHATWG Streams do not yet have a way to flush the underlying
  // transform streams. https://github.com/whatwg/streams/issues/960
}

const VIEW_SIZE = 512;
let currentView = null;
let writtenBytes = 0;

export function beginWriting(destination) {
  currentView = new Uint8Array(VIEW_SIZE);
  writtenBytes = 0;
}

export function writeChunk(destination, chunk) {
  if (chunk.length === 0) {
    return;
  }

  if (chunk.length > VIEW_SIZE) {
    // this chunk may overflow a single view which implies it was not
    // one that is cached by the streaming renderer. We will enqueu
    // it directly and expect it is not re-used
    if (writtenBytes > 0) {
      destination.enqueue(new Uint8Array(currentView.buffer, 0, writtenBytes));
      currentView = new Uint8Array(VIEW_SIZE);
      writtenBytes = 0;
    }
    destination.enqueue(chunk);
    return;
  }

  let bytesToWrite = chunk;
  const allowableBytes = currentView.length - writtenBytes;
  if (allowableBytes < bytesToWrite.length) {
    // this chunk would overflow the current view. We enqueue a full view
    // and start a new view with the remaining chunk
    if (allowableBytes === 0) {
      // the current view is already full, send it
      destination.enqueue(currentView);
    } else {
      // fill up the current view and apply the remaining chunk bytes
      // to a new view.
      currentView.set(bytesToWrite.subarray(0, allowableBytes), writtenBytes);
      // writtenBytes += allowableBytes; // this can be skipped because we are going to immediately reset the view
      destination.enqueue(currentView);
      bytesToWrite = bytesToWrite.subarray(allowableBytes);
    }
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
  currentView.set(bytesToWrite, writtenBytes);
  writtenBytes += bytesToWrite.length;
}

export function writeChunkAndReturn(destination, chunk) {
  writeChunk(destination, chunk);
  // in web streams there is no backpressure so we can alwas write more
  return true;
}

export function completeWriting(destination) {
  if (currentView && writtenBytes > 0) {
    destination.enqueue(new Uint8Array(currentView.buffer, 0, writtenBytes));
    currentView = null;
    writtenBytes = 0;
  }
}

export function close(destination) {
  destination.close();
}

const textEncoder = new TextEncoder();

export function stringToChunk(content) {
  return textEncoder.encode(content);
}

export function stringToPrecomputedChunk(content) {
  return textEncoder.encode(content);
}

export function closeWithError(destination, error) {
  if (typeof destination.error === 'function') {
    // $FlowFixMe: This is an Error object or the destination accepts other types.
    destination.error(error);
  } else {
    // Earlier implementations doesn't support this method. In that environment you're
    // supposed to throw from a promise returned but we don't return a promise in our
    // approach. We could fork this implementation but this is environment is an edge
    // case to begin with. It's even less common to run this in an older environment.
    // Even then, this is not where errors are supposed to happen and they get reported
    // to a global callback in addition to this anyway. So it's fine just to close this.
    destination.close();
  }
}
