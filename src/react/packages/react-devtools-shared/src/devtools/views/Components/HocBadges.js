/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import styles from './HocBadges.css';

export default function HocBadges({element}) {
  const {hocDisplayNames} = element;

  if (hocDisplayNames === null) {
    return null;
  }

  return (
    <div className={styles.HocBadges}>
      {hocDisplayNames !== null &&
        hocDisplayNames.map((hocDisplayName) => (
          <div key={hocDisplayName} className={styles.Badge}>
            {hocDisplayName}
          </div>
        ))}
    </div>
  );
}
