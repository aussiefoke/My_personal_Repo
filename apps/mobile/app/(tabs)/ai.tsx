import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useState, useRef } from 'react';
import { apiClient } from '../../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  '附近哪个充电站现在最便宜？',
  '现在几点充电最划算？',
  '哪个充电站快充桩最多？',
  '推荐一个可靠性高的充电站',
];

export default function AIScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好！我是 ChargeSmart AI 助手，可以帮你找到最合适的充电站。有什么可以帮你的？',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;

    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await apiClient.post('/ai/chat', {
        message: msg,
        lat: 22.5396,
        lng: 114.0577,
      });
      setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '抱歉，AI 服务暂时不可用，请稍后再试。',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((m, i) => (
          <View key={i} style={[
            styles.bubble,
            m.role === 'user' ? styles.userBubble : styles.aiBubble
          ]}>
            {m.role === 'assistant' && (
              <Text style={styles.aiLabel}>AI 助手</Text>
            )}
            <Text style={[
              styles.bubbleText,
              m.role === 'user' ? styles.userText : styles.aiText
            ]}>
              {m.content}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiLabel}>AI 助手</Text>
            <ActivityIndicator size="small" color="#1DB954" style={{ marginTop: 4 }} />
          </View>
        )}

        {/* 快捷问题 */}
        {messages.length === 1 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>你可以这样问：</Text>
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionBtn}
                onPress={() => send(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 输入框 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="问我关于充电的任何问题..."
          placeholderTextColor="#999"
          multiline
          maxLength={200}
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12, paddingBottom: 20 },

  bubble: {
    maxWidth: '85%', padding: 12, borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: '#1DB954',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  aiLabel: { fontSize: 11, color: '#1DB954', fontWeight: '600', marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#1a1a1a' },

  suggestions: { marginTop: 8, gap: 8 },
  suggestionsTitle: { fontSize: 13, color: '#999', marginBottom: 4 },
  suggestionBtn: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  suggestionText: { fontSize: 14, color: '#1DB954' },

  inputBar: {
    flexDirection: 'row', padding: 12, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#eee',
    gap: 8, alignItems: 'flex-end',
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#1a1a1a', maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#1DB954', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});