'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Loader2 } from 'lucide-react';

interface WeatherData {
    temperature: number;
    humidity: number;
    weatherCode: number;
    description: string;
}

// Open-Meteo Weather Codes
// https://open-meteo.com/en/docs
const getWeatherDetails = (code: number) => {
    switch (true) {
        case code === 0:
            return { desc: 'Trời quang', icon: Sun, color: 'text-yellow-400' };
        case [1, 2].includes(code):
            return { desc: 'Ít mây', icon: Cloud, color: 'text-gray-300' };
        case code === 3:
            return { desc: 'Nhiều mây', icon: Cloud, color: 'text-gray-400' };
        case [45, 48].includes(code):
            return { desc: 'Có sương mù', icon: CloudFog, color: 'text-gray-300' };
        case [51, 53, 55, 56, 57].includes(code):
            return { desc: 'Mưa phùn', icon: CloudDrizzle, color: 'text-sky-300' };
        case [61, 63, 65, 66, 67, 80, 81, 82].includes(code):
            return { desc: 'Có mưa', icon: CloudRain, color: 'text-sky-400' };
        case [71, 73, 75, 77, 85, 86].includes(code):
            return { desc: 'Có tuyết', icon: CloudSnow, color: 'text-white' };
        case [95, 96, 99].includes(code):
            return { desc: 'Có giông bão', icon: CloudLightning, color: 'text-amber-400' };
        default:
            return { desc: 'N/A', icon: Cloud, color: 'text-gray-400' };
    }
};

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchWeather = async () => {
            try {
                // Tọa độ trạm: 11.014556, 106.694337
                const res = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=11.014556&longitude=106.694337&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FHo_Chi_Minh'
                );

                if (!res.ok) throw new Error('Failed to fetch weather');

                const data = await res.json();

                if (mounted && data.current) {
                    const details = getWeatherDetails(data.current.weather_code);
                    setWeather({
                        temperature: data.current.temperature_2m,
                        humidity: data.current.relative_humidity_2m,
                        weatherCode: data.current.weather_code,
                        description: details.desc,
                    });
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching weather:', error);
                if (mounted) setLoading(false);
            }
        };

        fetchWeather();

        // Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 h-[72px] min-w-[200px] justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Đang tải thời tiết...</span>
            </div>
        );
    }

    if (!weather) {
        return null;
    }

    const { icon: WeatherIcon, color } = getWeatherDetails(weather.weatherCode);

    return (
        <div className="rounded-xl border border-border bg-card px-4 py-2 flex items-center gap-4 h-[72px] hover:border-border/80 transition-colors shadow-sm">
            <div className={`p-2 rounded-full bg-muted/50 ${color}`}>
                <WeatherIcon className="h-6 w-6" />
            </div>

            <div className="flex flex-col justify-center">
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tracking-tight">
                        {Math.round(weather.temperature)}°C
                    </span>
                    <span className="text-sm text-muted-foreground capitalize">
                        {weather.description}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-0.5">
                    <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-sky-400">
                            <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        Bình Dương
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-blue-400">
                            <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
                        </svg>
                        Độ ẩm: {Math.round(weather.humidity)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
