import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropertyTemplate from '../components/PropertyTemplate';
import { useAuth } from '../contexts/AuthContext';
import { COLLECTIONS, DATABASE_ID, databases, Query } from '../services/appwrite';
import type { ParsedPropertyData } from '../services/propertyService';
import { getPropertyParsed } from '../services/propertyService';

export default function PropertyBrochure() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);
  const [parsedProperty, setParsedProperty] = useState<ParsedPropertyData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agency, setAgency] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      console.log('[PropertyBrochure] Loading with projectId:', projectId);

      if (!projectId) {
        console.error('[PropertyBrochure] No projectId provided');
        setError('Geen project ID opgegeven');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch project
        console.log('[PropertyBrochure] Fetching project:', projectId);
        const projectDoc = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId
        );
        console.log('[PropertyBrochure] Project loaded:', projectDoc);

        setProject(projectDoc);

        // Fetch property if property_id exists (new JSON-based structure)
        if (projectDoc.property_id) {
          try {
            const propertyData = await getPropertyParsed(projectDoc.property_id);
            setParsedProperty(propertyData);
          } catch (err) {
            console.warn('Could not load property:', err);
          }
        }

        // Fetch agency
        console.log('[PropertyBrochure] Fetching agency');
        const agencyList = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.AGENCIES,
          [Query.limit(1)]
        );
        console.log('[PropertyBrochure] Agency loaded:', agencyList.documents[0]);

        // Fetch agent (user profile)
        let agentProfile = null;
        if (user) {
          try {
            const profiles = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PROFILES,
              [Query.equal('userId', user.$id)]
            );
            agentProfile = profiles.documents[0] || null;
          } catch (err) {
            console.warn('Could not load profile:', err);
          }
        }

        setAgency(agencyList.documents[0] || null);
        setAgent(agentProfile);

        console.log('[PropertyBrochure] Data loading complete:', {
          project: !!projectDoc,
          agency: !!agencyList.documents[0],
          agent: !!agentProfile
        });
      } catch (err) {
        console.error('[PropertyBrochure] Error loading data:', err);
        console.error('[PropertyBrochure] Error details:', err instanceof Error ? err.message : String(err));
        setError('Kon project niet laden');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, user]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Brochure laden...</p>
        </div>
      </div>
    );
  }

  if (error || !project || !agency) {
    const errorMsg = error ||
      (!project ? 'Project niet gevonden' : '') ||
      (!agency ? 'Kantoor niet gevonden' : '') ||
      'Project niet gevonden';

    console.error('[PropertyBrochure] Rendering error state:', { error, hasProject: !!project, hasAgency: !!agency, errorMsg });

    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Fout</h2>
          <p className="text-slate-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/admin/projects')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Terug naar projecten
          </button>
        </div>
      </div>
    );
  }

  // Default amenities (can be customized per project)
  const defaultAmenities = parsedProperty?.specsData?.map(spec => ({
    icon: '✓',
    label: spec
  })) || [
    { icon: '🏊', label: 'Zwembad' },
    { icon: '🏋️', label: 'Fitness' },
    { icon: '🅿️', label: 'Parkeren' },
    { icon: '🌳', label: 'Tuin' },
    { icon: '🔒', label: 'Beveiliging' },
    { icon: '🌡️', label: 'Klimatisatie' },
  ];

  // Get address - use parsed property location or fallback to project
  const getFullAddress = () => {
    if (parsedProperty?.formattedAddress) {
      return parsedProperty.formattedAddress;
    }
    return project.address || 'Adres onbekend';
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <PropertyTemplate
        project={{
          title: project.title || 'Prachtige Woning',
          price: project.price || 0,
          address: getFullAddress(),
          description: parsedProperty?.property.description || project.description || 'Geen beschrijving beschikbaar.',
          bedrooms: parsedProperty?.roomsData.bedrooms || project.bedrooms,
          bathrooms: parsedProperty?.roomsData.bathrooms || project.bathrooms,
          livingArea: parsedProperty?.sizeData.floorSize || project.livingArea,
          sqft: parsedProperty?.sizeData.lotSize || project.sqft,
          buildYear: parsedProperty?.roomsData.buildYear || project.buildYear,
          garages: parsedProperty?.roomsData.garages || project.garages,
          coverImageId: parsedProperty?.mediaData.images?.[0] || project.coverImageId,
          gallery: parsedProperty?.mediaData.images || project.gallery || [],
          status: project.status || 'Te Koop',
        }}
        agency={{
          name: agency.name || 'Makelaarskantoor',
          logo: agency.logo,
          phone: agency.phone,
          email: agency.email,
          website: agency.website,
          address: agency.address,
        }}
        agent={agent ? {
          name: agent.name || user?.name || 'Makelaar',
          avatar: agent.avatar,
          phone: agent.phone,
          email: agent.email || user?.email,
          role: agent.role || 'Real Estate Agent',
        } : undefined}
        amenities={defaultAmenities}
      />
    </div>
  );
}
