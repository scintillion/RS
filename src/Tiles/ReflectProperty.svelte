<script lang='ts'>
    import './custom-text';
    function setAttributes(node:any, attributes:any) {
      const applyAttributes = () => {
        Object.entries(attributes).forEach(([k, v]) => {
          if (v !== undefined) {
            node.setAttribute(k, v);
          } else {
            node.removeAttribute(k);
          }
        });
      };
      applyAttributes();
      return {
        update(updatedAttributes:any) {
          attributes = updatedAttributes;
          applyAttributes();
        }
      };
    }
    let flagged = true;
  </script>
  <h2>
      Reflect property
  </h2>
  <label><input type="checkbox" bind:checked={flagged} /> Flagged</label>
  <h3>
      Without using the action
  </h3>
  <custom-text flag={flagged}>
    Just some custom text.
  </custom-text>
  <h3>
      Using the setAttributes action
  </h3>
  <custom-text use:setAttributes={{ flag: flagged ? '' : undefined }}>
    Just some custom text.
  </custom-text>