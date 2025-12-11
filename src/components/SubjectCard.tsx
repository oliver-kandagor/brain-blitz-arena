import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface SubjectCardProps {
  subject: Subject;
  index: number;
}

const colorClasses: Record<string, { bg: string; border: string; glow: string }> = {
  cyan: {
    bg: 'from-[hsl(174,100%,50%,0.15)] to-transparent',
    border: 'border-[hsl(174,100%,50%,0.3)] hover:border-[hsl(174,100%,50%,0.6)]',
    glow: 'hover:shadow-[0_0_30px_hsl(174,100%,50%,0.3)]',
  },
  emerald: {
    bg: 'from-[hsl(142,76%,45%,0.15)] to-transparent',
    border: 'border-[hsl(142,76%,45%,0.3)] hover:border-[hsl(142,76%,45%,0.6)]',
    glow: 'hover:shadow-[0_0_30px_hsl(142,76%,45%,0.3)]',
  },
  amber: {
    bg: 'from-[hsl(45,100%,51%,0.15)] to-transparent',
    border: 'border-[hsl(45,100%,51%,0.3)] hover:border-[hsl(45,100%,51%,0.6)]',
    glow: 'hover:shadow-[0_0_30px_hsl(45,100%,51%,0.3)]',
  },
  purple: {
    bg: 'from-[hsl(262,83%,58%,0.15)] to-transparent',
    border: 'border-[hsl(262,83%,58%,0.3)] hover:border-[hsl(262,83%,58%,0.6)]',
    glow: 'hover:shadow-[0_0_30px_hsl(262,83%,58%,0.3)]',
  },
  rose: {
    bg: 'from-[hsl(330,100%,60%,0.15)] to-transparent',
    border: 'border-[hsl(330,100%,60%,0.3)] hover:border-[hsl(330,100%,60%,0.6)]',
    glow: 'hover:shadow-[0_0_30px_hsl(330,100%,60%,0.3)]',
  },
  blue: {
    bg: 'from-[hsl(210,100%,50%,0.15)] to-transparent',
    border: 'border-[hsl(210,100%,50%,0.3)] hover:border-[hsl(210,100%,50%,0.6)]',
    glow: 'hover:shadow-[0_0_30px_hsl(210,100%,50%,0.3)]',
  },
};

const SubjectCard = ({ subject, index }: SubjectCardProps) => {
  const navigate = useNavigate();
  const colors = colorClasses[subject.color] || colorClasses.cyan;

  return (
    <button
      onClick={() => navigate(`/subject/${subject.id}`)}
      className={cn(
        'group relative p-6 rounded-2xl border bg-gradient-to-br transition-all duration-500 text-left',
        'hover:scale-[1.02] hover:-translate-y-1',
        colors.bg,
        colors.border,
        colors.glow
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
          {subject.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold mb-2 group-hover:text-primary transition-colors">
            {subject.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {subject.description}
          </p>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-1 rounded-full bg-muted/50">3 Levels</span>
        <span className="px-2 py-1 rounded-full bg-muted/50">Multiplayer</span>
      </div>
      
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm font-medium text-primary">Play →</span>
      </div>
    </button>
  );
};

export default SubjectCard;
