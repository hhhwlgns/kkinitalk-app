// A true minimal entry is useful when Expo Go itself exits before JavaScript
// errors can reach Metro. In normal runs this delegates to Expo Router exactly
// as before; diagnostic mode avoids importing the router and every app route.
if (process.env.EXPO_PUBLIC_DIAGNOSTIC_MODE === 'true') {
  const React = require('react');
  const { registerRootComponent } = require('expo');
  const { StyleSheet, Text, View } = require('react-native');

  function DiagnosticApp() {
    return React.createElement(
      View,
      { style: styles.container },
      React.createElement(Text, { style: styles.title }, '끼니톡 최소 진단 화면'),
      React.createElement(Text, { style: styles.description }, 'Expo Go와 기본 React Native 실행은 정상입니다.'),
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F5EEE2',
      padding: 24,
    },
    title: {
      color: '#E15B26',
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
    },
    description: {
      color: '#2E251C',
      fontSize: 17,
      lineHeight: 25,
      textAlign: 'center',
      marginTop: 12,
    },
  });

  registerRootComponent(DiagnosticApp);
} else {
  require('expo-router/entry');
}
