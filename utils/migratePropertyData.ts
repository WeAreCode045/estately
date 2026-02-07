/**
 * Browser-based Migration Utility
 *
 * This can be imported and called from the browser console or a temporary admin page
 * Run this while logged in as an admin user
 */

/* eslint-disable no-console */

import { COLLECTIONS, DATABASE_ID, databases, ID } from '../api/appwrite';

/**
 * Map legacy project fields to Property collection structure
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProjectToProperty(project: Record<string, any>) {
  // Extract location data
  const location = {
    street: project.address || '',
    streetNumber: '',
    postalCode: '',
    city: '',
    country: ''
  };

  // Try to parse address if it's a string
  if (project.address && typeof project.address === 'string') {
    // Simple address parsing (can be improved)
    const addressParts = project.address.split(',').map((p: string) => p.trim());
    if (addressParts.length >= 1) location.street = addressParts[0] || '';
    if (addressParts.length >= 2) location.city = addressParts[1] || '';
    if (addressParts.length >= 3) location.country = addressParts[2] || '';
  }

  // Extract size data
  const size = {
    lotSize: project.sqft || project.plotSize || 0,
    floorSize: project.livingArea || project.floorArea || 0
  };

  // Extract media data
  const media = {
    images: project.media || project.images || [],
    floorplans: [],
    videoUrl: '',
    virtualTourUrl: ''
  };

  // Extract rooms data
  const rooms = {
    bedrooms: project.bedrooms || 0,
    bathrooms: project.bathrooms || 0,
    garages: project.garages || 0,
    buildYear: project.buildYear || project.build_year || null
  };

  // Extract description
  const descriptions = [];
  if (project.description) {
    descriptions.push({
      type: 'propertydesc',
      content: project.description
    });
  }

  // Extract specs (features)
  const specs: string[] = [];
  if (project.features) {
    if (Array.isArray(project.features)) {
      specs.push(...project.features);
    } else if (typeof project.features === 'string') {
      try {
        const parsed = JSON.parse(project.features);
        if (Array.isArray(parsed)) specs.push(...parsed);
      } catch {
        // Ignore parsing errors
      }
    }
  }

  return {
    description: JSON.stringify(descriptions),
    location: JSON.stringify(location),
    size: JSON.stringify(size),
    media: JSON.stringify(media),
    rooms: JSON.stringify(rooms),
    specs: JSON.stringify(specs)
  };
}

/**
 * Migrate property data from a project to the properties collection
 */
