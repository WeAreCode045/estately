import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useEffect, useRef, useState } from 'react';
import { s3Service } from '../services/s3Service';
import { env } from '../utils/env';

interface PropertyTemplateProps {
  project: {
    title: string;
    price: number;
    address: string;
    description: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    livingArea?: number;
    plotSize?: number;
    buildYear?: number;
    garages?: number;
    coverImageId?: string;
    gallery?: string[]; // Array of S3 paths
    status?: string;
  };
  agency: {
    name: string;
    logo?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  agent?: {
    name: string;
    avatar?: string;
    phone?: string;
    email?: string;
    role?: string;
  };
  amenities?: Array<{
    icon: string;
    label: string;
  }>;
}

export default function PropertyTemplate({
  project,
  agency,
  agent,
  amenities = []
}: PropertyTemplateProps) {
  const templateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Add Google Font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Load presigned URLs for images
  const loadImages = async () => {
    const urls: Record<string, string> = {};

    // Collect all image paths
    const paths = [
      project.coverImageId,
      ...(project.gallery || []),
      agency.logo,
      agent?.avatar
    ].filter(Boolean) as string[];

    // Generate presigned URLs
    await Promise.all(
      paths.map(async (path) => {
        try {
          const presignedUrl = await s3Service.getPresignedUrl(path, 3600);
          urls[path] = presignedUrl;
        } catch (error) {
          console.error(`Error loading image ${path}:`, error);
        }
      })
    );

    setImageUrls(urls);
    return urls;
  };

  // Preload images on mount
  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.coverImageId, project.gallery, agency.logo, agent?.avatar]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getImageUrl = (path?: string) => {
    if (!path) return 'https://via.placeholder.com/800x600/e2e8f0/64748b?text=No+Image';
    return imageUrls[path] || 'https://via.placeholder.com/800x600/e2e8f0/64748b?text=Loading...';
  };

  const allImages = [
    project.coverImageId,
    ...(project.gallery || [])
  ].filter(Boolean) as string[];

  const getAgencyInitial = () => {
    return agency.name.charAt(0).toUpperCase();
  };

