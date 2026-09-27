import { NextRequest, NextResponse } from "next/server";

const OWM_API_KEY = process.env.OPENWEATHER_API_KEY || "27418dc66a18ed7e81851dc1fe4f255d";

export interface LiveWeatherResponse {
  city: string;
  temp: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon: string;
  iconUrl: string;
  humidity: number;
  windSpeedKmH: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const city = searchParams.get("city") || searchParams.get("q");

  try {
    let url = "";
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${OWM_API_KEY}`;
    } else if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OWM_API_KEY}`;
    } else {
      // Default fallback to Goa
      url = `https://api.openweathermap.org/data/2.5/weather?q=Goa,IN&units=metric&appid=${OWM_API_KEY}`;
    }

    const res = await fetch(url, {
      next: { revalidate: 600 }, // 10 minutes cache
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("OpenWeatherMap API error:", res.status, errText);
      return NextResponse.json(
        { error: "Weather data unavailable", details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    const weatherObj = data.weather?.[0] || {};
    const iconCode = weatherObj.icon || "01d";

    const payload: LiveWeatherResponse & { latitude?: number; longitude?: number } = {
      city: data.name || city || "Destination",
      temp: Math.round(data.main?.temp ?? 26),
      feelsLike: Math.round(data.main?.feels_like ?? 27),
      condition: weatherObj.main || "Clear",
      description: weatherObj.description || "clear sky",
      icon: iconCode,
      iconUrl: `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
      humidity: data.main?.humidity ?? 65,
      windSpeedKmH: Math.round((data.wind?.speed ?? 2) * 3.6),
      latitude: data.coord?.lat,
      longitude: data.coord?.lon,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch (error: any) {
    console.error("OpenWeatherMap fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data", message: error.message },
      { status: 500 }
    );
  }
}
