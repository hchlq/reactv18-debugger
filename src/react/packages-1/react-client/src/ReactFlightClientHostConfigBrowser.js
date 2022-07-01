/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

export const supportsBinaryStreams = true;

export function createStringDecoder() {
  return new TextDecoder();
}

const decoderOptions = {stream: true};

export function readPartialStringChunk(decoder, buffer) {
  return decoder.decode(buffer, decoderOptions);
}

export function readFinalStringChunk(decoder, buffer) {
  return decoder.decode(buffer);
}
