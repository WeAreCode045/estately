import React, { useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
  apiKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ 
  apiKey, 
  value, 
  onChange, 
  placeholder, 
  className,
  name 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Keep internal value for typing
  const [inputValue, setInputValue] = React.useState(value);

  // Sync internal value when prop changes (e.g. initial load or reset)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!apiKey) return;

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (!inputRef.current || !window.google) return;
      
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
      });

      // Prevent the modal/form from submitting when selecting an address
      inputRef.current.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.querySelector('.pac-container:not([style*="display: none"])')) {
          e.preventDefault();
        }
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        const formatted = place.formatted_address || place.name || '';
        if (formatted) {
          setInputValue(formatted);
          onChange(formatted);
        }
      });
    };

    loadGoogleMapsScript();

    return () => {
      // Cleanup listener if needed, though Maps usually handles this
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [apiKey]);

  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      value={inputValue}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        setInputValue(e.target.value);
        onChange(e.target.value);
      }}
      autoComplete="off"
    />
  );
};

export default AddressAutocomplete;
