import { View, Text, StyleSheet } from 'react-native';

export default function RankScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>智能排名</Text>
      <Text style={styles.sub}>即将上线</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  text: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  sub: { fontSize: 14, color: '#999', marginTop: 8 },
});