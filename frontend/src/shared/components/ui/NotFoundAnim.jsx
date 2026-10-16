import comingSoon from '@/assets/coming_soon.png';

const NotFoundAnim = ({ className = 'w-64 h-64' }) => (
  <div className={`${className} flex items-center justify-center`}>
    <img src={comingSoon} alt="Not found" className="w-full h-full object-contain" />
  </div>
);

export default NotFoundAnim;
