import React from 'react';

interface MapEmbedProps {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  className?: string;
}

/** OpenStreetMap embed (no API key). Falls back gracefully with a directions link. */
const MapEmbed: React.FC<MapEmbedProps> = ({ lat, lng, name = 'Établissement', address, className = '' }) => {
  const d = 0.006;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className={`card-flat overflow-hidden ${className}`}>
      <iframe
        title={`Carte de ${name}`}
        src={src}
        loading="lazy"
        className="w-full h-44 border-0 block"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="text-xs text-muted line-clamp-1 flex items-center gap-2 min-w-0">
          <i className="fa-solid fa-location-dot text-accentStrong shrink-0" aria-hidden="true"></i>
          <span className="truncate">{address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</span>
        </p>
        <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm shrink-0">
          <i className="fa-solid fa-diamond-turn-right" aria-hidden="true"></i> Itinéraire
        </a>
      </div>
    </div>
  );
};

export default MapEmbed;
