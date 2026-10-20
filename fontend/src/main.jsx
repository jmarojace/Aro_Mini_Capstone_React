import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <main className="app-error"><div className="brand-mark">!</div><h1>That page hit a problem.</h1><p>The app caught an error instead of leaving a blank screen.</p><code>{this.state.error.message}</code><button onClick={() => window.location.reload()}>Reload app</button></main>
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
)
