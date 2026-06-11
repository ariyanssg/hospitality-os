/** Atrium — the Vela design system. Public surface consumed by apps (doc 17). */
export { cn } from './lib/cn';

export { ThemeProvider, useTheme, type Theme } from './providers/theme-provider';
export { DensityProvider, useDensity, type Density } from './providers/density-provider';

export { Button, type ButtonProps } from './components/button';
export { Input } from './components/input';
export { Badge, type BadgeProps } from './components/badge';
export { Kbd } from './components/kbd';
export { Skeleton } from './components/skeleton';
export { Drawer } from './components/drawer';
export { MoneyText, type MoneyJSON } from './components/money-text';
export { ReservationStatusBadge } from './components/reservation-status-badge';
export { RoomStatusChip, type RoomState } from './components/room-status-chip';
export { DataGrid, type DataGridProps, type ColumnDef } from './components/data-grid';
export { CommandPalette, type CommandItem } from './components/command-palette';
export { PulseBar, type PulseChip } from './components/pulse-bar';
