// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Colors as BlueprintColors } from '@blueprintjs/core';
import { color, px, rgba } from 'csx';
import { cssRule } from 'typestyle';

export const appBackgroundColor = BlueprintColors.DARK_GRAY3;
export const splitterColor = BlueprintColors.GRAY1;
const blackColor = color(BlueprintColors.BLACK);
export const dividerBlackColor = rgba(
  blackColor.red(),
  blackColor.green(),
  blackColor.blue(),
  0.15
);
export const tableStyle = {
  backgroundColor: BlueprintColors.DARK_GRAY4,
  headerBackgroundColor: BlueprintColors.DARK_GRAY4,
  headerHoverBackgroundColor: BlueprintColors.DARK_GRAY5,
  tableBorderWidth: px(1),
  tableBorderColor: dividerBlackColor,
  resizeHandleColor: BlueprintColors.BLUE3
};

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
