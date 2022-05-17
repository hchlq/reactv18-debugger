/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                                            

             
              
                
                  
                 
                                              

import {resolveModelToJSON} from 'react-server/src/ReactFlightServer';

import {
  emitModel,
  emitError,
  resolveModuleMetaData as resolveModuleMetaDataImpl,
} from 'ReactFlightDOMRelayServerIntegration';

             
              
                
                  
                 
                                              

export function resolveModuleMetaData   (
  config               ,
  resource                    ,
)                 {
  return resolveModuleMetaDataImpl(config, resource);
}

                
          
          
           
        
                               
                     

                   
     
                   
                 
                      
     
     
                    
                 
             
                        
                      
           
        
      

export function processErrorChunk(
  request         ,
  id        ,
  message        ,
  stack        ,
)        {
  return {
    type: 'error',
    id: id,
    json: {
      message,
      stack,
    },
  };
}

function convertModelToJSON(
  request         ,
  parent                                                           ,
  key        ,
  model            ,
)            {
  const json = resolveModelToJSON(request, parent, key, model);
  if (typeof json === 'object' && json !== null) {
    if (Array.isArray(json)) {
      const jsonArray                   = [];
      for (let i = 0; i < json.length; i++) {
        jsonArray[i] = convertModelToJSON(request, json, '' + i, json[i]);
      }
      return jsonArray;
    } else {
      const jsonObj                             = {};
      for (const nextKey in json) {
        jsonObj[nextKey] = convertModelToJSON(
          request,
          json,
          nextKey,
          json[nextKey],
        );
      }
      return jsonObj;
    }
  }
  return json;
}

export function processModelChunk(
  request         ,
  id        ,
  model            ,
)        {
  const json = convertModelToJSON(request, {}, '', model);
  return {
    type: 'json',
    id: id,
    json: json,
  };
}

export function scheduleWork(callback            ) {
  callback();
}

export function flushBuffered(destination             ) {}

export function beginWriting(destination             ) {}

export function writeChunk(destination             , chunk       )          {
  if (chunk.type === 'json') {
    emitModel(destination, chunk.id, chunk.json);
  } else {
    emitError(destination, chunk.id, chunk.json.message, chunk.json.stack);
  }
  return true;
}

export function completeWriting(destination             ) {}

export {close} from 'ReactFlightDOMRelayServerIntegration';
