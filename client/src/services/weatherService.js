// Weather Service for Trek.IQ - Halifax Weather Integration
class WeatherService {
  constructor() {
    this.apiKey = '4971842141905f0c08d2ca1478cb5142'; // OpenWeather API key
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.halifaxCoords = { lat: 44.6475, lng: -63.5756 }; // Halifax, NS coordinates
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    this.isInitialized = false;
    this.currentWeather = null;
    this.forecast = null;
    this.weatherWarnings = [];
    this.barrierPredictions = [];
  }

  // Test API key validity
  async testAPIKey() {
    try {
      const testUrl = `${this.baseUrl}/weather?lat=44.6475&lon=-63.5756&appid=${this.apiKey}&units=metric`;
      console.log('Testing OpenWeather API key...');
      
      const response = await fetch(testUrl);
      const responseText = await response.text();
      
      if (response.ok) {
        console.log('✅ OpenWeather API key is valid and working');
        return true;
      } else {
        console.error(`❌ OpenWeather API key test failed: ${response.status}`);
        console.error('Response:', responseText);
        
        if (response.status === 401) {
          console.error('🔑 API Key Issues:');
          console.error('- The API key may not be activated yet (takes up to 2 hours after registration)');
          console.error('- The API key may be invalid or expired');
          console.error('- The API key may have usage restrictions');
          console.error('- Check your OpenWeather account dashboard');
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to test API key:', error);
      return false;
    }
  }

  // Initialize the weather service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Test API key first
      const apiKeyValid = await this.testAPIKey();
      
      if (!apiKeyValid) {
        console.warn('⚠️ Using fallback weather data due to API key issues');
        this.currentWeather = this.getFallbackWeather();
        this.forecast = this.getFallbackForecast();
        this.isInitialized = true;
        console.log('WeatherService initialized with fallback data');
        return;
      }
      
      await this.loadCurrentWeather();
      await this.loadForecast();
      this.isInitialized = true;
      console.log('WeatherService initialized successfully');
      
      // Start periodic updates
      this.startPeriodicUpdates();
    } catch (error) {
      console.error('Failed to initialize WeatherService:', error);
      // Use fallback data if initialization fails
      this.currentWeather = this.getFallbackWeather();
      this.forecast = this.getFallbackForecast();
      this.isInitialized = true;
      console.log('WeatherService initialized with fallback data due to error');
    }
  }

