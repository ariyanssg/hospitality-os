**Input** — single-line text field. Pair with a `<label>` and caption-sized field label above it.

```jsx
<label className="block">
  <span>Email</span>
  <Input type="email" placeholder="frankie@grand-vela.demo" />
</label>
<Input mono placeholder="BK-1042" />
<Input invalid defaultValue="bad@" />
```

Set `invalid` to surface a server-side error inline (border + ring go critical). Use `mono` for confirmation numbers, codes and amounts.
