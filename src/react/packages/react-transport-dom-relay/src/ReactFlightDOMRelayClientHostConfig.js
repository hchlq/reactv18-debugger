/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                                                

import {
  parseModelString,
  parseModelTuple,
} from 'react-client/src/ReactFlightClient';

export {
  resolveModuleReference,
  preloadModule,
  requireModule,
} from 'ReactFlightDOMRelayClientIntegration';

             
                  
                 
                                              

                                                  

                                    

function parseModelRecursively(response          , parentObj, value) {
  if (typeof value === 'string') {
    return parseModelString(response, parentObj, value);
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        (value     )[i] = parseModelRecursively(response, value, value[i]);
      }
      return parseModelTuple(response, value);
    } else {
      for (const innerKey in value) {
        (value     )[innerKey] = parseModelRecursively(
          response,
          value,
          value[innerKey],
        );
      }
    }
  }
  return value;
}

const dummy = {};

export function parseModel   (response          , json                    )    {
  return (parseModelRecursively(response, dummy, json)     );
}
