**RoomStatusChip** — the one true way to show a room's housekeeping/occupancy state. The colors are sacred and never used for anything else.

```jsx
<RoomStatusChip state="vacant-clean" />
<RoomStatusChip state="ooo" />
<RoomStatusChip state="occupied" chip />   // filled pill variant
```

States: `vacant-clean` · `vacant-dirty` · `occupied` · `inspected` · `ooo` · `oos` · `arrival` · `departure`. Always shows a label too (color-never-alone).
