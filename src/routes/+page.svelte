<script>	
	import ReflectProperty from '../Tiles/ReflectProperty.svelte';
	import BooleanProperty from '../Tiles/BooleanProperty.svelte';
	import Lazyload from '../Tiles/Lazyload.svelte';
	
	let currentComponent = ReflectProperty;
</script>

<h1>
	Svelte + custom elements
</h1>

<p>
	This is a supporting demo for a CSS tricks article on Svelte and custom elements (add link once live).
</p>

<button on:click={() => { currentComponent = ReflectProperty; }}>
	Reflect property
</button>
<button on:click={() => { currentComponent = Lazyload; }}>
	Lazyload
</button>
<button on:click={() => { currentComponent = BooleanProperty; }}>
	Boolean property
</button>

{#if currentComponent}
	<svelte:component this={currentComponent} />
{/if}