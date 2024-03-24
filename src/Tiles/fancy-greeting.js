import { html, css, LitElement } from 'lit';
export class FancyGreeting extends LitElement {
  static get styles() {
    return css`
      p {
        border: 5px dashed mediumaquamarine;
        padding: 4px;
      }
    `;
  }
  static get properties() {
    return {
      names: { type: Array },
      greeting: { type: String }
    };
  }
  constructor() {
    super();
    this.names = [];
  }
  render() {
    return html`<p>
      ${this.greeting},
      ${this.names && this.names.length > 0 ? this.names.join(', ') : 'no one'}!
    </p>`;
  }
}

// moved the define to the Svelte component for lazyloading to work correctly