import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Place } from '../../types';
import { placeMarker, placePopup } from '../../utils/mapPopup';
import { GoogleMap } from '../maps/GoogleMap';
import { googleMapsSelected } from '../../utils/googleMapsLoader';

interface MapViewProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
}

export const MapView: React.FC<MapViewProps> = props => googleMapsSelected()
  ? <GoogleMap points={props.places.map(p=>({id:p.id,name:p.name,latitude:p.latitude,longitude:p.longitude}))} selectedId={props.selectedPlace?.id} onSelect={id=>{const place=props.places.find(p=>p.id===id);if(place)props.onSelectPlace(place);}} height={700}/>
  : <LegacyMapView {...props}/>;
const LegacyMapView: React.FC<MapViewProps> = ({ places, selectedPlace, onSelectPlace }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Vietnam (Da Nang coordinates by default)
    const map = L.map(mapContainerRef.current, {
      center: [16.0544, 108.2022],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // OpenStreetMap Germany is reachable in the local demo network where the
    // default OSM tile host may be blocked.
    L.tileLayer('https://a.tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Tiles: <a href="https://openstreetmap.de/">OpenStreetMap Deutschland</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    places.forEach((place) => {
      if (!place.latitude || !place.longitude) return;

      const isSelected = selectedPlace?.id === place.id;
      const categoryColor =
        place.category === 'hotel'
          ? 'bg-indigo-600'
          : place.category === 'restaurant'
          ? 'bg-amber-500'
          : 'bg-teal-600';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: placeMarker(place.rating, categoryColor, isSelected),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([place.latitude, place.longitude], { icon: customIcon }).addTo(map);

      marker.bindPopup(placePopup(place));

      marker.on('click', () => {
        onSelectPlace(place);
      });

      markersRef.current[place.id] = marker;
    });
  }, [places, selectedPlace, onSelectPlace]);

  // Fly to selected place when changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPlace) return;

    map.flyTo([selectedPlace.latitude, selectedPlace.longitude], 12, {
      duration: 1.2,
    });

    const marker = markersRef.current[selectedPlace.id];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedPlace]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full min-h-[450px] lg:min-h-[700px]" />

      {/* Map Legend Floating Tag */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200 text-xs flex items-center space-x-3 pointer-events-auto">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-teal-600"></span>
          <span className="text-slate-700 font-medium">Tour / Điểm đến</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
          <span className="text-slate-700 font-medium">Khách sạn</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-slate-700 font-medium">Nhà hàng</span>
        </div>
      </div>
    </div>
  );
};
