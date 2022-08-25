/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

export function scheduleWork(callback) {
  // We don't schedule work in this model, and instead expect performWork to always be called repeatedly.
}

export function flushBuffered(destination) {}

export function beginWriting(destination) {}

export function writeChunk(destination, chunk) {
  destination.buffer += chunk;
}

export function writeChunkAndReturn(destination, chunk) {
  destination.buffer += chunk;
  return true;
}

export function completeWriting(destination) {}

export function close(destination) {
  destination.done = true;
}

export function stringToChunk(content) {
  return content;
}

export function stringToPrecomputedChunk(content) {
  return content;
}

export function closeWithError(destination, error) {
  destination.done = true;
  destination.fatal = true;
  destination.error = error;
}
