// Registry: block metadata, the parity source of truth. The JSON literal between the
// markers is parsed by tools/parity.mjs from the BUILT artifact — keep it strict JSON.
// Shape: { "<catalogName>": { id (1.12.2 numeric, cosmetic), tier, variants: { "<variantKey>": {
//   functional, tiles:[6 px,nx,py,ny,pz,nz], hardness, drop, tool, minTier, solid, light } } } }
// Variant key rule: catalog `labels` if present; v==1 -> "default"; v>1 without labels -> "0".."v-1".
// minTier: 0 hand, 1 wood, 2 stone, 3 iron, 4 diamond (1.12 gate levels; see REFERENCE §tool tiers).
window.CF = window.CF || {};
window.CF.REGISTRY = /*REGISTRY-START*/
{
 "stone": {
  "id": 1,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "stone",
     "stone",
     "stone",
     "stone",
     "stone",
     "stone"
    ],
    "hardness": 1.5,
    "drop": "cobblestone",
    "tool": "pickaxe",
    "minTier": 1,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "interact.slow-tier"
     ]
    }
   }
  }
 },
 "grass": {
  "id": 2,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "grass_side",
     "grass_side",
     "grass_top",
     "dirt",
     "grass_side",
     "grass_side"
    ],
    "hardness": 0.9,
    "drop": "dirt",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "world.grass-spread"
     ]
    }
   }
  }
 },
 "dirt": {
  "id": 3,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "dirt",
     "dirt",
     "dirt",
     "dirt",
     "dirt",
     "dirt"
    ],
    "hardness": 0.5,
    "drop": "dirt",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists"
     ]
    }
   }
  }
 },
 "cobblestone": {
  "id": 4,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "cobblestone",
     "cobblestone",
     "cobblestone",
     "cobblestone",
     "cobblestone",
     "cobblestone"
    ],
    "hardness": 2,
    "drop": "cobblestone",
    "tool": "pickaxe",
    "minTier": 1,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "interact.slow-tier"
     ]
    }
   }
  }
 },
 "planks": {
  "id": 5,
  "tier": 1,
  "variants": {
   "oak": {
    "functional": true,
    "tiles": [
     "planks_oak",
     "planks_oak",
     "planks_oak",
     "planks_oak",
     "planks_oak",
     "planks_oak"
    ],
    "hardness": 2,
    "drop": "planks",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists"
     ]
    }
   }
  }
 },
 "log": {
  "id": 17,
  "tier": 1,
  "variants": {
   "oak": {
    "functional": true,
    "tiles": [
     "log_side_oak",
     "log_side_oak",
     "log_top_oak",
     "log_top_oak",
     "log_side_oak",
     "log_side_oak"
    ],
    "hardness": 2,
    "drop": "log",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists"
     ]
    }
   }
  }
 },
 "leaves": {
  "id": 18,
  "tier": 1,
  "variants": {
   "oak": {
    "functional": false,
    "tiles": [
     "leaves_oak",
     "leaves_oak",
     "leaves_oak",
     "leaves_oak",
     "leaves_oak",
     "leaves_oak"
    ],
    "hardness": 0.2,
    "drop": null,
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0
   }
  }
 },
 "bedrock": {
  "id": 7,
  "tier": 1,
  "variants": {
   "default": {
    "functional": false,
    "tiles": [
     "bedrock",
     "bedrock",
     "bedrock",
     "bedrock",
     "bedrock",
     "bedrock"
    ],
    "hardness": -1,
    "drop": null,
    "tool": null,
    "minTier": 9,
    "solid": true,
    "light": 0
   }
  }
 },
 "sand": {
  "id": 12,
  "tier": 1,
  "variants": {
   "sand": {
    "functional": true,
    "tiles": [
     "sand",
     "sand",
     "sand",
     "sand",
     "sand",
     "sand"
    ],
    "hardness": 0.5,
    "drop": "sand",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "world.gravity-fall"
     ]
    }
   }
  }
 },
 "gravel": {
  "id": 13,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "gravel",
     "gravel",
     "gravel",
     "gravel",
     "gravel",
     "gravel"
    ],
    "hardness": 0.6,
    "drop": "gravel",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "world.gravity-fall",
      "interact.gravel-flint"
     ]
    }
   }
  }
 },
 "glass": {
  "id": 20,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "glass",
     "glass",
     "glass",
     "glass",
     "glass",
     "glass"
    ],
    "hardness": 0.3,
    "drop": null,
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists"
     ]
    }
   }
  }
 },
 "obsidian": {
  "id": 49,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "obsidian",
     "obsidian",
     "obsidian",
     "obsidian",
     "obsidian",
     "obsidian"
    ],
    "hardness": 50,
    "drop": "obsidian",
    "tool": "pickaxe",
    "minTier": 4,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists"
     ]
    }
   }
  }
 },
 "coal_ore": {
  "id": 16,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "coal_ore",
     "coal_ore",
     "coal_ore",
     "coal_ore",
     "coal_ore",
     "coal_ore"
    ],
    "hardness": 3,
    "drop": "coal",
    "tool": "pickaxe",
    "minTier": 1,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "interact.slow-tier"
     ]
    }
   }
  }
 },
 "iron_ore": {
  "id": 15,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "iron_ore",
     "iron_ore",
     "iron_ore",
     "iron_ore",
     "iron_ore",
     "iron_ore"
    ],
    "hardness": 3,
    "drop": "iron_ore",
    "tool": "pickaxe",
    "minTier": 2,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "interact.slow-tier"
     ]
    }
   }
  }
 },
 "gold_ore": {
  "id": 14,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "gold_ore",
     "gold_ore",
     "gold_ore",
     "gold_ore",
     "gold_ore",
     "gold_ore"
    ],
    "hardness": 3,
    "drop": "gold_ingot",
    "tool": "pickaxe",
    "minTier": 3,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "interact.slow-tier"
     ]
    }
   }
  }
 },
 "diamond_ore": {
  "id": 56,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "diamond_ore",
     "diamond_ore",
     "diamond_ore",
     "diamond_ore",
     "diamond_ore",
     "diamond_ore"
    ],
    "hardness": 3,
    "drop": "diamond",
    "tool": "pickaxe",
    "minTier": 3,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#006 #013",
     "tests": [
      "interact.break-time",
      "interact.place",
      "world.set-persists",
      "interact.slow-tier"
     ]
    }
   }
  }
 }
}/*REGISTRY-END*/;

