**MoneyText** — renders money with locale formatting, tabular mono, and sign conventions (refunds/credits in the rose refund hue).

```jsx
<MoneyText amount="420.00" />
<MoneyText amount="-65.00" />        // shows −$65.00 in refund color
<MoneyText amount="241" signed />    // +$241.00
<MoneyText amount="1850.50" currency="EUR" />
```

Right-align in tables so decimals line up. Money is always a string upstream — never a float.
