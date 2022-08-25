/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {useContext, useEffect} from 'react';
import {RegistryContext} from './Contexts';

export default function useContextMenu({data, id, onChange, ref}) {
  const {showMenu} = useContext(RegistryContext);

  useEffect(() => {
    if (ref.current !== null) {
      const handleContextMenu = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const pageX = event.pageX || (event.touches && event.touches[0].pageX);
        const pageY = event.pageY || (event.touches && event.touches[0].pageY);

        showMenu({data, id, onChange, pageX, pageY});
      };

      const trigger = ref.current;
      trigger.addEventListener('contextmenu', handleContextMenu);

      return () => {
        trigger.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [data, id, showMenu]);
}
