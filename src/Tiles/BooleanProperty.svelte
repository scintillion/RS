<script>
	import './secret-box';
</script>

<h2>
	Boolean property
</h2>

<h3>
	Setting open to string
</h3>
<pre>{'<secret-box open></secret-box>'}</pre>
<secret-box open></secret-box>
<pre>{'<secret-box open=""></secret-box>'}</pre>
<secret-box open=""></secret-box>
<pre>{'<secret-box open="open"></secret-box>'}</pre>
<secret-box open="open"></secret-box>

<h3>
	Setting open to true
</h3>
<secret-box open={true}></secret-box>