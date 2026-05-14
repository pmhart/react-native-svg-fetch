const React = require('react');

const View = ({ testID, style, children }) =>
  React.createElement('View', { testID, style }, children);

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) =>
    Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
};

module.exports = {
  View,
  StyleSheet,
};