// Engine-side id<->name index (0 = air, implicit).
(function () {
  const CF = window.CF;
  CF.BY_ID = []; CF.BY_NAME = {}; CF.ID_TO_VARIANT = [];
  let next = 1;
  for (const name of Object.keys(CF.REGISTRY)) {
    const reg = CF.REGISTRY[name];
    CF.BY_NAME[name] = reg;
    for (const key of Object.keys(reg.variants)) {
      const v = reg.variants[key];
      v.id = next; v.name = name; v.variant = key;
      CF.BY_ID[next] = v; CF.ID_TO_VARIANT[next] = name + (key === 'default' ? '' : ':' + key);
      CF.IDOF = CF.IDOF || {};
      CF.IDOF[name + (key === 'default' ? '' : ':' + key)] = next;
      if (!CF.IDOF[name]) CF.IDOF[name] = next;
      next++;
    }
  }
  CF.AIR = 0;
  CF.solidAt = (id) => id !== 0 && CF.BY_ID[id] && CF.BY_ID[id].solid;
  CF.tileFor = (id, faceIdx) => { const v = CF.BY_ID[id]; return v ? v.tiles[faceIdx] : 'MISSING'; };

  CF.registryTests = async (r) => {
    const meta = window.__TEXMETA || {};
    let allTiles = true, allSix = true;
    for (const name of Object.keys(CF.REGISTRY)) {
      for (const key of Object.keys(CF.REGISTRY[name].variants)) {
        const v = CF.REGISTRY[name].variants[key];
        if (v.tiles.length !== 6) allSix = false;
        for (const t of v.tiles) if (!meta[t]) allTiles = false;
      }
    }
    CF.assert(r, 'registry.tiles-exist', allTiles);
    CF.assert(r, 'registry.tiles-6-faces', allSix);
    CF.assert(r, 'registry.planks-oak', !!CF.REGISTRY.planks.variants.oak);
    CF.assert(r, 'registry.ids-unique', new Set(CF.BY_ID.map((v) => v && v.id)).size === CF.BY_ID.length);
  };
})();
