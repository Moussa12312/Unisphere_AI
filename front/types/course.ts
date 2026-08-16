// frontend/types/course.ts
export interface Course {
    id: number;
    title: string;
    code: string;
    department: string;
    level: string;
    credits: number;
    hours: number;
    teacher_id: number | null;
    teacher_name: string;
    filiere_id: number | null;
    university_id: number;
  }
  
  export interface CourseHistory {
    id: number;
    course_id: number;
    action: 'created' | 'updated' | 'deleted';
    field_changed: string | null;
    old_value: string | null;
    new_value: string | null;
    user_name: string;
    created_at: string;
  }
  
  export interface CourseFormData {
    title: string;
    code: string;
    level: string;
    filiere_id: string;
    teacher_id: string;
    credits: string;
    hours: string;
  }
  
  export interface CourseFilters {
    search: string;
    level: string;
    filiere: string;
  }