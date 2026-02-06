import React, { useEffect, useState } from 'react';
import { projectService } from '../services/appwrite';

interface AsyncImageProps {
  srcOrId?: string | null;
  alt?: string;
  className?: string;
  placeholder?: React.ReactNode;
}

const DEFAULT_PLACEHOLDER = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

const AsyncImage: React.FC<AsyncImageProps> = ({ srcOrId, alt = '', className, placeholder }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      try {
        if (!srcOrId) {
          setUrl(DEFAULT_PLACEHOLDER);
          return;
        }

        if (srcOrId.startsWith('http')) {
          setUrl(srcOrId);
          return;
        }

        const maybe = projectService.getImagePreview(srcOrId);
        if (maybe && typeof (maybe as any).then === 'function') {
          const resolved = await (maybe as unknown as Promise<string>);
          if (mounted) setUrl(resolved || DEFAULT_PLACEHOLDER);
        } else {
          if (mounted) setUrl((maybe as unknown as string) || DEFAULT_PLACEHOLDER);
        }
      } catch (e) {
        if (mounted) setUrl(DEFAULT_PLACEHOLDER);
      }
    };

    resolve();

    return () => { mounted = false; };
  }, [srcOrId]);

  if (!url) return <>{placeholder || null}</>;

  return <img src={url} alt={alt} className={className} />;
};

export default AsyncImage;
