import * as React from 'react';
import * as ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-resizable/css/styles.css';
import 'react-virtualized/styles.css';

export interface EmbedOptions {
    standalone: boolean;
}

export function embed(element: Element, options?: EmbedOptions): void {
    ReactDOM.render(<div>Foo</div>, document.getElementById('root'));
}
