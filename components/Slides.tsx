import React from 'react';

const Slides: React.FC = () => {
  const slidesUrl = "https://docs.google.com/presentation/d/1W7YDzYffFhhMu3ZBmPMdIkMmImo9kTmZEicDWTo6Tik/embed?start=true&loop=true&delayms=5000&slide=id.g3745b9540e6_17_53";

  return (
    <div className="w-full max-w-5xl mx-auto mb-10 shadow-2xl rounded-lg overflow-hidden border-4 border-falcon-green bg-black">
      <div className="relative w-full pt-[56.25%]">
        <iframe 
          src={slidesUrl} 
          title="Daily Student Announcements"
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          allow="autoplay"
        ></iframe>
      </div>
    </div>
  );
};

export default Slides;