# Property Template & Brochure Generator

Modern, interactieve property brochure template met PDF export functionaliteit.

## Functionaliteit

### PropertyTemplate Component

Een volledig responsive React component voor het tonen van property details in een professionele, luxe lay-out.

**Features:**
- 📸 Image gallery met thumbnails
- 💰 Dynamische pricing in EUR formaat
- 🏠 Property specs (slaapkamers, badkamers, m²)
- 📝 Uitgebreide beschrijving
- ✨ Amenities grid met icons
- 👔 Agent & agency contact informatie
- 📄 PDF export met één klik
- 🔒 AWS S3 presigned URL support voor secure images

### PropertyBrochure View

Full-page brochure view die automatisch project data laadt uit Appwrite.

**Route:** `/projects/:projectId/brochure`

## Gebruik

### 1. Via Project Detail Page

In de project detail page, klik op het **Actions** menu (⚡ icoon) en selecteer:
- **View Brochure** - Open interactieve online versie
- **Download Brochure** - Download direct als PDF (legacy functie)

### 2. Direct URL

Navigeer naar: `/#/projects/{PROJECT_ID}/brochure`

### 3. Programmatisch

```tsx
import { useNavigate } from 'react-router-dom';
import PropertyTemplate from '../components/PropertyTemplate';

// Navigeren naar brochure
const navigate = useNavigate();
navigate(`/projects/${projectId}/brochure`);

// Of direct component gebruiken
<PropertyTemplate
  project={{
    title: "Luxe Villa",
    price: 450000,
    address: "Keizersgracht 123, Amsterdam",
    description: "...",
    bedrooms: 4,
    bathrooms: 3,
    sqft: 250,
    coverImageId: "projects/cover.jpg",
    gallery: ["projects/img1.jpg", "projects/img2.jpg"],
    status: "Te Koop"
  }}
  agency={{
    name: "Real Estate Agency",
    logo: "agency/logo.png",
    phone: "+31 20 123 4567",
    email: "info@agency.nl",
    website: "www.agency.nl"
  }}
  agent={{
    name: "Jan Janssen",
    avatar: "profiles/jan.jpg",
    phone: "+31 6 12345678",
    email: "jan@agency.nl",
    role: "Senior Makelaar"
  }}
  amenities={[
    { icon: '🏊', label: 'Zwembad' },
    { icon: '🅿️', label: 'Parkeren' }
  ]}
/>
```

## PDF Generatie

De component gebruikt `html2canvas` en `jsPDF` voor het genereren van PDF's:

```tsx
const generatePDF = async () => {
  // Load presigned URLs for images
  await loadImages();

  // Capture component as canvas
  const canvas = await html2canvas(templateRef.current, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  // Generate PDF (A4 format)
  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 0, 0, 210, height);
  pdf.save('brochure.pdf');
};
```

## Image Handling

De template ondersteunt automatische presigned URL generatie voor AWS S3:

```tsx
const loadImages = async () => {
  const urls: Record<string, string> = {};

  await Promise.all(
    imagePaths.map(async (path) => {
      const presignedUrl = await s3Service.getPresignedUrl(path, 3600);
      urls[path] = presignedUrl;
    })
  );

  setImageUrls(urls);
};
```

URLs zijn 1 uur geldig. De component laadt automatisch nieuwe URLs indien nodig.

## Styling

De component gebruikt **Tailwind CSS** voor styling met:
- Modern gradient backgrounds
- Subtiele shadows en borders
- Responsive grid layouts
- Print-friendly formatting
- Smooth transitions en hover effecten

## Props Interface

### PropertyTemplateProps

```typescript
interface PropertyTemplateProps {
  project: {
    title: string;
    price: number;
    address: string;
    description: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    coverImageId?: string;
    gallery?: string[];
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
```

## Aanpassingen

### Custom Amenities

Amenities worden als array meegegeven:

```tsx
const amenities = [
  { icon: '🏊', label: 'Zwembad' },
  { icon: '🏋️', label: 'Fitness' },
  { icon: '🅿️', label: 'Parkeren' },
  { icon: '🌳', label: 'Tuin' },
  { icon: '🔒', label: 'Beveiliging' },
  { icon: '🌡️', label: 'Klimatisatie' }
];
```

### Image Gallery

Voeg images toe aan het gallery array:

```tsx
project={{
  coverImageId: "projects/main.jpg",
  gallery: [
    "projects/living-room.jpg",
    "projects/kitchen.jpg",
    "projects/bedroom.jpg",
    "projects/bathroom.jpg"
  ]
}}
```

### Styling Aanpassen

De component gebruikt Tailwind utility classes. Pas aan in PropertyTemplate.tsx:

```tsx
// Bijv. wijzig header gradient
<div className="bg-gradient-to-r from-blue-900 to-blue-800">

// Of wijzig card styling
<div className="bg-white rounded-3xl shadow-xl">
```

## Dependencies

```json
{
  "html2canvas": "^1.4.1",
  "jspdf": "^2.5.1",
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x"
}
```

## Troubleshooting

### Images laden niet
- Controleer of S3 presigned URL's correct worden gegenereerd
- Verify AWS credentials in `.env`
- Check CORS instellingen voor S3 bucket

### PDF export werkt niet
- Zorg dat `crossOrigin="anonymous"` is ingesteld op images
- Wacht tot alle images zijn geladen voordat PDF wordt gegenereerd
- Check browser console voor CORS errors

### Styling komt niet mee in PDF
- `html2canvas` ondersteunt geen externe stylesheets - gebruik alleen Tailwind inline classes
- Sommige CSS features (bijv. backdrop-filter) worden niet gerenderd
- Test in verschillende browsers

## Toekomstige Verbeteringen

- [ ] Template varianten (modern, klassiek, minimaal)
- [ ] Custom branding kleuren
- [ ] Multi-language support
- [ ] Video embedding in gallery
- [ ] Floorplan sectie
- [ ] Interactive map integration
- [ ] Social sharing buttons
- [ ] QR code voor direct contact

## Support

Voor vragen of issues, contacteer het development team.
