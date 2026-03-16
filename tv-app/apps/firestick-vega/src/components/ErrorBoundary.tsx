import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface State {
  hasError: boolean;
  error: string;
  count: number;
}

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '', count: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error: String(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info);
  }

  componentDidUpdate(_: Props, prev: State) {
    if (this.state.hasError && !prev.hasError) {
      // Auto-reset after 3 seconds so the app recovers
      this.resetTimer = setTimeout(() => {
        this.setState(s => ({ hasError: false, error: '', count: s.count + 1 }));
        if (this.props.onReset) this.props.onReset();
      }, 3000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.label}>Recovering...</Text>
          <Text style={s.detail} numberOfLines={3}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0326',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 32,
    fontFamily: 'System',
  },
  detail: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontFamily: 'System',
    marginTop: 16,
    maxWidth: 800,
    textAlign: 'center',
  },
});
