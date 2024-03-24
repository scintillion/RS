import { html, LitElement } from 'lit';
export class SecretBox extends LitElement {
  static get properties() {
    return {
      open: {
        type: Boolean
      }
    };
  }
  render() {
    return html`<div>The box is ${this.open ? 'open 🔓' : 'closed 🔒'}</div>`;
  }
}
if (!customElements.get('secret-box')) {
	customElements.define('secret-box', SecretBox);
}