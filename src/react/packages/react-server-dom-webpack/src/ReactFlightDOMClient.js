/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  createResponse,
  reportGlobalError,
  processStringChunk,
  processBinaryChunk,
  close,
} from 'react-client/src/ReactFlightClientStream';

function startReadingFromStream(response, stream) {
  const reader = stream.getReader();
  function progress({done, value}) {
    if (done) {
      close(response);
      return;
    }
    const buffer = value;
    processBinaryChunk(response, buffer);
    return reader.read().then(progress, error);
  }
  function error(e) {
    reportGlobalError(response, e);
  }
  reader.read().then(progress, error);
}

function createFromReadableStream(stream, options) {
  const response = createResponse(
    options && options.moduleMap ? options.moduleMap : null,
  );
  startReadingFromStream(response, stream);
  return response;
}

function createFromFetch(promiseForResponse, options) {
  const response = createResponse(
    options && options.moduleMap ? options.moduleMap : null,
  );
  promiseForResponse.then(
    function (r) {
      startReadingFromStream(response, r.body);
    },
    function (e) {
      reportGlobalError(response, e);
    },
  );
  return response;
}

function createFromXHR(request, options) {
  const response = createResponse(
    options && options.moduleMap ? options.moduleMap : null,
  );
  let processedLength = 0;
  function progress(e) {
    const chunk = request.responseText;
    processStringChunk(response, chunk, processedLength);
    processedLength = chunk.length;
  }
  function load(e) {
    progress(e);
    close(response);
  }
  function error(e) {
    reportGlobalError(response, new TypeError('Network error'));
  }
  request.addEventListener('progress', progress);
  request.addEventListener('load', load);
  request.addEventListener('error', error);
  request.addEventListener('abort', error);
  request.addEventListener('timeout', error);
  return response;
}

export {createFromXHR, createFromFetch, createFromReadableStream};
