import { html, css, LitElement } from 'lit';
export class CustomText extends LitElement {
  static get styles() {
    return css`
      :host([flag]) p::before {
        content: '🚩';
      }
    `;
  }
  static get properties() {
    return {
      flag: {
        type: Boolean
      }
    };
  }
  constructor() {
    super();
    this.flag = false;
  }
  render() {
    return html`<p>
      ${this.flag ? html`<strong>Flagged:</strong>` : ''}
      <slot></slot>
    </p>`;
  }
}

if (!customElements.get('custom-text')) {
	customElements.define('custom-text', CustomText);
}