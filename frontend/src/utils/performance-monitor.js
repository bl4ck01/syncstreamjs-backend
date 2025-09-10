'use client';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      componentRenders: [],
      dataLoads: [],
      interactions: []
    };
    this.activeMeasures = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Start measuring a performance metric
  startMeasure(name, type = 'custom') {
    if (!this.isEnabled) return null;
    
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const measure = {
      id,
      name,
      type,
      startTime: performance.now(),
      metadata: {}
    };
    
    this.activeMeasures.set(id, measure);
    return id;
  }

  // End measuring and record the metric
  endMeasure(id, metadata = {}) {
    if (!this.isEnabled || !this.activeMeasures.has(id)) return;
    
    const measure = this.activeMeasures.get(id);
    measure.endTime = performance.now();
    measure.duration = measure.endTime - measure.startTime;
    measure.metadata = { ...measure.metadata, ...metadata };
    
    // Store in appropriate metrics array
    switch (measure.type) {
      case 'pageLoad':
        this.metrics.pageLoads.push(measure);
        break;
      case 'componentRender':
        this.metrics.componentRenders.push(measure);
        break;
      case 'dataLoad':
        this.metrics.dataLoads.push(measure);
        break;
      case 'interaction':
        this.metrics.interactions.push(measure);
        break;
      default:
        this.metrics.componentRenders.push(measure);
    }
    
    // Keep only last 100 measurements per type
    Object.keys(this.metrics).forEach(key => {
      if (Array.isArray(this.metrics[key]) && this.metrics[key].length > 100) {
        this.metrics[key] = this.metrics[key].slice(-100);
      }
    });
    
    this.activeMeasures.delete(id);
    this.logMeasure(measure);
    
    return measure;
  }

  // Log measure to console
  logMeasure(measure) {
    const { name, type, duration, metadata } = measure;
    const durationMs = duration.toFixed(2);
    
    let logMethod = 'log';
    let logStyle = 'color: #4CAF50; font-weight: bold;';
    
    if (duration > 1000) {
      logMethod = 'warn';
      logStyle = 'color: #FF9800; font-weight: bold;';
    }
    
    if (duration > 3000) {
      logMethod = 'error';
      logStyle = 'color: #F44336; font-weight: bold;';
    }
    
    console[logMethod](
      `%c[Performance] ${type}: ${name} - ${durationMs}ms`,
      logStyle,
      metadata
    );
  }

  // Get performance summary
  getSummary() {
    const calculateAverage = (arr) => {
      if (!arr.length) return 0;
      return arr.reduce((sum, item) => sum + item.duration, 0) / arr.length;
    };
    
    const calculateMax = (arr) => {
      if (!arr.length) return 0;
      return Math.max(...arr.map(item => item.duration));
    };
    
    return {
      pageLoads: {
        count: this.metrics.pageLoads.length,
        average: calculateAverage(this.metrics.pageLoads),
        max: calculateMax(this.metrics.pageLoads)
      },
      componentRenders: {
        count: this.metrics.componentRenders.length,
        average: calculateAverage(this.metrics.componentRenders),
        max: calculateMax(this.metrics.componentRenders)
      },
      dataLoads: {
        count: this.metrics.dataLoads.length,
        average: calculateAverage(this.metrics.dataLoads),
        max: calculateMax(this.metrics.dataLoads)
      },
      interactions: {
        count: this.metrics.interactions.length,
        average: calculateAverage(this.metrics.interactions),
        max: calculateMax(this.metrics.interactions)
      }
    };
  }

  // Log performance summary
  logSummary() {
    const summary = this.getSummary();
    console.group('%c📊 Performance Summary', 'color: #2196F3; font-weight: bold; font-size: 14px;');
    
    Object.entries(summary).forEach(([type, data]) => {
      console.log(
        `%c${type}:`,
        'color: #673AB7; font-weight: bold;',
        `${data.count} measurements | Avg: ${data.average.toFixed(2)}ms | Max: ${data.max.toFixed(2)}ms`
      );
    });
    
    console.groupEnd();
  }

  // Monitor component render time
  withComponentMonitoring(Component, componentName) {
    if (!this.isEnabled) return Component;
    
    return (props) => {
      const measureId = this.startMeasure(componentName, 'componentRender');
      
      try {
        const result = <Component {...props} />;
        this.endMeasure(measureId, { 
          component: componentName,
          propsKeys: Object.keys(props) 
        });
        return result;
      } catch (error) {
        this.endMeasure(measureId, { 
          component: componentName,
          error: error.message 
        });
        throw error;
      }
    };
  }

  // Monitor async function
  withAsyncMonitoring(fn, name) {
    if (!this.isEnabled) return fn;
    
    return async (...args) => {
      const measureId = this.startMeasure(name, 'dataLoad');
      
      try {
        const result = await fn(...args);
        this.endMeasure(measureId, { 
          function: name,
          success: true 
        });
        return result;
      } catch (error) {
        this.endMeasure(measureId, { 
          function: name,
          success: false,
          error: error.message 
        });
        throw error;
      }
    };
  }

  // Clear metrics
  clear() {
    this.metrics = {
      pageLoads: [],
      componentRenders: [],
      dataLoads: [],
      interactions: []
    };
    this.activeMeasures.clear();
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      summary: this.getSummary()
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export hook for React components
export function usePerformance() {
  const startMeasure = (name, type = 'componentRender') => {
    return performanceMonitor.startMeasure(name, type);
  };

  const endMeasure = (id, metadata = {}) => {
    return performanceMonitor.endMeasure(id, metadata);
  };

  const logSummary = () => {
    performanceMonitor.logSummary();
  };

  return { startMeasure, endMeasure, logSummary };
}

// Export HOC for class components
export function withPerformance(Component, componentName) {
  return performanceMonitor.withComponentMonitoring(Component, componentName);
}

// Export default instance
export default performanceMonitor;