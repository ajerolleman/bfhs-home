
import React from 'react';
import { QUICK_LINKS } from '../constants';

interface QuickLinksProps {
    compact?: boolean;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ compact }) => {
  // Filter out the "Tech Info" link as it is now in the separator bar
  const mainLinks = QUICK_LINKS.filter(link => !link.title.includes('TECH INFO'));

  return (
    <div className={`w-full flex flex-wrap justify-center gap-3 px-4 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${compact ? 'py-1' : 'py-2'}`}>
        {mainLinks.map((link) => (
          <a
            key={link.title}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className={`
                magnetic-btn magnetic-slight 
                backdrop-blur-md bg-white/10 border border-white/20 
                text-white hover:text-white 
                hover:bg-white/20 shadow-lg hover:shadow-xl hover:scale-105
                transition-all duration-300 ease-spring
                rounded-full font-medium text-center uppercase tracking-wide
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