  const generatePDF = async () => {
    if (!templateRef.current) return;

    setIsGenerating(true);

    try {
      await loadImages();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${project.title.replace(/\s+/g, '-').toLowerCase()}-brochure.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Er is een fout opgetreden bij het genereren van de PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* PDF Button */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4">
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:bg-slate-300 shadow-lg transition-colors"
        >
          {isGenerating ? 'Genereren...' : 'Download PDF'}
        </button>
      </div>

      {/* Template */}
      <div
        ref={templateRef}
        id="property-details-container"
        className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-12 bg-slate-50"
      >
        <section className="space-y-8">
          {/* Hero Images */}
          <div className="flex flex-col md:flex-row gap-4 h-[500px]">
            <div className="w-full md:w-2/3 h-full">
              {allImages[0] && (
                <img
                  src={getImageUrl(allImages[0])}
                  alt="Main"
                  className="w-full h-full object-cover rounded-3xl"
                  crossOrigin="anonymous"
                />
              )}
            </div>
            {allImages.length > 1 && (
              <div className="hidden md:flex flex-col w-1/3 gap-4">
                {allImages[1] && (
                  <img
                    src={getImageUrl(allImages[1])}
                    alt="Side 1"
                    className="h-1/2 object-cover rounded-3xl"
                    crossOrigin="anonymous"
                  />
                )}
                <div className="relative h-1/2">
                  {allImages[2] && (
                    <img
                      src={getImageUrl(allImages[2])}
                      alt="Side 2"
                      className="w-full h-full object-cover rounded-3xl brightness-50"
                      crossOrigin="anonymous"
                    />
                  )}
                  {allImages.length > 3 && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">
                      + {allImages.length - 3} foto&apos;s
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Price */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight uppercase text-slate-900">
                    {project.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm">{project.address}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-900">{formatPrice(project.price)}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    {project.status || 'Te Koop'}
                  </p>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-y-8 gap-x-4 pt-4">
                {project.bedrooms !== undefined && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Slaapkamers</p>
                      <p className="font-bold text-slate-900">{project.bedrooms}</p>
                    </div>
                  </div>
                )}

                {project.bathrooms !== undefined && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Badkamers</p>
                      <p className="font-bold text-slate-900">{project.bathrooms}</p>
                    </div>
                  </div>
                )}

                {project.livingArea !== undefined && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Woonopp.</p>
                      <p className="font-bold text-slate-900">{project.livingArea} m²</p>
                    </div>
                  </div>
                )}

                {project.sqft !== undefined && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Perceel</p>
                      <p className="font-bold text-slate-900">{project.sqft} m²</p>
                    </div>
                  </div>
                )}

                {project.buildYear !== undefined && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Bouwjaar</p>
                      <p className="font-bold text-slate-900">{project.buildYear}</p>
                    </div>
                  </div>
                )}

                {project.garages !== undefined && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Garages</p>
                      <p className="font-bold text-slate-900">{project.garages}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-6 border-t border-slate-200 pt-8">
                <div>
                  <h3 className="font-bold text-xl mb-3 text-slate-900">Beschrijving</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2 uppercase tracking-widest text-slate-400 text-xs">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Eigenschappen
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {amenities.map((amenity, idx) => (
                      <span key={idx} className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                        <span>{amenity.icon}</span>
                        <span>{amenity.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {allImages.length > 1 && (
                <div className="space-y-6 border-t border-slate-200 pt-8">
                  <h3 className="font-bold text-xl mb-3 text-slate-900">Galerij</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {allImages.slice(1).map((img, idx) => (
                      <img
                        key={idx}
                        src={getImageUrl(img)}
                        className="w-full h-32 object-cover rounded-2xl shadow-sm"
                        alt={`Gallery ${idx + 1}`}
                        crossOrigin="anonymous"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="space-y-8 border-t border-slate-200 pt-8">
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-blue-900">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    De Omgeving
                  </h3>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    Gelegen in een rustige, kindvriendelijke woonwijk met veel groenvoorzieningen. Op loopafstand vindt u diverse parken en sportfaciliteiten.
                  </p>
                </div>

                {project.address && (
                  <div className="w-full h-[300px] rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-slate-100">
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=${env.googleApiKey}&q=${encodeURIComponent(project.address)}`}
                      className="w-full h-full border-0"
                      loading="lazy"
                      title="Property Location"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {agent && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex flex-col items-center text-center">
                    {agent.avatar ? (
                      <img
                        src={getImageUrl(agent.avatar)}
                        className="w-20 h-20 rounded-full mb-4 border-4 border-white shadow-lg object-cover"
                        alt={agent.name}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full mb-4 border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600">
                        {agent.name.charAt(0)}
                      </div>
                    )}
                    <h4 className="font-bold text-lg text-slate-900">{agent.name}</h4>
                    <p className="text-xs text-slate-400 mb-6">{agent.role || 'Uw Makelaar'}</p>
                  </div>

                  <div className="space-y-4 mb-8 text-sm">
                    {agent.phone && (
                      <div className="flex items-center gap-3 text-slate-700">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{agent.phone}</span>
                      </div>
                    )}
                    {agent.email && (
                      <div className="flex items-center gap-3 text-slate-700">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm truncate">{agent.email}</span>
                      </div>
                    )}
                  </div>

                  <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-colors">
                    Contact Opnemen
                  </button>
                </div>
              )}

              <div className="bg-slate-900 p-6 rounded-3xl text-white">
                <div className="flex items-center gap-4">
                  {agency.logo ? (
                    <img
                      src={getImageUrl(agency.logo)}
                      alt={agency.name}
                      className="w-12 h-12 rounded-xl object-contain bg-white p-2"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-xl">
                      {getAgencyInitial()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold">{agency.name}</h4>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Premium Service</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
