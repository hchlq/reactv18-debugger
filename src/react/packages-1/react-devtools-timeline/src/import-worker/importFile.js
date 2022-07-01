/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import 'regenerator-runtime/runtime';

import preprocessData from './preprocessData';
import {readInputData} from './readInputData';
import InvalidProfileError from './InvalidProfileError';

export async function importFile(file) {
  try {
    const readFile = await readInputData(file);
    const events = JSON.parse(readFile);
    if (events.length === 0) {
      throw new InvalidProfileError('No profiling data found in file.');
    }

    const processedData = await preprocessData(events);

    return {
      status: 'SUCCESS',
      processedData,
    };
  } catch (error) {
    if (error instanceof InvalidProfileError) {
      return {
        status: 'INVALID_PROFILE_ERROR',
        error,
      };
    } else {
      return {
        status: 'UNEXPECTED_ERROR',
        error,
      };
    }
  }
}
