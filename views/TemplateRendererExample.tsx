import { Copy, Eye, FileDown } from 'lucide-react';
import { useState } from 'react';
import { COLLECTIONS, DATABASE_ID, databases } from '../api/appwrite';
import { s3Service } from '../api/s3Service';
import { prepareAppwriteDataForRendering, renderAppwriteContentBrowser } from '../api/templateRendererBrowser';

/**
 * Example component showing how to use the template renderer
 */
export default function TemplateRendererExample() {
  const [templateHtml, setTemplateHtml] = useState(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
    .logo { width: 150px; height: 150px; object-fit: contain; }
    .cover { width: 100%; max-width: 600px; height: auto; }
    .avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
  </style>
</head>
<body>
  <div class="header">
    <img
      src="https://placeholder.com/150"
      data-appwrite-src="agency.logo"
      alt="Agency Logo"
      class="logo"
    />
    <div>
      <h1>Estate Agency Document</h1>
      <p>Professional Property Brochure</p>
    </div>
  </div>

  <div class="content">
    <h2>Property Details</h2>
    <img
      src="https://placeholder.com/600x400"
      data-appwrite-src="project.coverImageId"
      alt="Property Cover"
      class="cover"
    />

    <h3>Agent Information</h3>
    <div style="display: flex; align-items: center; gap: 15px;">
      <img
        src="https://placeholder.com/80"
        data-appwrite-src="user.avatar"
        alt="Agent Avatar"
        class="avatar"
      />
      <div>
        <p><strong>Agent:</strong> John Doe</p>
        <p><strong>Contact:</strong> info@agency.com</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim());

  const [renderedHtml, setRenderedHtml] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');

  const handleRender = async () => {
    setIsRendering(true);
    setError('');

    try {
      // Fetch data from Appwrite
      let agency = null;
      let project = null;
      const user = null;

      // Fetch agency
      try {
        const agencyList = await databases.listDocuments(DATABASE_ID, COLLECTIONS.AGENCIES, []);
        agency = agencyList.documents[0] || null;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('No agency found:', err);
      }

      // Fetch project if ID provided
      if (projectId) {
        try {
          project = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Project not found:', err);
        }
      }

      // Generate presigned URLs for all image paths
      const presignedUrls: Record<string, string> = {};
      const imagePaths = [
        agency?.logo,
        project?.coverImageId
      ];

      await Promise.all(
        imagePaths
          .filter(path => path)
          .map(async (path) => {
            try {
              const presignedUrl = await s3Service.getPresignedUrl(path, 3600);
              presignedUrls[path] = presignedUrl;
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(`Error generating presigned URL for ${path}:`, error);
            }
          })
      );

      // Replace S3 paths with presigned URLs in the data
      if (agency?.logo && presignedUrls[agency.logo]) {
        agency.logo = presignedUrls[agency.logo];
      }
      if (project?.coverImageId && presignedUrls[project.coverImageId]) {
        project.coverImageId = presignedUrls[project.coverImageId];
      }

      // Prepare data and render (now with presigned URLs already in place)
      const dataObject = prepareAppwriteDataForRendering(agency, project, user);

      // Since URLs are already presigned, we need to modify the renderer to not add base URL
      const result = renderAppwriteContentBrowser(templateHtml, dataObject, {
        debug: true,
        useDirectUrls: true // Signal that paths are already full URLs
      });

      setRenderedHtml(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering failed');
    } finally {
      setIsRendering(false);
    }
  };

  const handlePreview = async () => {
    setIsRendering(true);
    setError('');

    try {
      // Use mock data
      const mockData = prepareAppwriteDataForRendering(
        {
          logo: 'agency/demo-logo.png',
          name: 'Demo Agency',
          address: 'Demo Street 123'
        },
        {
          coverImageId: 'projects/demo-cover.jpg',
          title: 'Demo Project',
          price: 350000
        },
        {
          avatar: 'profiles/demo-avatar.jpg',
          name: 'Demo User',
          email: 'demo@example.com'
        }
      );

      const result = renderAppwriteContentBrowser(templateHtml, mockData, {
        debug: true
      });

      setRenderedHtml(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([renderedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rendered-template.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(renderedHtml);
    alert('HTML gekopieerd naar klembord!');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Template Renderer Test</h1>
        <p className="text-slate-600">
          Test de dynamische image data-source rendering met Appwrite en S3
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Template HTML</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Project ID (optioneel)
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Laat leeg voor test data"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              HTML Template
            </label>
            <textarea
              value={templateHtml}
              onChange={(e) => setTemplateHtml(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRender}
              disabled={isRendering}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
            >
              <Eye size={18} />
              {isRendering ? 'Rendering...' : 'Render met data'}
            </button>

            <button
              onClick={handlePreview}
              disabled={isRendering}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-400 transition-colors"
            >
              <Eye size={18} />
              Preview (Demo)
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Output Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Rendered Output</h2>
            {renderedHtml && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyHtml}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                  title="Copy HTML"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                  title="Download HTML"
                >
                  <FileDown size={18} />
                </button>
              </div>
            )}
          </div>

          {renderedHtml ? (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Preview</h3>
                <div className="border border-slate-300 rounded-md overflow-hidden">
                  <iframe
                    srcDoc={renderedHtml}
                    className="w-full h-96 bg-white"
                    title="Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">HTML Code</h3>
                <textarea
                  value={renderedHtml}
                  readOnly
                  rows={15}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-xs bg-slate-50"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96 bg-slate-50 border-2 border-dashed border-slate-300 rounded-md">
              <p className="text-slate-500">Rendered output verschijnt hier...</p>
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Hoe werkt het?</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1. Data Source Attribute:</strong> Voeg <code className="bg-blue-100 px-1 py-0.5 rounded">data-appwrite-src="collectie.attribuut"</code> toe aan img tags</p>
          <p><strong>2. Beschikbare bronnen:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><code className="bg-blue-100 px-1 py-0.5 rounded">agency.logo</code> - Agency logo</li>
            <li><code className="bg-blue-100 px-1 py-0.5 rounded">project.coverImageId</code> - Project cover afbeelding</li>
            <li><code className="bg-blue-100 px-1 py-0.5 rounded">user.avatar</code> - User avatar</li>
            <li><code className="bg-blue-100 px-1 py-0.5 rounded">profiles.avatar</code> - Profile avatar</li>
          </ul>
          <p><strong>3. Rendering:</strong> De renderer vervangt het data-appwrite-src pad met de volledige S3 URL</p>
          <p><strong>4. Fallback:</strong> Als data niet gevonden wordt, wordt een placeholder gebruikt</p>
        </div>
      </div>
    </div>
  );
}
