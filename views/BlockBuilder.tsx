import { canvasFullSize, presetPrintable } from '@grapesjs/studio-sdk-plugins';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/dist/style.css';
import type { Editor } from 'grapesjs';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { COLLECTIONS, DATABASE_ID, databases, Query } from '../api/appwrite';
import { s3Service } from '../api/s3Service';

interface AppwriteDataSources {
  globalData?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agency?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projects?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templates?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user?: any;
  };
}

export default function BlockBuilder() {
  const { user, profile } = useAuth();
  const [dataSources, setDataSources] = useState<AppwriteDataSources>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projectData, setProjectData] = useState<any>(null);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  // Map to cache presigned URLs for S3 paths
  const [presignedUrlCache, setPresignedUrlCache] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchAppwriteData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Fetch all collections in parallel
        const [
          agencyResponse,
          projectsResponse,
          usersResponse,
          contractsResponse,
          templatesResponse
        ] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.AGENCIES, [Query.limit(1)]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.CONTRACTS, [Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.TEMPLATES, [Query.limit(100)])
        ]);

        // Structure data for GrapeJS datasources
        setDataSources({
          globalData: {
            agency: agencyResponse.documents[0] || {},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            projects: projectsResponse.documents.map((doc: any) => ({
              id: doc.$id,
              title: doc.title,
              address: doc.address,
              price: doc.price,
              description: doc.description,
              bedrooms: doc.bedrooms,
              bathrooms: doc.bathrooms,
              sqft: doc.sqft,
              status: doc.status,
              createdAt: doc.$createdAt,
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            users: usersResponse.documents.map((doc: any) => ({
              id: doc.$id,
              name: doc.name,
              email: doc.email,
              role: doc.role,
              phone: doc.phone,
              address: doc.address,
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contracts: contractsResponse.documents.map((doc: any) => ({
              id: doc.$id,
              title: doc.title,
              status: doc.status,
              projectId: doc.projectId,
              createdAt: doc.$createdAt,
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            templates: templatesResponse.documents.map((doc: any) => ({
              id: doc.$id,
              name: doc.name,
              type: doc.type,
              content: doc.content,
            })),
            user: {
              id: user.$id,
              name: profile?.name || user.name,
              email: user.email,
              role: profile?.role,
            }
          }
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching Appwrite data for datasources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppwriteData();
  }, [user, profile]);

  // Fetch project data when a project is selected
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!selectedProjectId) {
        setProjectData(null);
        setPresignedUrlCache(new Map());
        return;
      }

      try {
        // eslint-disable-next-line no-console
        console.log('Fetching project data for:', selectedProjectId);

        const [project, agency] = await Promise.all([
          databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, selectedProjectId),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.AGENCIES, [Query.limit(1)])
        ]);

        const newProjectData = {
          agency: agency.documents[0] || null,
          project,
          user: {
            avatar: profile?.avatar || null,
            name: profile?.name || user?.name || '',
            email: user?.email || ''
          },
          profiles: {
            avatar: profile?.avatar || null
          }
        };

        // eslint-disable-next-line no-console
        console.log('Project data loaded:', newProjectData);

        setProjectData(newProjectData);

        // Pre-fetch presigned URLs for all image paths
        const urlCache = new Map<string, string>();
        const imagePaths = [
          newProjectData.agency?.logo,
          newProjectData.project?.coverImageId,
          newProjectData.user?.avatar,
          newProjectData.profiles?.avatar
        ];

        // eslint-disable-next-line no-console
        console.log('Generating presigned URLs for paths:', imagePaths);

        await Promise.all(
          imagePaths
            .filter(path => path) // Remove null/undefined
            .map(async (path) => {
              try {
                const presignedUrl = await s3Service.getPresignedUrl(path, 3600);
                urlCache.set(path, presignedUrl);
                // eslint-disable-next-line no-console
                console.log(`Presigned URL for ${path}:`, presignedUrl);
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`Error generating presigned URL for ${path}:`, error);
              }
            })
        );

        setPresignedUrlCache(urlCache);

        // Update editor images with real data
        if (editorInstance) {
          // Small delay to ensure state is updated
          setTimeout(() => {
            updateEditorImages(editorInstance);
          }, 200);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching project data:', error);
        setProjectData(null);
        setPresignedUrlCache(new Map());
      }
    };

    fetchProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, user, profile]);

  // Helper function to resolve data paths
  const resolveDataPath = (path: string): string | null => {
    if (!projectData || !path) return null;

    const keys = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = projectData;

    // eslint-disable-next-line no-console
    console.log(`Resolving path "${path}" in:`, projectData);

    for (const key of keys) {
      if (current === null || current === undefined) {
        // eslint-disable-next-line no-console
        console.log(`  Key "${key}" not found, current is null/undefined`);
        return null;
      }
      current = current[key];
      // eslint-disable-next-line no-console
      console.log(`  After key "${key}":`, current);
    }

    // eslint-disable-next-line no-console
    console.log(`  Final resolved value:`, current);

    return current || null;
  };

  // Update all images in the editor with real data
  const updateEditorImages = (editor: Editor) => {
    // eslint-disable-next-line no-console
    console.log('Updating editor images with projectData:', projectData);
    // eslint-disable-next-line no-console
    console.log('Presigned URL cache:', presignedUrlCache);

    const wrapper = editor.DomComponents.getWrapper();
    const images = wrapper?.find('img') || [];

    // eslint-disable-next-line no-console
    console.log('Found images:', images.length);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images.forEach((img: any, index: number) => {
      const dataSrc = img.getAttributes()['data-appwrite-src'];
      // eslint-disable-next-line no-console
      console.log(`Image ${index}: data-appwrite-src="${dataSrc}"`);

      if (dataSrc && projectData) {
        const resolvedPath = resolveDataPath(dataSrc);
        // eslint-disable-next-line no-console
        console.log(`Image ${index}: resolved path="${resolvedPath}"`);

        if (resolvedPath) {
          const presignedUrl = presignedUrlCache.get(resolvedPath);
          if (presignedUrl) {
            // eslint-disable-next-line no-console
            console.log(`Image ${index}: setting presigned URL="${presignedUrl}"`);

            img.set('src', presignedUrl);
            img.addAttributes({ title: `Live: ${dataSrc}` });
          } else {
            // eslint-disable-next-line no-console
            console.warn(`Image ${index}: no presigned URL found in cache for "${resolvedPath}"`);
          }
        }
      }
    });

    editor.refresh();
  };

  // Custom plugin to add data-source selector to image component
  const customImagePlugin = (editor: Editor) => {
    // Store editor instance
    setEditorInstance(editor);

    // Create a mutable reference object to hold current project data
    const dataRef = {
      projectData,
      resolveDataPath,
      presignedUrlCache
    };

    // Update the reference when component re-renders
    dataRef.projectData = projectData;
    dataRef.resolveDataPath = resolveDataPath;
    dataRef.presignedUrlCache = presignedUrlCache;

    // Define data source options
    const dataSourceOptions = [
      { id: '', name: 'Geen (Standaard URL)' },
      { id: 'agency.logo', name: 'Agency Logo' },
      { id: 'project.coverImageId', name: 'Project Cover' },
      { id: 'user.avatar', name: 'User Avatar' },
      { id: 'profiles.avatar', name: 'Profile Avatar' },
    ];

    // Extend the image component
    const defaultType = editor.DomComponents.getType('image');
    const defaultModel = defaultType.model;

    editor.DomComponents.addType('image', {
      model: defaultModel.extend({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialize(props: any, options: any) {
          // Call parent initialize
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (defaultModel.prototype as any).initialize.apply(this, [props, options]);

          // Listen to data-appwrite-src changes
          this.on('change:data-appwrite-src', () => {
            const dataAppwriteSrc = this.get('data-appwrite-src');

            if (dataAppwriteSrc && dataAppwriteSrc !== '') {
              // Check if we have real project data using the dataRef
              if (dataRef.projectData) {
                const resolvedPath = dataRef.resolveDataPath(dataAppwriteSrc);
                if (resolvedPath) {
                  const presignedUrl = dataRef.presignedUrlCache.get(resolvedPath);
                  if (presignedUrl) {
                    this.set('src', presignedUrl);
                    this.addAttributes({
                      'data-appwrite-src': dataAppwriteSrc,
                      title: `Live data: ${dataAppwriteSrc}`
                    });
                    // eslint-disable-next-line no-console
                    console.log('Set presigned URL:', presignedUrl);
                    return;
                  }
                }
              }

              // Fallback to placeholder
              const placeholderText = encodeURIComponent(dataAppwriteSrc);
              const placeholderUrl = `https://via.placeholder.com/400x300/e2e8f0/475569?text=${placeholderText}`;

              this.set('src', placeholderUrl);

              // Add visual feedback in the editor
              this.addAttributes({
                'data-appwrite-src': dataAppwriteSrc,
                title: `Dynamische bron: ${dataAppwriteSrc}`
              });
            } else {
              // Remove the data attribute if cleared
              this.removeAttributes(['data-appwrite-src', 'title']);
            }
          });

          // Initial setup
          const dataAppwriteSrc = this.get('data-appwrite-src');
          if (dataAppwriteSrc) {
            this.trigger('change:data-appwrite-src');
          }
        }
      }, {
        // Extend traits to add data-source selector
        isComponent(el: HTMLElement) {
          return el.tagName === 'IMG';
        }
      }),

      view: defaultType.view.extend({
        onRender() {
          // Add custom traits dynamically
          const traits = this.model.get('traits');

          // Check if our custom trait exists
          const hasDataSource = traits.where({ name: 'data-appwrite-src' }).length > 0;

          if (!hasDataSource) {
            // Add data source selector trait
            traits.add({
              type: 'select',
              name: 'data-appwrite-src',
              label: 'Data Bron',
              options: dataSourceOptions,
              changeProp: 1
            }, { at: 1 }); // Add after alt text
          }
        }
      })
    });

    // eslint-disable-next-line no-console
    console.log('Custom image component with data-source selector initialized');
  };


  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Project Selector Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 shadow-sm">
        <span className="text-sm font-medium text-slate-700">
          Preview met project data:
        </span>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Geen project (Placeholder mode)</option>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {dataSources.globalData?.projects?.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.title} - {project.address}
            </option>
          ))}
        </select>
        {selectedProjectId && projectData && (
          <>
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Live data actief
            </div>
            <button
              onClick={() => editorInstance && updateEditorImages(editorInstance)}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Refresh Images
            </button>
          </>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <StudioEditor
          options={{
            licenseKey: 'DEMO_LOCALHOST_KEY',
            theme: 'light',
            plugins: [
              presetPrintable,
              canvasFullSize,
              customImagePlugin
            ],
            project: {
              type: 'document',
              id: `project-${user?.$id || 'default'}`
            },
            identity: {
              id: user?.$id || 'unique-user-id'
            },
            assets: {
              storageType: 'cloud'
            },
            storage: {
              type: 'cloud',
              autosaveChanges: 100,
              autosaveIntervalMs: 10000
            },
            dataSources: {
              blocks: true, // Enable datasource blocks
              ...dataSources
            }
          }}
        />
      </div>
    </div>
  );
}
