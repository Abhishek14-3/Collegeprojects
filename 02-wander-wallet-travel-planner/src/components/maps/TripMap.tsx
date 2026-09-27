"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigation2, CloudRain, Thermometer, Cloud, Wind, Layers, Map as MapIcon } from "lucide-react";
import { GeneratedItineraryItem } from "@/lib/itinerary/engine";
import { getBaseCoordsForDestination } from "@/lib/maps/geocoding";

export interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  category?: string;
  cost?: string;
}

export interface TripMapProps {
  items: GeneratedItineraryItem[];
  center?: [number, number];
  zoom?: number;
  selectedItemId?: string;
  destination?: string;
  onMarkerSelect?: (item: GeneratedItineraryItem) => void;
  className?: string;
}

type WeatherLayerType = "none" | "precipitation_new" | "temp_new" | "clouds_new" | "wind_new";

interface LiveWeather {
  city: string;
  temp: number;
  feelsLike: number;
  condition: string;
  description: string;
  iconUrl: string;
  humidity: number;
  windSpeedKmH: number;
  latitude?: number;
  longitude?: number;
}

const OWM_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || "27418dc66a18ed7e81851dc1fe4f255d";

export function TripMap({
  items,
  center,
  zoom = 12,
  selectedItemId,
  destination,
  onMarkerSelect,
  className = "h-[450px] w-full",
}: TripMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const weatherTileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<any>(null);

  // Compute dynamic center coordinates based on chosen destination or passed center
  const initialCenter = useMemo<[number, number]>(() => {
    if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      return center;
    }
    if (destination) {
      return getBaseCoordsForDestination(destination);
    }
    return [28.6139, 77.2090]; // Neutral fallback (Delhi)
  }, [center, destination]);

  const [effectiveCenter, setEffectiveCenter] = useState<[number, number]>(initialCenter);
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<WeatherLayerType>("none");
  const [liveWeather, setLiveWeather] = useState<LiveWeather | null>(null);

  // Synchronize effectiveCenter when destination changes
  useEffect(() => {
    if (destination) {
      setEffectiveCenter(getBaseCoordsForDestination(destination));
    } else if (center) {
      setEffectiveCenter(center);
    }
  }, [destination, center]);

  // Filter items that have coordinates
  const geoItems = items.filter(
    (item) => item.latitude !== undefined && item.longitude !== undefined
  );

  // Fetch live weather for the destination or map center
  useEffect(() => {
    let isCancelled = false;
    async function fetchWeather() {
      try {
        const query = destination
          ? `city=${encodeURIComponent(destination)}`
          : `lat=${effectiveCenter[0]}&lon=${effectiveCenter[1]}`;
        const res = await fetch(`/api/weather?${query}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setLiveWeather(data);
            if (data.latitude !== undefined && data.longitude !== undefined) {
              setEffectiveCenter([data.latitude, data.longitude]);
              if (mapInstanceRef.current && geoItems.length === 0) {
                mapInstanceRef.current.panTo([data.latitude, data.longitude]);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch weather for map:", err);
      }
    }
    fetchWeather();
    return () => {
      isCancelled = true;
    };
  }, [destination, effectiveCenter[0], effectiveCenter[1]]);

  // Initialize Map and Markers
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      // Dynamically import Leaflet
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!isMounted) return;
      leafletRef.current = L;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        // Initialize Map
        const map = L.map(mapContainerRef.current, {
          center: [effectiveCenter[0], effectiveCenter[1]],
          zoom: zoom,
          zoomControl: false,
        });

        // Add zoom control at bottom right to avoid cluttering top widgets
        L.control.zoom({ position: "bottomright" }).addTo(map);

        // High-clarity, watermark-free OpenStreetMap standard tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const latLngs: [number, number][] = [];

      // Add pins
      geoItems.forEach((item, index) => {
        if (item.latitude === undefined || item.longitude === undefined) return;

        const isSelected = selectedItemId === item.id;
        latLngs.push([item.latitude, item.longitude]);

        // Custom HTML pin matching Wander Wallet editorial design language (Terracotta / Midnight Navy)
        const pinColor = isSelected ? "#C85C3A" : "#172A3A";
        const pinHtml = `
          <div style="
            background-color: ${pinColor};
            color: #FFF9F0;
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #FFF9F0;
            box-shadow: 0 4px 10px rgba(23,42,58,0.35);
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <span style="transform: rotate(45deg); font-family: sans-serif; font-size: 11px; font-weight: bold;">
              ${index + 1}
            </span>
          </div>
        `;

        const customIcon = L.divIcon({
          html: pinHtml,
          className: "custom-travel-pin",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        });

        const marker = L.marker([item.latitude, item.longitude], {
          icon: customIcon,
        }).addTo(map);

        // Custom Popup matching Wander Wallet card
        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 170px; text-align: left;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #C85C3A; margin-bottom: 2px; letter-spacing: 0.05em;">
              ${item.timeSlot} • ${item.category}
            </div>
            <div style="font-size: 13px; font-weight: bold; color: #172A3A; margin-bottom: 4px;">
              ${item.title}
            </div>
            <div style="font-size: 11px; color: #746D65; margin-bottom: 6px;">
              ${item.location || ""}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #D8C9B5; padding-top: 6px;">
              <span style="font-size: 12px; font-weight: bold; color: #172A3A;">${item.formattedCost}</span>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                item.location || item.title
              )}" target="_blank" rel="noopener noreferrer" style="font-size: 10px; font-weight: 600; color: #C85C3A; text-decoration: none;">
                View on Maps ↗
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => onMarkerSelect?.(item));

        if (isSelected) {
          marker.openPopup();
        }

        markersRef.current.push(marker);
      });

      // Fit bounds if we have pins along the itinerary route
      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else {
        // Destination Hub Pin
        const destPinHtml = `
          <div style="
            background: #172A3A;
            color: #FFF9F0;
            padding: 6px 14px;
            border-radius: 9999px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: sans-serif;
            font-size: 12px;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(23,42,58,0.35);
            border: 2px solid #FFF9F0;
            white-space: nowrap;
          ">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#C85C3A;"></span>
            <span>${destination || "Trip Destination"}</span>
          </div>
        `;
        const destIcon = L.divIcon({
          html: destPinHtml,
          className: "custom-dest-pin",
          iconSize: [160, 36],
          iconAnchor: [80, 18],
        });
        const destMarker = L.marker([effectiveCenter[0], effectiveCenter[1]], { icon: destIcon }).addTo(map);
        destMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #C85C3A; margin-bottom: 2px;">
              Destination Hub
            </div>
            <div style="font-size: 14px; font-weight: bold; color: #172A3A; margin-bottom: 4px;">
              ${destination || "Selected Destination"}
            </div>
            <div style="font-size: 11px; color: #746D65;">
              Interactive destination map & weather radar active.
            </div>
          </div>
        `);
        markersRef.current.push(destMarker);
        map.flyTo([effectiveCenter[0], effectiveCenter[1]], zoom);
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [items, selectedItemId, destination, effectiveCenter[0], effectiveCenter[1], zoom]);

  // Handle Dynamic OpenWeatherMap Tile Layer Switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    // Remove existing weather tile layer if present
    if (weatherTileLayerRef.current) {
      map.removeLayer(weatherTileLayerRef.current);
      weatherTileLayerRef.current = null;
    }

    // Add new OpenWeatherMap tile layer if layer is selected
    if (activeWeatherLayer !== "none") {
      const weatherLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/${activeWeatherLayer}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
        {
          maxZoom: 19,
          opacity: 0.65,
          attribution: '&copy; <a href="https://openweathermap.org">OpenWeatherMap</a>',
        }
      );
      weatherLayer.addTo(map);
      weatherTileLayerRef.current = weatherLayer;
    }
  }, [activeWeatherLayer]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#D8C9B5] shadow-sm ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />

      {/* Top Left: Route Plotted Stops Pill */}
      <div className="absolute top-3 left-3 z-[400] bg-[#FFF9F0] px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-[#D8C9B5]">
        <Navigation2 className="w-3.5 h-3.5 text-[#172A3A]" />
        <span className="text-xs font-bold text-[#172A3A] font-sans">
          {geoItems.length} stops plotted along route
        </span>
      </div>

      {/* Top Right: Live OpenWeatherMap Destination Badge */}
      {liveWeather && (
        <div className="absolute top-3 right-3 z-[400] bg-[#FFF9F0] px-3.5 py-1.5 rounded-full shadow-sm border border-[#D8C9B5] flex items-center gap-2">
          <img
            src={liveWeather.iconUrl}
            alt={liveWeather.condition}
            className="w-5 h-5 -my-1"
          />
          <span className="text-xs font-bold text-[#172A3A]">
            {liveWeather.city}: {liveWeather.temp}°C
          </span>
          <span className="text-[11px] text-[#746D65] capitalize hidden sm:inline">
            {liveWeather.description}
          </span>
          <span className="text-[10px] text-[#746D65] border-l border-[#D8C9B5] pl-1.5 font-mono hidden md:inline">
            💧 {liveWeather.humidity}% • 💨 {liveWeather.windSpeedKmH} km/h
          </span>
        </div>
      )}

      {/* Bottom Left: Interactive OpenWeatherMap Layer Switcher */}
      <div className="absolute bottom-3 left-3 z-[400] bg-[#FFF9F0] p-1 rounded-full shadow-md border border-[#D8C9B5] flex items-center gap-1 overflow-x-auto max-w-[calc(100%-40px)] sm:max-w-none">
        <button
          onClick={() => setActiveWeatherLayer("none")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            activeWeatherLayer === "none"
              ? "bg-[#172A3A] text-[#FFF9F0] shadow-sm"
              : "text-[#746D65] hover:text-[#172A3A] hover:bg-[#EAE1D3]"
          }`}
          title="Standard Clean OpenStreetMap View"
        >
          <MapIcon className="w-3 h-3" />
          <span>Base Map</span>
        </button>

        <button
          onClick={() => setActiveWeatherLayer("precipitation_new")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            activeWeatherLayer === "precipitation_new"
              ? "bg-[#C85C3A] text-white shadow-sm"
              : "text-[#746D65] hover:text-[#172A3A] hover:bg-[#EAE1D3]"
          }`}
          title="OpenWeatherMap Live Precipitation & Rain Radar"
        >
          <CloudRain className="w-3 h-3" />
          <span>Rain Radar</span>
        </button>

        <button
          onClick={() => setActiveWeatherLayer("temp_new")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            activeWeatherLayer === "temp_new"
              ? "bg-[#D49A55] text-white shadow-sm"
              : "text-[#746D65] hover:text-[#172A3A] hover:bg-[#EAE1D3]"
          }`}
          title="OpenWeatherMap Temperature Heatmap"
        >
          <Thermometer className="w-3 h-3" />
          <span>Temperature</span>
        </button>

        <button
          onClick={() => setActiveWeatherLayer("clouds_new")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            activeWeatherLayer === "clouds_new"
              ? "bg-[#233d52] text-white shadow-sm"
              : "text-[#746D65] hover:text-[#172A3A] hover:bg-[#EAE1D3]"
          }`}
          title="OpenWeatherMap Cloud Cover Overlay"
        >
          <Cloud className="w-3 h-3" />
          <span>Clouds</span>
        </button>

        <button
          onClick={() => setActiveWeatherLayer("wind_new")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            activeWeatherLayer === "wind_new"
              ? "bg-[#172A3A] text-white shadow-sm"
              : "text-[#746D65] hover:text-[#172A3A] hover:bg-[#EAE1D3]"
          }`}
          title="OpenWeatherMap Wind Speed Stream"
        >
          <Wind className="w-3 h-3" />
          <span>Wind</span>
        </button>
      </div>
    </div>
  );
}
export default TripMap;
