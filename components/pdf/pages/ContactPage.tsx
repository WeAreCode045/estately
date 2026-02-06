import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';
import type { Agency, PropertyData, ThemeConfig } from '../types';

interface ContactPageProps {
  theme: ThemeConfig;
  property: PropertyData;
  agency: Agency;
}

const ContactPage: React.FC<ContactPageProps> = ({ theme, property, agency }) => {
    // styles not required for this custom layout; keep theme available via prop

  // Custom Split Layout style
  const splitStyles = StyleSheet.create({
      container: {
          flexDirection: 'row',
          flex: 1,
          width: '100%',
          height: '100%',
      },
      imageSide: {
          width: '60%',
          height: '100%',
          backgroundColor: '#f0f0f0',
      },
      image: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
      },
      contentSide: {
          width: '40%',
          height: '100%',
          backgroundColor: '#1a1a1a', // Always Dark for requested style
          padding: 30,
          justifyContent: 'center',
          color: '#ffffff',
      },
      heading: {
          fontSize: 24,
          fontWeight: 300,
          color: '#ffffff',
          marginBottom: 30,
          fontFamily: theme.fonts.heading,
          letterSpacing: -0.5,
      },
      subheading: {
          fontSize: 10,
          fontWeight: 700,
          color: '#888888',
          textTransform: 'uppercase',
          marginBottom: 10,
          letterSpacing: 2,
      },
      text: {
          fontSize: 10,
          color: '#cccccc',
          marginBottom: 5,
          lineHeight: 1.6,
      },
      logo: {
          width: 80,
          height: 50,
          objectFit: 'contain',
          marginBottom: 40,
          filter: 'grayscale(100%) brightness(1000%)', // Attempt to make logo white/monochrome via CSS filter equivalent if supported (React-PDF support is limited, usually need white png)
          // Note: React-PDF doesn't support CSS filters. If logo is black, it might disappear on dark bg.
          // In a real app we'd ask for 'logoLight'. For now we assume logo works or is hidden in dark mode.
      },
      divider: {
          height: 1,
          backgroundColor: '#333333',
          marginVertical: 30,
      }
  });

  // Use second image or cover image for the generic "Lifestyle" shot
  const contactImage = property.images[1] || property.coverImage;

  return (
    <Page size="A4" style={{ padding: 0, flexDirection: 'row' }}>
       <View style={splitStyles.imageSide}>
           {contactImage ? <Image src={contactImage} style={splitStyles.image} /> : null}
       </View>

       <View style={splitStyles.contentSide}>
           {/* Agency Info */}
           {agency.logo && (
               <View style={{ marginBottom: 40, backgroundColor: '#fff', padding: 5, alignSelf: 'flex-start' }}>
                    {/* Background wrapper for logo visibility */}
                   <Image src={agency.logo} style={{ width: 80, height: 40, objectFit: 'contain' }} />
               </View>
           )}

           <Text style={splitStyles.subheading}>Presented By</Text>
           <Text style={splitStyles.heading}>{agency.name}</Text>

           <Text style={splitStyles.text}>{agency.address}</Text>
           <Text style={splitStyles.text}>{agency.email}</Text>
           <Text style={splitStyles.text}>{agency.phone}</Text>
           <Text style={splitStyles.text}>{agency.website}</Text>

           <View style={splitStyles.divider} />

           {/* Agent Info */}
           {property.agent && (
               <>
                <Text style={splitStyles.subheading}>Your Agent</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    {property.agent.avatar && (
                        <Image
                            src={property.agent.avatar}
                            style={{ width: 50, height: 50, borderRadius: 0, marginRight: 15, backgroundColor: '#333' }}
                        />
                    )}
                    <View>
                        <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>{property.agent.name}</Text>
                        <Text style={{ fontSize: 10, color: '#888' }}>{property.agent.role}</Text>
                    </View>
                </View>

                <Text style={splitStyles.text}>{property.agent.email}</Text>
                <Text style={splitStyles.text}>{property.agent.phone}</Text>
               </>
           )}
       </View>
    </Page>
  );
};

export default ContactPage;
