import React, { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro capturado no Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Algo deu errado. Tente novamente mais tarde.</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
