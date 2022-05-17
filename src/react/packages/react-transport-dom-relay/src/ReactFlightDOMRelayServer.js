/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                                   
             
                
              
                                               

import {createRequest, startWork} from 'react-server/src/ReactFlightServer';

function render(
  model            ,
  destination             ,
  config               ,
)       {
  const request = createRequest(model, destination, config);
  startWork(request);
}

export {render};
