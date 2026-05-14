const React = require('react');
const { View } = require('react-native');

module.exports = {
  SvgXml: ({ testID }) =>
    React.createElement(View, { testID: testID ?? 'svg-xml' }),
};
