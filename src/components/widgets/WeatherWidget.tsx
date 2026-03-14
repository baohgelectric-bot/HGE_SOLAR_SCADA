'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface WeatherData {
    temperature: number;
    humidity: number;
    weatherCode: number;
    forecast?: {
        temperature: number;
        weatherCode: number;
    };
}

// Open-Meteo Weather Codes
// https://open-meteo.com/en/docs
const getWeatherDetails = (code: number) => {
    switch (true) {
        case code === 0:
            return { descKey: 'weather.clearSky', icon: Sun, color: 'text-yellow-400' };
        case [1, 2].includes(code):
            return { descKey: 'weather.fewClouds', icon: Cloud, color: 'text-gray-300' };
        case code === 3:
            return { descKey: 'weather.cloudy', icon: Cloud, color: 'text-gray-400' };
        case [45, 48].includes(code):
            return { descKey: 'weather.fog', icon: CloudFog, color: 'text-gray-300' };
        case [51, 53, 55, 56, 57].includes(code):
            return { descKey: 'weather.drizzle', icon: CloudDrizzle, color: 'text-sky-300' };
        case [61, 63, 65, 66, 67, 80, 81, 82].includes(code):
            return { descKey: 'weather.rain', icon: CloudRain, color: 'text-sky-400' };
        case [71, 73, 75, 77, 85, 86].includes(code):
            return { descKey: 'weather.snow', icon: CloudSnow, color: 'text-white' };
        case [95, 96, 99].includes(code):
            return { descKey: 'weather.thunderstorm', icon: CloudLightning, color: 'text-amber-400' };
        default:
            return { descKey: 'weather.na', icon: Cloud, color: 'text-gray-400' };
    }
};

export function WeatherWidget() {
    const { t } = useTranslation();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchWeather = async () => {
            try {
                // Tọa độ trạm: 11.014556, 106.694337
                const res = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=11.014556&longitude=106.694337&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh&forecast_hours=2'
                );

                if (!res.ok) throw new Error('Failed to fetch weather');

                const data = await res.json();

                if (mounted && data.current) {
                    const currentDetails = getWeatherDetails(data.current.weather_code);

                    let forecast = undefined;
                    if (data.hourly && data.hourly.temperature_2m.length > 1) {
                        const forecastCode = data.hourly.weather_code[1];
                        forecast = {
                            temperature: data.hourly.temperature_2m[1],
                            weatherCode: forecastCode,
                        };
                    }

                    setWeather({
                        temperature: data.current.temperature_2m,
                        humidity: data.current.relative_humidity_2m,
                        weatherCode: data.current.weather_code,
                        forecast: forecast,
                    });
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching weather:', error);
                if (mounted) setLoading(false);
            }
        };

        fetchWeather();

        // Refresh every 5 minutes
        const interval = setInterval(fetchWeather, 5 * 60 * 1000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 h-[72px] min-w-[200px] justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">{t('weather.loading' as any)}</span>
            </div>
        );
    }

    if (!weather) {
        return null;
    }

    const { icon: WeatherIcon, color, descKey } = getWeatherDetails(weather.weatherCode);

    return (
        <div className="rounded-xl border border-border bg-card px-4 py-2 flex items-center gap-4 h-[72px] hover:border-border/80 transition-colors shadow-sm lg:h-[88px] lg:px-6 lg:gap-6 min-w-fit">
            <div className={`p-2 rounded-full bg-muted/50 flex-shrink-0 ${color} lg:p-3`}>
                <WeatherIcon className="h-6 w-6 lg:h-8 lg:w-8" />
            </div>

            <div className="flex flex-col justify-center min-w-[200px]">
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tracking-tight lg:text-3xl">
                        {Math.round(weather.temperature)}°C
                    </span>
                    <span className="text-sm text-muted-foreground capitalize lg:text-base">
                        {t(descKey as any)}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-0.5 lg:text-sm lg:mt-1">
                    <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-sky-400 lg:h-4 lg:w-4">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        {t('weather.location' as any)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-blue-400 lg:h-4 lg:w-4">
                            <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
                        </svg>
                        {Math.round(weather.humidity)}%
                    </span>
                </div>
            </div>

            {weather.forecast && (
                <div className="flex items-center gap-3 pl-4 border-l border-border/50 ml-2 hidden sm:flex">
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-[14px] uppercase font-semibold text-muted-foreground mb-1 tracking-wider">{t('weather.inOneHour' as any)}</span>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const { icon: ForecastIcon, color: forecastColor, descKey: forecastDescKey } = getWeatherDetails(weather.forecast.weatherCode);
                                const fDesc = t(forecastDescKey as any);
                                return (
                                    <>
                                        <ForecastIcon className={`h-4 w-4 ${forecastColor}`} />
                                        <span className="text-sm font-bold">{Math.round(weather.forecast!.temperature)}°C</span>
                                        <span className="text-xs font-bold text-muted-foreground truncate max-w-[80px]" title={fDesc}>
                                            {fDesc}
                                        </span>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
