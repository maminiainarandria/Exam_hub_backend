import { Router } from 'express';
import { authController } from '../Controller/AuthController.js';
import { studentController } from '../Controller/StudentController.js';
import { courseController } from '../Controller/CourseController.js';
import { examController } from '../Controller/ExamController.js';
import { questionController } from '../Controller/QuestionController.js';
import { myExamController } from '../Controller/MyExamController.js';
import { authenticate, authorize } from '../Middleware/auth.js';

export const apiRouter = Router();

apiRouter.post('/auth/login', authController.login);

apiRouter.use(authenticate);

apiRouter.get('/students', authorize('admin'), studentController.list);
apiRouter.post('/students', authorize('admin'), studentController.create);
apiRouter.put('/students/:id', authorize('admin'), studentController.update);
apiRouter.delete('/students/:id', authorize('admin'), studentController.deactivate);

apiRouter.get('/courses', authorize('admin'), courseController.list);
apiRouter.post('/courses', authorize('admin'), courseController.create);
apiRouter.put('/courses/:id', authorize('admin'), courseController.update);
apiRouter.delete('/courses/:id', authorize('admin'), courseController.delete);

apiRouter.get('/exams', authorize('admin'), examController.list);
apiRouter.post('/exams', authorize('admin'), examController.create);
apiRouter.get('/exams/:id', authorize('admin'), examController.get);
apiRouter.put('/exams/:id', authorize('admin'), examController.update);
apiRouter.delete('/exams/:id', authorize('admin'), examController.delete);
apiRouter.get('/exams/:id/questions', authorize('admin'), questionController.list);
apiRouter.post('/exams/:id/questions', authorize('admin'), questionController.create);
apiRouter.put('/questions/:id', authorize('admin'), questionController.update);
apiRouter.delete('/questions/:id', authorize('admin'), questionController.delete);
apiRouter.get('/exams/:id/results', authorize('admin'), examController.results);

apiRouter.get('/my/exams', authorize('student'), myExamController.list);
apiRouter.get('/my/exams/:id', authorize('student'), myExamController.get);
apiRouter.post('/my/exams/:id/submit', authorize('student'), myExamController.submit);
apiRouter.get('/my/results', authorize('student'), myExamController.results);
