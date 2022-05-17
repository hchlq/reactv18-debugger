/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                
             
                       
                                    
                           

export function createFundamentalStateInstance      (
  currentFiber       ,
  props        ,
  impl                            ,
  state        ,
)                                          {
  return {
    currentFiber,
    impl,
    instance: null,
    prevProps: null,
    props,
    state,
  };
}
