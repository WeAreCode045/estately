import { useState, useEffect } from 'react';
import { configService } from '../services/appwrite';

export const useSettings = () => {
  const [googleApiKey, setGoogleApiKey] = useState<string | null>(null);
  const [messagingProviderId, setMessagingProviderId] = useState<string | null>(null);
  const [defaultAgentId, setDefaultAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [googleConfig, messagingConfig, defaultAgentConfig] = await Promise.all([
          configService.get('google_maps_api_key'),
          configService.get('messaging_provider_id'),
          configService.get('default_agent_id')
        ]);

        if (googleConfig) {
          setGoogleApiKey((googleConfig as any).value);
        }
        if (messagingConfig) {
          setMessagingProviderId((messagingConfig as any).value);
        }
        if (defaultAgentConfig) {
            setDefaultAgentId((defaultAgentConfig as any).value);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { googleApiKey, messagingProviderId, defaultAgentId, loading };
};
