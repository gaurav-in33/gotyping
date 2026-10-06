import { useRoute } from '../../router';
import { CourseHome } from './CourseHome';
import { LessonView } from './LessonView';
import './learn.css';

const PREFIX = '/learn';

export default function LearnScreen() {
  const path = useRoute();
  const rest = path.startsWith(PREFIX) ? path.slice(PREFIX.length).replace(/^\/+/, '') : '';

  if (!rest) return <CourseHome />;
  return <LessonView lessonId={rest} />;
}
