import React, { Component, ReactNode } from 'react';
import { FiestaProvider } from 'react-native-fiesta';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Safe wrapper for FiestaProvider that catches initialization errors
 * and renders children without the provider if it fails
 */
export class SafeFiestaProvider extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SafeFiestaProvider: Error initializing FiestaProvider:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI: render children without FiestaProvider
      return <>{this.props.children}</>;
    }

    try {
      return <FiestaProvider>{this.props.children}</FiestaProvider>;
    } catch (error) {
      console.error('SafeFiestaProvider: Error rendering FiestaProvider:', error);
      // Fallback: render children without provider
      return <>{this.props.children}</>;
    }
  }
}
