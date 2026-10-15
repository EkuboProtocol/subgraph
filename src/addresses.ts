// The v3 contracts that emit logs without topics, as lowercase hex. They are
// deployed with CREATE2 at the same address on every chain this subgraph
// supports.
//
// These must stay string constants. A module-level value built by a host call
// such as Address.fromString() is initialized before the AssemblyScript
// allocator, and graph-node then writes it over the module's static data.

export const CORE = "0x00000000000014aa86c5d3c41765bb24e11bd701";
export const ORACLE = "0x517e506700271aea091b02f42756f5e174af5230";
export const LEGACY_TWAMM = "0xd4f1060cb9c1a13e1d2d20379b8aa2cf7541ed9b";
export const TWAMM = "0xd47f1b1edcfeabb08f6ebd8fc337c27e636c75ba";
export const BOOSTED_FEES_CONCENTRATED =
  "0xd4b54d0ca6979da05f25895e6e269e678ba00f9e";
export const BOOSTED_FEES_STABLESWAP =
  "0x948b9c2c99718034954110cb61a6e08e107745f9";
