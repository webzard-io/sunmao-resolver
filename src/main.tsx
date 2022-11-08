import React from 'react';
import ReactDOM from 'react-dom';
import { Viewer } from './Viewer';

export default function renderApp() {
  ReactDOM.render(<Viewer />, document.getElementById('root'));
}
