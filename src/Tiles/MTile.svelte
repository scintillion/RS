<script>
	export class MagicTile extends HTMLElement {
        myProperty = null;
        other = null;
        constructor() {
			super();
		}
		
		connectedCallback() {
			const div = document.createElement('div');
			div.innerHTML = `myProperty: ${JSON.stringify(this.myProperty)}, other: ${JSON.stringify(this.other)}, myproperty: ${JSON.stringify(this.getAttribute('myproperty'))}`;
			this.append(div);
		}
	}
	
	customElements.define('magic-tile', MagicTile);
	
	const obj = {
		hello: 'world'
	};
</script>


<h1>MTile Message!</h1>
<slot />

