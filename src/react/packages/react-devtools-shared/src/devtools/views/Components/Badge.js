/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {Fragment} from 'react';
import styles from './Badge.css';

export default function Badge({className, hocDisplayNames, type, children}) {
  if (hocDisplayNames === null || hocDisplayNames.length === 0) {
    return null;
  }

  const totalBadgeCount = hocDisplayNames.length;

  return (
    <Fragment>
      <div className={`${styles.Badge} ${className || ''}`}>{children}</div>
      {totalBadgeCount > 1 && (
        <div className={styles.ExtraLabel}>+{totalBadgeCount - 1}</div>
      )}
    </Fragment>
  );
}
