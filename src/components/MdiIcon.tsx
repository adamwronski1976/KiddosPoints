import React from 'react';

interface Props {
  icon?: string;
  className?: string;
}

/** Renderuje prawdziwą ikonę Material Design przez natywny web-component
 *  Home Assistant <ha-icon> (już załadowany globalnie, bo panel działa
 *  wewnątrz HA - żadna dodatkowa biblioteka ikon nie jest potrzebna).
 *  Poza HA (np. `npm run dev`) po prostu nic się nie renderuje. */
export const MdiIcon: React.FC<Props> = ({ icon, className }) => {
  if (!icon) return null;
  return <ha-icon icon={icon} className={className}></ha-icon>;
};
