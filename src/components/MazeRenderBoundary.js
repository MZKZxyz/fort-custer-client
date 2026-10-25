import { Component } from 'react';

export default class MazeRenderBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div role="alert">
      <p>Maze artwork could not load.</p>
      <button onClick={this.props.onFallback}>Use classic view</button>
    </div> : this.props.children;
  }
}
