import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
}

export function SEOHead({ 
  title, 
  description, 
  keywords, 
  image = "https://sunisup.be/images/pv.png",
  url = "https://sunisup.be",
  type = "website",
  noIndex = false
}: SEOHeadProps) {
  const { t } = useTranslation();
  
  const defaultTitle = "Sun Is Up - Communauté d'Énergie Solaire Bruxelles | Réduisez vos Factures jusqu'à 30%";
  const defaultDescription = "Rejoignez Sun Is Up, la communauté d'énergie solaire de Bruxelles. Économisez jusqu'à 30% sur vos factures d'électricité grâce au partage d'énergie locale.";
  const defaultKeywords = "Sun Is Up, communauté énergie Bruxelles, partage énergie solaire, réduction facture électricité, énergie renouvelable Bruxelles, autoconsommation collective, transition énergétique";

  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalKeywords = keywords || defaultKeywords;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Sun Is Up" />
      <meta property="og:locale" content="fr_BE" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Structured Data for this specific page */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": finalTitle,
          "description": finalDescription,
          "url": url,
          "isPartOf": {
            "@type": "WebSite",
            "name": "Sun Is Up",
            "url": "https://sunisup.be"
          },
          "about": {
            "@type": "Organization",
            "name": "Sun Is Up ASBL",
            "description": "Communauté d'énergie solaire à Bruxelles"
          }
        })}
      </script>
    </Helmet>
  );
}