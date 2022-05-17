/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import {convertStringToBuffer} from 'react-server/src/ReactServerStreamConfig';

export function formatChunkAsString(type        , props        )         {
  let str = '<' + type + '>';
  if (typeof props.children === 'string') {
    str += props.children;
  }
  str += '</' + type + '>';
  return str;
}

export function formatChunk(type        , props        )             {
  return convertStringToBuffer(formatChunkAsString(type, props));
}
