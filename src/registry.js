// Registry: block metadata, the parity source of truth. The JSON literal between the
// markers is parsed by tools/parity.mjs from the BUILT artifact — keep it strict JSON.
// Shape: { "<catalogName>": { id, tier, variants: { "<variantKey>": { functional, tiles:[tileId],
//   hardness, drop, light, solid } } } }
// Variant key rule: catalog `labels` if present; v==1 -> "default"; v>1 without labels -> "0".."v-1".
window.CF = window.CF || {};
window.CF.REGISTRY = /*REGISTRY-START*/
{
}/*REGISTRY-END*/;
