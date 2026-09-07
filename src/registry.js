// Registry: block metadata, the parity source of truth. The JSON literal between the
// markers is parsed by tools/parity.mjs from the BUILT artifact — keep it strict JSON.
// Shape: { "<catalogName>": { id (1.12.2 numeric, cosmetic), tier, variants: { "<variantKey>": {
//   functional, tiles:[6 px,nx,py,ny,pz,nz], hardness, drop, tool, minTier, solid, light } } } }
// Variant key rule: catalog `labels` if present; v==1 -> "default"; v>1 without labels -> "0".."v-1".
// minTier: 0 hand, 1 wood, 2 stone, 3 iron, 4 diamond (1.12 gate levels; see REFERENCE §tool tiers).
window.CF = window.CF || {};
window.CF.REGISTRY = /*REGISTRY-START*/{
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
   },
   "birch": {
    "functional": true,
    "tiles": [
     "planks_birch",
     "planks_birch",
     "planks_birch",
     "planks_birch",
     "planks_birch",
     "planks_birch"
    ],
    "hardness": 2,
    "drop": "planks:birch",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "interact.place",
      "world.set-persists"
     ]
    }
   },
   "jungle": {
    "functional": true,
    "tiles": [
     "planks_jungle",
     "planks_jungle",
     "planks_jungle",
     "planks_jungle",
     "planks_jungle",
     "planks_jungle"
    ],
    "hardness": 2,
    "drop": "planks:jungle",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
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
   },
   "birch": {
    "functional": true,
    "tiles": [
     "log_side_birch",
     "log_side_birch",
     "log_top_birch",
     "log_top_birch",
     "log_side_birch",
     "log_side_birch"
    ],
    "hardness": 2,
    "drop": "log:birch",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "interact.drop-birch",
      "world.leaves-decay-all",
      "grass.sapling-grow-birch"
     ]
    }
   },
   "jungle": {
    "functional": true,
    "tiles": [
     "log_side_jungle",
     "log_side_jungle",
     "log_top_jungle",
     "log_top_jungle",
     "log_side_jungle",
     "log_side_jungle"
    ],
    "hardness": 2,
    "drop": "log:jungle",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "interact.drop-birch",
      "world.leaves-decay-all",
      "grass.sapling-grow-jungle"
     ]
    }
   }
  }
 },
 "bed": {
  "id": 26,
  "tier": 1,
  "variants": {
   "white": {
    "functional": false,
    "tiles": [
     "bed_side",
     "bed_side",
     "bed_top",
     "bed_top",
     "bed_side",
     "bed_side"
    ],
    "hardness": 0.2,
    "drop": "bed",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0
   }
  }
 },
 "chest": {
  "id": 54,
  "tier": 1,
  "variants": {
   "default": {
    "functional": false,
    "tiles": [
     "chest_side",
     "chest_side",
     "chest_top",
     "chest_top",
     "chest_side",
     "chest_side"
    ],
    "hardness": 2.5,
    "drop": "chest",
    "tool": "axe",
    "minTier": 0,
    "solid": true,
    "light": 0
   }
  }
 },
 "tnt": {
  "id": 46,
  "tier": 1,
  "variants": {
   "default": {
    "functional": false,
    "tiles": [
     "tnt_side",
     "tnt_side",
     "tnt_top",
     "tnt_top",
     "tnt_side",
     "tnt_side"
    ],
    "hardness": 0,
    "drop": "tnt",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0
   }
  }
 },
 "leaves": {
  "id": 18,
  "tier": 1,
  "variants": {
   "oak": {
    "functional": true,
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
    "light": 0,
    "proof": {
     "issue": "#019",
     "tests": [
      "interact.break-time",
      "world.leaves-decay",
      "world.leaves-persist",
      "interact.leaves-drop"
     ]
    }
   },
   "birch": {
    "functional": true,
    "tiles": [
     "leaves_birch",
     "leaves_birch",
     "leaves_birch",
     "leaves_birch",
     "leaves_birch",
     "leaves_birch"
    ],
    "hardness": 0.2,
    "drop": null,
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "world.leaves-decay-all"
     ]
    }
   },
   "jungle": {
    "functional": true,
    "tiles": [
     "leaves_jungle",
     "leaves_jungle",
     "leaves_jungle",
     "leaves_jungle",
     "leaves_jungle",
     "leaves_jungle"
    ],
    "hardness": 0.2,
    "drop": null,
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "world.leaves-decay-all"
     ]
    }
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
 },
 "glowstone": {
  "id": 89,
  "tier": 2,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "glowstone",
     "glowstone",
     "glowstone",
     "glowstone",
     "glowstone",
     "glowstone"
    ],
    "hardness": 0.8,
    "drop": "glowstone",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 15,
    "proof": {
     "issue": "#020",
     "tests": [
      "light.source",
      "light.falloff",
      "light.occluded",
      "light.sky",
      "light.queue-off",
      "interact.place"
     ]
    }
   }
  }
 },
 "torch": {
  "id": 50,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "tile_torch",
     "tile_torch",
     "tile_torch",
     "tile_torch",
     "tile_torch",
     "tile_torch"
    ],
    "hardness": 0,
    "drop": "torch",
    "tool": null,
    "minTier": 0,
    "solid": false,
    "light": 14,
    "cross": true,
    "proof": {
     "issue": "#024",
     "tests": [
      "items.torch",
      "items.torch-light",
      "interact.place",
      "light.source"
     ]
    }
   }
  }
 },
 "furnace": {
  "id": 61,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "furnace",
     "furnace",
     "furnace",
     "furnace",
     "furnace",
     "furnace"
    ],
    "hardness": 3.5,
    "drop": "furnace",
    "tool": "pickaxe",
    "minTier": 1,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#032",
     "tests": [
      "items.smelt",
      "ui.furn-open",
      "ui.furn-smelt",
      "ui.furn-takeout"
     ]
    }
   }
  }
 },
 "crafting_table": {
  "id": 58,
  "tier": 1,
  "variants": {
   "default": {
    "functional": false,
    "tiles": [
     "crafting_table",
     "crafting_table",
     "crafting_table",
     "crafting_table",
     "crafting_table",
     "crafting_table"
    ],
    "hardness": 2.5,
    "drop": "crafting_table",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0
   }
  }
 },
 "water": {
  "id": 8,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "water",
     "water",
     "water",
     "water",
     "water",
     "water"
    ],
    "hardness": -1,
    "drop": null,
    "tool": null,
    "minTier": 9,
    "solid": false,
    "light": 0,
    "liquid": "water",
    "proof": {
     "issue": "#043",
     "tests": [
      "fluids.spread",
      "fluids.obsidian",
      "fluids.solidify",
      "items.bucket-fill",
      "items.bucket-place",
      "items.bucket-no-flow",
      "items.bucket-self-place"
     ]
    }
   }
  }
 },
 "lava": {
  "id": 10,
  "tier": 1,
  "variants": {
   "default": {
    "functional": true,
    "tiles": [
     "lava",
     "lava",
     "lava",
     "lava",
     "lava",
     "lava"
    ],
    "hardness": -1,
    "drop": null,
    "tool": null,
    "minTier": 9,
    "solid": false,
    "light": 15,
    "liquid": "lava",
    "proof": {
     "issue": "#043",
     "tests": [
      "fluids.lava-slow",
      "fluids.stone-lava-into-water",
      "items.bucket-lava",
      "items.bucket-fill"
     ]
    }
   }
  }
 },
 "sapling": {
  "id": 0,
  "tier": 1,
  "variants": {
   "oak": {
    "functional": true,
    "tiles": [
     "sapling_oak",
     "sapling_oak",
     "sapling_oak",
     "sapling_oak",
     "sapling_oak",
     "sapling_oak"
    ],
    "hardness": 0,
    "drop": "sapling",
    "tool": null,
    "minTier": 0,
    "solid": false,
    "light": 0,
    "cross": true,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "grass.sapling-grow-oak"
     ]
    }
   },
   "birch": {
    "functional": true,
    "tiles": [
     "sapling_birch",
     "sapling_birch",
     "sapling_birch",
     "sapling_birch",
     "sapling_birch",
     "sapling_birch"
    ],
    "hardness": 0,
    "drop": "sapling:birch",
    "tool": null,
    "minTier": 0,
    "solid": false,
    "light": 0,
    "cross": true,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "grass.sapling-grow-birch"
     ]
    }
   },
   "jungle": {
    "functional": true,
    "tiles": [
     "sapling_jungle",
     "sapling_jungle",
     "sapling_jungle",
     "sapling_jungle",
     "sapling_jungle",
     "sapling_jungle"
    ],
    "hardness": 0,
    "drop": "sapling:jungle",
    "tool": null,
    "minTier": 0,
    "solid": false,
    "light": 0,
    "cross": true,
    "proof": {
     "issue": "#049",
     "tests": [
      "registry.species-variants",
      "grass.sapling-grow-jungle"
     ]
    }
   }
  }
 },
 "wool": {
  "id": 35,
  "tier": 1,
  "variants": {
   "white": {
    "functional": true,
    "tiles": [
     "wool_white",
     "wool_white",
     "wool_white",
     "wool_white",
     "wool_white",
     "wool_white"
    ],
    "hardness": 0.8,
    "drop": "wool",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "orange": {
    "functional": true,
    "tiles": [
     "wool_orange",
     "wool_orange",
     "wool_orange",
     "wool_orange",
     "wool_orange",
     "wool_orange"
    ],
    "hardness": 0.8,
    "drop": "wool:orange",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "magenta": {
    "functional": true,
    "tiles": [
     "wool_magenta",
     "wool_magenta",
     "wool_magenta",
     "wool_magenta",
     "wool_magenta",
     "wool_magenta"
    ],
    "hardness": 0.8,
    "drop": "wool:magenta",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "light_blue": {
    "functional": true,
    "tiles": [
     "wool_light_blue",
     "wool_light_blue",
     "wool_light_blue",
     "wool_light_blue",
     "wool_light_blue",
     "wool_light_blue"
    ],
    "hardness": 0.8,
    "drop": "wool:light_blue",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "yellow": {
    "functional": true,
    "tiles": [
     "wool_yellow",
     "wool_yellow",
     "wool_yellow",
     "wool_yellow",
     "wool_yellow",
     "wool_yellow"
    ],
    "hardness": 0.8,
    "drop": "wool:yellow",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "lime": {
    "functional": true,
    "tiles": [
     "wool_lime",
     "wool_lime",
     "wool_lime",
     "wool_lime",
     "wool_lime",
     "wool_lime"
    ],
    "hardness": 0.8,
    "drop": "wool:lime",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "pink": {
    "functional": true,
    "tiles": [
     "wool_pink",
     "wool_pink",
     "wool_pink",
     "wool_pink",
     "wool_pink",
     "wool_pink"
    ],
    "hardness": 0.8,
    "drop": "wool:pink",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "gray": {
    "functional": true,
    "tiles": [
     "wool_gray",
     "wool_gray",
     "wool_gray",
     "wool_gray",
     "wool_gray",
     "wool_gray"
    ],
    "hardness": 0.8,
    "drop": "wool:gray",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "light_gray": {
    "functional": true,
    "tiles": [
     "wool_light_gray",
     "wool_light_gray",
     "wool_light_gray",
     "wool_light_gray",
     "wool_light_gray",
     "wool_light_gray"
    ],
    "hardness": 0.8,
    "drop": "wool:light_gray",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "cyan": {
    "functional": true,
    "tiles": [
     "wool_cyan",
     "wool_cyan",
     "wool_cyan",
     "wool_cyan",
     "wool_cyan",
     "wool_cyan"
    ],
    "hardness": 0.8,
    "drop": "wool:cyan",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "purple": {
    "functional": true,
    "tiles": [
     "wool_purple",
     "wool_purple",
     "wool_purple",
     "wool_purple",
     "wool_purple",
     "wool_purple"
    ],
    "hardness": 0.8,
    "drop": "wool:purple",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "blue": {
    "functional": true,
    "tiles": [
     "wool_blue",
     "wool_blue",
     "wool_blue",
     "wool_blue",
     "wool_blue",
     "wool_blue"
    ],
    "hardness": 0.8,
    "drop": "wool:blue",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "brown": {
    "functional": true,
    "tiles": [
     "wool_brown",
     "wool_brown",
     "wool_brown",
     "wool_brown",
     "wool_brown",
     "wool_brown"
    ],
    "hardness": 0.8,
    "drop": "wool:brown",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "green": {
    "functional": true,
    "tiles": [
     "wool_green",
     "wool_green",
     "wool_green",
     "wool_green",
     "wool_green",
     "wool_green"
    ],
    "hardness": 0.8,
    "drop": "wool:green",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "red": {
    "functional": true,
    "tiles": [
     "wool_red",
     "wool_red",
     "wool_red",
     "wool_red",
     "wool_red",
     "wool_red"
    ],
    "hardness": 0.8,
    "drop": "wool:red",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
     ]
    }
   },
   "black": {
    "functional": true,
    "tiles": [
     "wool_black",
     "wool_black",
     "wool_black",
     "wool_black",
     "wool_black",
     "wool_black"
    ],
    "hardness": 0.8,
    "drop": "wool:black",
    "tool": null,
    "minTier": 0,
    "solid": true,
    "light": 0,
    "proof": {
     "issue": "#050",
     "tests": [
      "registry.wool-spectrum",
      "interact.drop-wool-red",
      "interact.place"
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
    CF.assert(r, 'registry.wool-spectrum', (() => {
      const meta = window.__TEXMETA || {};
      const cols = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
      return cols.every((c) => CF.REGISTRY.wool.variants[c] && CF.IDOF['wool:' + c] && meta['wool_' + c]) && CF.IDOF['wool'] === CF.REGISTRY.wool.variants.white.id;
    })());
    CF.assert(r, 'registry.species-variants', (() => {
      const meta = window.__TEXMETA || {};
      const want = { planks: ['birch', 'jungle'], log: ['birch', 'jungle'], leaves: ['birch', 'jungle'], sapling: ['oak', 'birch', 'jungle'] };
      for (const fam in want) for (const v of want[fam]) {
        const vr = CF.REGISTRY[fam] && CF.REGISTRY[fam].variants && CF.REGISTRY[fam].variants[v];
        if (!vr || !CF.IDOF[fam + ':' + v] || !meta[vr.tiles[0]]) return false;
      }
      return true;
    })());
    CF.assert(r, 'registry.ids-unique', new Set(CF.BY_ID.map((v) => v && v.id)).size === CF.BY_ID.length);
  };
})();
