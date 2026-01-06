import { Course, ClassSchedule, BotConfig } from '../types/config';

export class CourseService {
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
  }

  getAllCourses(): Course[] {
    return this.config.courses.filter(c => c.active);
  }

  getCourseById(id: string): Course | null {
    return this.config.courses.find(c => c.id === id && c.active) || null;
  }

  getUpcomingClasses(courseId: string): ClassSchedule[] {
    // In a real implementation, this would query the database
    // For now, return mock data based on course
    const course = this.getCourseById(courseId);
    if (!course) return [];

    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return [
      {
        id: `${courseId}-class-1`,
        courseId,
        startDate: this.formatDate(today),
        endDate: this.formatDate(nextMonth),
        schedule: 'Segunda a Sexta, 19h às 22h',
        availableSlots: 15,
        totalSlots: 30
      }
    ];
  }

  updateCourse(id: string, data: Partial<Course>): boolean {
    const index = this.config.courses.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.config.courses[index] = {
      ...this.config.courses[index],
      ...data
    };
    return true;
  }

  formatCourseList(): string {
    const courses = this.getAllCourses();
    let message = `📚 *Cursos Disponíveis*\n\n`;
    
    courses.forEach((course, index) => {
      message += `${index + 1}. *${course.name}*\n   ${course.description}\n\n`;
    });
    
    message += `\nDigite o número do curso para mais detalhes ou 0 para voltar ao menu.`;
    return message;
  }

  formatCourseDetail(course: Course): string {
    const classes = this.getUpcomingClasses(course.id);
    
    let message = `📖 *${course.name}*\n\n`;
    message += `📝 ${course.description}\n\n`;
    message += `⏱️ *Duração:* ${course.duration}\n`;
    message += `📚 *Carga Horária:* ${course.workload}\n`;
    message += `💰 *Investimento:* R$ ${course.price.toFixed(2)}\n\n`;
    
    message += `📋 *Pré-requisitos:*\n`;
    course.prerequisites.forEach(p => {
      message += `• ${p}\n`;
    });
    
    message += `\n📄 *Documentos necessários:*\n`;
    course.documents.forEach(d => {
      message += `• ${d}\n`;
    });

    if (classes.length > 0) {
      message += `\n📅 *Próximas turmas:*\n`;
      classes.forEach(c => {
        message += `• Início: ${c.startDate} - ${c.schedule}\n`;
        message += `  Vagas: ${c.availableSlots}/${c.totalSlots}\n`;
      });
    }

    message += `\nDigite:\n`;
    message += `1️⃣ Fazer pré-matrícula neste curso\n`;
    message += `2️⃣ Ver outros cursos\n`;
    message += `0️⃣ Voltar ao menu principal`;

    return message;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }
}
