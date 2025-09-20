// Google Analytics utility functions
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const trackPageView = (path: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-S3DZSRLSEL', {
      page_path: path,
      page_title: title
    });
  }
};

export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};

export const trackContactForm = (source: string) => {
  trackEvent('contact_form_open', 'engagement', source);
};

export const trackSimulation = (type: 'consumer' | 'producer', value?: number) => {
  trackEvent('simulation_completed', 'engagement', type, value);
};

export const trackLogin = (method: string) => {
  trackEvent('login', 'authentication', method);
};

export const trackRegistration = (method: string) => {
  trackEvent('sign_up', 'authentication', method);
};