  // Load current weather for Halifax
  async loadCurrentWeather() {
    try {
      const url = `${this.baseUrl}/weather?lat=${this.halifaxCoords.lat}&lon=${this.halifaxCoords.lng}&appid=${this.apiKey}&units=metric`;
      
      console.log('Fetching current weather from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Weather API error ${response.status}:`, errorText);
        
        if (response.status === 401) {
          console.warn('OpenWeather API key may be invalid or not activated. Using fallback data.');
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.currentWeather = this.processWeatherData(data);
      
      // Cache the result
      this.cache.set('current', {
        data: this.currentWeather,
        timestamp: Date.now()
      });

      console.log('Current weather loaded:', this.currentWeather);
      return this.currentWeather;
    } catch (error) {
      console.error('Failed to load current weather:', error);
      console.log('Using fallback weather data');
      return this.getFallbackWeather();
    }
  }

  // Load weather forecast for Halifax
  async loadForecast() {
    try {
      const url = `${this.baseUrl}/forecast?lat=${this.halifaxCoords.lat}&lon=${this.halifaxCoords.lng}&appid=${this.apiKey}&units=metric`;
      
      console.log('Fetching weather forecast from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Weather forecast API error ${response.status}:`, errorText);
        
        if (response.status === 401) {
          console.warn('OpenWeather API key may be invalid or not activated. Using fallback forecast data.');
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.forecast = this.processForecastData(data);
      
      // Cache the result
      this.cache.set('forecast', {
        data: this.forecast,
        timestamp: Date.now()
      });

      console.log('Weather forecast loaded:', this.forecast);
      return this.forecast;
    } catch (error) {
      console.error('Failed to load weather forecast:', error);
      console.log('Using fallback forecast data');
      return this.getFallbackForecast();
    }
  }

  // Process weather data
  processWeatherData(data) {
    return {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      visibility: data.visibility,
      clouds: data.clouds.all,
      rain: data.rain ? data.rain['1h'] || 0 : 0,
      snow: data.snow ? data.snow['1h'] || 0 : 0,
      timestamp: data.dt * 1000,
      sunrise: data.sys.sunrise * 1000,
      sunset: data.sys.sunset * 1000
    };
  }

  // Process forecast data
  processForecastData(data) {
    return data.list.map(item => ({
      timestamp: item.dt * 1000,
      temperature: item.main.temp,
      feelsLike: item.main.feels_like,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      rain: item.rain ? item.rain['3h'] || 0 : 0,
      snow: item.snow ? item.snow['3h'] || 0 : 0,
      clouds: item.clouds.all
    }));
  }

  // Get current weather
  async getCurrentWeather() {
    const cached = this.cache.get('current');
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    return await this.loadCurrentWeather();
  }

  // Get weather forecast
  async getForecast() {
    const cached = this.cache.get('forecast');
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    return await this.loadForecast();
  }

  // Predict barriers based on weather conditions
  predictWeatherBarriers() {
    if (!this.currentWeather) return [];

    const predictions = [];
    const weather = this.currentWeather;

    // Rain-related barriers
    if (weather.rain > 0) {
      predictions.push({
        type: 'slippery_surface',
        severity: weather.rain > 5 ? 'high' : 'medium',
        probability: Math.min(weather.rain / 10, 0.9),
        description: 'Wet surfaces may be slippery',
        location: 'general',
        weatherCondition: 'rain',
        recommendation: 'Use caution on wet surfaces'
      });
    }

    // Snow/ice barriers
    if (weather.snow > 0 || weather.temperature < -5) {
      predictions.push({
        type: 'snow_ice',
        severity: weather.snow > 2 ? 'critical' : 'high',
        probability: Math.min((weather.snow + Math.abs(weather.temperature)) / 10, 0.95),
        description: 'Snow or ice may make paths unsafe',
        location: 'general',
        weatherCondition: 'snow_ice',
        recommendation: 'Consider alternative routes or delay travel'
      });
    }

    // Wind-related barriers
    if (weather.windSpeed > 20) {
      predictions.push({
        type: 'wind_hazard',
        severity: weather.windSpeed > 30 ? 'high' : 'medium',
        probability: Math.min(weather.windSpeed / 50, 0.8),
        description: 'Strong winds may affect mobility',
        location: 'exposed_areas',
        weatherCondition: 'wind',
        recommendation: 'Avoid exposed areas and secure loose items'
      });
    }

    // Visibility barriers
    if (weather.visibility < 1000) {
      predictions.push({
        type: 'poor_visibility',
        severity: weather.visibility < 500 ? 'high' : 'medium',
        probability: Math.min((1000 - weather.visibility) / 1000, 0.9),
        description: 'Poor visibility may affect navigation',
        location: 'general',
        weatherCondition: 'fog_mist',
        recommendation: 'Use extra caution and well-lit paths'
      });
    }

    // Temperature-related barriers
    if (weather.temperature < -10 || weather.temperature > 30) {
      predictions.push({
        type: 'extreme_temperature',
        severity: weather.temperature < -20 || weather.temperature > 35 ? 'critical' : 'high',
        probability: 0.8,
        description: 'Extreme temperatures may affect accessibility',
        location: 'general',
        weatherCondition: 'extreme_temp',
        recommendation: 'Plan for temperature-appropriate clothing and hydration'
      });
    }

    this.barrierPredictions = predictions;
    return predictions;
  }

  // Generate weather warnings for routes
  generateWeatherWarnings(route) {
    if (!this.currentWeather || !route) return [];

    const warnings = [];
    const weather = this.currentWeather;
    const predictions = this.predictWeatherBarriers();

    // Check route characteristics against weather conditions
    const routeAnalysis = this.analyzeRouteForWeather(route, weather);

    // Add weather-specific warnings
    if (routeAnalysis.exposedToWind && weather.windSpeed > 20) {
      warnings.push({
        type: 'wind_warning',
        severity: weather.windSpeed > 30 ? 'high' : 'medium',
        message: `Route includes exposed areas with ${Math.round(weather.windSpeed)} km/h winds`,
        recommendation: 'Consider sheltered alternative routes'
      });
    }

    if (routeAnalysis.hasElevation && weather.temperature < -5) {
      warnings.push({
        type: 'cold_elevation_warning',
        severity: 'medium',
        message: 'Route includes elevation changes in cold weather',
        recommendation: 'Dress appropriately for cold conditions'
      });
    }

    if (routeAnalysis.hasSteps && (weather.rain > 0 || weather.snow > 0)) {
      warnings.push({
        type: 'slippery_steps_warning',
        severity: weather.snow > 0 ? 'high' : 'medium',
        message: 'Route includes steps that may be slippery',
        recommendation: 'Use handrails and extra caution'
      });
    }

    // Add general weather warnings
    predictions.forEach(prediction => {
      if (prediction.severity === 'critical' || prediction.severity === 'high') {
        warnings.push({
          type: 'weather_condition_warning',
          severity: prediction.severity,
          message: prediction.description,
          recommendation: prediction.recommendation
        });
      }
    });

    this.weatherWarnings = warnings;
    return warnings;
  }

  // Analyze route for weather sensitivity
  analyzeRouteForWeather(route, weather) {
    // This would analyze the route geometry and characteristics
    // For now, return a simplified analysis
    return {
      exposedToWind: Math.random() > 0.5, // Random for demo
      hasElevation: Math.random() > 0.3,
      hasSteps: Math.random() > 0.4,
      totalDistance: route.distance || 1000,
      estimatedDuration: route.duration || 600
    };
  }

  // Get weather-based accessibility recommendations
  getAccessibilityRecommendations() {
    if (!this.currentWeather) return [];

    const recommendations = [];
    const weather = this.currentWeather;

    // Temperature recommendations
    if (weather.temperature < 0) {
      recommendations.push({
        type: 'clothing',
        priority: 'high',
        message: 'Wear warm, non-slip footwear',
        reason: 'Cold temperatures and potential ice'
      });
    }

    if (weather.temperature > 25) {
      recommendations.push({
        type: 'hydration',
        priority: 'medium',
        message: 'Stay hydrated and take breaks',
        reason: 'High temperatures'
      });
    }

    // Precipitation recommendations
    if (weather.rain > 0) {
      recommendations.push({
        type: 'visibility',
        priority: 'medium',
        message: 'Use umbrella or rain gear',
        reason: 'Rain may reduce visibility'
      });
    }

    if (weather.snow > 0) {
      recommendations.push({
        type: 'mobility',
        priority: 'high',
        message: 'Consider mobility assistance if needed',
        reason: 'Snow may affect mobility'
      });
    }

    // Wind recommendations
    if (weather.windSpeed > 20) {
      recommendations.push({
        type: 'stability',
        priority: 'medium',
        message: 'Use mobility aids for stability if needed',
        reason: 'Strong winds may affect balance'
      });
    }

    return recommendations;
  }

  // Start periodic weather updates
  startPeriodicUpdates() {
    // Update weather every 15 minutes
    setInterval(async () => {
      try {
        await this.loadCurrentWeather();
        await this.loadForecast();
        this.predictWeatherBarriers();
      } catch (error) {
        console.warn('Failed to update weather data:', error);
      }
    }, 15 * 60 * 1000);
  }

  // Get weather alerts for Halifax
  async getWeatherAlerts() {
    try {
      const url = `${this.baseUrl}/onecall?lat=${this.halifaxCoords.lat}&lon=${this.halifaxCoords.lng}&appid=${this.apiKey}&exclude=current,minutely,hourly,daily`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Failed to load weather alerts:', error);
      return [];
    }
  }

  // Get historical weather data
  async getHistoricalWeather(date) {
    try {
      const timestamp = Math.floor(date.getTime() / 1000);
      const url = `${this.baseUrl}/onecall/timemachine?lat=${this.halifaxCoords.lat}&lon=${this.halifaxCoords.lng}&dt=${timestamp}&appid=${this.apiKey}&units=metric`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0] || null;
    } catch (error) {
      console.error('Failed to load historical weather:', error);
      return null;
    }
  }

  // Get weather trends
  async getWeatherTrends() {
    if (!this.forecast) return null;

    const trends = {
      temperature: [],
      precipitation: [],
      wind: []
    };

    this.forecast.forEach(period => {
      trends.temperature.push(period.temperature);
      trends.precipitation.push(period.rain + period.snow);
      trends.wind.push(period.windSpeed);
    });

    return {
      temperature: {
        trend: this.calculateTrend(trends.temperature),
        min: Math.min(...trends.temperature),
        max: Math.max(...trends.temperature)
      },
      precipitation: {
        trend: this.calculateTrend(trends.precipitation),
        total: trends.precipitation.reduce((a, b) => a + b, 0)
      },
      wind: {
        trend: this.calculateTrend(trends.wind),
        average: trends.wind.reduce((a, b) => a + b, 0) / trends.wind.length
      }
    };
  }

  // Calculate trend (simplified)
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (Math.abs(difference) < 1) return 'stable';
    return difference > 0 ? 'increasing' : 'decreasing';
  }

  // Fallback weather data
  getFallbackWeather() {
    // Halifax typical weather - moderate temperature, variable conditions
    const now = new Date();
    const month = now.getMonth(); // 0-11
    
    // Seasonal adjustments for Halifax
    let baseTemp, description, icon;
    if (month >= 11 || month <= 2) { // Winter (Dec-Feb)
      baseTemp = -2 + Math.random() * 8; // -2 to 6°C
      description = Math.random() > 0.7 ? 'light snow' : 'partly cloudy';
      icon = Math.random() > 0.7 ? '13d' : '02d';
    } else if (month >= 3 && month <= 5) { // Spring (Mar-May)
      baseTemp = 8 + Math.random() * 12; // 8 to 20°C
      description = Math.random() > 0.6 ? 'light rain' : 'partly cloudy';
      icon = Math.random() > 0.6 ? '10d' : '02d';
    } else if (month >= 6 && month <= 8) { // Summer (Jun-Aug)
      baseTemp = 18 + Math.random() * 12; // 18 to 30°C
      description = Math.random() > 0.8 ? 'clear sky' : 'partly cloudy';
      icon = Math.random() > 0.8 ? '01d' : '02d';
    } else { // Fall (Sep-Nov)
      baseTemp = 10 + Math.random() * 10; // 10 to 20°C
      description = Math.random() > 0.7 ? 'light rain' : 'partly cloudy';
      icon = Math.random() > 0.7 ? '10d' : '02d';
    }
    
    return {
      temperature: Math.round(baseTemp * 10) / 10,
      feelsLike: Math.round((baseTemp - 1 + Math.random() * 2) * 10) / 10,
      humidity: 60 + Math.random() * 25, // 60-85%
      pressure: 1000 + Math.random() * 30, // 1000-1030 hPa
      windSpeed: 8 + Math.random() * 15, // 8-23 km/h
      windDirection: Math.floor(Math.random() * 360),
      description: description,
      icon: icon,
      visibility: 8000 + Math.random() * 12000, // 8-20 km
      clouds: 30 + Math.random() * 50, // 30-80%
      rain: Math.random() > 0.7 ? Math.random() * 2 : 0, // 0-2mm
      snow: month >= 11 || month <= 2 ? (Math.random() > 0.8 ? Math.random() * 1 : 0) : 0, // Winter snow
      timestamp: Date.now(),
      sunrise: Date.now() - 6 * 60 * 60 * 1000,
      sunset: Date.now() + 6 * 60 * 60 * 1000,
      location: 'Halifax, NS',
      source: 'fallback'
    };
  }

  // Fallback forecast data
  getFallbackForecast() {
    const forecast = [];
    const now = new Date();
    
    for (let i = 0; i < 8; i++) {
      const forecastTime = new Date(now.getTime() + i * 3 * 60 * 60 * 1000);
      const forecastMonth = forecastTime.getMonth();
      
      // Seasonal adjustments for Halifax
      let baseTemp, description, icon;
      if (forecastMonth >= 11 || forecastMonth <= 2) { // Winter
        baseTemp = -2 + Math.random() * 8;
        description = Math.random() > 0.7 ? 'light snow' : 'partly cloudy';
        icon = Math.random() > 0.7 ? '13d' : '02d';
      } else if (forecastMonth >= 3 && forecastMonth <= 5) { // Spring
        baseTemp = 8 + Math.random() * 12;
        description = Math.random() > 0.6 ? 'light rain' : 'partly cloudy';
        icon = Math.random() > 0.6 ? '10d' : '02d';
      } else if (forecastMonth >= 6 && forecastMonth <= 8) { // Summer
        baseTemp = 18 + Math.random() * 12;
        description = Math.random() > 0.8 ? 'clear sky' : 'partly cloudy';
        icon = Math.random() > 0.8 ? '01d' : '02d';
      } else { // Fall
        baseTemp = 10 + Math.random() * 10;
        description = Math.random() > 0.7 ? 'light rain' : 'partly cloudy';
        icon = Math.random() > 0.7 ? '10d' : '02d';
      }
      
      forecast.push({
        timestamp: forecastTime.getTime(),
        temperature: Math.round(baseTemp * 10) / 10,
        feelsLike: Math.round((baseTemp - 1 + Math.random() * 2) * 10) / 10,
        humidity: 60 + Math.random() * 25,
        windSpeed: 8 + Math.random() * 15,
        description: description,
        icon: icon,
        rain: Math.random() > 0.7 ? Math.random() * 2 : 0,
        snow: forecastMonth >= 11 || forecastMonth <= 2 ? (Math.random() > 0.8 ? Math.random() * 1 : 0) : 0,
        clouds: 30 + Math.random() * 50,
        source: 'fallback'
      });
    }
    return forecast;
  }

  // Get weather summary for UI
  getWeatherSummary() {
    if (!this.currentWeather) return null;

    const weather = this.currentWeather;
    const predictions = this.predictWeatherBarriers();
    const recommendations = this.getAccessibilityRecommendations();

    return {
      current: weather,
      barrierPredictions: predictions,
      accessibilityRecommendations: recommendations,
      warnings: this.weatherWarnings,
      lastUpdated: weather.timestamp
    };
  }

  // Check if weather conditions are severe
  isSevereWeather() {
    if (!this.currentWeather) return false;

    const weather = this.currentWeather;
    
    return (
      weather.temperature < -20 ||
      weather.temperature > 35 ||
      weather.windSpeed > 40 ||
      weather.visibility < 500 ||
      weather.snow > 10 ||
      weather.rain > 20
    );
  }

  // Get weather data for a specific location
  async getWeatherData(location, options = {}) {
    try {
      console.log('WeatherService: Getting weather data for location:', location);
      
      // If location is coordinates array [lon, lat]
      let lat, lon;
      if (Array.isArray(location)) {
        [lon, lat] = location;
      } else if (location.lat && location.lng) {
        lat = location.lat;
        lon = location.lng;
      } else {
        // Use Halifax as default
        lat = this.halifaxCoords.lat;
        lon = this.halifaxCoords.lng;
      }

      // Check cache first
      const cacheKey = `weather_${lat}_${lon}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('WeatherService: Returning cached weather data');
        return cached.data;
      }

      // Get current weather
      const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('WeatherService: API call failed, using fallback data');
        return this.getFallbackWeather();
      }

      const data = await response.json();
      
      const weatherData = {
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        conditions: data.weather[0].main.toLowerCase(),
        visibility: data.visibility,
        rain: data.rain ? data.rain['1h'] || 0 : 0,
        snow: data.snow ? data.snow['1h'] || 0 : 0,
        clouds: data.clouds.all,
        timestamp: Date.now(),
        location: { lat, lon },
        source: 'api'
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      console.log('WeatherService: Weather data retrieved successfully');
      return weatherData;
      
    } catch (error) {
      console.error('WeatherService: Error getting weather data:', error);
      return this.getFallbackWeather();
    }
  }

  // Get weather-based route recommendations
  getRouteRecommendations(route) {
    if (!this.currentWeather || !route) return [];

    const recommendations = [];
    const weather = this.currentWeather;

    // Temperature-based recommendations
    if (weather.temperature < -10) {
      recommendations.push({
        type: 'route_modification',
        priority: 'high',
        message: 'Consider shorter route due to cold weather',
        reason: 'Extreme cold may affect mobility'
      });
    }

    // Precipitation-based recommendations
    if (weather.rain > 5 || weather.snow > 0) {
      recommendations.push({
        type: 'route_modification',
        priority: 'medium',
        message: 'Consider routes with better shelter',
        reason: 'Precipitation may affect comfort and safety'
      });
    }

    // Wind-based recommendations
    if (weather.windSpeed > 25) {
      recommendations.push({
        type: 'route_modification',
        priority: 'medium',
        message: 'Avoid exposed routes when possible',
        reason: 'Strong winds may affect stability'
      });
    }

    return recommendations;
  }
}

// Create singleton instance
const weatherService = new WeatherService();

export default weatherService;