export async function migrateProjectProperty(projectId?: string) {
  try {
    console.log('🔍 Fetching project...\n');

    let project;

    if (projectId) {
      // Fetch specific project
      project = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        projectId
      );
    } else {
      // Fetch the first project
      const projectsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        []
      );

      if (projectsResponse.documents.length === 0) {
        console.log('❌ No projects found in the collection.');
        return null;
      }

      project = projectsResponse.documents[0];
    }

    if (!project) {
      console.log('❌ No project data available.');
      return null;
    }

    console.log(`📋 Found project: ${project.title || project.$id}`);
    console.log(`   Project ID: ${project.$id}`);
    console.log(`   Property ID: ${project.property_id || 'not set'}\n`);

    // Check if project already has a property_id
    if (project.property_id) {
      console.log('⚠️  Project already has a property_id. Checking if property exists...');

      try {
        const existingProperty = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROPERTIES,
          project.property_id
        );_
        console.log(`✓ Property ${project.property_id} exists.`);
        console.log('\n📊 Current property data:');
        console.log(existingProperty);
        return { project, property: existingProperty, alreadyMigrated: true };
      } catch {
        console.log(`⚠️  Property ${project.property_id} not found. Creating new one...`);
      }
    }

    // Display current project data
    console.log('📊 Current project data:');
    console.log('   Address:', project.address || 'N/A');
    console.log('   Price:', project.price || 'N/A');
    console.log('   Living Area:', project.livingArea || 'N/A');
    console.log('   Plot Size:', project.sqft || 'N/A');
    console.log('   Bedrooms:', project.bedrooms || 'N/A');
    console.log('   Bathrooms:', project.bathrooms || 'N/A');
    console.log('   Garages:', project.garages || 'N/A');
    console.log('   Build Year:', project.buildYear || 'N/A');
    console.log('   Description:', project.description ? `${project.description.substring(0, 50)}...` : 'N/A');
    console.log('   Media:', (project.media || []).length, 'items\n');

    // Map project data to property structure
    console.log('🔄 Mapping project data to property structure...\n');
    const propertyData = mapProjectToProperty(project);

    console.log('📦 Property data to be created:');
    console.log('Location:', JSON.parse(propertyData.location));
    console.log('Size:', JSON.parse(propertyData.size));
    console.log('Rooms:', JSON.parse(propertyData.rooms));
    console.log('Media images:', JSON.parse(propertyData.media).images?.length || 0);
    console.log('Descriptions:', JSON.parse(propertyData.description).length, 'items\n');

    // Create property in properties collection
    console.log('✨ Creating property in properties collection...\n');
    const newProperty = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROPERTIES,
      ID.unique(),
      propertyData
    );

    console.log(`✓ Property created with ID: ${newProperty.$id}\n`);

    // Update project to reference the new property
    console.log('🔗 Updating project to reference new property...\n');
    try {
      const updatedProject = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        project.$id,
        {
          property_id: newProperty.$id
        }
      );

      console.log('✓ Project updated successfully!\n');
      console.log('✅ Migration completed successfully!');
      console.log(`\n📝 Summary:`);
      console.log(`   Project ID: ${project.$id}`);
      console.log(`   New Property ID: ${newProperty.$id}`);
      console.log(`   Project now references the property via property_id\n`);

      return {
        project: updatedProject,
        property: newProperty,
        alreadyMigrated: false
      };
    } catch (updateError) {
      const err = updateError as { message?: string; code?: number };

      if (err.message?.includes('Unknown attribute') || err.message?.includes('property_id')) {
        console.error('\n❌ The property_id attribute does not exist in the projects collection.\n');
        console.log('📋 To fix this, you have two options:\n');
        console.log('Option 1 - Via Appwrite Console (Recommended):');
        console.log('   1. Go to your Appwrite Console');
        console.log('   2. Navigate to Database → estately-main → projects collection');
        console.log('   3. Click "Attributes" tab');
        console.log('   4. Click "Create Attribute"');
        console.log('   5. Select "String" type');
        console.log('   6. Key: property_id');
        console.log('   7. Size: 36');
        console.log('   8. Required: No (uncheck)');
        console.log('   9. Click "Create"\n');
        console.log('Option 2 - Via API Key (requires admin access):');
        console.log('   1. Set APPWRITE_API_KEY environment variable');
        console.log('   2. Run: node scripts/add_property_id_attribute.cjs\n');
        console.log(`✓ Property was created (ID: ${newProperty.$id}), but couldn't link to project.`);
        console.log('   After adding the attribute, you can manually update the project or re-run migration.\n');

        return {
          project,
          property: newProperty,
          alreadyMigrated: false,
          needsAttributeCreation: true
        };
      }

      throw updateError;
    }

  } catch (error) {
    const err = error as { message?: string; response?: unknown };
    console.error('❌ Migration failed:', err.message);
    if (err.response) {
      console.error('Response:', err.response);
    }
    throw error;
  }
}

/**
 * Migrate all projects that don't have a property_id yet
 */
export async function migrateAllProjects() {
  try {
    console.log('🔍 Fetching all projects...\n');

    const projectsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      []
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectsWithoutProperty = projectsResponse.documents.filter(
      (p: any) => !p.property_id
    );

    console.log(`Found ${projectsWithoutProperty.length} projects without property_id\n`);

    const results = [];

    for (const project of projectsWithoutProperty) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Migrating project: ${project.title || project.$id}`);
      console.log('='.repeat(60));

      try {
        const result = await migrateProjectProperty(project.$id);
        results.push({ success: true, projectId: project.$id, result });
      } catch (error) {
        const err = error as { message?: string };
        results.push({ success: false, projectId: project.$id, error: err.message });
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total projects processed: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);

    return results;

  } catch (error) {
    const err = error as { message?: string };
    console.error('❌ Migration failed:', err.message);
    throw error;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).migrateProjectProperty = migrateProjectProperty;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).migrateAllProjects = migrateAllProjects;
}
