// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Colors as BlueprintColors } from '@blueprintjs/core';
import { cssRule } from 'typestyle';

export const appBackgroundColor = BlueprintColors.DARK_GRAY3;
export const splitterColor = BlueprintColors.GRAY1;

export function injectCssRules() {
  cssRule('#appWindowContainer', {
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column'
  });

  cssRule('.p-SplitPanel-handle', {
    backgroundColor: splitterColor
  });
}
