/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// This file is an intermediate layer to translate between Flight
// calls to stream output over a binary stream.

/*
FLIGHT PROTOCOL GRAMMAR

Response
- RowSequence

RowSequence
- Row RowSequence
- Row

Row
- "J" RowID JSONData
- "M" RowID JSONModuleData
- "H" RowID HTMLData
- "B" RowID BlobData
- "U" RowID URLData
- "E" RowID ErrorData

RowID
- HexDigits ":"

HexDigits
- HexDigit HexDigits
- HexDigit

HexDigit
- 0-F

URLData
- (UTF8 encoded URL) "\n"

ErrorData
- (UTF8 encoded JSON: {message: "...", stack: "..."}) "\n"

JSONData
- (UTF8 encoded JSON) "\n"
  - String values that begin with $ are escaped with a "$" prefix.
  - References to other rows are encoding as JSONReference strings.

JSONReference
- "$" HexDigits

HTMLData
- ByteSize (UTF8 encoded HTML)

BlobData
- ByteSize (Binary Data)

ByteSize
- (unsigned 32-bit integer)
*/

// TODO: Implement HTMLData, BlobData and URLData.

import {stringToChunk} from './ReactServerStreamConfig';

const stringify = JSON.stringify;

function serializeRowHeader(tag, id) {
  return tag + id.toString(16) + ':';
}

export function processErrorChunk(request, id, message, stack) {
  const errorInfo = {message, stack};
  const row = serializeRowHeader('E', id) + stringify(errorInfo) + '\n';
  return stringToChunk(row);
}

export function processModelChunk(request, id, model) {
  const json = stringify(model, request.toJSON);
  const row = serializeRowHeader('J', id) + json + '\n';
  return stringToChunk(row);
}

export function processModuleChunk(request, id, moduleMetaData) {
  const json = stringify(moduleMetaData);
  const row = serializeRowHeader('M', id) + json + '\n';
  return stringToChunk(row);
}

export function processProviderChunk(request, id, contextName) {
  const row = serializeRowHeader('P', id) + contextName + '\n';
  return stringToChunk(row);
}

export function processSymbolChunk(request, id, name) {
  const json = stringify(name);
  const row = serializeRowHeader('S', id) + json + '\n';
  return stringToChunk(row);
}

export {
  scheduleWork,
  flushBuffered,
  beginWriting,
  writeChunk,
  writeChunkAndReturn,
  completeWriting,
  close,
  closeWithError,
} from './ReactServerStreamConfig';
