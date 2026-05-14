declare module 'react-native-svg' {
  import type React from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export interface SvgXmlProps {
    xml: string | null;
    width?: number | string;
    height?: number | string;
    color?: string;
    style?: StyleProp<ViewStyle>;
    testID?: string;
  }

  export const SvgXml: React.FC<SvgXmlProps>;
}
