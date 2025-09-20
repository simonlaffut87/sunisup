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
  const defaultDescription = "Communauté d'énergie Bruxelles Sun Is Up : partage d'énergie solaire locale pour réduire votre facture électricité jusqu'à 30%. Première communauté d'énergie renouvelable de Belgique.";
  const defaultKeywords = "communauté d'énergie bruxelles, communauté d'énergie belgique, partage d'énergie bruxelles, réduction facture électricité, energy community brussels, energy sharing brussels, electricity bill reduction, energiegemeenschap brussel, energie delen brussel, elektriciteitsrekening vermindering, Sun Is Up, énergie renouvelable bruxelles, autoconsommation collective belgique, transition énergétique bruxelles";

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
          "keywords": finalKeywords,
          "url": url,
          "inLanguage": ["fr-BE", "nl-BE", "en-BE"],
          "isPartOf": {
            "@type": "WebSite",
            "name": "Sun Is Up",
            "url": "https://sunisup.be",
            "alternateName": ["Communauté d'Énergie Bruxelles", "Energy Community Brussels", "Energiegemeenschap Brussel"]
          },
          "about": {
            "@type": "Organization",
            "name": "Sun Is Up ASBL",
            "description": "Communauté d'énergie Bruxelles pour le partage d'énergie solaire et la réduction des factures électricité",
            "serviceType": ["Communauté d'énergie", "Partage d'énergie", "Réduction facture électricité"]
          }
        })}
      </script>
    </Helmet>
  );
}