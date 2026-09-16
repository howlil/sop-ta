---
name: call-graph-output
description: Produce consistent plain-text call graphs, execution flows, and architecture traces with separate Production and Tests sections when they differ. Use when documenting project overviews, architecture summaries, execution paths, or component/service relationships.
---

## Call Graph Output

When showing call graphs, execution flows, or architecture traces, use this format:

Production:

```ts
HTTP handlers
  → ComponentA
    → ComponentA.layerX
      → ComponentB
        → ComponentC
```

Tests:

```ts
HTTP handlers
  → ComponentA
    → componentMemoryLayer
      → ComponentA.layer
        → ComponentB.layerMemory
```

- Plain text only, no rendered diagrams
- Indented `→` arrows for hierarchy
- `ts` code block
- Production and Tests as separate sections when they differ
- Include call graphs in project overviews, architecture summaries, and code explanations
