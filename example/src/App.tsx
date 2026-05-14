import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgFetch } from 'react-native-svg-fetch';
import starAsset from './assets/star.svg';

const SAMPLES = [
  {
    label: 'Local asset (star)',
    source: starAsset,
  },
  {
    label: 'React logo',
    source: {
      uri: 'https://upload.wikimedia.org/wikipedia/commons/3/30/React_Logo_SVG.svg',
    },
  },
  {
    label: 'Wikimedia Commons',
    source: {
      uri: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Commons-logo.svg',
    },
  },
  {
    label: 'React logo (red)',
    source: {
      uri: 'https://upload.wikimedia.org/wikipedia/commons/3/30/React_Logo_SVG.svg',
    },
    color: 'red',
  },
];

export default function App() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {SAMPLES.map(({ label, source, color }) => (
        <View key={label} style={styles.card}>
          <Text style={styles.label}>{label}</Text>
          <SvgFetch
            source={source}
            width={120}
            height={120}
            color={color}
            fallback={
              <View style={styles.error}>
                <Text style={styles.errorText}>Failed to load</Text>
              </View>
            }
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
  },
  card: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#555',
  },
  error: {
    width: 120,
    height: 120,
    backgroundColor: '#fee',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#c00',
  },
});
