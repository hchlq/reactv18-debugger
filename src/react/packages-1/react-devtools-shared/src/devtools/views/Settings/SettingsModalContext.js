/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {createContext, useMemo, useState} from 'react';

const SettingsModalContext = createContext(null);
SettingsModalContext.displayName = 'SettingsModalContext';

function SettingsModalContextController({children}) {
  const [isModalShowing, setIsModalShowing] = useState(false);

  const value = useMemo(
    () => ({isModalShowing, setIsModalShowing}),
    [isModalShowing, setIsModalShowing],
  );

  return (
    <SettingsModalContext.Provider value={value}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export {SettingsModalContext, SettingsModalContextController};
