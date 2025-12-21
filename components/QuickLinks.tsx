
import React from 'react';
import { QUICK_LINKS } from '../constants';

interface QuickLinksProps {
    compact?: boolean;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ compact }) => {
  // Filter out the "Tech Info" link as it is now in the separator bar
  const mainLinks = QUICK_LINKS.filter(link => !link.title.includes('TECH INFO'));

  return (
    <div className={`w-full flex flex-wrap justify-center gap-3 px-4 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${compact ? 'py-1' : 'py-6'}`}>
        {mainLinks.map((link) => (
          <a
            key={link.title}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className={`
                magnetic-btn magnetic-slight bg-white dark:bg-gray-800 text-falcon-green dark:text-falcon-gold 
                hover:text-falcon-gold hover:bg-white/90 dark:hover:bg-gray-700 border border-transparent 
                hover:border-falcon-gold/20 shadow-md hover:shadow-lg transition-all duration-500 
                rounded-sm font-medium text-center uppercase tracking-wide
                ${compact 
                    ? 'px-4 py-1.5 text-xs min-w-[120px]' 
                    : 'px-8 py-3 text-sm md:text-base min-w-[160px]'
                }
            `}
          >
            {link.title}
          </a>
        ))}
    </div>
  );
};

export default QuickLinks;
