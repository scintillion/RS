<script>
    import { onMount } from 'svelte';
      import { FancyGreeting } from './fancy-greeting';
    onMount(async () => {
          // the original example uses await import, but that doesn't work the same in the Svelte REPL
          // to achieve the same effect, we wait to define the custom element until after the component has mounted
          if (!customElements.get('fancy-greeting')) {
          customElements.define('fancy-greeting', FancyGreeting);
          }
    });
      
      let names = ['Amy', 'Bill', 'Clara'];
      
      function addName() {
          names = [...names, 'Rory'];
      }	
  
      function setProperties(node, properties) {
          const applyProperties = () => {
              Object.entries(properties).forEach(([k, v]) => {
                  node[k] = v;
              });
          };
          applyProperties();
          return {
              update(updatedProperties) {
                  properties = updatedProperties;
                  applyProperties();
              }
          };
      }
  </script>
  <h2>
      Lazyload
  </h2>
  <p>
      You may need to refresh the page to see the effect of the lazyload.
  </p>
  <h3>
      Without using the action
  </h3>
  <fancy-greeting greeting="Howdy" names={names} />
  
  <h3>
      With using the action
  </h3>
  
  <fancy-greeting
    greeting="Howdy"
    use:setProperties={{ names: names }}
  />
  
  <button on:click={addName}>
      Add name
  </button>