/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {createContext} from 'react';

// TODO (Webpack 5) Hopefully we can remove this context entirely once the Webpack 5 upgrade is completed.
const HookNamesModuleLoaderContext = createContext(null);
HookNamesModuleLoaderContext.displayName = 'HookNamesModuleLoaderContext';

export default HookNamesModuleLoaderContext;
